import type { ReactElement } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import type { YearRow } from '../lib/simulate'
import { won, wonShort } from '../lib/format'

const AXIS = 'rgb(100 116 139)' // slate-500
const GRID = 'rgb(30 41 59)' // slate-800

const tooltipStyle = {
  backgroundColor: 'rgb(15 23 42)', // slate-900
  border: '1px solid rgb(51 65 85)', // slate-700
  borderRadius: 12,
  fontSize: 13,
}
const labelStyle = { color: 'rgb(203 213 225)' } // slate-300

function ChartCard({ title, children }: { title: string; children: ReactElement }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-300">{title}</h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function Charts({ rows, monthlyGoal }: { rows: YearRow[]; monthlyGoal: number }) {
  const data = rows.map((r) => ({
    year: r.year,
    value: Math.round(r.value),
    monthly: Math.round(r.monthly),
  }))

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <ChartCard title="연도별 평가금액">
        <LineChart data={data} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="year" stroke={AXIS} fontSize={12} tickFormatter={(y) => `${y}년`} />
          <YAxis stroke={AXIS} fontSize={12} width={48} tickFormatter={(v) => wonShort(v)} />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={labelStyle}
            labelFormatter={(l) => `${l}년차`}
            formatter={(v: number) => [won(v), '평가금액']}
          />
          <Line type="monotone" dataKey="value" stroke="#34d399" strokeWidth={2.5} dot={false} />
        </LineChart>
      </ChartCard>

      <ChartCard title="연도별 월배당 (세후) · 목표선">
        <LineChart data={data} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke={GRID} />
          <XAxis dataKey="year" stroke={AXIS} fontSize={12} tickFormatter={(y) => `${y}년`} />
          <YAxis
            stroke={AXIS}
            fontSize={12}
            width={48}
            tickFormatter={(v) => wonShort(v)}
            allowDecimals={false}
            domain={[0, (dataMax: number) => Math.max(dataMax, monthlyGoal) * 1.1]}
          />
          <Tooltip
            contentStyle={tooltipStyle}
            labelStyle={labelStyle}
            labelFormatter={(l) => `${l}년차`}
            formatter={(v: number) => [won(v), '월배당']}
          />
          {monthlyGoal > 0 && (
            <ReferenceLine
              y={monthlyGoal}
              stroke="#f59e0b"
              strokeDasharray="6 4"
              label={{
                value: `목표 ${wonShort(monthlyGoal)}`,
                fill: '#f59e0b',
                fontSize: 11,
                position: 'insideTopRight',
              }}
            />
          )}
          <Line type="monotone" dataKey="monthly" stroke="#22d3ee" strokeWidth={2.5} dot={false} />
        </LineChart>
      </ChartCard>
    </div>
  )
}
