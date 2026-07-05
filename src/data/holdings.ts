import type { Holding, PortfolioInput } from '../lib/simulate'

// 실제 보유 3종목 기본값 (스크린샷 평가액·수익률 + 조사한 배당 데이터 기반).
//  - value/gainPct: 캡처한 평가액·수익률 → 매입원가는 자동 산출(value/(1+gainPct)).
//  - yieldPct: "현재 평가액 대비" 배당률(대략). 원가대비 YOC 는 자동으로 더 높게 나옴.
//  - dpsGrowth: 최근 10년 DPS 평균성장률을 향후 전망으로. KB는 밸류업 특수라 보수적으로 10% 시작.
//  - taxRate: 계좌별. 일반계좌(JPM)만 15.4%, ISA(KB)·연금(배당다우)은 0%.
//  - allocPct: 신규 적립금 배분(%). 기본은 평가비중 근사(45/46/9). '세금최적 자동배분'으로 재설정 가능.
export const DEFAULT_HOLDINGS: Holding[] = [
  {
    key: 'schd',
    name: 'ACE 미국배당다우존스',
    account: '연금저축',
    value: 35_500_320,
    gainPct: 33.1,
    yieldPct: 3.4,
    dpsGrowth: 10,
    priceGrowth: 6,
    taxRate: 0,
    allocPct: 45,
  },
  {
    key: 'kb',
    name: 'KB금융',
    account: 'ISA',
    value: 36_485_500,
    gainPct: 95.5,
    yieldPct: 2.5,
    dpsGrowth: 10,
    priceGrowth: 5,
    taxRate: 0,
    allocPct: 46,
  },
  {
    key: 'jpm',
    name: 'JPM (JPMorgan)',
    account: '일반',
    value: 6_879_157,
    gainPct: 23,
    yieldPct: 1.9,
    dpsGrowth: 12,
    priceGrowth: 6,
    taxRate: 15.4,
    allocPct: 9,
  },
]

export const DEFAULT_PORTFOLIO_GLOBAL: Omit<PortfolioInput, 'holdings'> = {
  contribution: 12_000_000,
  years: 15,
  reinvest: true,
  monthlyGoal: 5_000_000,
}
