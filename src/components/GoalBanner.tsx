import type { YearRow } from '../lib/simulate'
import { won, pct } from '../lib/format'

export function GoalBanner({
  goalYear,
  final,
  monthlyGoal,
}: {
  goalYear: number | null
  final: YearRow
  monthlyGoal: number
}) {
  const met = goalYear !== null
  const ratio = monthlyGoal > 0 ? (final.monthly / monthlyGoal) * 100 : 100

  if (met) {
    return (
      <div className="flex items-center gap-3 rounded-2xl border border-brand-500/40 bg-brand-500/10 p-4">
        <span className="text-2xl">🎉</span>
        <div>
          <div className="font-semibold text-brand-200">
            {goalYear}년차에 월배당 목표 {won(monthlyGoal)} 달성!
          </div>
          <div className="text-sm text-slate-300">
            최종 {final.year}년차 월배당은 {won(final.monthly)} (목표의 {pct(ratio, 0)}) 입니다.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-4">
      <span className="text-2xl">⚠️</span>
      <div>
        <div className="font-semibold text-amber-200">기간 내 월배당 목표 미달성</div>
        <div className="text-sm text-slate-300">
          최종 {final.year}년차 월배당 {won(final.monthly)} — 목표 {won(monthlyGoal)}의{' '}
          <span className="font-semibold text-amber-200">{pct(ratio, 0)}</span> 수준. 왼쪽{' '}
          <span className="font-semibold">‘목표 역산’</span>으로 필요 적립액을 확인해 보세요.
        </div>
      </div>
    </div>
  )
}
