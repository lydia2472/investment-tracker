import { Card , Button } from 'animal-island-ui'

import {
  TrendingUpIcon,
  TrendingDownIcon,
  EditIcon,
  TrashIcon,
} from '@/lib/components/icon-adapter'
import { FixedDepositService } from '@/lib/services/fixed-deposit-service'
import { MaturityReminderService } from '@/lib/services/maturity-reminder-service'
import { useSnapshotStore } from '@/lib/stores/snapshot-store'
import { cn } from '@/lib/utils/cn'
import { iconClasses, cardClasses, buttonClasses } from '@/lib/utils/design-classes'
import { formatCurrency } from '@/lib/utils/formatters'

import { AccountTypeBadge } from './account-type-badge'
import { MaturityBadge } from './maturity-badge'
import { RiskLevelBadge } from './risk-level-badge'
import { TransferDialog } from './transfer-dialog'

import type { Account } from '@/types'

interface AccountCardProps {
  account: Account
  onDelete: (id: string, name: string) => void
  onEdit?: (account: Account) => void
  // 新增 props
  isSelected?: boolean
  onToggleSelection?: () => void
  isBulkSelectionMode?: boolean
}

export function AccountCard({
  account,
  onDelete,
  onEdit,
  isSelected = false,
  onToggleSelection,
  isBulkSelectionMode = false,
}: AccountCardProps) {
  // 获取该账户的最新快照
  const latestSnapshot = useSnapshotStore((state) =>
    state.getLatestSnapshot(account.id)
  )

  // 当前余额显示逻辑：优先显示最新快照金额，如果没有快照则显示账户余额
  const currentBalance = latestSnapshot?.balance ?? account.balance

  // 添加渲染日志
  const formattedInitialBalance = formatCurrency(account.initialBalance)
  console.log(`[AccountCard] 渲染账户: ${account.name}`)
  console.log(
    `[AccountCard] 接收到的数据 - balance: ${account.balance}, initialBalance: ${account.initialBalance}`
  )
  console.log(`[AccountCard] 格式化后的initialBalance: ${formattedInitialBalance}`)

  const balanceGrowth = currentBalance - account.initialBalance
  const isPositiveGrowth = balanceGrowth > 0

  // 检查是否是已到期的定期存款
  const isMatured = MaturityReminderService.isMatured(account)
  const maturityDetails = isMatured ? MaturityReminderService.getMaturityDetails(account) : null

  return (
    <Card
      className={cn(
        'group overflow-hidden',
        cardClasses.interactive,
        isSelected && 'ring-4 ring-blue-500 ring-opacity-50'
      )}
      style={{ backgroundColor: account.color }}
    >
      {/* Top gradient bar */}
      <div
        className="h-2 w-full"
        style={{
          background: `linear-gradient(90deg, ${account.color}, ${account.color}aa)`,
        }}
      />

      {/* 批量选择复选框 */}
      {isBulkSelectionMode && (
        <div className="absolute top-4 right-4 z-10">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onToggleSelection?.()}
            className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation()
              onToggleSelection?.()
            }}
          />
        </div>
      )}

      <div className="p-6 pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'h-12 w-12 rounded-2xl transition-all duration-normal',
                iconClasses.hover,
                account.icon ? 'overflow-hidden p-0' : 'p-3 shadow-xl'
              )}
              style={
                account.icon
                  ? {
                      background: 'transparent',
                      boxShadow: 'none',
                    }
                  : {
                      background: `linear-gradient(135deg, ${account.color}, ${account.color}cc)`,
                      boxShadow: `0 8px 16px ${account.color}40`,
                    }
              }
            >
              {account.icon ? (
                <img
                  src={account.icon}
                  alt={account.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    console.error('Failed to load account icon:', account.icon, e)
                    // 图片加载失败时回退到首字母显示
                    e.currentTarget.style.display = 'none'
                    const parent = e.currentTarget.parentElement
                    if (parent) {
                      parent.style.background = `linear-gradient(135deg, ${account.color}, ${account.color}cc)`
                      parent.style.boxShadow = `0 8px 16px ${account.color}40`
                    }
                  }}
                />
              ) : (
                <span className="text-white text-lg font-bold">
                  {account.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <h3 className="font-semibold text-lg">{account.name}</h3>
              <p className="text-sm text-muted-foreground">{account.description || '无描述'}</p>
            </div>
          </div>
        </div>
      </div>
      <div className="p-6 pt-0">
        <div className="space-y-4">
          {/* Balance display */}
          <div className="p-4 rounded-2xl bg-muted/50">
            <p className="text-sm text-muted-foreground mb-1">当前余额</p>
            <p className="text-3xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
              {formatCurrency(currentBalance)}
            </p>
          </div>

          {/* Account info */}
          <div className="flex gap-2 flex-wrap">
            <AccountTypeBadge type={account.type} />
            {account.riskLevel && <RiskLevelBadge level={account.riskLevel} />}
            {isMatured && maturityDetails && (
              <MaturityBadge
                maturityDate={maturityDetails.maturityDate}
                principal={maturityDetails.principal}
                interest={maturityDetails.interest}
                totalAmount={maturityDetails.totalAmount}
              />
            )}
            <span className="text-xs bg-muted px-3 py-1.5 rounded-xl font-medium">
              {account.currency}
            </span>
          </div>

          {/* Growth indicator */}
          {balanceGrowth !== 0 && (
            <div
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-xl',
                isPositiveGrowth
                  ? 'bg-[var(--color-profit)]/10 text-[var(--color-profit)]'
                  : 'bg-[var(--color-loss)]/10 text-[var(--color-loss)]'
              )}
            >
              {isPositiveGrowth ? (
                <TrendingUpIcon className="h-4 w-4" />
              ) : (
                <TrendingDownIcon className="h-4 w-4" />
              )}
              <div className="flex flex-col">
                <span className="text-xs font-semibold">{isPositiveGrowth ? '增长' : '减少'}</span>
                <span className="text-xs font-bold">{formatCurrency(Math.abs(balanceGrowth))}</span>
              </div>
            </div>
          )}

          {/* Initial balance reference */}
          <div className="flex justify-between text-sm text-muted-foreground pt-2 border-t border-border/50">
            <span>初始余额</span>
            <span
              className="font-medium"
              data-account-id={account.id}
              data-initial-balance={account.initialBalance}
            >
              {formatCurrency(account.initialBalance)}
            </span>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-3 gap-2 pt-2">
            {onEdit && (
              <Button
                type="default"
                size="small"
                className="border-2 border-[var(--color-profit)]/50"
                onClick={() => onEdit(account)}
                icon={<EditIcon className="h-4 w-4" />}
              >
                编辑
              </Button>
            )}
            <TransferDialog fromAccountId={account.id} />
            <Button
              type="primary"
              size="small"
              className={cn(
                'bg-gradient-to-r from-[var(--color-loss)] to-[var(--color-loss)] text-white shadow-lg shadow-[var(--color-loss)]/30 hover:shadow-xl hover:shadow-[var(--color-loss)]/40',
                buttonClasses.interactive
              )}
              onClick={() => onDelete(account.id, account.name)}
              icon={<TrashIcon className="h-4 w-4" />}
            >
              删除
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
