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
import { FixedDepositService } from '@/lib/services/fixed-deposit-service'
import { useAccountStore , useTransactionStore } from '@/lib/stores'
import { AccountType } from '@/types'

import { AccountForm } from './account-form'

import type { AccountFormData } from './account-form'

interface AddAccountDialogProps {
  trigger?: React.ReactNode
}

export function AddAccountDialog({ trigger }: AddAccountDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const addAccount = useAccountStore((state) => state.addAccount)
  const addTransaction = useTransactionStore((state) => state.addTransaction)
  const getAccount = useAccountStore((state) => state.getAccount)

  const handleSubmit = async (data: AccountFormData) => {
    setIsSubmitting(true)
    try {
      // 1. 创建账户（余额 = 本金）
      const principal = data.fixedDepositConfig?.principal || data.initialBalance
      const newAccount = addAccount({
        name: data.name,
        type: data.type,
        balance: principal,
        initialBalance: principal,
        createdAt: data.startDate,
        currency: data.currency || 'CNY',
        color: '#f0e8d8',
        icon: data.icon,
        riskLevel: data.riskLevel,
        description: data.description,
        fixedDepositConfig: data.fixedDepositConfig,
        fundCode: data.fundCode || undefined,
      })

      // 2. 如果是定期存款，立即生成月度利息
      if (data.type === AccountType.FIXED_DEPOSIT && data.fixedDepositConfig) {
        // 获取刚创建的账户（包含 ID）
        const accountWithId = getAccount(newAccount.id)
        if (accountWithId) {
          // 生成从起息日到今天的所有月度利息
          const monthlyPayments = FixedDepositService.generateMonthlyInterestPayments(
            accountWithId,
            new Date(),
            [] // 新建账户，没有已存在的交易
          )

          // 批量添加月度利息
          monthlyPayments.forEach((payment) => {
            addTransaction(payment)
            console.log(`[AddAccount] 生成月度利息 ${payment.amount}元 (${payment.description})`)
          })

          if (monthlyPayments.length > 0) {
            console.log(`[AddAccount] 共生成 ${monthlyPayments.length} 笔月度利息`)
          }
        }
      }

      toast.success('账户创建成功')

      // 重置表单并关闭对话框
      setOpen(false)
    } catch (error) {
      console.error('创建账户失败:', error)
      toast.error('创建失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>添加新账户</DialogTitle>
          <DialogDescription>创建一个新的投资账户来跟踪您的资产</DialogDescription>
        </DialogHeader>
        <AccountForm onSubmit={handleSubmit} onCancel={handleCancel} isSubmitting={isSubmitting} />
      </DialogContent>
    </Dialog>
  )
}
