'use client'

import { useState, useEffect } from 'react'
import { useTransactionStore, useAccountStore } from '@/lib/stores'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { TransactionForm, TransactionFormData } from './transaction-form'
import { toast } from 'sonner'
import { TransactionType, TransactionCategory } from '@/types'
import type { Transaction } from '@/types'

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
  const updateAccountBalance = useAccountStore((state) => state.updateBalance)
  const getAccount = useAccountStore((state) => state.getAccount)
  const accounts = useAccountStore((state) => state.accounts)
  const getTransaction = useTransactionStore((state) => state.getTransaction)

  const transaction = transactionId ? getTransaction(transactionId) : null

  // 检查是否是转账记录
  const isTransfer = transaction?.type === TransactionType.TRANSFER

  // 回退原交易的余额影响
  const revertBalance = (txn: Transaction) => {
    const account = getAccount(txn.accountId)
    if (!account) return

    let newBalance = account.balance

    if (txn.type === TransactionType.INCOME) {
      newBalance -= txn.amount || 0
    } else if (txn.type === TransactionType.EXPENSE) {
      newBalance += txn.amount || 0
    }
    // 快照不回退（历史数据）

    updateAccountBalance(txn.accountId, newBalance)
  }

  // 应用新交易的余额影响
  const applyNewBalance = (data: TransactionFormData) => {
    const account = getAccount(data.accountId)
    if (!account) return

    let newBalance = account.balance

    if (data.type === TransactionType.INCOME) {
      newBalance += data.amount || 0
    } else if (data.type === TransactionType.EXPENSE) {
      newBalance -= data.amount || 0
    } else if (data.type === TransactionType.SNAPSHOT) {
      newBalance = data.balance || 0
    }

    updateAccountBalance(data.accountId, newBalance)
  }

  const handleSubmit = async (data: TransactionFormData) => {
    if (!transaction) return

    setIsSubmitting(true)
    try {
      // 回退原交易的余额影响
      revertBalance(transaction)

      // 应用新交易的余额影响
      applyNewBalance(data)

      // 更新交易记录
      updateTransaction(transaction.id, {
        accountId: data.accountId,
        type: data.type,
        category: data.category || TransactionCategory.DEPOSIT, // 提供默认值
        amount: data.amount,
        balance: data.balance,
        description: data.description,
        note: data.note,
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

  // 转账记录不支持编辑
  if (isTransfer) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>无法编辑转账记录</DialogTitle>
            <DialogDescription>
              转账记录涉及两个账户，编辑较为复杂。建议删除后重新创建。
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
            <button
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center justify-center rounded-md text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
            >
              关闭
            </button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  // 准备表单初始数据
  const initialData: Partial<TransactionFormData> | undefined = transaction
    ? {
        accountId: transaction.accountId,
        type: transaction.type,
        category: transaction.category,
        amount: transaction.amount,
        balance: transaction.balance,
        description: transaction.description,
        note: transaction.note,
        date: transaction.createdAt,
      }
    : undefined

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>编辑交易</DialogTitle>
          <DialogDescription>
            修改交易信息，账户余额将自动调整
          </DialogDescription>
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
