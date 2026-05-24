/**
 * 生成年份范围数组
 */
export function getYearsInRange(minYear?: number, maxYear?: number): number[] {
  const currentYear = new Date().getFullYear()
  const min = minYear || currentYear - 10
  const max = maxYear || currentYear
  const years: number[] = []
  for (let y = max; y >= min; y--) {
    years.push(y)
  }
  return years
}

/**
 * 生成月份选项
 */
export function getMonthsInRange(): Array<{ value: number; label: string }> {
  return Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: `${i + 1}月`,
  }))
}
