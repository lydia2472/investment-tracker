'use client'

import { useState } from 'react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAccountStore } from '@/lib/stores'

import { AccountForm } from './account-form'

import type { AccountFormData } from './account-form'
import type { Account } from '@/types'

interface EditAccountDialogProps {
  account: Account
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditAccountDialog({ account, open, onOpenChange }: EditAccountDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const updateAccount = useAccountStore((state) => state.updateAccount)

  const handleSubmit = async (data: AccountFormData) => {
    setIsSubmitting(true)
    try {
      updateAccount(account.id, {
        name: data.name,
        type: data.type,
        initialBalance: data.initialBalance,
        currency: data.currency,
        icon: data.icon,
        riskLevel: data.riskLevel,
        description: data.description,
        fixedDepositConfig: data.fixedDepositConfig,
      })

      toast.success('账户更新成功')

      // 关闭对话框
      onOpenChange(false)
    } catch (error) {
      console.error('更新账户失败:', error)
      toast.error('更新失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  // 默认值转换（添加日期字段处理）
  const defaultValues: Partial<AccountFormData> = {
    name: account.name,
    type: account.type,
    initialBalance: account.initialBalance,
    currency: account.currency,
    riskLevel: account.riskLevel,
    icon: account.icon,
    description: account.description,
    fixedDepositConfig: account.fixedDepositConfig
      ? {
          ...account.fixedDepositConfig,
          // 确保日期字段是 Date 对象（处理 localStorage 序列化）
          startDate: new Date(account.fixedDepositConfig.startDate),
          maturityDate: new Date(account.fixedDepositConfig.maturityDate),
        }
      : undefined,
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>编辑账户</DialogTitle>
          <DialogDescription>修改账户信息</DialogDescription>
        </DialogHeader>
        <AccountForm
          mode="edit"
          defaultValues={defaultValues}
          currentBalance={account.balance}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  )
}
