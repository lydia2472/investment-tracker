'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Input , Button } from 'animal-island-ui'
import { useForm } from 'react-hook-form'
import * as z from 'zod'

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { IconPicker } from '@/components/ui/icon-picker'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/utils/formatters'
import { getDefaultRiskLevel } from '@/lib/utils/risk-level-helpers'
import {
  AccountType,
  RiskLevel,
  FixedDepositConfig,
  InterestPaymentFrequency,
  EarlyWithdrawalRule,
} from '@/types'

// 本地 schema 定义，避免类型推断问题
const accountFormSchema = z
  .object({
    name: z.string().min(1, '账户名称必填'),
    type: z.nativeEnum(AccountType),
    initialBalance: z.number().min(0, '初始余额不能为负'),
    currency: z.string().min(1, '货币必填'),
    riskLevel: z.nativeEnum(RiskLevel),
    icon: z.string().optional(),
    description: z.string().optional(),
    // 定期存款配置（可选，当 type 为 FIXED_DEPOSIT 时使用）
    fixedDepositConfig: z
      .object({
        interestRate: z.number().min(0).max(100, '年利率必须在0-100之间'),
        startDate: z.date(),
        maturityDate: z.date(),
        interestPaymentFrequency: z.nativeEnum(InterestPaymentFrequency),
        principal: z.number().min(0, '本金不能为负'),
        autoRollOver: z.boolean(),
        earlyWithdrawalRule: z.nativeEnum(EarlyWithdrawalRule).optional(),
      })
      .optional(),
  })
  .refine(
    (data) => {
      // 当账户类型为定期存款时，必须填写配置
      if (data.type === AccountType.FIXED_DEPOSIT && !data.fixedDepositConfig) {
        return false
      }
      return true
    },
    {
      message: '定期存款账户必须填写配置信息',
      path: ['fixedDepositConfig'],
    }
  )

export type AccountFormData = z.infer<typeof accountFormSchema>

const accountTypeOptions = [
  { value: AccountType.SECURITIES, label: '证券账户' },
  { value: AccountType.BANK, label: '银行账户' },
  { value: AccountType.CASH, label: '现金账户' },
  { value: AccountType.FIXED_DEPOSIT, label: '定期存款' },
  { value: AccountType.FUND, label: '基金账户' },
  { value: AccountType.STOCK, label: '股票账户' },
  { value: AccountType.GOLD, label: '黄金账户' },
  { value: AccountType.OTHER, label: '其他账户' },
]

const currencyOptions = [
  { value: 'CNY', label: 'CNY (人民币)', symbol: '¥' },
  { value: 'USD', label: 'USD (美元)', symbol: '$' },
  { value: 'EUR', label: 'EUR (欧元)', symbol: '€' },
  { value: 'HKD', label: 'HKD (港币)', symbol: 'HK$' },
  { value: 'JPY', label: 'JPY (日元)', symbol: '¥' },
]

const riskLevelOptions = [
  { value: RiskLevel.HIGH, label: '高风险', description: '股票、基金等波动性大的投资' },
  { value: RiskLevel.MEDIUM, label: '中风险', description: '混合型投资、稳健理财' },
  { value: RiskLevel.LOW, label: '低风险', description: '银行存款、货币基金等' },
]

interface AccountFormProps {
  onSubmit: (data: AccountFormData) => void
  onCancel: () => void
  isSubmitting?: boolean
  mode?: 'create' | 'edit'
  defaultValues?: Partial<AccountFormData>
  currentBalance?: number // 仅在编辑模式下使用
}

