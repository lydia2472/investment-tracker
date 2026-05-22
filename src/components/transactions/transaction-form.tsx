'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { useEffect } from 'react'
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
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { TransactionType, TransactionCategory } from '@/types'
import { useAccountStore } from '@/lib/stores'
import { format } from 'date-fns'
import { cn } from '@/lib/utils/cn'

// 本地 schema 定义，避免类型推断问题
const transactionFormSchema = z.object({
  accountId: z.string().min(1, '请选择账户'),
  type: z.nativeEnum(TransactionType),
  category: z.nativeEnum(TransactionCategory).optional(),
  amount: z.number().optional(),
  balance: z.number().optional(),
  fromAccountId: z.string().optional(),
  toAccountId: z.string().optional(),
  description: z.string().optional(),
  note: z.string().optional(),
  date: z.date(),
})

export type TransactionFormData = z.infer<typeof transactionFormSchema>

// 分类选项配置
const categoryOptions: Record<TransactionType, Array<{value: TransactionCategory, label: string}>> = {
  [TransactionType.INCOME]: [
    { value: TransactionCategory.DEPOSIT, label: '存款' },
    { value: TransactionCategory.INVESTMENT_GAIN, label: '投资收益' },
    { value: TransactionCategory.TRANSFER_IN, label: '转入' },
  ],
  [TransactionType.EXPENSE]: [
    { value: TransactionCategory.WITHDRAW, label: '取款' },
    { value: TransactionCategory.INVESTMENT_LOSS, label: '投资损失' },
    { value: TransactionCategory.TRANSFER_OUT, label: '转出' },
  ],
  [TransactionType.TRANSFER]: [],
  [TransactionType.SNAPSHOT]: [
    { value: TransactionCategory.SNAPSHOT, label: '余额快照' },
  ],
}

interface TransactionFormProps {
  mode: 'add' | 'edit'
  initialData?: Partial<TransactionFormData>
  onSubmit: (data: TransactionFormData) => void | Promise<void>
  onCancel: () => void
  isSubmitting?: boolean
}

export function TransactionForm({
  mode,
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: TransactionFormProps) {
  const accounts = useAccountStore((state) => state.accounts)

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      type: TransactionType.INCOME,
      date: new Date(),
      ...initialData,
    },
  })

  const selectedType = form.watch('type')

  // 当交易类型改变时，清空相关字段
  useEffect(() => {
    if (mode === 'add') {
      form.setValue('category', undefined)
      form.setValue('amount', undefined)
      form.setValue('balance', undefined)
      form.setValue('fromAccountId', undefined)
      form.setValue('toAccountId', undefined)
    }
  }, [selectedType, form, mode])

  const handleSubmit = async (data: TransactionFormData) => {
    await onSubmit(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* 账户选择（转账类型时不显示） */}
        {selectedType !== TransactionType.TRANSFER && (
          <FormField
            control={form.control}
            name="accountId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>账户</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="选择账户" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={account.id}>
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* 交易类型 */}
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>交易类型</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={mode === 'edit'}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="选择类型" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={TransactionType.INCOME}>收入</SelectItem>
                  <SelectItem value={TransactionType.EXPENSE}>支出</SelectItem>
                  <SelectItem value={TransactionType.TRANSFER}>转账</SelectItem>
                  <SelectItem value={TransactionType.SNAPSHOT}>快照</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 收入/支出类型字段 */}
        {(selectedType === TransactionType.INCOME || selectedType === TransactionType.EXPENSE) && (
          <>
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>分类</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择分类" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categoryOptions[selectedType].map((option) => (
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
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>金额</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        {/* 转账类型字段 */}
        {selectedType === TransactionType.TRANSFER && (
          <>
            <FormField
              control={form.control}
              name="fromAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>转出账户</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择转出账户" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
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
              name="toAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>转入账户</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="选择转入账户" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {accounts.map((account) => (
                        <SelectItem key={account.id} value={account.id}>
                          {account.name}
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
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>转账金额</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      {...field}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        )}

        {/* 快照类型字段 */}
        {selectedType === TransactionType.SNAPSHOT && (
          <FormField
            control={form.control}
            name="balance"
            render={({ field }) => (
              <FormItem>
                <FormLabel>当前余额</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...field}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* 日期选择 */}
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>日期</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  value={format(field.value instanceof Date ? field.value : new Date(field.value), 'yyyy-MM-dd')}
                  onChange={(e) => field.onChange(new Date(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 描述 */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>描述</FormLabel>
              <FormControl>
                <Input placeholder="输入描述" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 按钮 */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isSubmitting}
            className={cn('w-full sm:w-auto', 'mt-2 sm:mt-0')}
          >
            取消
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? '提交中...' : mode === 'add' ? '添加交易' : '保存修改'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
