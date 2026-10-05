import { Card , Button } from 'animal-island-ui'
import { useMemo } from 'react'

import { useTransactionTotals } from '@/hooks/use-transaction-totals'
import { TrashIcon, InfoIcon, EditIcon, XIcon } from '@/lib/components/icon-adapter'
import { formatDate } from '@/lib/utils/formatters'
import { filterTransactions } from '@/lib/utils/transaction-filtering'

import { TransactionAmount } from './transaction-amount'
import { TransactionTotalsDisplay } from './transaction-totals'
import { TransactionTypeBadge } from './transaction-type-badge'

import type { TransactionFilters } from './transaction-filters'
import type { Transaction, Account } from '@/types'

interface TransactionTableProps {
  transactions: Transaction[]
  accounts: Account[]
  filteredTransactions?: Transaction[]
  filters?: TransactionFilters
  onDelete: (id: string) => void
  onEdit?: (id: string) => void
  selectedIds?: Set<string>
  onSelectionChange?: (ids: Set<string>) => void
}

export function TransactionTable({
  transactions,
  accounts,
  filteredTransactions: providedFilteredTransactions,
  filters,
  onDelete,
  onEdit,
  selectedIds = new Set(),
  onSelectionChange,
}: TransactionTableProps) {
  const accountNameMap = useMemo(
    () => new Map(accounts.map((account) => [account.id, account.name])),
    [accounts]
  )
  const accountCodeMap = useMemo(
    () => new Map(accounts.map((account) => [account.id, account.fundCode])),
    [accounts]
  )

  // 应用过滤逻辑
  const filteredTransactions = useMemo(() => {
    if (providedFilteredTransactions) {
      return providedFilteredTransactions
    }

    return filterTransactions(transactions, accounts, filters)
  }, [providedFilteredTransactions, transactions, accounts, filters])

  // Calculate totals for filtered transactions
  const totals = useTransactionTotals(filteredTransactions)

  const sortedTransactions = useMemo(() => {
    return [...filteredTransactions].sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt)
      return dateB.getTime() - dateA.getTime()
    })
  }, [filteredTransactions])

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
            {sortedTransactions.map((txn) => (
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
                <td className="p-4 text-sm font-semibold">
                  {accountNameMap.get(txn.accountId) || '未知账户'}
                  {accountCodeMap.get(txn.accountId) && (
                    <span className="ml-1.5 text-[10px] font-mono px-1 py-0.5 rounded bg-muted border text-muted-foreground align-middle">
                      {accountCodeMap.get(txn.accountId)}
                    </span>
                  )}
                </td>
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
