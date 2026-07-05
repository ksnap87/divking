import { useState } from 'react'
import type { Holding, PortfolioInput } from '../lib/simulate'
import { holdingSnapshots, solvePortfolioContribution } from '../lib/simulate'
import { won, wonShort, pct } from '../lib/format'
import { Field } from './Field'

type Global = Omit<PortfolioInput, 'holdings'>

interface Props {
  holdings: Holding[]
  onHolding: <K extends keyof Holding>(index: number, key: K, value: Holding[K]) => void
  global: Global
  onGlobal: <K extends keyof Global>(key: K, value: Global[K]) => void
  onReset: () => void
}

const ACCENT: Record<string, string> = {
  schd: 'text-emerald-300 border-emerald-500/40',
  kb: 'text-amber-300 border-amber-500/40',
  jpm: 'text-sky-300 border-sky-500/40',
}

function Num({
  label,
  value,
  onChange,
  step = 0.1,
  suffix = '%',
  width = 'w-14',
}: {
  label: string
  value: number
  onChange: (v: number) => void
  step?: number
  suffix?: string
  width?: string
}) {
  return (
    <label className="flex items-center gap-1 text-[11px] text-slate-400">
      <span className="whitespace-nowrap">{label}</span>
      <input
        type="number"
        value={Number.isFinite(value) ? value : ''}
        step={step}
        onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
        className={`${width} rounded border border-slate-700 bg-slate-800/70 px-1.5 py-0.5 text-right text-xs tabular-nums text-slate-100 outline-none focus:border-brand-500`}
      />
      {suffix && <span>{suffix}</span>}
    </label>
  )
}

