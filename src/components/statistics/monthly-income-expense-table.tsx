'use client'

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { MonthlyIncomeExpense } from '@/types'

interface MonthlyIncomeExpenseTableProps {
  data: MonthlyIncomeExpense[]
}

/**
 * 格式化货币显示
 */
function formatCurrency(amount: number): string {
  const absAmount = Math.abs(amount)
  const formatted = absAmount.toFixed(2)
  return amount >= 0 ? `¥${formatted}` : `-¥${formatted}`
}

/**
 * 获取净收支颜色
 */
function getNetFlowColor(amount: number): string {
  return amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
}

/**
 * 月度收支明细表格组件
 */
export function MonthlyIncomeExpenseTable({ data }: MonthlyIncomeExpenseTableProps) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-center text-muted-foreground">
        暂无数据
      </div>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px]">月份</TableHead>
            <TableHead className="text-right">收入</TableHead>
            <TableHead className="text-right">存款</TableHead>
            <TableHead className="text-right">投资收益</TableHead>
            <TableHead className="text-right">总收入</TableHead>
            <TableHead className="text-right">消费</TableHead>
            <TableHead className="text-right">放贷</TableHead>
            <TableHead className="text-right">投资亏损</TableHead>
            <TableHead className="text-right">总支出</TableHead>
            <TableHead className="text-right">净收支</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item) => (
            <TableRow key={`${item.year}-${item.month}`}>
              <TableCell className="font-medium">{item.monthLabel}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.income)}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.deposit)}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.investmentProfit)}</TableCell>
              <TableCell className="text-right font-semibold">{formatCurrency(item.totalIncome)}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.consumption)}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.loan)}</TableCell>
              <TableCell className="text-right">{formatCurrency(item.investmentLoss)}</TableCell>
              <TableCell className="text-right font-semibold">{formatCurrency(item.totalExpense)}</TableCell>
              <TableCell className={`text-right font-semibold ${getNetFlowColor(item.netFlow)}`}>
                {formatCurrency(item.netFlow)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
