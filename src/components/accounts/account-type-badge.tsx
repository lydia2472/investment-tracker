import { AccountType } from '@/types'

const accountTypeLabels: Record<AccountType, string> = {
  [AccountType.SECURITIES]: '证券',
  [AccountType.BANK]: '银行',
  [AccountType.CASH]: '现金',
  [AccountType.FIXED_DEPOSIT]: '定期',
  [AccountType.FUND]: '基金',
  [AccountType.STOCK]: '股票',
  [AccountType.GOLD]: '黄金',
  [AccountType.OTHER]: '其他',
}

interface AccountTypeBadgeProps {
  type: AccountType
}

export function AccountTypeBadge({ type }: AccountTypeBadgeProps) {
  return <span className="text-xs bg-secondary px-2 py-1 rounded">{accountTypeLabels[type]}</span>
}
