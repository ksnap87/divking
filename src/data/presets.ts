import type { SimInput } from '../lib/simulate'

export interface Preset {
  key: string
  label: string
  emoji: string
  desc: string
  patch: Partial<SimInput>
}

/** 앱 초기 기본값 */
export const DEFAULT_INPUT: SimInput = {
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

/**
 * 시나리오 프리셋 (간단 모드).
 * 실제 보유 종목 구성은 '내 포트폴리오(3종목)' 모드에서 다룬다.
 */
export const PRESETS: Preset[] = [
  {
    key: 'conservative',
    label: '보수적',
    emoji: '🛡️',
    desc: 'DPS 5% · 주가 4% · 재투자',
    patch: { dpsGrowth: 5, priceGrowth: 4, reinvest: true },
  },
  {
    key: 'base',
    label: '기본',
    emoji: '⚖️',
    desc: 'DPS 8% · 주가 6%',
    patch: { dpsGrowth: 8, priceGrowth: 6 },
  },
  {
    key: 'aggressive',
    label: '공격적',
    emoji: '🚀',
    desc: 'DPS 10% · 주가 8%',
    patch: { dpsGrowth: 10, priceGrowth: 8 },
  },
]

/** 현재 입력이 특정 프리셋과 (해당 프리셋이 지정한 필드 기준) 일치하는지 */
export function activePresetKey(input: SimInput): string | null {
  for (const p of PRESETS) {
    const keys = Object.keys(p.patch) as (keyof SimInput)[]
    if (keys.every((k) => input[k] === p.patch[k])) return p.key
  }
  return null
}
