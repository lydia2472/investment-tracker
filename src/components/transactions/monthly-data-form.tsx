'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Input , Button } from 'animal-island-ui'
import { format, endOfMonth, isValid, isLastDayOfMonth } from 'date-fns'
import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { SearchableAccountSelect } from '@/components/ui/searchable-account-select'
import { Textarea } from '@/components/ui/textarea'
import { InfoIcon } from '@/lib/components/icon-adapter'
import { MonthlyDataService } from '@/lib/services/monthly-data-service'
import { useAccountStore } from '@/lib/stores'
import { useSnapshotStore } from '@/lib/stores/snapshot-store'
import { cn } from '@/lib/utils/cn'
import { formatCurrency } from '@/lib/utils/formatters'

/**
 * 月末数据表单 Schema
 */
const monthlyDataSchema = z.object({
  accountId: z.string().min(1, '请选择账户'),
  snapshotAmount: z.number().min(0, '快照金额必须大于等于 0'),
  investmentAmount: z.number().min(0, '投资金额必须大于等于 0').optional().or(z.literal(0)),
  snapshotDate: z.date(),
  note: z.string().optional(),
})

export type MonthlyDataFormData = z.infer<typeof monthlyDataSchema>

interface MonthlyDataFormProps {
  onSubmit: (result: any) => void
  isSubmitting?: boolean
}

