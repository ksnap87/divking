// 계산 로직 콘솔 검증 스크립트.  실행:  npm run verify
//
// UI를 붙이기 전에 순수 함수(simulate / solveContribution)가 상식적인 값을
// 내는지, 그리고 몇 가지 불변식(단조성 등)을 만족하는지 확인한다.

import {
  simulate,
  solveContribution,
  simulatePortfolio,
  solvePortfolioContribution,
  holdingSnapshots,
  type SimInput,
  type PortfolioInput,
} from '../src/lib/simulate.ts'
import { DEFAULT_HOLDINGS } from '../src/data/holdings.ts'
import { accountPlan, optimizeAllocation, solveRealisticContribution } from '../src/lib/accounts.ts'
import { won, pct } from '../src/lib/format.ts'

let failures = 0
function assert(cond: boolean, msg: string) {
  if (!cond) {
    failures++
    console.error(`  ❌ FAIL: ${msg}`)
  } else {
    console.log(`  ✅ ${msg}`)
  }
}

function printTable(input: SimInput) {
  const { rows, goalYear } = simulate(input)
  console.log(
    ['연차', '평가금액', '연배당(세후)', '월배당(세후)', 'YOC(평가)', 'YOC(원가)', '목표']
      .map((s) => s.padStart(14))
      .join(''),
  )
  for (const r of rows) {
    console.log(
      [
        `${r.year}년`,
        won(r.value),
        won(r.netAnnual),
        won(r.monthly),
        pct(r.yocOnValue),
        pct(r.yocOnCost),
        r.goalMet ? '★달성' : '-',
      ]
        .map((s) => s.padStart(14))
        .join(''),
    )
  }
  console.log(
    goalYear ? `\n  → 월배당 목표를 ${goalYear}년차에 처음 달성` : '\n  → 기간 내 월배당 목표 미달성',
  )
}

// ---------------------------------------------------------------------------
console.log('\n=== [1] 기본 시나리오 ===')
const base: SimInput = {
  initialAsset: 60_000_000,
  initialYield: 3.5,
  dpsGrowth: 8,
  priceGrowth: 6,
  contribution: 12_000_000,
  years: 15,
  reinvest: true,
  taxRate: 0,
  monthlyGoal: 5_000_000,
}
printTable(base)

// ---------------------------------------------------------------------------
console.log('\n=== [2] 불변식 검증 ===')
const { rows } = simulate(base)

// 성장률/적립이 모두 양수이므로 평가금액은 매년 증가해야 한다.
let valMono = true
for (let i = 1; i < rows.length; i++) if (rows[i].value <= rows[i - 1].value) valMono = false
assert(valMono, '평가금액은 매년 증가한다 (성장+적립 양수)')

// 안 팔고 보유하면 원가 대비 YOC 는 매년 상승해야 한다 (핵심 개념).
let yocMono = true
for (let i = 1; i < rows.length; i++) if (rows[i].yocOnCost <= rows[i - 1].yocOnCost) yocMono = false
assert(yocMono, '원가 대비 YOC 는 매년 상승한다 (DPS 성장 원리)')

// 첫해 배당은 초기 자산 × 초기수익률 근처여야 한다.
const y1 = rows[0]
assert(
  Math.abs(y1.grossAnnual - base.initialAsset * (base.initialYield / 100)) < 1,
  '1년차 세전 배당 = 초기자산 × 초기수익률',
)

// 세율 0 이면 세전=세후.
assert(Math.abs(y1.grossAnnual - y1.netAnnual) < 1e-6, '세율 0%: 세전배당 = 세후배당')

// 월배당 = 세후 연배당 / 12.
assert(Math.abs(y1.monthly - y1.netAnnual / 12) < 1e-6, '월배당 = 세후 연배당 / 12')

// ---------------------------------------------------------------------------
console.log('\n=== [3] 세금 영향 (일반계좌 15.4%) ===')
const taxed = simulate({ ...base, taxRate: 15.4 })
const untaxed = simulate({ ...base, taxRate: 0 })
assert(
  taxed.final.netAnnual < untaxed.final.netAnnual,
  '세율 15.4% 세후 배당 < 세율 0% 세후 배당',
)
console.log(`  세후 최종 월배당 — 비과세: ${won(untaxed.final.monthly)} / 15.4%: ${won(taxed.final.monthly)}`)

// ---------------------------------------------------------------------------
console.log('\n=== [4] 재투자 ON/OFF 비교 ===')
const on = simulate({ ...base, reinvest: true })
const off = simulate({ ...base, reinvest: false })
assert(on.final.value > off.final.value, '재투자 ON 최종 평가금액 > OFF')
console.log(`  최종 평가금액 — ON: ${won(on.final.value)} / OFF: ${won(off.final.value)}`)

