/** 预设渠道（账户页分组顺序也按此排列） */
export const PRESET_INSTITUTIONS = [
  '支付宝',
  '工商银行',
  '招商银行',
  '汇丰银行',
  '盈立',
  '同花顺',
] as const

/** 未设置渠道的账户归入该分组（排在最后） */
export const UNGROUPED = '未分组'

/**
 * 渠道分组排序：预设渠道按固定顺序在前，自定义渠道字典序居中，未分组最后。
 */
export function compareInstitutions(a: string | undefined, b: string | undefined): number {
  const av = a || ''
  const bv = b || ''
  const ai = PRESET_INSTITUTIONS.indexOf(av as (typeof PRESET_INSTITUTIONS)[number])
  const bi = PRESET_INSTITUTIONS.indexOf(bv as (typeof PRESET_INSTITUTIONS)[number])
  const aRank = ai >= 0 ? ai : av ? PRESET_INSTITUTIONS.length : PRESET_INSTITUTIONS.length + 1
  const bRank = bi >= 0 ? bi : bv ? PRESET_INSTITUTIONS.length : PRESET_INSTITUTIONS.length + 1
  if (aRank !== bRank) return aRank - bRank
  return av.localeCompare(bv, 'zh-CN')
}
