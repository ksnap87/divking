// 숫자 포맷 헬퍼 — 전부 원화 콤마 포맷(ko-KR) 기준

const krw = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 })

/** 1234567 → "1,234,567원" */
export function won(n: number): string {
  return `${krw.format(Math.round(n))}원`
}

/** 1234567 → "1,234,567" (단위 없이) */
export function num(n: number): string {
  return krw.format(Math.round(n))
}

/** 3.14159 → "3.14%" */
export function pct(n: number, digits = 2): string {
  return `${n.toFixed(digits)}%`
}

/**
 * 큰 금액을 억/만원 단위로 축약. 차트 축 라벨용.
 *  123456789 → "1.2억", 5800000 → "580만"
 */
export function wonShort(n: number): string {
  const v = Math.round(n)
  const abs = Math.abs(v)
  if (abs >= 1e8) {
    const eok = v / 1e8
    return `${eok.toFixed(eok >= 10 ? 0 : 1)}억`
  }
  if (abs >= 1e4) {
    return `${Math.round(v / 1e4)}만`
  }
  return krw.format(v)
}