// ---------------------------------------------------------------------------
console.log('\n=== [5] 프리셋 시나리오 최종 월배당 ===')
const presets: Record<string, Partial<SimInput>> = {
  보수적: { dpsGrowth: 5, priceGrowth: 4, reinvest: true },
  기본: { dpsGrowth: 8, priceGrowth: 6 },
  공격적: { dpsGrowth: 10, priceGrowth: 8 },
}
for (const [name, p] of Object.entries(presets)) {
  const r = simulate({ ...base, ...p })
  console.log(
    `  ${name.padEnd(4)} → 최종 평가 ${won(r.final.value)} · 월배당 ${won(r.final.monthly)} · 달성 ${
      r.goalYear ? `${r.goalYear}년차` : '미달성'
    }`,
  )
}

// ---------------------------------------------------------------------------
console.log('\n=== [6] 목표 역산 (필요 연 적립액) ===')
const { contribution: _drop, ...noContrib } = base
void _drop
for (const goal of [3_000_000, 5_000_000, 8_000_000]) {
  const need = solveContribution({ ...noContrib, monthlyGoal: goal })
  if (need === null) {
    console.log(`  월 ${won(goal)} 목표 → 현실적으로 불가능`)
    continue
  }
  // 역산 결과를 다시 넣으면 목표를 (거의) 만족해야 한다.
  const check = simulate({ ...base, contribution: need, monthlyGoal: goal })
  const ok = check.final.monthly >= goal * 0.999
  assert(ok, `역산: 월 ${won(goal)} 목표 → 연 적립 ${won(need)} 넣으면 목표 달성`)
}

// ---------------------------------------------------------------------------
console.log('\n=== [7] 엣지 케이스 ===')
const zeroYears = simulate({ ...base, years: 0 })
assert(zeroYears.rows.length === 0, '기간 0년: 행 없음')
assert(zeroYears.goalYear === null, '기간 0년: 목표연차 null')
console.log(`  0년 final(폴백): 평가 ${won(zeroYears.final.value)} · 월배당 ${won(zeroYears.final.monthly)}`)

const already = solveContribution({ ...noContrib, initialAsset: 3e9, monthlyGoal: 1_000_000 })
assert(already === 0, '이미 목표 달성 상태: 필요 적립액 0')

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
console.log('\n=== [8] 내 포트폴리오 (3종목, 원가 기준 YOC) ===')
const pbase: PortfolioInput = {
  holdings: DEFAULT_HOLDINGS,
  contribution: 12_000_000,
  years: 15,
  reinvest: true,
  monthlyGoal: 5_000_000,
}
for (const s of holdingSnapshots(DEFAULT_HOLDINGS)) {
  console.log(
    `  ${s.name.padEnd(18)} 평가비중 ${pct(s.valueWeight, 0).padStart(5)} · 원가 ${won(s.cost)} · 연배당 ${won(
      s.grossAnnual,
    )} · YOC원가 ${pct(s.yocOnCost)} (현재가 ${pct(s.yieldOnValue)})`,
  )
}
const pres = simulatePortfolio(pbase)
console.log(
  `  → 시작 합계: 평가 ${won(pres.initialValue)} · 원가 ${won(pres.initialCost)} · 블렌디드 YOC원가 ${pct(
    pres.blendedYocOnCost,
  )} vs 현재가 ${pct(pres.blendedYieldOnValue)}`,
)
console.log(
  `  → ${pbase.years}년 뒤: 평가 ${won(pres.final.value)} · 월배당(세후) ${won(pres.final.monthly)} · YOC원가 ${pct(
    pres.final.yocOnCost,
  )} · 달성 ${pres.goalYear ? `${pres.goalYear}년차` : '미달성'}`,
)

const psnaps = holdingSnapshots(DEFAULT_HOLDINGS)
assert(pres.blendedYocOnCost > pres.blendedYieldOnValue, '블렌디드 YOC(원가) > 배당률(현재가)')
const kb = psnaps.find((s) => s.key === 'kb')!
assert(kb.yocOnCost > kb.yieldOnValue * 1.5, 'KB(+95%): 원가대비 YOC 가 현재가 배당률보다 크게 높다')
let pv = true
let pyoc = true
for (let i = 1; i < pres.rows.length; i++) {
  if (pres.rows[i].value <= pres.rows[i - 1].value) pv = false
  if (pres.rows[i].yocOnCost <= pres.rows[i - 1].yocOnCost) pyoc = false
}
assert(pv, '포트폴리오: 평가금액 매년 증가')
assert(pyoc, '포트폴리오: 원가대비 YOC 매년 상승')
const y1gross = DEFAULT_HOLDINGS.reduce((s, h) => s + h.value * (h.yieldPct / 100), 0)
assert(Math.abs(pres.rows[0].grossAnnual - y1gross) < 1, '1년차 세전배당 = Σ(평가액×배당률)')
assert(pres.rows[0].netAnnual < pres.rows[0].grossAnnual, '세후 배당 < 세전 (JPM 15.4% 반영)')

