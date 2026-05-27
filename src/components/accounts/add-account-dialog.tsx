'use client'

import { useState } from 'react'
import { useAccountStore } from '@/lib/stores'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { AccountForm } from './account-form'
import type { AccountFormData } from './account-form'
import { toast } from 'sonner'

interface AddAccountDialogProps {
  trigger?: React.ReactNode
}

export function AddAccountDialog({ trigger }: AddAccountDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const addAccount = useAccountStore((state) => state.addAccount)

  const handleSubmit = async (data: AccountFormData) => {
    setIsSubmitting(true)
    try {
      addAccount({
        name: data.name,
        type: data.type,
        balance: data.initialBalance,
        initialBalance: data.initialBalance,
        currency: data.currency || 'CNY',
        color: '#f0e8d8',
        icon: data.icon,
        riskLevel: data.riskLevel,
        description: data.description,
      })

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
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>添加新账户</DialogTitle>
          <DialogDescription>
            创建一个新的投资账户来跟踪您的资产
          </DialogDescription>
        </DialogHeader>
        <AccountForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isSubmitting={isSubmitting}
        />
      </DialogContent>
    </Dialog>
  )
}
