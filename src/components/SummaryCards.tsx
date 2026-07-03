import type { YearRow } from '../lib/simulate'
import { won, pct } from '../lib/format'

function Card({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub?: string
  accent?: boolean
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        accent
          ? 'border-brand-500/40 bg-brand-500/10'
          : 'border-slate-800 bg-slate-900/60'
      }`}
    >
      <div className="text-xs font-medium text-slate-400">{label}</div>
      <div
        className={`mt-1.5 break-keep text-lg font-bold tabular-nums sm:text-xl ${
          accent ? 'text-brand-300' : 'text-slate-100'
        }`}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] tabular-nums text-slate-500">{sub}</div>}
    </div>
  )
}

export function SummaryCards({ final, years }: { final: YearRow; years: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card label={`${years}년 뒤 평가금액`} value={won(final.value)} accent />
      <Card
        label="YOC (원가 대비)"
        value={pct(final.yocOnCost)}
        sub={`평가액 대비 ${pct(final.yocOnValue)}`}
      />
      <Card label="연배당 (세후)" value={won(final.netAnnual)} sub={`세전 ${won(final.grossAnnual)}`} />
      <Card label="월배당 (세후)" value={won(final.monthly)} accent />
    </div>
  )
}
