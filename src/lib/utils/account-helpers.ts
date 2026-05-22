import { AccountType } from '@/types'

/**
 * 获取账户类型标签
 */
export function getAccountTypeLabel(type: AccountType): string {
  const labels: Record<AccountType, string> = {
    [AccountType.SECURITIES]: '证券',
    [AccountType.BANK]: '银行',
    [AccountType.CASH]: '现金',
    [AccountType.OTHER]: '其他',
  }
  return labels[type]
}

/**
 * 根据ID查找账户
 */
export function getAccountById(
  accounts: Array<{ id: string }>,
  id: string
): { id: string } | undefined {
  return accounts.find(acc => acc.id === id)
}

/**
 * 根据ID查找账户名称
 */
export function getAccountName(
  accounts: Array<{ id: string; name: string }>,
  id: string
): string {
  const account = accounts.find(acc => acc.id === id)
  return account?.name || '未知账户'
}

/**
 * 搜索账户（按名称或描述）
 */
export function searchAccounts(
  accounts: Array<{ name: string; description?: string }>,
  query: string
): Array<{ name: string; description?: string }> {
  const lowerQuery = query.toLowerCase()
  return accounts.filter(acc =>
    acc.name.toLowerCase().includes(lowerQuery) ||
    (acc.description && acc.description.toLowerCase().includes(lowerQuery))
  )
}

/**
 * 验证账户颜色格式
 */
export function isValidAccountColor(color: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(color)
}

/**
 * 生成随机账户颜色
 */
export function generateRandomColor(): string {
  const colors = [
    '#3b82f6', // 蓝色
    '#10b981', // 绿色
    '#f59e0b', // 琥珀色
    '#ef4444', // 红色
    '#8b5cf6', // 紫色
    '#ec4899', // 粉色
    '#6366f1', // 靛蓝色
    '#14b8a6', // 青色
  ]
  return colors[Math.floor(Math.random() * colors.length)]
}
