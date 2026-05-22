'use client'

import { useState } from 'react'
import { useTransactionStore, useAccountStore } from '@/lib/stores'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { TransactionForm, TransactionFormData } from './transaction-form'
import { toast } from 'sonner'
import { TransactionType, TransactionCategory } from '@/types'

interface AddTransactionDialogProps {
  trigger?: React.ReactNode
}

export function AddTransactionDialog({ trigger }: AddTransactionDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const addTransaction = useTransactionStore((state) => state.addTransaction)
  const transfer = useTransactionStore((state) => state.transfer)
  const accounts = useAccountStore((state) => state.accounts)

  const handleSubmit = async (data: TransactionFormData) => {
    setIsSubmitting(true)
    try {
      if (data.type === TransactionType.TRANSFER) {
        // 处理转账
        if (!data.fromAccountId || !data.toAccountId || !data.amount) {
          toast.error('请填写完整的转账信息')
          return
        }

        if (data.fromAccountId === data.toAccountId) {
          toast.error('转出和转入账户不能相同')
          return
        }

        transfer(
          data.fromAccountId,
          data.toAccountId,
          data.amount,
          data.description,
          data.date
        )

        const fromAccount = accounts.find((acc) => acc.id === data.fromAccountId)
        const toAccount = accounts.find((acc) => acc.id === data.toAccountId)

        toast.success('转账成功', {
          description: `已从 ${fromAccount?.name || '未知账户'} 转账 ¥${data.amount?.toFixed(2) || '0.00'} 到 ${toAccount?.name || '未知账户'}`,
        })
      } else {
        // 处理其他类型（ accountId 已在 handleSubmit 中验证）
        addTransaction({
          accountId: data.accountId!, // 类型断言：已在 handleSubmit 中验证
          type: data.type,
          category: data.category || TransactionCategory.DEPOSIT, // 提供默认值
          amount: data.amount,
          balance: data.balance,
          description: data.description,
          note: data.note,
          createdAt: data.date, // 使用 createdAt 存储用户选择的日期
        })

        toast.success('交易添加成功', {
          description: '账户余额已自动更新',
        })
      }

      setOpen(false)
    } catch (error) {
      console.error('添加交易失败:', error)
      toast.error('操作失败', {
        description: '请检查输入信息后重试',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>添加交易</DialogTitle>
          <DialogDescription>
            记录一笔新的交易或转账
          </DialogDescription>
        </DialogHeader>
        <TransactionForm
          mode="add"
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  )
}
