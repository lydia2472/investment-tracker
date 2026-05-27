import { Card } from 'animal-island-ui'
import { Button } from 'animal-island-ui'
import { TrashIcon, InfoIcon, EditIcon, XIcon } from '@/lib/components/icon-adapter'
import { formatDate } from '@/lib/utils/formatters'
import { cn } from '@/lib/utils/cn'
import { TransactionTypeBadge } from './transaction-type-badge'
import { TransactionAmount } from './transaction-amount'
import type { Transaction, Account } from '@/types'
import type { TransactionFilters } from './transaction-filters'
import { TransactionType } from '@/types'
import { useMemo } from 'react'
import { useTransactionTotals } from '@/hooks/use-transaction-totals'
import { TransactionTotalsDisplay } from './transaction-totals'

interface TransactionTableProps {
  transactions: Transaction[]
  accounts: Account[]
  filters?: TransactionFilters
  onDelete: (id: string) => void
  onEdit?: (id: string) => void
  selectedIds?: Set<string>
  onSelectionChange?: (ids: Set<string>) => void
}

export function TransactionTable({ transactions, accounts, filters, onDelete, onEdit, selectedIds = new Set(), onSelectionChange }: TransactionTableProps) {
  const getAccountName = (accountId: string) => {
    return accounts.find((acc) => acc.id === accountId)?.name || '未知账户'
  }

  // 应用过滤逻辑
  const filteredTransactions = useMemo(() => {
    if (!filters || Object.keys(filters).length === 0) {
      return transactions
    }

    return transactions.filter((txn) => {
      // 账户过滤
      if (filters.accountId && txn.accountId !== filters.accountId) {
        return false
      }

      // 交易类型过滤
      if (filters.type) {
        if (filters.type === TransactionType.TRANSFER) {
          // 筛选转账时，显示所有转账对（有transferPairId的交易）
          const isTransfer = !!(txn.transferToAccountId || txn.transferFromAccountId || txn.transferPairId)
          if (!isTransfer) {
            return false
          }
        } else if (txn.type !== filters.type) {
          return false
        }
      }

      // 日期范围过滤
      if (filters.dateRange) {
        const { from, to } = filters.dateRange
        const txnDate = txn.createdAt instanceof Date ? txn.createdAt : new Date(txn.createdAt)
        // 设置 to 的结束时间为当天的 23:59:59
        const endTime = new Date(to)
        endTime.setHours(23, 59, 59, 999)

        if (txnDate < from || txnDate > endTime) {
          return false
        }
      }

      // 标签过滤
      if (filters.tags && filters.tags.length > 0) {
        const hasBlankTagFilter = filters.tags.includes("__BLANK__")
        const regularTags = filters.tags.filter(tag => tag !== "__BLANK__")

        // 如果选择了"无标签"选项
        if (hasBlankTagFilter) {
          // 交易无标签：包含（符合条件）
          const hasNoTags = !txn.tags || txn.tags.length === 0

          // 交易有选中标签：包含（符合条件）
          const hasMatchingRegularTag = regularTags.some((filterTag) =>
            txn.tags?.includes(filterTag)
          )

          // OR 逻辑：无标签 OR 有匹配标签
          if (!hasNoTags && !hasMatchingRegularTag) {
            return false
          }
        } else {
          // 原有逻辑：只筛选有标签的交易
          if (!txn.tags || txn.tags.length === 0) {
            return false
          }
          const hasMatchingTag = filters.tags.some((filterTag) =>
            txn.tags?.includes(filterTag)
          )
          if (!hasMatchingTag) {
            return false
          }
        }
      }

      return true
    })
  }, [transactions, filters])

  // Calculate totals for filtered transactions
  const totals = useTransactionTotals(filteredTransactions)

  const sortedTransactions = [...filteredTransactions].sort(
    (a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt)
      return dateB.getTime() - dateA.getTime()
    }
  )

  // 检查是否有过滤条件
  const hasFilters = filters && Object.keys(filters).length > 0
  const showNoResults = filteredTransactions.length === 0 && hasFilters
  const showNoTransactions = transactions.length === 0

  if (showNoTransactions) {
    return (
      <Card color="app-green">
        <div className="text-center py-12">
          <div className="flex flex-col items-center justify-center">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mb-4">
              <InfoIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">暂无交易记录</p>
          </div>
        </div>
      </Card>
    )
  }

  if (showNoResults) {
    return (
      <Card color="app-green">
        <div className="text-center py-12">
          <div className="flex flex-col items-center justify-center">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mb-4">
              <XIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">没有找到匹配的交易记录</p>
            <p className="text-sm text-muted-foreground mt-1">请尝试调整过滤条件</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card color="app-green" className="overflow-hidden" style={{ backgroundColor: '#8ac68a' }}>
      {/* 显示金额统计 - 仅当有筛选结果时显示 */}
      {filteredTransactions.length > 0 && (
        <TransactionTotalsDisplay totals={totals} />
      )}

      {/* 显示筛选结果数量 - 仅当有筛选条件时显示 */}
      {hasFilters && (
        <div className="px-6 py-3 border-b" style={{ backgroundColor: '#8ac68a' }}>
          <p className="text-sm text-foreground">
            显示 <span className="font-bold">{filteredTransactions.length}</span> 条交易记录
            {filteredTransactions.length !== transactions.length && (
              <span className="ml-2">（共 {transactions.length} 条）</span>
            )}
          </p>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b" style={{ backgroundColor: '#8ac68a' }}>
            <tr>
              {onSelectionChange && (
                <th className="p-4 font-bold">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded"
                    checked={selectedIds.size === sortedTransactions.length && sortedTransactions.length > 0}
                    ref={(input) => {
                      if (input) {
                        input.indeterminate = selectedIds.size > 0 && selectedIds.size < sortedTransactions.length
                      }
                    }}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onSelectionChange(new Set(sortedTransactions.map(t => t.id)))
                      } else {
                        onSelectionChange(new Set())
                      }
                    }}
                  />
                </th>
              )}
              <th className="text-left p-4 font-bold">日期</th>
              <th className="text-left p-4 font-bold">账户</th>
              <th className="text-left p-4 font-bold">类型</th>
              <th className="text-left p-4 font-bold">描述</th>
              <th className="text-left p-4 font-bold">标签</th>
              <th className="text-right p-4 font-bold">金额</th>
              <th className="text-center p-4 font-bold" colSpan={onEdit ? 2 : 1}>操作</th>
            </tr>
          </thead>
          <tbody>
            {sortedTransactions.map((txn, index) => (
              <tr
                key={txn.id}
                className={cn(
                  "border-b transition-colors",
                  index % 2 === 0 ? "hover:bg-[#7bc96a]/30" : ""
                )}
                style={index % 2 === 0 ? { backgroundColor: 'rgba(138, 198, 138, 0.3)' } : undefined}
              >
                {onSelectionChange && (
                  <td className="p-4">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded"
                      checked={selectedIds.has(txn.id)}
                      onChange={(e) => {
                        const newSelected = new Set(selectedIds)
                        if (e.target.checked) {
                          newSelected.add(txn.id)
                        } else {
                          newSelected.delete(txn.id)
                        }
                        onSelectionChange(newSelected)
                      }}
                    />
                  </td>
                )}
                <td className="p-4 text-sm font-semibold">
                  {formatDate(txn.createdAt)}
                </td>
                <td className="p-4 text-sm font-semibold">
                  {getAccountName(txn.accountId)}
                </td>
                <td className="p-4">
                  <TransactionTypeBadge type={txn.type} />
                </td>
                <td className="p-4 text-sm font-semibold">
                  {txn.description || '-'}
                  {txn.note && (
                    <p className="text-xs text-muted-foreground mt-1">{txn.note}</p>
                  )}
                </td>
                <td className="p-4">
                  {txn.tags && txn.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {txn.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground text-sm">-</span>
                  )}
                </td>
                <td className="p-4 text-sm text-right font-semibold">
                  <TransactionAmount
                    amount={txn.amount}
                    balance={txn.balance}
                    type={txn.type}
                  />
                </td>
                <td className="p-4 text-center">
                  <div className="flex items-center justify-center gap-2">
                    {onEdit && (
                      <Button
                        type="default"
                        size="small"
                        className="group hover:bg-blue-50 hover:bg-muted/50 hover:scale-110 transition-all duration-200"
                        onClick={() => onEdit(txn.id)}
                      >
                        <EditIcon className="h-4 w-4 text-blue-600 group-hover:text-blue-700" />
                      </Button>
                    )}
                    <Button
                      type="default"
                      size="small"
                      className="group hover:bg-red-50 hover:bg-muted/50 hover:scale-110 transition-all duration-200"
                      onClick={() => onDelete(txn.id)}
                    >
                      <TrashIcon className="h-4 w-4 text-red-600 group-hover:text-red-700" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
