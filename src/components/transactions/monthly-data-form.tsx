'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input } from 'animal-island-ui'
import { endOfMonth, format, isLastDayOfMonth, isValid } from 'date-fns'
import { useEffect, useState } from 'react'
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
import {
  MonthlyDataService,
  type MonthlyInvestmentSource,
} from '@/lib/services/monthly-data-service'
import { useAccountStore, useTransactionStore } from '@/lib/stores'
import { useSnapshotStore } from '@/lib/stores/snapshot-store'
import { cn } from '@/lib/utils/cn'
import { formatCurrency } from '@/lib/utils/formatters'
import { calculateGoldSnapshotValue, getGoldSnapshotValue } from '@/lib/utils/gold-profit-helpers'
import { AccountType } from '@/types'

const monthlyDataSchema = z.object({
  accountId: z.string().min(1, '请选择账户'),
  snapshotAmount: z.number().min(0, '快照金额必须大于等于 0'),
  investmentAmount: z.number().min(0, '投资金额必须大于等于 0').optional().or(z.literal(0)),
  goldMarketPrice: z.number().min(0, '市场均价必须大于等于 0').optional().or(z.literal(0)),
  goldGrams: z.number().min(0, '本月购买克数必须大于等于 0').optional().or(z.literal(0)),
  goldPurchaseAmount: z.number().min(0, '购买金额必须大于等于 0').optional().or(z.literal(0)),
  snapshotDate: z.date(),
  note: z.string().optional(),
})

export type MonthlyDataFormData = z.infer<typeof monthlyDataSchema>

interface MonthlyDataFormProps {
  onSubmit: (result: any) => void
  isSubmitting?: boolean
}

// 月末数据通常录的是"上个月"的月末（因为本月还没结束）。
// 例如：7月初录入的是6月30日的数据。这样默认日期就能匹配到上个月的转账记录。
const getLastMonthEnd = (): Date => {
  const now = new Date()
  return endOfMonth(new Date(now.getFullYear(), now.getMonth() - 1, 1))
}

const defaultValues: MonthlyDataFormData = {
  accountId: '',
  snapshotAmount: 0,
  investmentAmount: 0,
  goldMarketPrice: 0,
  goldGrams: 0,
  goldPurchaseAmount: 0,
  snapshotDate: getLastMonthEnd(),
  note: '',
}

