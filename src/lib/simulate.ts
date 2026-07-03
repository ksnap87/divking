// 배당성장 장기투자 시뮬레이터 — 순수 계산 로직 (백엔드/DB 없음)
//
// 핵심 개념: YOC (Yield on Cost, 매입원가 대비 배당수익률)
//   안 팔고 보유하면서 DPS(주당배당)가 매년 성장하면, 초기 배당률이 낮아도
//   시간이 지날수록 "매입원가 대비 실질 배당률"이 올라간다. 이 파일은 그 원리를
//   연 단위로 시뮬레이션한다.
//
// 모든 함수는 부수효과 없는 순수 함수다. UI 없이 콘솔(scripts/verify.ts)로 검증한다.

export interface SimInput {
  /** 초기 배당자산 평가금액 (원) */
  initialAsset: number
  /** 초기 배당수익률 (%) — 평가금액 대비 연 배당률 */
  initialYield: number
  /** 연 DPS(주당배당) 성장률 (%) */
  dpsGrowth: number
  /** 연 주가 성장률 (%) */
  priceGrowth: number
  /** 연 추가 적립액 (원) */
  contribution: number
  /** 투자 기간 (년) */
  years: number
  /** 배당 재투자 여부 */
  reinvest: boolean
  /** 배당 세율 (%) — ISA/연금이면 0, 일반계좌면 15.4 */
  taxRate: number
  /** 월배당 목표액 (원, 세후 실수령 기준) */
  monthlyGoal: number
}

export interface YearRow {
  /** 경과 연차 (1..years) */
  year: number
  /** 연말 평가금액 (원) */
  value: number
  /** 연간 세전 배당 (원) */
  grossAnnual: number
  /** 연간 세후 배당 (원) */
  netAnnual: number
  /** 월배당 (세후 실수령, 원) */
  monthly: number
  /** 평가액 대비 배당수익률 (%) = 세전배당 / 평가금액 */
  yocOnValue: number
  /** 원가 대비 YOC (%) = 세전배당 / 누적투자원가 — 핵심 개념 지표 */
  yocOnCost: number
  /** 누적 투자원가 (원) */
  cost: number
  /** 이 해에 월배당 목표를 달성했는가 */
  goalMet: boolean
}

export interface SimResult {
  /** 연도별 상세 */
  rows: YearRow[]
  /** 월배당 목표를 처음 넘는 연차 (달성 못하면 null) */
  goalYear: number | null
  /** 마지막 해 스냅샷 */
  final: YearRow
}

const pct = (x: number): number => x / 100

/**
 * 연 단위 반복 시뮬레이션.
 *
 * 매년 순서(스펙 기준):
 *  1) 그 해 배당액 = 배당 베이스 × (1 - 세율)   (세전/세후 모두 기록)
 *  2) 평가금액 = 평가금액 × (1 + 주가성장률)
 *  3) 추가 적립액을 평가금액에 더하고, 적립분의 첫해 배당 기여를 배당 베이스에 반영(초기수익률로 근사)
 *  4) 재투자 ON이면 세후 배당을 평가금액에 더하고 배당 베이스에도 반영
 *  5) DPS 성장률만큼 배당 베이스 증가 (다음 해 대비)
 *  6) 그 해의 평가금액 / 연배당 / 월배당 / YOC 기록
 */
export function simulate(input: SimInput): SimResult {
  const g = pct(input.priceGrowth)
  const d = pct(input.dpsGrowth)
  const y0 = pct(input.initialYield)
  const t = pct(input.taxRate)

  let value = input.initialAsset // 평가금액
  let divBase = input.initialAsset * y0 // 배당 베이스 = 현재 연간 세전 배당
  let cost = input.initialAsset // 누적 투자원가 (원가 대비 YOC 산출용)

  const rows: YearRow[] = []
  let goalYear: number | null = null

  const n = Math.max(0, Math.floor(input.years))
  for (let year = 1; year <= n; year++) {
    // 1) 그 해 배당액 (세전/세후)
    const grossAnnual = divBase
    const netAnnual = grossAnnual * (1 - t)

    // 2) 주가 성장
    value = value * (1 + g)

    // 3) 추가 적립 — 적립분은 초기수익률로 배당 베이스에 기여
    value += input.contribution
    divBase += input.contribution * y0
    cost += input.contribution

    // 4) 배당 재투자 (세후 배당을 재투자)
    if (input.reinvest) {
      value += netAnnual
      divBase += netAnnual * y0
      cost += netAnnual
    }

    // 5) DPS 성장 — 다음 해를 위해 배당 베이스 성장
    divBase = divBase * (1 + d)

    // 6) 기록
    const monthly = netAnnual / 12
    const goalMet = monthly >= input.monthlyGoal
    if (goalMet && goalYear === null) goalYear = year

    rows.push({
      year,
      value,
      grossAnnual,
      netAnnual,
      monthly,
      yocOnValue: value > 0 ? (grossAnnual / value) * 100 : 0,
      yocOnCost: cost > 0 ? (grossAnnual / cost) * 100 : 0,
      cost,
      goalMet,
    })
  }

  const final: YearRow =
    rows[rows.length - 1] ??
    {
      year: 0,
      value: input.initialAsset,
      grossAnnual: divBase,
      netAnnual: divBase * (1 - t),
      monthly: (divBase * (1 - t)) / 12,
      yocOnValue: input.initialYield,
      yocOnCost: input.initialYield,
      cost,
      goalMet: (divBase * (1 - t)) / 12 >= input.monthlyGoal,
    }

  return { rows, goalYear, final }
}

/**
 * 목표 역산: 월배당 목표와 기간을 고정했을 때 필요한 "연 추가 적립액"을 이진탐색으로 역산.
 *
 * monthlyAt(contribution) 은 contribution 에 대해 단조증가이므로 이진탐색이 성립한다.
 * @returns 필요한 연 적립액(원, 반올림). 적립 없이 이미 달성이면 0, 현실적으로 불가능하면 null.
 */
export function solveContribution(
  base: Omit<SimInput, 'contribution'>,
  opts: { hi?: number; iterations?: number } = {},
): number | null {
  const iterations = opts.iterations ?? 80
  let lo = 0
  let hi = opts.hi ?? Math.max(base.monthlyGoal * 12 * Math.max(1, base.years), 1e8)

  const monthlyAt = (contribution: number): number =>
    simulate({ ...base, contribution }).final.monthly

  // 적립 0으로도 목표 달성이면 0
  if (monthlyAt(0) >= base.monthlyGoal) return 0

  // 상한이 목표를 넘도록 확장 (최대 40회 = 상한 2^40배까지)
  let expand = 0
  while (monthlyAt(hi) < base.monthlyGoal && expand < 40) {
    hi *= 2
    expand++
  }
  if (monthlyAt(hi) < base.monthlyGoal) return null // 현실적으로 불가능

  // 이진탐색: 목표를 만족하는 최소 적립액
  for (let i = 0; i < iterations; i++) {
    const mid = (lo + hi) / 2
    if (monthlyAt(mid) >= base.monthlyGoal) hi = mid
    else lo = mid
  }
  // 올림해서 반환: hi 는 목표를 만족하는 값이므로, 정수 원으로 올리면 여전히 목표를 만족한다.
  // (반올림 시 1원 미만 차이로 목표에 미세하게 못 미치는 경우를 방지)
  return Math.ceil(hi)
}
