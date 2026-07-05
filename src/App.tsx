import { useCallback, useMemo, useState } from 'react'
import {
  simulate,
  simulatePortfolio,
  type SimInput,
  type PortfolioInput,
  type Holding,
} from './lib/simulate'
import { DEFAULT_INPUT, activePresetKey } from './data/presets'
import { DEFAULT_HOLDINGS, DEFAULT_PORTFOLIO_GLOBAL } from './data/holdings'
import { Controls } from './components/Controls'
import { PortfolioBuilder } from './components/PortfolioBuilder'
import { SummaryCards } from './components/SummaryCards'
import { GoalBanner } from './components/GoalBanner'
import { Charts } from './components/Charts'
import { YearlyTable } from './components/YearlyTable'

type Mode = 'simple' | 'portfolio'
type Global = Omit<PortfolioInput, 'holdings'>

export default function App() {
  const [mode, setMode] = useState<Mode>('simple')

  // 간단 모드
  const [input, setInput] = useState<SimInput>(DEFAULT_INPUT)
  const onField = useCallback(<K extends keyof SimInput>(key: K, value: SimInput[K]) => {
    setInput((prev) => ({ ...prev, [key]: value }))
  }, [])
  const onPreset = useCallback((patch: Partial<SimInput>) => {
    setInput((prev) => ({ ...prev, ...patch }))
  }, [])

  // 내 포트폴리오 모드
  const [holdings, setHoldings] = useState<Holding[]>(() => DEFAULT_HOLDINGS.map((h) => ({ ...h })))
  const [pglobal, setPglobal] = useState<Global>(DEFAULT_PORTFOLIO_GLOBAL)
  const onHolding = useCallback(<K extends keyof Holding>(index: number, key: K, value: Holding[K]) => {
    setHoldings((prev) => prev.map((h, i) => (i === index ? { ...h, [key]: value } : h)))
  }, [])
  const onGlobal = useCallback(<K extends keyof Global>(key: K, value: Global[K]) => {
    setPglobal((prev) => ({ ...prev, [key]: value }))
  }, [])
  const onResetHoldings = useCallback(() => {
    setHoldings(DEFAULT_HOLDINGS.map((h) => ({ ...h })))
  }, [])

  const result = useMemo(
    () => (mode === 'simple' ? simulate(input) : simulatePortfolio({ holdings, ...pglobal })),
    [mode, input, holdings, pglobal],
  )
  const activePreset = useMemo(() => activePresetKey(input), [input])

  const monthlyGoal = mode === 'simple' ? input.monthlyGoal : pglobal.monthlyGoal
  const years = mode === 'simple' ? input.years : pglobal.years

  return (
    <div className="min-h-full">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {/* 헤더 */}
        <header className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">👑</span>
            <span className="text-sm font-semibold uppercase tracking-widest text-brand-400">DivKing</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 sm:text-3xl">배당성장 장기투자 시뮬레이터</h1>
          <p className="max-w-3xl text-sm leading-relaxed text-slate-400">
            안 팔고 보유하면서 <span className="font-medium text-slate-200">DPS(주당배당)</span>가 매년 성장하면,
            초기 배당률이 낮아도 시간이 지날수록{' '}
            <span className="font-medium text-brand-300">매입원가 대비 실질 배당률(YOC)</span>이 올라갑니다.
            <span className="font-medium text-slate-300"> 내 포트폴리오 모드</span>에선 실제 3종목(배당다우·KB·JPM)을
            각각 조합해 볼 수 있어요.
          </p>
        </header>

        {/* 본문 */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <div className="space-y-3 lg:sticky lg:top-6">
              {/* 모드 토글 */}
              <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-800 bg-slate-900/60 p-1.5">
                {(
                  [
                    ['simple', '간단 모드'],
                    ['portfolio', '내 포트폴리오 (3종목)'],
                  ] as [Mode, string][]
                ).map(([m, label]) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`rounded-xl px-3 py-2 text-sm font-semibold transition ${
                      mode === m ? 'bg-brand-600 text-white' : 'text-slate-300 hover:bg-slate-800/60'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {mode === 'simple' ? (
                <Controls input={input} onField={onField} onPreset={onPreset} activePreset={activePreset} />
              ) : (
                <PortfolioBuilder
                  holdings={holdings}
                  onHolding={onHolding}
                  onReplaceHoldings={setHoldings}
                  global={pglobal}
                  onGlobal={onGlobal}
                  onReset={onResetHoldings}
                />
              )}
            </div>
          </div>

          <div className="space-y-6 lg:col-span-8">
            <SummaryCards final={result.final} years={years} />
            {mode === 'portfolio' && (
              <p className="-mt-3 text-xs text-slate-500">
                * 내 포트폴리오 모드의 <span className="text-brand-300">YOC·배당은 매입원가 기준</span>입니다(평가액 ÷
                (1+수익률)로 원가 산출). 3종목을 각각 다른 배당률·DPS성장·세율로 굴려 합산합니다.
              </p>
            )}
            <GoalBanner goalYear={result.goalYear} final={result.final} monthlyGoal={monthlyGoal} />
            <Charts rows={result.rows} monthlyGoal={monthlyGoal} />
            <YearlyTable rows={result.rows} />
          </div>
        </div>

        {/* 계산 가정 + 면책 */}
        <footer className="mt-10 space-y-3 border-t border-slate-800 pt-6 text-xs leading-relaxed text-slate-500">
          <p>
            <span className="font-semibold text-slate-400">계산 가정</span> · 월배당·연배당은 세후 실수령 기준입니다.
            <span className="text-slate-400"> YOC(원가 대비)</span> = 세전배당 ÷ 매입원가(핵심 개념 지표),
            <span className="text-slate-400"> YOC(평가 대비)</span> = 세전배당 ÷ 평가금액. 간단 모드는 원가=초기
            평가액으로 두고, 내 포트폴리오 모드는 실제 매입원가(평가액÷(1+수익률))를 사용합니다. 적립금은 종목별 초기
            평가비중대로 배분하며, 신규 적립·재투자분은 현재수익률로 배당 기여를 근사합니다.
          </p>
          <p className="text-slate-600">
            ※ 본 도구는 단순화된 <span className="font-medium text-slate-500">근사 모델</span>이며 실제 투자 결과를
            보장하지 않습니다. 배당률·성장률·환율·세금을 단순화했습니다.{' '}
            <span className="font-medium text-slate-500">투자 권유가 아닙니다.</span>
          </p>
        </footer>
      </div>
    </div>
  )
}
