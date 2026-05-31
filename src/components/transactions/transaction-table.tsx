import { Card , Button } from 'animal-island-ui'
import { useMemo } from 'react'

import { useTransactionTotals } from '@/hooks/use-transaction-totals'
import { TrashIcon, InfoIcon, EditIcon, XIcon } from '@/lib/components/icon-adapter'
import { cn } from '@/lib/utils/cn'
import { formatDate } from '@/lib/utils/formatters'
import { TransactionType } from '@/types'

import { TransactionAmount } from './transaction-amount'
import { TransactionTotalsDisplay } from './transaction-totals'
import { TransactionTypeBadge } from './transaction-type-badge'

import type { TransactionFilters } from './transaction-filters'
import type { Transaction, Account } from '@/types'

interface TransactionTableProps {
  transactions: Transaction[]
  accounts: Account[]
  filters?: TransactionFilters
  onDelete: (id: string) => void
  onEdit?: (id: string) => void
  selectedIds?: Set<string>
  onSelectionChange?: (ids: Set<string>) => void
}

export function TransactionTable({
  transactions,
  accounts,
  filters,
  onDelete,
  onEdit,
  selectedIds = new Set(),
  onSelectionChange,
}: TransactionTableProps) {
  const getAccountName = (accountId: string) => {
    return accounts.find((acc) => acc.id === accountId)?.name || '未知账户'
  }

  // 应用过滤逻辑
  const filteredTransactions = useMemo(() => {
    if (!filters || Object.keys(filters).length === 0) {
      return transactions
    }

    return transactions.filter((txn) => {
      // 账户过滤 - 支持单个或多个账户
      if (filters.accountId) {
        const accountIds = Array.isArray(filters.accountId)
          ? filters.accountId
          : [filters.accountId]

        if (!accountIds.includes(txn.accountId)) {
          return false
        }
      }

      // 交易类型过滤
      if (filters.types && filters.types.length > 0) {
        // 检查是否包含 TRANSFER 类型
        if (filters.types.includes(TransactionType.TRANSFER)) {
          // 筛选转账时，显示所有转账对（有transferPairId的交易）
          const isTransfer = !!(
            txn.transferToAccountId ||
            txn.transferFromAccountId ||
            txn.transferPairId
          )
          if (!isTransfer && !filters.types.includes(txn.type)) {
            return false
          }
        } else if (!filters.types.includes(txn.type)) {
          // 不包含在选中的类型中
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

        // 添加调试日志
        if (
          txn.type === TransactionType.SNAPSHOT &&
          txnDate.getMonth() === 3 &&
          txnDate.getFullYear() === 2026
        ) {
          console.log(`[日期筛选] 快照交易: ${txn.description || '无描述'}`)
          console.log(`  from: ${from.toISOString()} (${from.toLocaleString()})`)
          console.log(`  to: ${to.toISOString()} (${to.toLocaleString()})`)
          console.log(`  endTime: ${endTime.toISOString()} (${endTime.toLocaleString()})`)
          console.log(`  txnDate: ${txnDate.toISOString()} (${txnDate.toLocaleString()})`)
          console.log(`  结果: ${txnDate >= from && txnDate <= endTime}`)
        }

        if (txnDate < from || txnDate > endTime) {
          return false
        }
      }

      // 标签过滤
      if (filters.tags && filters.tags.length > 0) {
        const hasBlankTagFilter = filters.tags.includes('__BLANK__')
        const regularTags = filters.tags.filter((tag) => tag !== '__BLANK__')

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
          const hasMatchingTag = filters.tags.some((filterTag) => txn.tags?.includes(filterTag))
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

  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)
    const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt)
    return dateB.getTime() - dateA.getTime()
  })

  // 检查是否有过滤条件
  const hasFilters = filters && Object.keys(filters).length > 0
  const showNoResults = filteredTransactions.length === 0 && hasFilters
  const showNoTransactions = transactions.length === 0

  if (showNoTransactions) {
    return (
      <Card className="bg-background border">
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
      <Card className="bg-background border">
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
    <Card className="bg-background border overflow-hidden">
      {/* 显示金额统计 - 仅当有筛选结果时显示 */}
      {filteredTransactions.length > 0 && <TransactionTotalsDisplay totals={totals} />}

      {/* 显示筛选结果数量 - 仅当有筛选条件时显示 */}
      {hasFilters && (
        <div className="px-6 py-3 border-b bg-muted/50">
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
          <thead className="border-b bg-muted/30">
            <tr>
              {onSelectionChange && (
                <th className="p-4 font-bold">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded"
                    checked={
                      selectedIds.size === sortedTransactions.length &&
                      sortedTransactions.length > 0
                    }
                    ref={(input) => {
                      if (input) {
                        input.indeterminate =
                          selectedIds.size > 0 && selectedIds.size < sortedTransactions.length
                      }
                    }}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onSelectionChange(new Set(sortedTransactions.map((t) => t.id)))
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
              <th className="text-center p-4 font-bold" colSpan={onEdit ? 2 : 1}>
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedTransactions.map((txn, index) => (
              <tr
                key={txn.id}
                className="border-b last:border-b-0 hover:bg-muted/30 transition-colors"
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
                <td className="p-4 text-sm font-semibold">{formatDate(txn.createdAt)}</td>
                <td className="p-4 text-sm font-semibold">{getAccountName(txn.accountId)}</td>
                <td className="p-4">
                  <TransactionTypeBadge type={txn.type} />
                </td>
                <td className="p-4 text-sm font-semibold">
                  {txn.description || '-'}
                  {txn.note && <p className="text-xs text-muted-foreground mt-1">{txn.note}</p>}
                </td>
                <td className="p-4">
                  {txn.tags && txn.tags.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {txn.tags.map((tag, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700"
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
                  <TransactionAmount amount={txn.amount} balance={txn.balance} type={txn.type} />
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
