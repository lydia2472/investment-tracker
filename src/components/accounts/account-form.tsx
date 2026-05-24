'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
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
import { Input } from 'animal-island-ui'
import { Button } from 'animal-island-ui'
import { Textarea } from '@/components/ui/textarea'
import { ColorPicker } from '@/components/ui/color-picker'
import { AccountType } from '@/types'
import { cn } from '@/lib/utils'

// 本地 schema 定义，避免类型推断问题
const accountFormSchema = z.object({
  name: z.string().min(1, '账户名称必填'),
  type: z.nativeEnum(AccountType),
  initialBalance: z.number().min(0, '初始余额不能为负'),
  currency: z.string().min(1, '货币必填'),
  color: z.string().min(1, '颜色必填'),
  description: z.string().optional(),
})

export type AccountFormData = z.infer<typeof accountFormSchema>

const accountTypeOptions = [
  { value: AccountType.SECURITIES, label: '证券账户' },
  { value: AccountType.BANK, label: '银行账户' },
  { value: AccountType.CASH, label: '现金账户' },
  { value: AccountType.OTHER, label: '其他账户' },
]

const currencyOptions = [
  { value: 'CNY', label: 'CNY (人民币)', symbol: '¥' },
  { value: 'USD', label: 'USD (美元)', symbol: '$' },
  { value: 'EUR', label: 'EUR (欧元)', symbol: '€' },
  { value: 'HKD', label: 'HKD (港币)', symbol: 'HK$' },
  { value: 'JPY', label: 'JPY (日元)', symbol: '¥' },
]

interface AccountFormProps {
  onSubmit: (data: AccountFormData) => void
  onCancel: () => void
  isSubmitting?: boolean
}

export function AccountForm({ onSubmit, onCancel, isSubmitting = false }: AccountFormProps) {
  const form = useForm<AccountFormData>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: '',
      type: AccountType.BANK,
      initialBalance: 0,
      currency: 'CNY',
      color: '#3b82f6',
      description: '',
    },
  })

  const selectedCurrency = form.watch('currency')

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
          name="color"
          render={({ field }) => (
            <FormItem>
              <FormLabel>账户颜色</FormLabel>
              <FormControl>
                <ColorPicker
                  value={field.value}
                  onChange={field.onChange}
                />
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
                <Textarea
                  placeholder="添加备注信息..."
                  className="resize-none"
                  {...field}
                />
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
              <>创建中...</>
            ) : (
              <>创建账户</>
            )}
          </Button>
        </div>
      </form>
    </Form>
  )
}
