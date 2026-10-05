import { InfoIcon } from '@/lib/components/icon-adapter'
import { formatCurrencyForStats } from '@/lib/utils/formatters'

import type { TransactionTotals } from '@/hooks/use-transaction-totals'

interface TransactionTotalsProps {
  totals: TransactionTotals
}

interface MetricHintProps {
  title: string
  lines: string[]
}

function MetricHint({ title, lines }: MetricHintProps) {
  return (
    <span className="group/metric relative inline-flex items-center">
      <button
        type="button"
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground transition hover:text-foreground focus-visible:text-foreground"
        aria-label={`${title}计算口径`}
      >
        <InfoIcon className="h-3.5 w-3.5" />
      </button>
      <span className="pointer-events-none absolute left-0 top-6 z-50 w-72 translate-y-1 rounded-2xl border border-[#d7d0be] bg-[#fffaf0] p-4 text-left text-[#4d3d2b] opacity-0 shadow-md transition duration-150 group-hover/metric:translate-y-0 group-hover/metric:opacity-100 group-focus-within/metric:translate-y-0 group-focus-within/metric:opacity-100">
        <span className="block space-y-3">
          <span className="block">
            <span className="block text-sm font-bold text-[#6b4f2d]">{title}</span>
            <span className="mt-1 block text-xs text-[#8a7455]">当前筛选结果下的计算口径</span>
          </span>
          <span className="block space-y-2 text-xs leading-5 text-[#5b4a35]">
            {lines.map((line) => (
              <span key={line} className="block rounded-xl bg-[#f7efdc] px-3 py-2">
                {line}
              </span>
            ))}
          </span>
        </span>
      </span>
    </span>
  )
}

const TOTAL_INCOME_LINES = [
  '总收入只统计 INCOME + DEPOSIT 两类交易。',
  '不包含 TRANSFER_IN / TRANSFER_OUT，也不包含 INVESTMENT_PROFIT / INVESTMENT_LOSS。',
]

const TOTAL_EXPENSE_LINES = [
  '总支出只统计 CONSUMPTION + LOAN 两类交易。',
  '按绝对值汇总显示，因此支出金额始终展示为正数。',
]

const NET_AMOUNT_LINES = [
  '净额 = 总收入 - 总支出。',
  '总收入包含：收入（含定期利息）、存款、转入；总支出包含：消费、放贷、转出。',
  '投资收益/亏损不计入收支，归入"投资收益"指标。',
]

const TOTAL_AMOUNT_LINES = [
  '投资收益 = 当前筛选结果中投资收益 − 投资亏损 + 定期存款利息。',
  '与总览"各货币收益"口径一致；转账和日常收支不计入。',
]

export function TransactionTotalsDisplay({ totals }: TransactionTotalsProps) {
  const { totalIncome, totalExpense, netAmount, totalAmount } = totals

  return (
    <div className="px-6 py-3 border-b bg-muted/50">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        {/* 总收入 */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-foreground">
            总收入:
            <MetricHint title="总收入" lines={TOTAL_INCOME_LINES} />
          </span>
          <span className="font-bold text-green-700">¥{formatCurrencyForStats(totalIncome)}</span>
        </div>

        <span className="text-foreground">|</span>

        {/* 总支出 */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-foreground">
            总支出:
            <MetricHint title="总支出" lines={TOTAL_EXPENSE_LINES} />
          </span>
          <span className="font-bold text-red-700">¥{formatCurrencyForStats(totalExpense)}</span>
        </div>

        <span className="text-foreground">|</span>

        {/* 净额 */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-foreground">
            净额:
            <MetricHint title="净额" lines={NET_AMOUNT_LINES} />
          </span>
          <span className={`font-bold ${netAmount >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {netAmount >= 0 ? '+' : ''}¥{formatCurrencyForStats(netAmount)}
          </span>
        </div>

        <span className="text-foreground">|</span>

        {/* 投资收益（收益/亏损净额） */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 text-foreground">
            投资收益:
            <MetricHint title="投资收益" lines={TOTAL_AMOUNT_LINES} />
          </span>
          <span className={`font-bold ${totalAmount >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {totalAmount >= 0 ? '+' : ''}¥{formatCurrencyForStats(totalAmount)}
          </span>
        </div>
      </div>
    </div>
  )
}