export function PortfolioBuilder({ holdings, onHolding, global, onGlobal, onReset }: Props) {
  const snaps = holdingSnapshots(holdings)
  const initialValue = holdings.reduce((s, h) => s + h.value, 0)
  const initialCost = snaps.reduce((s, h) => s + h.cost, 0)
  const initialDiv = snaps.reduce((s, h) => s + h.grossAnnual, 0)
  const blendedYocCost = initialCost > 0 ? (initialDiv / initialCost) * 100 : 0
  const blendedYieldVal = initialValue > 0 ? (initialDiv / initialValue) * 100 : 0

  const [need, setNeed] = useState<number | null | undefined>(undefined)
  const runReverse = () => {
    const base: Omit<PortfolioInput, 'contribution'> = { holdings, ...global }
    setNeed(solvePortfolioContribution(base))
  }

  return (
    <div className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      {/* 블렌디드 요약 */}
      <div className="rounded-xl border border-brand-500/30 bg-brand-500/5 p-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            내 포트폴리오 · 시작 시점
          </h3>
          <button
            type="button"
            onClick={onReset}
            className="text-[11px] text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline"
          >
            실제 보유값으로 리셋
          </button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
          <div className="text-slate-400">
            평가액 <span className="tabular-nums text-slate-200">{won(initialValue)}</span>
          </div>
          <div className="text-slate-400">
            매입원가 <span className="tabular-nums text-slate-200">{won(initialCost)}</span>
          </div>
          <div className="text-slate-400">
            YOC(원가) <span className="font-semibold tabular-nums text-brand-300">{pct(blendedYocCost)}</span>
          </div>
          <div className="text-slate-400">
            배당률(현재가) <span className="tabular-nums text-slate-300">{pct(blendedYieldVal)}</span>
          </div>
        </div>
      </div>

      {/* 종목 카드 3개 */}
      <div className="space-y-3">
        {holdings.map((h, i) => {
          const s = snaps[i]
          const accent = ACCENT[h.key] ?? 'text-slate-200 border-slate-700'
          return (
            <div key={h.key} className={`rounded-xl border bg-slate-800/40 p-3 ${accent.split(' ')[1]}`}>
              <div className="flex items-baseline justify-between gap-2">
                <div className="flex min-w-0 items-baseline gap-2">
                  <span className={`break-keep text-sm font-semibold ${accent.split(' ')[0]}`}>{h.name}</span>
                  <span className="shrink-0 rounded bg-slate-700/60 px-1.5 py-0.5 text-[10px] text-slate-300">
                    {h.account}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400">
                  평가비중 <span className="tabular-nums text-slate-200">{pct(s.valueWeight, 0)}</span>
                </span>
              </div>

              <div className="mt-2">
                <Field
                  label="평가액"
                  value={h.value}
                  onChange={(v) => onHolding(i, 'value', v)}
                  min={0}
                  max={200_000_000}
                  step={500_000}
                  suffix="원"
                  display={wonShort}
                />
              </div>

              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <Num label="배당률" value={h.yieldPct} onChange={(v) => onHolding(i, 'yieldPct', v)} />
                <Num label="DPS성장" value={h.dpsGrowth} onChange={(v) => onHolding(i, 'dpsGrowth', v)} step={0.5} />
                <Num label="주가성장" value={h.priceGrowth} onChange={(v) => onHolding(i, 'priceGrowth', v)} step={0.5} />
                <Num label="수익률" value={h.gainPct} onChange={(v) => onHolding(i, 'gainPct', v)} step={1} />
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <span>세율</span>
                  <button
                    type="button"
                    onClick={() => onHolding(i, 'taxRate', h.taxRate === 0 ? 15.4 : 0)}
                    className="rounded border border-slate-700 bg-slate-800/70 px-1.5 py-0.5 text-xs tabular-nums text-slate-200 hover:border-brand-500"
                    title="탭해서 0% ↔ 15.4% 전환"
                  >
                    {h.taxRate}%
                  </button>
                </div>
              </div>

              <div className="mt-2 border-t border-slate-700/50 pt-1.5 text-[11px] tabular-nums text-slate-500">
                원가 {won(s.cost)} · 연배당 {won(s.grossAnnual)} ·
                <span className="text-brand-300"> YOC원가 {pct(s.yocOnCost)}</span> · 배당기여 {pct(s.divWeight, 0)}
              </div>
            </div>
          )
        })}
      </div>

      {/* 전역: 적립 · 기간 · 재투자 · 목표 */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">적립 · 기간 · 목표</h3>
        <Field
          label="연 추가 적립액"
          value={global.contribution}
          onChange={(v) => onGlobal('contribution', v)}
          min={0}
          max={100_000_000}
          step={1_000_000}
          suffix="원"
          display={wonShort}
        />
        <p className="-mt-1 text-[11px] text-slate-500">적립금은 위 3종목의 평가비중대로 자동 배분됩니다.</p>
        <Field
          label="투자 기간"
          value={global.years}
          onChange={(v) => onGlobal('years', Math.round(v))}
          min={1}
          max={40}
          step={1}
          suffix="년"
        />
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-300">배당 재투자</span>
          <button
            type="button"
            role="switch"
            aria-checked={global.reinvest}
            onClick={() => onGlobal('reinvest', !global.reinvest)}
            className={`relative h-6 w-11 rounded-full transition ${global.reinvest ? 'bg-brand-500' : 'bg-slate-700'}`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                global.reinvest ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </button>
        </div>
        <Field
          label="월배당 목표액 (세후)"
          value={global.monthlyGoal}
          onChange={(v) => onGlobal('monthlyGoal', v)}
          min={0}
          max={20_000_000}
          step={100_000}
          suffix="원"
          display={wonShort}
        />

        <div className="rounded-xl border border-slate-700 bg-slate-800/40 p-3">
          <button
            type="button"
            onClick={runReverse}
            className="w-full rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-brand-500"
          >
            🎯 목표 역산 — 필요한 연 적립액
          </button>
          {need !== undefined && (
            <div className="mt-3 text-sm">
              {need === null ? (
                <p className="text-amber-300">현재 가정으론 현실적 적립 범위에서 목표 달성이 어렵습니다.</p>
              ) : need === 0 ? (
                <p className="text-brand-300">추가 적립 없이도 이미 목표 달성. 👍</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-slate-300">
                    {global.years}년 뒤 월 {won(global.monthlyGoal)}을 위해 필요한{' '}
                    <span className="font-semibold text-brand-300">연 적립액</span>:
                  </p>
                  <p className="text-lg font-bold tabular-nums text-brand-200">{won(need)}</p>
                  <button
                    type="button"
                    onClick={() => onGlobal('contribution', need)}
                    className="rounded-lg border border-brand-500/50 bg-brand-500/10 px-3 py-1 text-xs font-medium text-brand-200 transition hover:bg-brand-500/20"
                  >
                    이 값을 연 적립액에 적용
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