const { contribution: _pc, ...pnoContrib } = pbase
void _pc
const pneed = solvePortfolioContribution({ ...pnoContrib, monthlyGoal: 5_000_000 })
if (pneed !== null) {
  const pcheck = simulatePortfolio({ ...pbase, contribution: pneed })
  assert(pcheck.final.monthly >= 5_000_000 * 0.999, `포트폴리오 역산: 연적립 ${won(pneed)} → 월 500만 달성`)
  console.log(`  → 월 500만 목표 필요 연적립: ${won(pneed)}`)
} else {
  console.log('  → 월 500만 목표: 현실적 범위 내 불가')
}

// ---------------------------------------------------------------------------
console.log('\n=== [9] 계좌별 적립 계획 + 세금최적 자동배분 ===')
const plan12 = accountPlan(DEFAULT_HOLDINGS, 12_000_000)
for (const r of plan12) {
  console.log(
    `  ${r.account.padEnd(6)} ${won(r.amount)}/년  ${
      r.overHard ? '⚠️ 한도초과' : r.overDeduction ? '△ 세액공제초과' : 'OK'
    }`,
  )
}
assert(
  plan12.every((r) => !r.overHard),
  '기본 1,200만: 물리 한도 초과 없음',
)

const bigC = 42_278_170
const planBig = accountPlan(DEFAULT_HOLDINGS, bigC)
const pensionBig = planBig.find((r) => r.account === '연금저축')!
assert(pensionBig.overHard, '적립 4,228만·비중배분: 연금 물리한도(1,800만) 초과 감지')

const opt = optimizeAllocation(DEFAULT_HOLDINGS, bigC)
const planOpt = accountPlan(opt, bigC)
const pOpt = planOpt.find((r) => r.account === '연금저축')!
const iOpt = planOpt.find((r) => r.account === 'ISA')!
const gOpt = planOpt.find((r) => r.account === '일반')!
console.log(
  `  자동배분(${won(bigC)}): 연금 ${won(pOpt.amount)} · ISA ${won(iOpt.amount)} · 일반 ${won(gOpt.amount)}`,
)
assert(Math.abs(pOpt.amount - 6_000_000) < 1, '자동배분: 연금 = 600만(세액공제)')
assert(Math.abs(iOpt.amount - 20_000_000) < 1, '자동배분: ISA = 2,000만')
assert(Math.abs(pOpt.amount + iOpt.amount + gOpt.amount - bigC) < 1, '자동배분 합 = 총적립액')
assert(!pOpt.overHard && !iOpt.overHard, '자동배분: 연금·ISA 물리 한도 내')

const allKB = DEFAULT_HOLDINGS.map((h) => ({ ...h, allocPct: h.key === 'kb' ? 100 : 0 }))
const rKB = simulatePortfolio({ holdings: allKB, contribution: 12_000_000, years: 15, reinvest: true, monthlyGoal: 5_000_000 })
const rEven = simulatePortfolio({ holdings: DEFAULT_HOLDINGS, contribution: 12_000_000, years: 15, reinvest: true, monthlyGoal: 5_000_000 })
console.log(`  KB 몰빵 vs 기본 최종 월배당: ${won(rKB.final.monthly)} vs ${won(rEven.final.monthly)}`)
assert(rKB.final.monthly !== rEven.final.monthly, '적립 배분(allocPct) 변경이 결과에 반영됨')

// 현실(세금최적 배분) 목표 역산: 계좌 한도 반영 → 한도무시보다 더 크고, 적용 후 목표 달성
const realNeed = solveRealisticContribution({ holdings: DEFAULT_HOLDINGS, years: 15, reinvest: true, monthlyGoal: 5_000_000 })
if (realNeed !== null) {
  const realHoldings = optimizeAllocation(DEFAULT_HOLDINGS, realNeed)
  const realCheck = simulatePortfolio({ holdings: realHoldings, contribution: realNeed, years: 15, reinvest: true, monthlyGoal: 5_000_000 })
  console.log(`  현실(세금최적) 필요 연적립: ${won(realNeed)}  vs 한도무시 ${won(pneed ?? 0)}`)
  assert(realCheck.final.monthly >= 5_000_000 * 0.999, '현실 역산: 적용(세금최적 배분) 후 목표 달성')
  assert(realNeed > (pneed ?? 0), '현실 필요액 > 한도무시 필요액 (초과분 과세계좌 반영)')
}

// ---------------------------------------------------------------------------
console.log(`\n${failures === 0 ? '🎉 모든 검증 통과' : `⚠️  ${failures}개 검증 실패`}\n`)
process.exit(failures === 0 ? 0 : 1)
