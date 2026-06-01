'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ArrowUpIcon, ArrowDownIcon } from '@/lib/components/icon-adapter'
import { cn } from '@/lib/utils/cn'
import { formatCurrencyCompact, formatPercentage } from '@/lib/utils/formatters'

interface AccountProfit {
  accountId: string
  accountName: string
  totalProfit: number
  profitRate: number
  startBalance: number
  endBalance: number
}

interface ProfitSummaryTableProps {
  accountProfits: AccountProfit[]
}

export function ProfitSummaryTable({ accountProfits }: ProfitSummaryTableProps) {
  if (accountProfits.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">收益汇总表</h3>
        <div className="text-center py-8 text-muted-foreground">暂无数据</div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="text-lg font-semibold mb-4">收益汇总表</h3>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>账户名称</TableHead>
            <TableHead className="text-right">收益金额</TableHead>
            <TableHead className="text-right">收益率</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {accountProfits.map((account) => {
            const isPositive = account.totalProfit >= 0

            return (
              <TableRow key={account.accountId}>
                <TableCell className="font-medium">{account.accountName}</TableCell>
                <TableCell
                  className={cn(
                    'text-right font-bold',
                    isPositive ? 'text-[#5ec850]' : 'text-[#ff6464]'
                  )}
                >
                  <div className="flex items-center justify-end gap-1">
                    {isPositive ? (
                      <ArrowUpIcon className="h-4 w-4" />
                    ) : (
                      <ArrowDownIcon className="h-4 w-4" />
                    )}
                    {formatCurrencyCompact(account.totalProfit)}
                  </div>
                </TableCell>
                <TableCell
                  className={cn(
                    'text-right font-bold',
                    isPositive ? 'text-[#5ec850]' : 'text-[#ff6464]'
                  )}
                >
                  {isPositive ? '+' : ''}
                  {formatPercentage(account.profitRate)}
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
