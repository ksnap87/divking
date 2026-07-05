import { simulatePortfolio, type Holding, type PortfolioInput } from './simulate'

// 계좌별 연 납입 한도 (2026 기준, 근사).
//  - 연금저축: 세액공제 한도 600만(IRP 합산 900만) / 물리 납입한도 1,800만
//  - ISA: 연 2,000만 (총 1억)
//  - 일반: 무제한, 배당 15.4% 과세
export interface AccountLimit {
  account: string
  /** 세액공제·권장 상한 (없으면 null) */
  deductionLimit: number | null
  /** 물리 납입 상한 (없으면 null = 무제한) */
  hardLimit: number | null
  /** 배당 과세 여부 */
  taxed: boolean
  /** 표시용 부가설명 */
  note: string
}

export const ACCOUNT_ORDER = ['연금저축', 'ISA', '일반'] as const

export const ACCOUNT_LIMITS: Record<string, AccountLimit> = {
  연금저축: {
    account: '연금저축',
    deductionLimit: 6_000_000,
    hardLimit: 18_000_000,
    taxed: false,
    note: '세액공제 600만(IRP 합산 900만) · 납입한도 1,800만',
  },
  ISA: {
    account: 'ISA',
    deductionLimit: null,
    hardLimit: 20_000_000,
    taxed: false,
    note: '연 납입한도 2,000만 · 비과세/분리과세',
  },
  일반: {
    account: '일반',
    deductionLimit: null,
    hardLimit: null,
    taxed: true,
    note: '무제한 · 배당 15.4% 과세',
  },
}

export interface AccountPlanRow {
  account: string
  /** 이 계좌에 배분되는 연 적립액 (원) */
  amount: number
  deductionLimit: number | null
  hardLimit: number | null
  taxed: boolean
  note: string
  /** 물리 한도 초과 (있는 경우) */
  overHard: boolean
  /** 세액공제/권장 상한 초과 (연금) */
  overDeduction: boolean
  /** 물리 한도 초과분 (원) */
  overflow: number
}

/** 종목별 allocPct × 총적립액 → 계좌별 연 적립액 집계 + 한도 대비 상태 */
export function accountPlan(holdings: Holding[], contribution: number): AccountPlanRow[] {
  const totAlloc = holdings.reduce((s, h) => s + Math.max(0, h.allocPct), 0) || 1
  const byAccount = new Map<string, number>()
  for (const h of holdings) {
    const amt = contribution * (Math.max(0, h.allocPct) / totAlloc)
    byAccount.set(h.account, (byAccount.get(h.account) ?? 0) + amt)
  }
  const rows: AccountPlanRow[] = [...byAccount.entries()].map(([account, amount]) => {
    const lim = ACCOUNT_LIMITS[account] ?? {
      account,
      deductionLimit: null,
      hardLimit: null,
      taxed: false,
      note: '',
    }
    return {
      account,
      amount,
      deductionLimit: lim.deductionLimit,
      hardLimit: lim.hardLimit,
      taxed: lim.taxed,
      note: lim.note,
      overHard: lim.hardLimit != null && amount > lim.hardLimit + 1,
      overDeduction: lim.deductionLimit != null && amount > lim.deductionLimit + 1,
      overflow: lim.hardLimit != null ? Math.max(0, amount - lim.hardLimit) : 0,
    }
  })
  // 연금 → ISA → 일반 순 정렬
  return rows.sort((a, b) => {
    const ai = ACCOUNT_ORDER.indexOf(a.account as (typeof ACCOUNT_ORDER)[number])
    const bi = ACCOUNT_ORDER.indexOf(b.account as (typeof ACCOUNT_ORDER)[number])
    return (ai < 0 ? 99 : ai) - (bi < 0 ? 99 : bi)
  })
}

/**
 * 세금최적 자동배분: 총적립액을 연금(pensionTarget) → ISA(isaLimit) → 일반(나머지) 순으로
 * 채워 각 종목의 allocPct 를 재설정한 새 holdings 를 반환한다.
 * 같은 계좌에 종목이 여럿이면 평가비중대로 나눈다.
 */
export function optimizeAllocation(
  holdings: Holding[],
  contribution: number,
  pensionTarget = 6_000_000,
  isaLimit = 20_000_000,
): Holding[] {
  if (contribution <= 0) return holdings.map((h) => ({ ...h, allocPct: 0 }))

  let remain = contribution
  const acctTarget: Record<string, number> = {}
  const pens = Math.min(remain, pensionTarget)
  acctTarget['연금저축'] = pens
  remain -= pens
  const isa = Math.min(remain, isaLimit)
  acctTarget['ISA'] = isa
  remain -= isa
  acctTarget['일반'] = remain // 나머지 전부

  const valueByAcct: Record<string, number> = {}
  for (const h of holdings) valueByAcct[h.account] = (valueByAcct[h.account] ?? 0) + h.value

  return holdings.map((h) => {
    const acctAmt = acctTarget[h.account] ?? 0
    const share = valueByAcct[h.account] > 0 ? h.value / valueByAcct[h.account] : 0
    const amt = acctAmt * share
    return { ...h, allocPct: (amt / contribution) * 100 }
  })
}

/**
 * 현실적(세금최적) 목표 역산: 후보 적립액마다 계좌 한도 내에서 세금최적 배분을 적용한 뒤
 * 시뮬레이션한다. 즉 "연금·ISA 한도를 채우고 넘치는 건 일반(과세)로" 라는 현실 제약을
 * 반영한 필요 연 적립액을 돌려준다. (한도 무시 배분보다 더 크게 나옴 — 이게 진짜 필요액)
 */
export function solveRealisticContribution(
  base: Omit<PortfolioInput, 'contribution'>,
  opts: { pensionTarget?: number; isaLimit?: number; hi?: number; iterations?: number } = {},
): number | null {
  const pensionTarget = opts.pensionTarget ?? 6_000_000
  const isaLimit = opts.isaLimit ?? 20_000_000
  const iterations = opts.iterations ?? 80
  let lo = 0
  let hi = opts.hi ?? Math.max(base.monthlyGoal * 12 * Math.max(1, base.years), 1e8)

  const monthlyAt = (c: number): number =>
    simulatePortfolio({
      ...base,
      holdings: optimizeAllocation(base.holdings, c, pensionTarget, isaLimit),
      contribution: c,
    }).final.monthly

  if (monthlyAt(0) >= base.monthlyGoal) return 0
  let expand = 0
  while (monthlyAt(hi) < base.monthlyGoal && expand < 40) {
    hi *= 2
    expand++
  }
  if (monthlyAt(hi) < base.monthlyGoal) return null

  for (let i = 0; i < iterations; i++) {
    const mid = (lo + hi) / 2
    if (monthlyAt(mid) >= base.monthlyGoal) hi = mid
    else lo = mid
  }
  return Math.ceil(hi)
}
