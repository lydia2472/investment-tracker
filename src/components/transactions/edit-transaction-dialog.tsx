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
import { TransactionType } from '@/types'
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

  // 回退原交易的余额影响
  const revertBalance = (txn: Transaction) => {
    const account = getAccount(txn.accountId)
    if (!account) return

    let newBalance = account.balance

    // 收入类型：减少余额
    if (txn.type === TransactionType.INCOME ||
        txn.type === TransactionType.DEPOSIT) {
      newBalance -= txn.amount || 0
    }
    // 支出类型：增加余额
    else if (txn.type === TransactionType.CONSUMPTION) {
      newBalance += txn.amount || 0
    }
    // 快照不回退（历史数据）

    updateAccountBalance(txn.accountId, newBalance)
  }

  // 应用新交易的余额影响
  const applyNewBalance = (data: TransactionFormData) => {
    const account = getAccount(data.accountId!)
    if (!account) return

    let newBalance = account.balance

    // 收入类型：增加余额
    if (data.type === TransactionType.INCOME ||
        data.type === TransactionType.DEPOSIT) {
      newBalance += data.amount || 0
    }
    // 支出类型：减少余额
    else if (data.type === TransactionType.CONSUMPTION) {
      newBalance -= data.amount || 0
    } else if (data.type === TransactionType.SNAPSHOT) {
      newBalance = data.balance || 0
    }

    updateAccountBalance(data.accountId!, newBalance)
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
        accountId: data.accountId!,
        type: data.type,
        amount: data.amount,
        balance: data.balance,
        description: data.description,
        note: data.note,
        tags: data.tags,  // 新增：标签字段
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
        tags: transaction.tags,  // 新增：标签字段
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
