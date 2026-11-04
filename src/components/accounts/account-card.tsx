import { Card , Button } from 'animal-island-ui'
import { format } from 'date-fns'

import {
  TrendingUpIcon,
  TrendingDownIcon,
  EditIcon,
  TrashIcon,
} from '@/lib/components/icon-adapter'
import { FixedDepositService } from '@/lib/services/fixed-deposit-service'
import { MaturityReminderService } from '@/lib/services/maturity-reminder-service'
import { useSnapshotStore } from '@/lib/stores/snapshot-store'
import { useTransactionStore } from '@/lib/stores/transaction-store'
import { cn } from '@/lib/utils/cn'
import { iconClasses, cardClasses, buttonClasses } from '@/lib/utils/design-classes'
import { formatCurrency } from '@/lib/utils/formatters'
import { calculateGoldAccountSummary, isGoldAccount } from '@/lib/utils/gold-profit-helpers'
import { calculateCurrentDisplayBalance } from '@/lib/utils/snapshot-balance-helpers'
import { AccountType } from '@/types'

import { AccountTypeBadge } from './account-type-badge'
import { MaturityBadge } from './maturity-badge'
import { RiskLevelBadge } from './risk-level-badge'
import { SellGoldDialog } from './sell-gold-dialog'
import { TransferDialog } from './transfer-dialog'

import type { Account } from '@/types'

interface AccountCardProps {
  account: Account
  onDelete: (id: string, name: string) => void
  onEdit?: (account: Account) => void
  /** 切换归档状态（归档/取消归档） */
  onToggleArchive?: (id: string) => void
  // 新增 props
  isSelected?: boolean
  onToggleSelection?: () => void
  isBulkSelectionMode?: boolean
}

export function AccountCard({
  account,
  onDelete,
  onEdit,
  onToggleArchive,
  isSelected = false,
  onToggleSelection,
  isBulkSelectionMode = false,
}: AccountCardProps) {
  // 获取该账户的最新快照
  const latestSnapshot = useSnapshotStore((state) =>
    state.getLatestSnapshot(account.id)
  )

  // 订阅稳定的全量数据用于计算当前余额（避免 selector 返回新数组的无限渲染问题）
  const allTransactions = useTransactionStore((state) => state.transactions)
  const allSnapshotsForBalance = useSnapshotStore((state) => state.snapshots)

  // 当前余额 = 最新快照余额 + 快照之后的交易变动（快照后转出/转入必须反映）
  const currentBalance = calculateCurrentDisplayBalance(
    account,
    allTransactions,
    allSnapshotsForBalance
  )

  // 黄金账户：计算累计总收益、平均持仓成本等专属指标
  // 注意：不能把 getSnapshotsByAccount 直接作为 selector，因为它每次都返回新数组引用，
  // 会触发 Zustand 的无限渲染告警。改为订阅稳定的 snapshots 数组，在组件内过滤。
  const isGold = account.type === AccountType.GOLD
  const allSnapshots = useSnapshotStore((state) => state.snapshots)
  const goldSummary = isGold
    ? calculateGoldAccountSummary(allSnapshots.filter((s) => s.accountId === account.id))
    : null

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
            onClick={(e) => e.stopPropagation()}
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
                account.icon.startsWith('/') || account.icon.startsWith('http') ? (
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
                  // emoji 图标(账户图标选择器现在存 emoji 字符)
                  <span className="text-2xl leading-none">{account.icon}</span>
                )
              ) : (
                <span className="text-white text-lg font-bold">
                  {account.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">{account.name}</h3>
                {account.fundCode && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted border text-muted-foreground">
                    {account.fundCode}
                  </span>
                )}
              </div>
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

          {/* 黄金账户专属指标：累计克数、平均成本、累计收益 */}
          {isGold && goldSummary?.hasData && (
            <div className="p-4 rounded-2xl bg-[#FFD700]/10 border border-[#FFD700]/30 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">黄金持仓</p>
                <SellGoldDialog account={account} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-xs text-muted-foreground">累计克数</p>
                  <p className="text-sm font-bold">{goldSummary.totalGrams.toFixed(4)} 克</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">最新均价</p>
                  <p className="text-sm font-bold">{formatCurrency(goldSummary.latestMarketPrice)}/克</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">平均成本</p>
                  <p className="text-sm font-bold">{formatCurrency(goldSummary.averageCostPerGram)}/克</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">累计投入</p>
                  <p className="text-sm font-bold">{formatCurrency(goldSummary.totalInvested)}</p>
                </div>
              </div>
              <div className="pt-2 border-t border-[#FFD700]/30">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">累计总收益</span>
                  <span
                    className={cn(
                      'text-sm font-bold',
                      goldSummary.totalProfit >= 0
                        ? 'text-[var(--color-profit)]'
                        : 'text-[var(--color-loss)]'
                    )}
                  >
                    {goldSummary.totalProfit >= 0 ? '+' : ''}
                    {formatCurrency(goldSummary.totalProfit)}
                    <span className="text-xs ml-1">
                      ({(goldSummary.totalProfitRate * 100).toFixed(2)}%)
                    </span>
                  </span>
                </div>
              </div>
            </div>
          )}

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

          <div className="flex justify-between text-sm text-muted-foreground">
            <span>初始日期</span>
            <span className="font-medium">{format(new Date(account.createdAt), 'yyyy-MM-dd')}</span>
          </div>

          {/* Action buttons */}
          <div className="grid grid-cols-4 gap-2 pt-2">
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
            {onToggleArchive && (
              <Button
                type="default"
                size="small"
                onClick={() => onToggleArchive(account.id)}
                title={account.archived ? '取消归档' : '归档（折叠隐藏）'}
              >
                {account.archived ? '取消归档' : '归档'}
              </Button>
            )}
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
