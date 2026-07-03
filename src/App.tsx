import { useCallback, useMemo, useState } from 'react'
import { simulate, type SimInput } from './lib/simulate'
import { DEFAULT_INPUT, activePresetKey } from './data/presets'
import { Controls } from './components/Controls'
import { SummaryCards } from './components/SummaryCards'
import { GoalBanner } from './components/GoalBanner'
import { Charts } from './components/Charts'
import { YearlyTable } from './components/YearlyTable'

export default function App() {
  const [input, setInput] = useState<SimInput>(DEFAULT_INPUT)

  const onField = useCallback(<K extends keyof SimInput>(key: K, value: SimInput[K]) => {
    setInput((prev) => ({ ...prev, [key]: value }))
  }, [])

  const onPreset = useCallback((patch: Partial<SimInput>) => {
    setInput((prev) => ({ ...prev, ...patch }))
  }, [])

  const result = useMemo(() => simulate(input), [input])
  const activePreset = useMemo(() => activePresetKey(input), [input])

  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <header className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">👑</span>
            <span className="text-sm font-semibold uppercase tracking-widest text-brand-400">
              DivKing
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 sm:text-3xl">배당성장 장기투자 시뮬레이터</h1>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-400">
            안 팔고 보유하면서 <span className="font-medium text-slate-200">DPS(주당배당)</span>가 매년
            성장하면, 초기 배당률이 낮아도 시간이 지날수록{' '}
            <span className="font-medium text-brand-300">매입원가 대비 실질 배당률(YOC)</span>이
            올라갑니다. 은퇴 시점의 월배당 목표 달성 여부를 연 단위로 시뮬레이션합니다.
          </p>
        </header>

        {/* 본문 */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-6">
              <Controls
                input={input}
                onField={onField}
                onPreset={onPreset}
                activePreset={activePreset}
              />
            </div>
          </div>

          <div className="space-y-6 lg:col-span-8">
            <SummaryCards final={result.final} years={input.years} />
            <GoalBanner
              goalYear={result.goalYear}
              final={result.final}
              monthlyGoal={input.monthlyGoal}
            />
            <Charts rows={result.rows} monthlyGoal={input.monthlyGoal} />
            <YearlyTable rows={result.rows} />
          </div>
        </div>

        {/* 계산 가정 + 면책 */}
        <footer className="mt-10 space-y-3 border-t border-slate-800 pt-6 text-xs leading-relaxed text-slate-500">
          <p>
            <span className="font-semibold text-slate-400">계산 가정</span> · 월배당·연배당은 세후
            실수령 기준입니다. <span className="text-slate-400">YOC(원가 대비)</span> = 세전배당 ÷
            누적투자원가(핵심 개념 지표), <span className="text-slate-400">YOC(평가 대비)</span> =
            세전배당 ÷ 평가금액. 적립·재투자분은 초기수익률로 배당 기여를 근사합니다.
          </p>
          <p className="text-slate-600">
            ※ 본 도구는 단순화된 <span className="font-medium text-slate-500">근사 모델</span>이며 실제
            투자 결과를 보장하지 않습니다. 세금·수수료·환율·배당 변동을 단순화했습니다.{' '}
            <span className="font-medium text-slate-500">투자 권유가 아닙니다.</span>
          </p>
        </footer>
      </div>
    </div>
  )
}
