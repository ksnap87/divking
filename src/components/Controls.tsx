import { useState } from 'react'
import type { SimInput } from '../lib/simulate'
import { solveContribution } from '../lib/simulate'
import { won, wonShort } from '../lib/format'
import { PRESETS } from '../data/presets'
import { Field } from './Field'

interface Props {
  input: SimInput
  onField: <K extends keyof SimInput>(key: K, value: SimInput[K]) => void
  onPreset: (patch: Partial<SimInput>) => void
  activePreset: string | null
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</h3>
      {children}
    </div>
  )
}

export function Controls({ input, onField, onPreset, activePreset }: Props) {
  // 목표 역산 결과: undefined=미실행, null=불가능, number=필요 연 적립액
  const [need, setNeed] = useState<number | null | undefined>(undefined)

  const runReverse = () => {
    const { contribution: _c, ...rest } = input
    void _c
    setNeed(solveContribution(rest))
  }

  return (
    <div className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      {/* 프리셋 */}
      <Section title="시나리오 프리셋">
        <div className="grid grid-cols-2 gap-2">
          {PRESETS.map((p) => {
            const active = activePreset === p.key
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => onPreset(p.patch)}
                className={`rounded-xl border px-3 py-2 text-left transition ${
                  active
                    ? 'border-brand-500 bg-brand-500/15'
                    : 'border-slate-700 bg-slate-800/40 hover:border-slate-600'
                }`}
              >
                <div className="text-sm font-semibold text-slate-100">
                  {p.emoji} {p.label}
                </div>
                <div className="mt-0.5 text-[11px] leading-tight text-slate-400">{p.desc}</div>
              </button>
            )
          })}
        </div>
      </Section>

      {/* 기본 가정 */}
      <Section title="기본 가정">
        <Field
          label="초기 배당자산 평가금액"
          value={input.initialAsset}
          onChange={(v) => onField('initialAsset', v)}
          min={0}
          max={500_000_000}
          step={1_000_000}
          suffix="원"
          display={wonShort}
        />
        <Field
          label="초기 배당수익률"
          value={input.initialYield}
          onChange={(v) => onField('initialYield', v)}
          min={0}
          max={15}
          step={0.1}
          suffix="%"
        />
        <Field
          label="연 DPS 성장률"
          value={input.dpsGrowth}
          onChange={(v) => onField('dpsGrowth', v)}
          min={0}
          max={20}
          step={0.5}
          suffix="%"
        />
        <Field
          label="연 주가 성장률"
          value={input.priceGrowth}
          onChange={(v) => onField('priceGrowth', v)}
          min={0}
          max={20}
          step={0.5}
          suffix="%"
        />
      </Section>

      {/* 적립 · 기간 */}
      <Section title="적립 · 기간">
        <Field
          label="연 추가 적립액"
          value={input.contribution}
          onChange={(v) => onField('contribution', v)}
          min={0}
          max={100_000_000}
          step={1_000_000}
          suffix="원"
          display={wonShort}
        />
        <Field
          label="투자 기간"
          value={input.years}
          onChange={(v) => onField('years', Math.round(v))}
          min={1}
          max={40}
          step={1}
          suffix="년"
        />
      </Section>

      {/* 세금 · 재투자 */}
      <Section title="세금 · 재투자">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-slate-300">배당 재투자</span>
          <button
            type="button"
            role="switch"
            aria-checked={input.reinvest}
            onClick={() => onField('reinvest', !input.reinvest)}
            className={`relative h-6 w-11 rounded-full transition ${
              input.reinvest ? 'bg-brand-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
                input.reinvest ? 'left-[22px]' : 'left-0.5'
              }`}
            />
          </button>
        </div>

        <div className="space-y-1.5">
          <span className="text-sm font-medium text-slate-300">배당 세율</span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onField('taxRate', 0)}
              className={`rounded-xl border px-3 py-2 text-sm transition ${
                input.taxRate === 0
                  ? 'border-brand-500 bg-brand-500/15 text-brand-200'
                  : 'border-slate-700 bg-slate-800/40 text-slate-300 hover:border-slate-600'
              }`}
            >
              ISA · 연금 0%
            </button>
            <button
              type="button"
              onClick={() => onField('taxRate', 15.4)}
              className={`rounded-xl border px-3 py-2 text-sm transition ${
                input.taxRate === 15.4
                  ? 'border-brand-500 bg-brand-500/15 text-brand-200'
                  : 'border-slate-700 bg-slate-800/40 text-slate-300 hover:border-slate-600'
              }`}
            >
              일반계좌 15.4%
            </button>
          </div>
        </div>
      </Section>

      {/* 목표 */}
      <Section title="목표">
        <Field
          label="월배당 목표액 (세후)"
          value={input.monthlyGoal}
          onChange={(v) => onField('monthlyGoal', v)}
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
            🎯 목표 역산 — 필요한 연 적립액 계산
          </button>
          {need !== undefined && (
            <div className="mt-3 text-sm">
              {need === null ? (
                <p className="text-amber-300">
                  현재 가정으로는 현실적인 적립액 범위에서 목표 달성이 어렵습니다. 기간·수익률
                  가정을 조정해 보세요.
                </p>
              ) : need === 0 ? (
                <p className="text-brand-300">추가 적립 없이도 이미 목표를 달성합니다. 👍</p>
              ) : (
                <div className="space-y-2">
                  <p className="text-slate-300">
                    {input.years}년 뒤 월배당 {won(input.monthlyGoal)}을 위해 필요한{' '}
                    <span className="font-semibold text-brand-300">연 적립액</span>:
                  </p>
                  <p className="text-lg font-bold tabular-nums text-brand-200">{won(need)}</p>
                  <button
                    type="button"
                    onClick={() => onField('contribution', need)}
                    className="rounded-lg border border-brand-500/50 bg-brand-500/10 px-3 py-1 text-xs font-medium text-brand-200 transition hover:bg-brand-500/20"
                  >
                    이 값을 연 적립액에 적용
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </Section>
    </div>
  )
}