export function MonthlyDataForm({ onSubmit, isSubmitting = false }: MonthlyDataFormProps) {
  const accounts = useAccountStore((state) => state.accounts)
  const transactions = useTransactionStore((state) => state.transactions)

  const form = useForm<MonthlyDataFormData>({
    resolver: zodResolver(monthlyDataSchema),
    defaultValues,
  })

  const selectedAccountId = form.watch('accountId')
  const snapshotAmount = form.watch('snapshotAmount') || 0
  const investmentAmount = form.watch('investmentAmount') || 0
  const goldMarketPrice = form.watch('goldMarketPrice') || 0
  const goldGrams = form.watch('goldGrams') || 0 // 本月购买克数（增量）
  const goldPurchaseAmount = form.watch('goldPurchaseAmount') || 0
  const snapshotDate = form.watch('snapshotDate')

  const selectedAccount = accounts.find((account) => account.id === selectedAccountId)
  const isGoldSelected = selectedAccount?.type === AccountType.GOLD

  // 上期累计克数：从上月快照取（只买不卖场景下，克数只增不减）
  const previousSnapshotForGrams = useSnapshotStore(
    (state) =>
      selectedAccountId
        ? state.getPreviousMonthSnapshot(selectedAccountId, snapshotDate)
        : null
  )
  const previousCumulativeGrams = previousSnapshotForGrams?.goldGrams ?? 0
  // 累计总克数 = 上期累计 + 本月新增（goldGrams 现在是增量）
  const cumulativeGrams = isGoldSelected ? previousCumulativeGrams + goldGrams : 0

  const derivedGoldSnapshotAmount =
    isGoldSelected && goldMarketPrice > 0
      ? calculateGoldSnapshotValue(goldMarketPrice, cumulativeGrams)
      : 0
  const effectiveSnapshotAmount = isGoldSelected ? derivedGoldSnapshotAmount : snapshotAmount
  const effectiveInvestmentAmount = isGoldSelected ? goldPurchaseAmount : investmentAmount

  const [previewData, setPreviewData] = useState<{
    previousSnapshot: number | null
    calculatedProfit: number | null
    hasPreviousSnapshot: boolean
    isFirstMonth: boolean
    accountInitialBalance?: number
    investmentSources: MonthlyInvestmentSource[]
  }>({
    previousSnapshot: null,
    calculatedProfit: null,
    hasPreviousSnapshot: false,
    isFirstMonth: false,
    accountInitialBalance: undefined,
    investmentSources: [],
  })

  useEffect(() => {
    if (isGoldSelected) {
      form.setValue('snapshotAmount', derivedGoldSnapshotAmount, {
        shouldDirty: false,
        shouldValidate: true,
      })
      form.setValue('investmentAmount', goldPurchaseAmount, {
        shouldDirty: false,
        shouldValidate: true,
      })
    }

    // 当月投资金额统计不依赖快照金额，先查询并更新（即使快照金额还没填也能显示转账来源）。
    // 这样新建快照时，用户填完账户和日期就能立刻看到"已识别的资金来源"。
    let investmentSummary = { totalAmount: 0, sources: [] as Array<{ accountId: string | null; accountName: string; amount: number; transactionCount: number }> }
    if (selectedAccountId) {
      investmentSummary = MonthlyDataService.getInvestmentSummary(
        selectedAccountId,
        snapshotDate
      )

      // 黄金账户和普通账户一样：当月投资金额来自转账记录自动统计，
      // 无条件更新（不再依赖 isDirty 判断，因为黄金投资金额不需要用户手动填写）。
      form.setValue('investmentAmount', investmentSummary.totalAmount, {
        shouldDirty: false,
        shouldValidate: true,
      })
      form.setValue('goldPurchaseAmount', investmentSummary.totalAmount, {
        shouldDirty: false,
        shouldValidate: true,
      })
    }

    if (!selectedAccountId || effectiveSnapshotAmount <= 0) {
      form.setValue('investmentAmount', selectedAccountId ? investmentSummary.totalAmount : 0, { shouldDirty: false, shouldValidate: true })
      setPreviewData({
        previousSnapshot: null,
        calculatedProfit: null,
        hasPreviousSnapshot: false,
        isFirstMonth: false,
        accountInitialBalance: undefined,
        investmentSources: investmentSummary.sources,
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
    // 黄金账户的当月购买金额来自转账记录（用户先在普通交易里从其他账户转入黄金账户），
    // 不需要手动填写，直接用 investmentSummary.totalAmount（从转账统计）。
    const investmentForPreview = investmentSummary.totalAmount

    if (isFirstMonth && selectedAccount) {
      // 首月不计算收益：没有上月快照作为对比基数，用 initialBalance 当基数算出的
      // 收益不合理。首月只创建快照，calculatedProfit 保持为 0（预览显示"首月不计算收益"）。
      accountInitialBalance = selectedAccount.initialBalance
      calculatedProfit = 0
    } else if (hasPreviousSnapshot && previousSnapshot) {
      const previousValue = isGoldSelected
        ? getGoldSnapshotValue(previousSnapshot)
        : previousSnapshot.balance
      calculatedProfit = MonthlyDataService.calculateProfit(
        effectiveSnapshotAmount,
        previousValue,
        investmentForPreview
      )
    }

    setPreviewData({
      previousSnapshot: previousSnapshot
        ? isGoldSelected
          ? getGoldSnapshotValue(previousSnapshot)
          : previousSnapshot.balance
        : null,
      calculatedProfit,
      hasPreviousSnapshot,
      isFirstMonth,
      accountInitialBalance,
      investmentSources: investmentSummary.sources,
    })
  }, [
    accounts,
    derivedGoldSnapshotAmount,
    effectiveSnapshotAmount,
    form,
    goldPurchaseAmount,
    isGoldSelected,
    selectedAccount,
    selectedAccountId,
    snapshotDate,
    transactions,
  ])

  const handleSubmit = async (data: MonthlyDataFormData) => {
    try {
      if (!isLastDayOfMonth(data.snapshotDate)) {
        console.log(
          `当前日期 ${format(data.snapshotDate, 'yyyy年MM月dd日')} 不是月末，建议选择 ${format(endOfMonth(data.snapshotDate), 'yyyy年MM月dd日')}`
        )
      }

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

      const account = accounts.find((item) => item.id === data.accountId)
      const isGold = account?.type === AccountType.GOLD
      const submittedSnapshotAmount = isGold ? derivedGoldSnapshotAmount : data.snapshotAmount

      if (isGold && (!data.goldMarketPrice || data.goldMarketPrice <= 0)) {
        toast.error('请填写黄金市场均价')
        return
      }

      if (isGold && data.goldGrams === undefined) {
        toast.error('请填写本月购买克数')
        return
      }

      console.log(`\n[月末数据表单] ========== 提交数据 ==========`)
      console.log(`  账户ID: ${data.accountId}`)
      console.log(`  快照金额: ${submittedSnapshotAmount}`)
      console.log(
        `  投资金额: ${isGold ? data.goldPurchaseAmount || 0 : data.investmentAmount || 0}`
      )
      console.log(`  快照日期: ${data.snapshotDate.toLocaleDateString('zh-CN')}`)

      const result = MonthlyDataService.processMonthlyData({
        accountId: data.accountId,
        snapshotAmount: submittedSnapshotAmount,
        snapshotDate: data.snapshotDate,
        note: data.note,
        goldMarketPrice: isGold ? data.goldMarketPrice : undefined,
        // 存入快照的必须是"累计克数"（只买不卖 = 上期累计 + 本月新增）
        goldGrams: isGold ? cumulativeGrams : undefined,
        // 黄金购买金额来自转账记录统计，不需要用户手动填写
        goldPurchaseAmount: isGold ? data.goldPurchaseAmount || 0 : undefined,
      })

      const profitMessage =
        result.calculatedProfit !== undefined
          ? `\n收益: ${result.calculatedProfit > 0 ? '+' : ''}${formatCurrency(result.calculatedProfit)}`
          : ''

      toast.success('月末数据记录成功', {
        description: `快照金额: ${formatCurrency(result.snapshot.balance)}${profitMessage}`,
      })

      onSubmit(result)
      form.reset(defaultValues)
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

        {isGoldSelected && (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="goldMarketPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      当月市场均价（元/克）
                      <span className="text-destructive ml-1">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="例如 620"
                        value={field.value ?? ''}
                        onChange={(event) => field.onChange(parseFloat(event.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="goldGrams"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      本月购买克数
                      <span className="text-destructive ml-1">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.0001"
                        min="0"
                        placeholder="例如 5（本月新买的克数）"
                        value={field.value ?? ''}
                        onChange={(event) => field.onChange(parseFloat(event.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
              {previousCumulativeGrams > 0 && (
                <div className="mb-1">
                  上期累计 {previousCumulativeGrams.toFixed(4)} 克 + 本月新增{' '}
                  {goldGrams.toLocaleString('zh-CN', { maximumFractionDigits: 4 })} 克 = 累计{' '}
                  {cumulativeGrams.toLocaleString('zh-CN', { maximumFractionDigits: 4 })} 克
                </div>
              )}
              黄金快照金额自动计算：{formatCurrency(goldMarketPrice)} ×{' '}
              {cumulativeGrams.toLocaleString('zh-CN', { maximumFractionDigits: 4 })} 克(累计) ={' '}
              <span className="font-semibold">{formatCurrency(derivedGoldSnapshotAmount)}</span>
            </div>
          </>
        )}

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
                  readOnly={isGoldSelected}
                  disabled={isGoldSelected}
                  value={field.value ?? ''}
                  onChange={(event) => field.onChange(parseFloat(event.target.value) || 0)}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground mt-1">
                {isGoldSelected
                  ? '黄金账户的快照金额由市场均价 × 累计克数自动生成'
                  : '该账户在本月末的余额'}
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name={isGoldSelected ? 'goldPurchaseAmount' : 'investmentAmount'}
          render={({ field }) => (
            <FormItem>
              <FormLabel>当月购买金额（来自转账记录）</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  readOnly
                  disabled
                  value={field.value ?? ''}
                  onChange={(event) => field.onChange(parseFloat(event.target.value) || 0)}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground mt-1">
                自动汇总本月转入到该账户的转账金额。若要新增投入，请先在"普通交易"里记录从他行转账至本账户。
              </p>
              {previewData.investmentSources.length > 0 ? (
                <div className="mt-2 rounded-lg border border-blue-200/70 bg-blue-50/70 p-3 text-xs text-blue-900">
                  <div className="font-medium">已识别的资金来源</div>
                  <div className="mt-2 space-y-1">
                    {previewData.investmentSources.map((source) => (
                      <div
                        key={`${source.accountId ?? 'unknown'}-${source.accountName}`}
                        className="flex items-center justify-between gap-3"
                      >
                        <span>
                          {source.accountName}
                          {source.transactionCount > 1 ? ` (${source.transactionCount} 笔)` : ''}
                        </span>
                        <span className="font-semibold">{formatCurrency(source.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                selectedAccountId && (
                  <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    当前月份未识别到该账户的转入记录，本月购买金额按 0 处理。
                  </div>
                )
              )}
              <FormMessage />
            </FormItem>
          )}
        />

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
                  onChange={(event) => field.onChange(new Date(event.target.value))}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground mt-1">
                {!isLastDayOfMonth(field.value) ? (
                  <span className="text-blue-600">
                    建议：选择月末日期以便于收益计算（
                    {format(endOfMonth(field.value), 'yyyy年MM月dd日')}）
                  </span>
                ) : (
                  <span className="text-green-600">已设置为月末</span>
                )}
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        {(previewData.hasPreviousSnapshot || previewData.isFirstMonth) && (
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-200 dark:border-blue-900 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-900 dark:text-blue-100">
              <InfoIcon className="h-4 w-4" />
              <span>{previewData.isFirstMonth ? '首月收益预览' : '收益预览'}</span>
            </div>
            <div className="space-y-2 text-sm">
              {previewData.isFirstMonth ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">账户初始余额</span>
                    <span className="font-medium">
                      {formatCurrency(previewData.accountInitialBalance || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">本月快照</span>
                    <span className="font-medium">{formatCurrency(effectiveSnapshotAmount)}</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">上期快照</span>
                    <span className="font-medium">
                      {formatCurrency(previewData.previousSnapshot || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">本月快照</span>
                    <span className="font-medium">{formatCurrency(effectiveSnapshotAmount)}</span>
                  </div>
                </>
              )}
              {effectiveInvestmentAmount > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    {isGoldSelected ? '当月购买金额' : '本月投资'}
                  </span>
                  <span className="font-medium">{formatCurrency(effectiveInvestmentAmount)}</span>
                </div>
              )}
              <div className="rounded-lg bg-white/60 p-2 text-xs text-blue-900 dark:bg-blue-950/30 dark:text-blue-100">
                {isGoldSelected
                  ? '黄金收益 = 当月市场均价 × 累计克数 - 上期黄金市值 - 当月购买金额'
                  : '普通收益 = 本月快照 - 上期快照/初始余额 - 本月投资'}
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-blue-200 dark:border-blue-800">
                <span className="font-semibold text-foreground">
                  {previewData.isFirstMonth ? '首月收益' : '预计收益'}
                </span>
                {previewData.isFirstMonth ? (
                  <span className="text-sm text-muted-foreground">—（首月不计算收益）</span>
                ) : (
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
                )}
              </div>
            </div>
          </div>
        )}

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
