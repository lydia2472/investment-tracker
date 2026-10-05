'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Input , Button } from 'animal-island-ui'
import { format, isValid } from 'date-fns'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'

import { TagInput } from '@/components/tags'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { SearchableAccountSelect } from '@/components/ui/searchable-account-select'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useAccountStore } from '@/lib/stores'
import { TransactionType } from '@/types'

// 基础 schema - 所有字段都标记为可选
const baseTransactionSchema = z.object({
  accountId: z.string().optional(),
  fromAccountId: z.string().optional(), // 转账专用：转出账户
  toAccountId: z.string().optional(), // 转账专用：转入账户
  type: z.nativeEnum(TransactionType),
  amount: z.number().optional(),
  balance: z.number().optional(),
  description: z.string().optional(),
  note: z.string().optional(),
  tags: z.array(z.string()).optional(), // 新增：标签字段
  date: z.date(),
})

// 根据交易类型进行条件验证
const transactionFormSchema = baseTransactionSchema.superRefine((data, ctx) => {
  if (data.type === TransactionType.TRANSFER) {
    if (!data.fromAccountId || !data.toAccountId || data.amount === undefined || data.amount <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: '请填写完整的转账信息',
        path: ['fromAccountId'],
      })
    }
    return
  }

  if (!data.accountId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: '请选择账户',
      path: ['accountId'],
    })
  }
})

export type TransactionFormData = z.infer<typeof transactionFormSchema>

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
      type: TransactionType.DEPOSIT,
      date: new Date(),
      ...initialData,
    },
  })

  const selectedType = form.watch('type')

  // 当交易类型改变时，清空相关字段
  useEffect(() => {
    if (mode === 'add') {
      form.setValue('amount', undefined)
      form.setValue('balance', undefined)
      form.setValue('fromAccountId', undefined)
      form.setValue('toAccountId', undefined)
    }
  }, [selectedType, form, mode])

  const handleSubmit = async (data: TransactionFormData) => {
    // 转账类型特殊验证
    if (data.type === TransactionType.TRANSFER) {
      if (!data.fromAccountId || !data.toAccountId) {
        toast.error('请选择转出和转入账户')
        return
      }
      if (!data.amount || data.amount <= 0) {
        toast.error('请输入有效的转账金额')
        return
      }
      if (data.fromAccountId === data.toAccountId) {
        toast.error('不能转账到同一账户')
        return
      }
    } else {
      // 非转账类型验证
      if (!data.accountId) {
        toast.error('请选择账户')
        return
      }

      // 收入和支出类型需要金额：INCOME, DEPOSIT, TRANSFER_IN, CONSUMPTION, TRANSFER_OUT, LOAN
      if (
        (data.type === TransactionType.INCOME ||
          data.type === TransactionType.DEPOSIT ||
          data.type === TransactionType.TRANSFER_IN ||
          data.type === TransactionType.CONSUMPTION ||
          data.type === TransactionType.TRANSFER_OUT ||
          data.type === TransactionType.LOAN) &&
        !data.amount
      ) {
        toast.error('请输入金额')
        return
      }

      // 快照需要余额
      if (data.type === TransactionType.SNAPSHOT && data.balance === undefined) {
        toast.error('请输入当前余额')
        return
      }
    }

    await onSubmit(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        {/* 账户选择 */}
        {selectedType === TransactionType.TRANSFER ? (
          <>
            {/* 转出账户 */}
            <FormField
              control={form.control}
              name="fromAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>转出账户</FormLabel>
                  <SearchableAccountSelect
                    value={field.value}
                    onChange={field.onChange}
                    accounts={accounts}
                    placeholder="选择转出账户"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 转入账户 */}
            <FormField
              control={form.control}
              name="toAccountId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>转入账户</FormLabel>
                  <SearchableAccountSelect
                    value={field.value}
                    onChange={field.onChange}
                    accounts={accounts}
                    placeholder="选择转入账户"
                  />
                  <FormMessage />
                </FormItem>
              )}
            />
          </>
        ) : (
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
        )}

        {/* 交易类型 */}
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>交易类型</FormLabel>
              <Select onValueChange={field.onChange} value={field.value} disabled={mode === 'edit'}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="选择类型" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value={TransactionType.INCOME}>收入</SelectItem>
                  <SelectItem value={TransactionType.DEPOSIT}>存款</SelectItem>
                  <SelectItem value={TransactionType.TRANSFER_IN}>转入</SelectItem>
                  <SelectItem value={TransactionType.CONSUMPTION}>消费</SelectItem>
                  <SelectItem value={TransactionType.TRANSFER_OUT}>转出</SelectItem>
                  <SelectItem value={TransactionType.LOAN}>放贷</SelectItem>
                  <SelectItem value={TransactionType.TRANSFER}>转账</SelectItem>
                  <SelectItem value={TransactionType.SNAPSHOT}>快照</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 需要金额的字段：所有类型 except SNAPSHOT */}
        {selectedType !== TransactionType.SNAPSHOT && (
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
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
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
                    value={field.value ?? ''}
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
                <Input placeholder="输入描述" value={field.value || ''} onChange={field.onChange} />
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
                  value={field.value || ''}
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 标签 */}
        <FormField
          control={form.control}
          name="tags"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                标签（可选）
                {selectedType === TransactionType.SNAPSHOT && (
                  <span className="ml-2 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded">
                    💡 快照建议添加 &quot;month-end&quot; 标签
                  </span>
                )}
              </FormLabel>
              <FormControl>
                <TagInput
                  value={field.value || []}
                  onChange={field.onChange}
                  placeholder="输入标签，按回车或逗号添加"
                />
              </FormControl>
              <p className="text-xs text-muted-foreground mt-1">从全局标签中选择或输入新标签</p>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* 按钮 */}
        <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
          <Button
            type="default"
            onClick={onCancel}
            disabled={isSubmitting}
            className="mt-2 w-full sm:mt-0 sm:w-auto"
          >
            取消
          </Button>
          <Button
            htmlType="submit"
            type="primary"
            disabled={isSubmitting}
            className="w-full sm:w-auto bg-[#5ec850] border-2 border-[#5ec850]"
          >
            {isSubmitting ? '提交中...' : mode === 'add' ? '添加交易' : '保存修改'}
          </Button>
        </div>
      </form>
    </Form>
  )
}
