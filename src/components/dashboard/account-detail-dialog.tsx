'use client'

import { useState, useMemo } from 'react'
import { formatCurrency } from '@/lib/utils/formatters'
import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { DateFilterBar } from '@/components/dashboard/date-filter-bar'
import { TransactionTrendChart } from '@/components/dashboard/transaction-trend-chart'
import type { DateRange } from '@/components/dashboard/date-filter-bar'
import type { Account, Transaction } from '@/types'

interface AccountDetailDialogProps {
  account: Account | null
  transactions: Transaction[]
  open: boolean
  onClose: () => void
}

export function AccountDetailDialog({
  account,
  transactions: allTransactions,
  open,
  onClose
}: AccountDetailDialogProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>()

  // 筛选该账户的交易记录
  const filteredTransactions = useMemo(() => {
    let txns = allTransactions.filter(t => t.accountId === account?.id)

    // 按日期筛选
    if (dateRange?.startDate || dateRange?.endDate) {
      txns = txns.filter(t => {
        const txnDate = t.createdAt instanceof Date ? t.createdAt : new Date(t.createdAt)
        if (dateRange.startDate && txnDate < dateRange.startDate) return false
        if (dateRange.endDate && txnDate > dateRange.endDate) return false
        return true
      })
    }

    // 按时间倒序
    return txns.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt)
      return dateB.getTime() - dateA.getTime()
    })
  }, [allTransactions, account?.id, dateRange])

  // 计算统计数据
  const stats = useMemo(() => {
    const income = filteredTransactions
      .filter(t => t.type === 'income' || t.type === 'deposit' || t.type === 'transfer_in')
      .reduce((sum, t) => sum + (t.amount || 0), 0)

    const expense = filteredTransactions
      .filter(t => t.type === 'consumption' || t.type === 'loan' || t.type === 'transfer_out')
      .reduce((sum, t) => sum + (t.amount || 0), 0)

    return {
      income,
      expense,
      net: income - expense,
      count: filteredTransactions.length
    }
  }, [filteredTransactions])

  if (!account) return null

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div
              className="h-12 w-12 rounded-xl flex items-center justify-center text-white text-xl font-bold shadow-lg"
              style={{
                background: `linear-gradient(135deg, ${account.color}, ${account.color}cc)`,
                boxShadow: `0 4px 12px ${account.color}40`
              }}
            >
              {account.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="text-xl font-bold">{account.name}</div>
              <div className="text-sm font-normal text-muted-foreground">
                余额 {formatCurrency(account.balance)}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {/* 统计卡片 */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">总收入</div>
              <div className="text-lg font-bold text-green-600">
                +{formatCurrency(stats.income)}
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">总支出</div>
              <div className="text-lg font-bold text-red-600">
                -{formatCurrency(stats.expense)}
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="text-xs text-muted-foreground mb-1">净收入</div>
              <div className={`text-lg font-bold ${stats.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.net >= 0 ? '+' : ''}{formatCurrency(stats.net)}
              </div>
            </div>
          </div>

          {/* 日期筛选器 */}
          <div>
            <h3 className="text-sm font-semibold mb-3">日期筛选</h3>
            <DateFilterBar value={dateRange} onChange={setDateRange} />
          </div>

          {/* 统计图表 */}
          <div>
            <h3 className="text-sm font-semibold mb-3">收支趋势</h3>
            <TransactionTrendChart transactions={filteredTransactions} />
          </div>

          {/* 交易记录列表 */}
          <div>
            <h3 className="text-sm font-semibold mb-3">
              交易记录 ({stats.count} 条)
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredTransactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  暂无交易记录
                </div>
              ) : (
                filteredTransactions.map(txn => (
                  <div
                    key={txn.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-muted-foreground">
                          {format(txn.createdAt instanceof Date ? txn.createdAt : new Date(txn.createdAt), 'yyyy-MM-dd HH:mm')}
                        </div>
                        <div className="text-xs px-2 py-0.5 rounded bg-muted">
                          {txn.type}
                        </div>
                      </div>
                      {txn.description && (
                        <div className="text-sm mt-1">{txn.description}</div>
                      )}
                    </div>
                    <div className={`font-bold ${
                      (txn.type === 'income' || txn.type === 'deposit' || txn.type === 'transfer_in')
                        ? 'text-green-600'
                        : 'text-red-600'
                    }`}>
                      {(txn.type === 'income' || txn.type === 'deposit' || txn.type === 'transfer_in') ? '+' : '-'}
                      {txn.amount ? formatCurrency(txn.amount) : '---'}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