export function AccountForm({
  onSubmit,
  onCancel,
  isSubmitting = false,
  mode = 'create',
  defaultValues,
  currentBalance,
}: AccountFormProps) {
  const form = useForm<AccountFormData>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: defaultValues || {
      name: '',
      type: AccountType.BANK,
      initialBalance: 0,
      currency: 'CNY',
      riskLevel: getDefaultRiskLevel(),
      icon: undefined,
      description: '',
    },
  })

  const selectedCurrency = form.watch('currency')
  const selectedAccountType = form.watch('type')

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>账户名称</FormLabel>
              <FormControl>
                <Input placeholder="输入账户名称" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>账户类型</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="选择账户类型" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {accountTypeOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="initialBalance"
          render={({ field }) => (
            <FormItem>
              <FormLabel>初始余额</FormLabel>
              <FormControl>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-muted-foreground">
                    {currencyOptions.find((c) => c.value === selectedCurrency)?.symbol || '¥'}
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    className="pl-7"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {mode === 'edit' && currentBalance !== undefined && (
          <div className="space-y-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              当前余额
            </label>
            <Input value={formatCurrency(currentBalance)} disabled className="bg-muted" />
            <p className="text-xs text-muted-foreground">余额通过交易记录自动更新</p>
          </div>
        )}

        <FormField
          control={form.control}
          name="currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>货币</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="选择货币" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {currencyOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="riskLevel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>风险等级</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="选择风险等级" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {riskLevelOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span className="font-medium">{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 定期存款配置 - 仅在账户类型为定期存款时显示 */}
        {selectedAccountType === AccountType.FIXED_DEPOSIT && (
          <div className="space-y-4 p-4 border-2 border-dashed border-muted rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              <div className="w-1 h-4 bg-yellow-500 rounded-full" />
              <h3 className="text-sm font-semibold text-foreground">定期存款配置</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fixedDepositConfig.principal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>本金金额</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="10000"
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
                name="fixedDepositConfig.interestRate"
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
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fixedDepositConfig.startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>起息日</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                        onChange={(e) =>
                          field.onChange(e.target.value ? new Date(e.target.value) : undefined)
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fixedDepositConfig.maturityDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>到期日</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
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
              name="fixedDepositConfig.interestPaymentFrequency"
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
                      <SelectItem value={InterestPaymentFrequency.QUARTERLY}>按季度付息</SelectItem>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="fixedDepositConfig.earlyWithdrawalRule"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>提前支取规则（可选）</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="选择提前支取规则" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={EarlyWithdrawalRule.FORBIDDEN}>禁止提前支取</SelectItem>
                        <SelectItem value={EarlyWithdrawalRule.WITH_PENALTY}>支付罚息</SelectItem>
                        <SelectItem value={EarlyWithdrawalRule.ALLOWED}>允许无罚息</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fixedDepositConfig.autoRollOver"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-md border p-3">
                    <div className="space-y-0.5">
                      <FormLabel>自动滚存</FormLabel>
                      <p className="text-xs text-muted-foreground">到期后自动续存</p>
                    </div>
                    <FormControl>
                      <input
                        type="checkbox"
                        checked={field.value || false}
                        onChange={field.onChange}
                        className="h-4 w-4 rounded border-gray-300"
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}

        <FormField
          control={form.control}
          name="icon"
          render={({ field }) => (
            <FormItem>
              <FormLabel>账户图标（可选）</FormLabel>
              <FormControl>
                <IconPicker value={field.value} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>备注（可选）</FormLabel>
              <FormControl>
                <Textarea placeholder="添加备注信息..." className="resize-none" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
          <Button
            htmlType="button"
            type="default"
            onClick={onCancel}
            disabled={isSubmitting}
            className={cn('w-full sm:w-auto', 'mt-2 sm:mt-0', 'border-2 border-[#5ec850]/50')}
          >
            取消
          </Button>
          <Button
            htmlType="submit"
            type="primary"
            disabled={isSubmitting}
            className="w-full sm:w-auto bg-[#5ec850]"
          >
            {isSubmitting ? (
              <>{mode === 'edit' ? '保存中...' : '创建中...'}</>
            ) : (
              <>{mode === 'edit' ? '保存更改' : '创建账户'}</>
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
