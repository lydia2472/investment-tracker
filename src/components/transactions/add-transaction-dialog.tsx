'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useTransactionStore, useAccountStore } from '@/lib/stores'
import { TransactionType } from '@/types'

import { MonthlyDataForm } from './monthly-data-form'
import { TransactionForm, TransactionFormData } from './transaction-form'

interface AddTransactionDialogProps {
  trigger?: React.ReactNode
}

export function AddTransactionDialog({ trigger }: AddTransactionDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [mode, setMode] = useState<'transaction' | 'monthly'>('transaction')
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

        transfer(data.fromAccountId, data.toAccountId, data.amount, data.description, data.date)

        const fromAccount = accounts.find((acc) => acc.id === data.fromAccountId)
        const toAccount = accounts.find((acc) => acc.id === data.toAccountId)

        toast.success('转账成功', {
          description: `已从 ${fromAccount?.name || '未知账户'} 转账 ${data.amount.toFixed(2)} 到 ${toAccount?.name || '未知账户'}`,
        })
      } else {
        // 处理其他类型（ accountId 已在 handleSubmit 中验证）
        addTransaction({
          accountId: data.accountId!, // 类型断言：已在 handleSubmit 中验证
          type: data.type,
          amount: data.amount,
          balance: data.balance,
          description: data.description,
          note: data.note,
          tags: data.tags, // 新增：标签字段
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
    // 重置模式
    setMode('transaction')
  }

  const handleMonthlySubmit = async (result: any) => {
    setIsSubmitting(true)
    try {
      console.log('[AddTransactionDialog] 月末数据处理完成:', result)

      // 关闭对话框
      setOpen(false)

      // 重置模式
      setMode('transaction')
    } catch (error) {
      console.error('[AddTransactionDialog] 月末数据处理失败:', error)
      toast.error('操作失败', {
        description: '请检查输入信息后重试',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'transaction' ? '添加交易' : '记录月末数据'}</DialogTitle>
          <DialogDescription>
            {mode === 'transaction'
              ? '记录一笔新的交易或转账'
              : '记录月末快照，并按当月真实转入自动统计投资金额和收益'}
          </DialogDescription>
        </DialogHeader>

        {/* 模式切换器 */}
        <div className="flex gap-2 pb-4 border-b">
          <button
            type="button"
            onClick={() => setMode('transaction')}
            className={`
              flex-1 px-4 py-2 rounded-lg font-medium transition-all
              ${
                mode === 'transaction'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }
            `}
          >
            普通交易
          </button>
          <button
            type="button"
            onClick={() => setMode('monthly')}
            className={`
              flex-1 px-4 py-2 rounded-lg font-medium transition-all
              ${
                mode === 'monthly'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }
            `}
          >
            月末数据
          </button>
        </div>

        {/* 根据模式显示不同的表单 */}
        {mode === 'transaction' ? (
          <TransactionForm
            mode="add"
            onSubmit={handleSubmit}
            onCancel={handleCancel}
            isSubmitting={isSubmitting}
          />
        ) : (
          <MonthlyDataForm onSubmit={handleMonthlySubmit} isSubmitting={isSubmitting} />
        )}
      </DialogContent>
    </Dialog>
  )
}
