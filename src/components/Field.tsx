import { num } from '../lib/format'

interface FieldProps {
  label: string
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
  /** 숫자입력 오른쪽 단위 표기 (%, 원, 년 …) */
  suffix?: string
  /** 슬라이더 양끝 라벨 포맷터 */
  display?: (v: number) => string
}

/**
 * 슬라이더 + 숫자입력을 함께 제공하는 입력 필드.
 * 숫자입력은 범위를 벗어난 값도 허용하고, 슬라이더는 min~max로 클램프해 동기화한다.
 */
export function Field({ label, value, onChange, min, max, step, suffix, display }: FieldProps) {
  const sliderValue = Math.min(max, Math.max(min, value))
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2">
        <label className="text-sm font-medium text-slate-300">{label}</label>
        <div className="flex items-center gap-1">
          {suffix === '원' ? (
            // 금액 입력: 천 단위 콤마 표시 (type=number 는 콤마 불가 → text + 숫자만 파싱)
            <input
              type="text"
              inputMode="numeric"
              value={num(value)}
              onChange={(e) => {
                const digits = e.target.value.replace(/[^\d]/g, '')
                onChange(digits === '' ? 0 : Number(digits))
              }}
              className="w-32 rounded-lg border border-slate-700 bg-slate-800/70 px-2.5 py-1 text-right text-sm tabular-nums text-slate-100 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          ) : (
            <input
              type="number"
              value={Number.isFinite(value) ? value : ''}
              min={min}
              step={step}
              onChange={(e) => onChange(e.target.value === '' ? 0 : Number(e.target.value))}
              className="w-32 rounded-lg border border-slate-700 bg-slate-800/70 px-2.5 py-1 text-right text-sm tabular-nums text-slate-100 outline-none transition focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
            />
          )}
          {suffix && <span className="w-4 text-xs text-slate-400">{suffix}</span>}
        </div>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={sliderValue}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full cursor-pointer accent-brand-500"
      />
      <div className="flex justify-between text-[11px] tabular-nums text-slate-500">
        <span>{display ? display(min) : min}</span>
        <span>{display ? display(max) : max}</span>
      </div>
    </div>
  )
}