export function MonthlyDataForm({ onSubmit, isSubmitting = false }: MonthlyDataFormProps) {
  const accounts = useAccountStore((state) => state.accounts)

  const form = useForm<MonthlyDataFormData>({
    resolver: zodResolver(monthlyDataSchema),
    defaultValues: {
      accountId: '',
      snapshotAmount: 0,
      investmentAmount: 0,
      snapshotDate: endOfMonth(new Date()),
      note: '',
    },
  })

  const selectedAccountId = form.watch('accountId')
  const snapshotAmount = form.watch('snapshotAmount')
  const investmentAmount = form.watch('investmentAmount')
  const snapshotDate = form.watch('snapshotDate')

  // 预览计算
  const [previewData, setPreviewData] = useState<{
    previousSnapshot: number | null
    calculatedProfit: number | null
    hasPreviousSnapshot: boolean
    isFirstMonth: boolean
    accountInitialBalance?: number
  }>({
    previousSnapshot: null,
    calculatedProfit: null,
    hasPreviousSnapshot: false,
    isFirstMonth: false,
    accountInitialBalance: undefined,
  })

  // 当账户、金额或日期改变时，更新预览
  useEffect(() => {
    if (!selectedAccountId || !snapshotAmount || snapshotAmount <= 0) {
      setPreviewData({
        previousSnapshot: null,
        calculatedProfit: null,
        hasPreviousSnapshot: false,
        isFirstMonth: false,
        accountInitialBalance: undefined,
      })
      return
    }

    const previousSnapshot = useSnapshotStore
      .getState()
      .getPreviousMonthSnapshot(selectedAccountId, snapshotDate)

    const hasPreviousSnapshot = !!previousSnapshot
    const isFirstMonth = !hasPreviousSnapshot

    let calculatedProfit: number | null = null
    let accountInitialBalance: number | undefined = undefined

    if (isFirstMonth) {
      // 首月收益计算
      const account = accounts.find((acc) => acc.id === selectedAccountId)

      if (account) {
        accountInitialBalance = account.initialBalance
        calculatedProfit = MonthlyDataService.calculateFirstMonthProfit(
          snapshotAmount,
          account.initialBalance,
          investmentAmount || 0
        )
      }
    } else if (hasPreviousSnapshot && previousSnapshot) {
      // 非首月收益计算
      calculatedProfit = MonthlyDataService.calculateProfit(
        snapshotAmount,
        previousSnapshot.balance,
        investmentAmount || 0
      )
    }

    setPreviewData({
      previousSnapshot: hasPreviousSnapshot ? previousSnapshot.balance : null,
      calculatedProfit,
      hasPreviousSnapshot,
      isFirstMonth,
      accountInitialBalance,
    })
  }, [selectedAccountId, snapshotAmount, investmentAmount, snapshotDate, accounts])

  const handleSubmit = async (data: MonthlyDataFormData) => {
    try {
      // 提示用户建议选择月末日期（非强制）
      // 不再阻止提交，仅做友好提示
      if (!isLastDayOfMonth(data.snapshotDate)) {
        // 可选：显示友好提示（不阻止）
        console.log(`当前日期 ${format(data.snapshotDate, 'yyyy年MM月dd日')} 不是月末，建议选择 ${format(endOfMonth(data.snapshotDate), 'yyyy年MM月dd日')}`)
      }

      // 检查是否已存在该月的快照
      const existingSnapshot = MonthlyDataService.getSnapshotForMonth(
        data.accountId,
        data.snapshotDate
      )
      if (existingSnapshot) {
        toast.error('该月已存在快照', {
          description: `${format(data.snapshotDate, 'yyyy年MM月')}已有一个快照，如需修改请先删除原有快照`,
        })
        return
      }

      console.log(`\n[月末数据表单] ========== 提交数据 ==========`)
      console.log(`  账户ID: ${data.accountId}`)
      console.log(`  快照金额: ${data.snapshotAmount}`)
      console.log(`  投资金额: ${data.investmentAmount || 0}`)
      console.log(`  快照日期: ${data.snapshotDate.toLocaleDateString('zh-CN')}`)

      // 调用月末数据处理服务
      const result = MonthlyDataService.processMonthlyData({
        accountId: data.accountId,
        snapshotAmount: data.snapshotAmount,
        investmentAmount: data.investmentAmount,
        snapshotDate: data.snapshotDate,
        note: data.note,
      })

      // 显示成功提示
      const profitMessage =
        result.calculatedProfit !== undefined
          ? `\n收益: ${result.calculatedProfit > 0 ? '+' : ''}${formatCurrency(result.calculatedProfit)}`
          : ''

      toast.success('月末数据记录成功', {
        description: `快照金额: ${formatCurrency(result.snapshot.balance)}${profitMessage}`,
      })

      onSubmit(result)

      // 重置表单
      form.reset()
    } catch (error) {
      console.error('[月末数据表单] 提交失败:', error)
      toast.error('提交失败', {
        description: error instanceof Error ? error.message : '请稍后重试',
      })
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* 账户选择 */}
        <FormField
          control={form.control}
          name="accountId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>账户</FormLabel>
              <SearchableAccountSelect
                value={field.value}
                onChange={field.onChange}
                accounts={accounts}
                placeholder="选择账户"
              />
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 快照金额 */}
        <FormField
          control={form.control}
          name="snapshotAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                月末快照金额
                <span className="text-destructive ml-1">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground mt-1">该账户在本月末的余额</p>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 投资金额 */}
        <FormField
          control={form.control}
          name="investmentAmount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>本月投资金额（可选）</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground mt-1">
                本月新增的投资金额，用于计算实际收益
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 快照日期 */}
        <FormField
          control={form.control}
          name="snapshotDate"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                快照日期
                <span className="text-destructive ml-1">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  type="date"
                  value={(() => {
                    const dateValue =
                      field.value instanceof Date ? field.value : new Date(field.value)
                    return isValid(dateValue)
                      ? format(dateValue, 'yyyy-MM-dd')
                      : format(new Date(), 'yyyy-MM-dd')
                  })()}
                  onChange={(e) => field.onChange(new Date(e.target.value))}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground mt-1">
                {!isLastDayOfMonth(field.value) ? (
                  <span className="text-blue-600">
                    💡 建议：选择月末日期以便于收益计算（{format(endOfMonth(field.value), 'yyyy年MM月dd日')}）
                  </span>
                ) : (
                  <span className="text-green-600">✓ 已设置为月末</span>
                )}
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 收益预览 */}
        {(previewData.hasPreviousSnapshot || previewData.isFirstMonth) && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-900 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-900 dark:text-blue-100">
              <InfoIcon className="h-4 w-4" />
              <span>{previewData.isFirstMonth ? '首月收益预览' : '收益预览'}</span>
            </div>
            <div className="space-y-2 text-sm">
              {previewData.isFirstMonth ? (
                // 首月显示
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">账户初始余额</span>
                    <span className="font-medium">
                      {formatCurrency(previewData.accountInitialBalance || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">本月快照</span>
                    <span className="font-medium">{formatCurrency(snapshotAmount || 0)}</span>
                  </div>
                </>
              ) : (
                // 非首月显示
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">上月快照</span>
                    <span className="font-medium">
                      {formatCurrency(previewData.previousSnapshot || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">本月快照</span>
                    <span className="font-medium">{formatCurrency(snapshotAmount || 0)}</span>
                  </div>
                </>
              )}
              {(investmentAmount || 0) > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">本月投资</span>
                  <span className="font-medium">{formatCurrency(investmentAmount || 0)}</span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-blue-200 dark:border-blue-800">
                <span className="font-semibold text-foreground">
                  {previewData.isFirstMonth ? '首月收益' : '预计收益'}
                </span>
                <span
                  className={cn(
                    'font-bold text-lg',
                    (previewData.calculatedProfit || 0) > 0
                      ? 'text-green-600'
                      : (previewData.calculatedProfit || 0) < 0
                        ? 'text-red-600'
                        : 'text-muted-foreground'
                  )}
                >
                  {(previewData.calculatedProfit || 0) > 0 ? '+' : ''}
                  {formatCurrency(previewData.calculatedProfit || 0)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* 备注 */}
        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>备注（可选）</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="添加备注信息..."
                  className="resize-none"
                  value={field.value || ''}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 提交按钮 */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
          <Button
            htmlType="submit"
            type="primary"
            disabled={isSubmitting}
            className="w-full sm:w-auto bg-[#5ec850] border-2 border-[#5ec850]"
          >
            {isSubmitting ? '提交中...' : '记录月末数据'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
