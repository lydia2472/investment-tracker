'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Input , Button } from 'animal-island-ui'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FixedDepositRenewalService } from '@/lib/services/fixed-deposit-renewal-service'
import { useAccountStore } from '@/lib/stores/account-store'
import { InterestPaymentFrequency } from '@/types'

import type { Account, FixedDepositConfig } from '@/types'

// 续存配置 Schema
const renewalFormSchema = z.object({
  startDate: z.date(),
  maturityDate: z.date(),
  interestRate: z.number().min(0).max(100, '年利率必须在0-100之间'),
  interestPaymentFrequency: z.nativeEnum(InterestPaymentFrequency),
})

export type RenewalFormData = z.infer<typeof renewalFormSchema>

interface RenewalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fromAccountId: string
  toAccountId: string
  amount: number
  onSuccess?: () => void
}

export function RenewalDialog({
  open,
  onOpenChange,
  fromAccountId,
  toAccountId,
  amount,
  onSuccess,
}: RenewalDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const fromAccount = useAccountStore((state) => state.getAccount(fromAccountId))
  const toAccount = useAccountStore((state) => state.getAccount(toAccountId))

  // 预填充上次配置
  const lastConfig = toAccount?.fixedDepositConfig
  const defaultValues: RenewalFormData = {
    startDate: new Date(),
    maturityDate: lastConfig
      ? calculateDefaultMaturityDate(lastConfig)
      : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 默认1年后
    interestRate: lastConfig?.interestRate || 3.5,
    interestPaymentFrequency:
      lastConfig?.interestPaymentFrequency || InterestPaymentFrequency.MATURITY,
  }

  const form = useForm<RenewalFormData>({
    resolver: zodResolver(renewalFormSchema),
    defaultValues,
  })

  const handleSubmit = async (data: RenewalFormData) => {
    setIsSubmitting(true)

    // 诊断日志：输出表单提交的数据
    console.log(`\n[续存对话框] 提交续存配置:`)
    console.log(`  fromAccountId: ${fromAccountId}`)
    console.log(`  toAccountId: ${toAccountId}`)
    console.log(`  amount: ${amount}`)
    console.log(
      `  startDate:`,
      data.startDate instanceof Date ? data.startDate.toLocaleDateString('zh-CN') : data.startDate
    )
    console.log(
      `  maturityDate:`,
      data.maturityDate instanceof Date
        ? data.maturityDate.toLocaleDateString('zh-CN')
        : data.maturityDate
    )
    console.log(`  interestRate: ${data.interestRate}`)
    console.log(`  interestPaymentFrequency: ${data.interestPaymentFrequency}`)

    try {
      // 调用续存服务
      FixedDepositRenewalService.renewFixedDeposit({
        fromAccountId,
        toAccountId,
        amount,
        newConfig: data,
        transferDate: new Date(),
      })

      toast.success('定期存款续存成功', {
        description: `已从 ${fromAccount?.name || '未知账户'} 续存 ${amount.toFixed(2)} 到 ${toAccount?.name || '未知账户'}`,
      })

      onSuccess?.()
      onOpenChange(false)
    } catch (error) {
      console.error('续存失败:', error)
      toast.error('续存失败', {
        description: '请检查输入信息后重试',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 根据上次期限计算新的到期日（智能推荐）
  function calculateDefaultMaturityDate(lastConfig: FixedDepositConfig): Date {
    const lastStart = new Date(lastConfig.startDate)
    const lastMaturity = new Date(lastConfig.maturityDate)
    const duration = lastMaturity.getTime() - lastStart.getTime()
    return new Date(Date.now() + duration)
  }

  // 根据起息日和期限计算到期日
  function handleStartDateChange(date: Date) {
    const maturityDate = form.getValues('maturityDate')
    const lastConfig = toAccount?.fixedDepositConfig

    if (lastConfig && maturityDate) {
      const lastStart = new Date(lastConfig.startDate)
      const lastMaturity = new Date(lastConfig.maturityDate)
      const duration = lastMaturity.getTime() - lastStart.getTime()

      // 更新到期日，保持相同的期限
      const newMaturityDate = new Date(date.getTime() + duration)
      form.setValue('maturityDate', newMaturityDate)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>定期存款续存配置</DialogTitle>
          <DialogDescription>
            配置续存参数，系统将自动清理旧快照并重新生成新月度快照
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* 续存信息 */}
          <div className="rounded-lg bg-muted p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">转出账户:</span>
              <span className="font-medium">{fromAccount?.name || '未知账户'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">转入账户:</span>
              <span className="font-medium">{toAccount?.name || '未知账户'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">续存金额:</span>
              <span className="font-bold text-primary">{amount.toFixed(2)} 元</span>
            </div>
            {lastConfig && (
              <div className="pt-2 border-t space-y-1">
                <p className="text-xs text-muted-foreground">上次配置（预填充）:</p>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">上次本金:</span>
                  <span>{lastConfig.principal.toFixed(2)} 元</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">上次利率:</span>
                  <span>{lastConfig.interestRate}%</span>
                </div>
              </div>
            )}
          </div>

          {/* 续存配置表单 */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>新起息日</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={
                            field.value ? new Date(field.value).toISOString().split('T')[0] : ''
                          }
                          onChange={(e) => {
                            const newDate = e.target.value ? new Date(e.target.value) : new Date()
                            field.onChange(newDate)
                            handleStartDateChange(newDate)
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="maturityDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>新到期日</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          value={
                            field.value ? new Date(field.value).toISOString().split('T')[0] : ''
                          }
                          onChange={(e) =>
                            field.onChange(e.target.value ? new Date(e.target.value) : undefined)
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="interestRate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>年利率 (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="3.5"
                        {...field}
                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="interestPaymentFrequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>付息方式</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择付息方式" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={InterestPaymentFrequency.MONTHLY}>按月付息</SelectItem>
                        <SelectItem value={InterestPaymentFrequency.QUARTERLY}>
                          按季度付息
                        </SelectItem>
                        <SelectItem value={InterestPaymentFrequency.ANNUALLY}>按年付息</SelectItem>
                        <SelectItem value={InterestPaymentFrequency.MATURITY}>
                          到期一次还本付息
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter className="gap-2">
                <Button type="default" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                  取消
                </Button>
                <Button
                  type="primary"
                  htmlType="submit"
                  disabled={isSubmitting}
                  className="bg-[#5ec850]"
                >
                  {isSubmitting ? '续存中...' : '确认续存'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
