// 계산 로직 콘솔 검증 스크립트.  실행:  npm run verify
//
// UI를 붙이기 전에 순수 함수(simulate / solveContribution)가 상식적인 값을
// 내는지, 그리고 몇 가지 불변식(단조성 등)을 만족하는지 확인한다.

import { simulate, solveContribution, type SimInput } from '../src/lib/simulate.ts'
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
console.log(`\n${failures === 0 ? '🎉 모든 검증 통과' : `⚠️  ${failures}개 검증 실패`}\n`)
process.exit(failures === 0 ? 0 : 1)
