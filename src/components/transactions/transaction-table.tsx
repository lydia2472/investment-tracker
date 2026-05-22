import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trash2, Receipt, Edit, FilterX } from 'lucide-react'
import { formatDate } from '@/lib/utils/formatters'
import { cn } from '@/lib/utils/cn'
import { TransactionTypeBadge } from './transaction-type-badge'
import { TransactionAmount } from './transaction-amount'
import type { Transaction, Account } from '@/types'
import type { TransactionFilters } from './transaction-filters'
import { useMemo } from 'react'

interface TransactionTableProps {
  transactions: Transaction[]
  accounts: Account[]
  filters?: TransactionFilters
  onDelete: (id: string) => void
  onEdit?: (id: string) => void
}

export function TransactionTable({ transactions, accounts, filters, onDelete, onEdit }: TransactionTableProps) {
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
      if (filters.type && txn.type !== filters.type) {
        return false
      }

      // 分类过滤
      if (filters.category && txn.category !== filters.category) {
        return false
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

      // 关键词搜索（搜索描述和备注）
      if (filters.keyword) {
        const searchTerm = filters.keyword.toLowerCase()
        const searchableText = [
          txn.description || '',
          txn.note || '',
        ].join(' ').toLowerCase()

        if (!searchableText.includes(searchTerm)) {
          return false
        }
      }

      return true
    })
  }, [transactions, filters])

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
      <Card>
        <CardContent className="text-center py-12">
          <div className="flex flex-col items-center justify-center">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mb-4">
              <Receipt className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">暂无交易记录</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (showNoResults) {
    return (
      <Card>
        <CardContent className="text-center py-12">
          <div className="flex flex-col items-center justify-center">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mb-4">
              <FilterX className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">没有找到匹配的交易记录</p>
            <p className="text-sm text-muted-foreground mt-1">请尝试调整过滤条件</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      {hasFilters && (
        <div className="px-6 py-3 border-b bg-muted/30">
          <p className="text-sm text-muted-foreground">
            显示 <span className="font-semibold text-foreground">{filteredTransactions.length}</span> 条交易记录
            {filteredTransactions.length !== transactions.length && (
              <span className="ml-2">（共 {transactions.length} 条）</span>
            )}
          </p>
        </div>
      )}
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-gradient-to-r from-emerald-500/10 to-green-500/10">
              <tr>
                <th className="text-left p-4 font-semibold">日期</th>
                <th className="text-left p-4 font-semibold">账户</th>
                <th className="text-left p-4 font-semibold">类型</th>
                <th className="text-left p-4 font-semibold">描述</th>
                <th className="text-right p-4 font-semibold">金额</th>
                <th className="text-center p-4 font-semibold" colSpan={onEdit ? 2 : 1}>操作</th>
              </tr>
            </thead>
            <tbody>
              {sortedTransactions.map((txn, index) => (
                <tr
                  key={txn.id}
                  className={cn(
                    "border-b hover:bg-muted/50 transition-colors",
                    index % 2 === 0 && "bg-muted/20"
                  )}
                >
                  <td className="p-4 text-sm">
                    {formatDate(txn.createdAt)}
                  </td>
                  <td className="p-4 text-sm">
                    {getAccountName(txn.accountId)}
                  </td>
                  <td className="p-4">
                    <TransactionTypeBadge type={txn.type} />
                  </td>
                  <td className="p-4 text-sm">
                    {txn.description || '-'}
                    {txn.note && (
                      <p className="text-xs text-muted-foreground mt-1">{txn.note}</p>
                    )}
                  </td>
                  <td className="p-4 text-sm text-right">
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
                          variant="ghost"
                          size="sm"
                          className="group hover:bg-blue-50 hover:scale-110 transition-all duration-200"
                          onClick={() => onEdit(txn.id)}
                        >
                          <Edit className="h-4 w-4 text-blue-600 group-hover:text-blue-700" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="group hover:bg-red-50 hover:scale-110 transition-all duration-200"
                        onClick={() => onDelete(txn.id)}
                      >
                        <Trash2 className="h-4 w-4 text-red-600 group-hover:text-red-700" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
