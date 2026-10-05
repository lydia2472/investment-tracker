'use client'

import { isValid } from 'date-fns'
import { useState } from 'react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useTransactionStore } from '@/lib/stores'

import { TransactionForm, TransactionFormData } from './transaction-form'

interface EditTransactionDialogProps {
  transactionId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditTransactionDialog({
  transactionId,
  open,
  onOpenChange,
}: EditTransactionDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const updateTransaction = useTransactionStore((state) => state.updateTransaction)
  const getTransaction = useTransactionStore((state) => state.getTransaction)

  const transaction = transactionId ? getTransaction(transactionId) : null

  const handleSubmit = async (data: TransactionFormData) => {
    if (!transaction) return

    setIsSubmitting(true)
    try {
      updateTransaction(transaction.id, {
        accountId: data.accountId!,
        type: data.type,
        amount: data.amount,
        balance: data.balance,
        description: data.description,
        note: data.note,
        tags: data.tags, // 新增：标签字段
        createdAt: data.date, // 使用 createdAt 存储用户选择的日期
      })

      toast.success('交易更新成功', {
        description: '账户余额已自动调整',
      })

      onOpenChange(false)
    } catch (error) {
      console.error('编辑交易失败:', error)
      toast.error('操作失败', {
        description: '请检查输入信息后重试',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 准备表单初始数据
  const initialData: Partial<TransactionFormData> | undefined = transaction
    ? {
        accountId: transaction.accountId,
        type: transaction.type,
        amount: transaction.amount,
        balance: transaction.balance,
        description: transaction.description,
        note: transaction.note,
        tags: transaction.tags, // 新增：标签字段
        date: (() => {
          const dateValue =
            transaction.createdAt instanceof Date
              ? transaction.createdAt
              : new Date(transaction.createdAt)
          return isValid(dateValue) ? dateValue : new Date()
        })(),
      }
    : undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>编辑交易</DialogTitle>
          <DialogDescription>修改交易信息，账户余额将自动调整</DialogDescription>
        </DialogHeader>
        {transaction && initialData && (
          <TransactionForm
            mode="edit"
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={() => onOpenChange(false)}
            isSubmitting={isSubmitting}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
