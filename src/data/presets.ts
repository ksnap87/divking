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
 * 시나리오 프리셋.
 *  - 앞의 3개는 스펙에 명시된 보수/기본/공격.
 *  - "내 실제 포트폴리오"는 캡처한 배당 엔진(배당다우존스 + KB금융 + 커버드콜 2종,
 *    약 5,800만원 규모)을 근사한 프리셋. 대부분 ISA/연금(비과세) 성격이라 세율 0.
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
  {
    key: 'mine',
    label: '내 실제 포트폴리오',
    emoji: '👑',
    desc: '배당엔진 5,800만 · 비과세 · 커버드콜 혼합',
    patch: {
      initialAsset: 58_000_000,
      initialYield: 6,
      dpsGrowth: 6,
      priceGrowth: 5,
      contribution: 12_000_000,
      years: 15,
      reinvest: true,
      taxRate: 0,
    },
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
