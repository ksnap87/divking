import type { YearRow } from '../lib/simulate'
import { won, pct } from '../lib/format'

const th = 'px-3 py-2 text-right font-medium text-slate-400 whitespace-nowrap'
const td = 'px-3 py-2 text-right tabular-nums whitespace-nowrap'

export function YearlyTable({ rows }: { rows: YearRow[] }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60">
      <h3 className="border-b border-slate-800 px-4 py-3 text-sm font-semibold text-slate-300">
        연도별 상세
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/80">
              <th className={`${th} text-left`}>연차</th>
              <th className={th}>평가금액</th>
              <th className={th}>연배당(세후)</th>
              <th className={th}>월배당(세후)</th>
              <th className={th}>YOC(평가)</th>
              <th className={th}>YOC(원가)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.year}
                className={`border-b border-slate-800/60 last:border-0 ${
                  r.goalMet ? 'bg-brand-500/10' : 'hover:bg-slate-800/30'
                }`}
              >
                <td className={`${td} text-left font-medium text-slate-300`}>
                  {r.goalMet && <span className="mr-1 text-brand-400">★</span>}
                  {r.year}년
                </td>
                <td className={`${td} text-slate-100`}>{won(r.value)}</td>
                <td className={td}>{won(r.netAnnual)}</td>
                <td className={`${td} ${r.goalMet ? 'font-semibold text-brand-300' : 'text-slate-200'}`}>
                  {won(r.monthly)}
                </td>
                <td className={`${td} text-slate-400`}>{pct(r.yocOnValue)}</td>
                <td className={`${td} text-brand-300`}>{pct(r.yocOnCost)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
