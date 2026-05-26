import { formatCurrencyForStats } from '@/lib/utils/formatters'
import type { TransactionTotals } from '@/hooks/use-transaction-totals'

interface TransactionTotalsProps {
  totals: TransactionTotals
}

export function TransactionTotalsDisplay({ totals }: TransactionTotalsProps) {
  const { totalIncome, totalExpense, netAmount } = totals

  return (
    <div className="px-6 py-3 border-b" style={{ backgroundColor: '#8ac68a' }}>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        {/* 总收入 */}
        <div className="flex items-center gap-2">
          <span className="text-foreground">总收入:</span>
          <span className="font-bold text-green-700">
            ¥{formatCurrencyForStats(totalIncome)}
          </span>
        </div>

        <span className="text-foreground">|</span>

        {/* 总支出 */}
        <div className="flex items-center gap-2">
          <span className="text-foreground">总支出:</span>
          <span className="font-bold text-red-700">
            ¥{formatCurrencyForStats(totalExpense)}
          </span>
        </div>

        <span className="text-foreground">|</span>

        {/* 净额 */}
        <div className="flex items-center gap-2">
          <span className="text-foreground">净额:</span>
          <span className={`font-bold ${
            netAmount >= 0 ? 'text-green-700' : 'text-red-700'
          }`}>
            {netAmount >= 0 ? '+' : ''}¥{formatCurrencyForStats(netAmount)}
          </span>
        </div>
      </div>
    </div>
  )
}
