'use client'

import { Button, Input } from 'animal-island-ui'
import { useState } from 'react'
import { toast } from 'sonner'

import { SearchableAccountSelect } from '@/components/ui/searchable-account-select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useAccountStore, useHoldingStore } from '@/lib/stores'
import { AccountType } from '@/types'

import { PlusIcon } from '@/lib/components/icon-adapter'

export function AddHoldingDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [accountId, setAccountId] = useState<string | undefined>(undefined)
  const [costPrice, setCostPrice] = useState<string>('')

  const accounts = useAccountStore((state) => state.accounts)
  const holdings = useHoldingStore((state) => state.holdings)
  const addHolding = useHoldingStore((state) => state.addHolding)

  // 只显示基金和股票类型的账户，且未被添加过的
  const availableAccounts = accounts.filter(
    (acc) =>
      (acc.type === AccountType.FUND || acc.type === AccountType.STOCK) &&
      !holdings.some((h) => h.accountId === acc.id)
  )

  const handleSubmit = () => {
    if (!accountId) {
      toast.error('请选择账户')
      return
    }
    const price = parseFloat(costPrice)
    if (isNaN(price) || price <= 0) {
      toast.error('请输入有效的持仓成本')
      return
    }

    setIsSubmitting(true)
    try {
      addHolding({ accountId, costPrice: price })
      toast.success('持仓添加成功')
      setOpen(false)
      setAccountId(undefined)
      setCostPrice('')
    } catch (error) {
      console.error('添加持仓失败:', error)
      toast.error('添加失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="primary" icon={<PlusIcon />}>
            添加持仓
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>添加持仓</DialogTitle>
          <DialogDescription>
            选择基金或股票账户，设置持仓成本（元/份）。后续每月录入份额和净值即可计算收益。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">选择账户</label>
            {availableAccounts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                没有可添加的账户（仅支持基金/股票类型，且未重复添加）
              </p>
            ) : (
              <SearchableAccountSelect
                value={accountId}
                onChange={setAccountId}
                accounts={availableAccounts}
                placeholder="搜索并选择基金/股票账户"
              />
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              持仓成本（元/份）
              <span className="text-destructive ml-1">*</span>
            </label>
            <Input
              type="number"
              step="0.0001"
              min="0"
              placeholder="例如 1.2345"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              收益 = 份额 × 最新净值 − 份额 × 持仓成本
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button type="default" onClick={() => setOpen(false)} disabled={isSubmitting}>
              取消
            </Button>
            <Button
              type="primary"
              onClick={handleSubmit}
              disabled={isSubmitting || availableAccounts.length === 0}
            >
              添加
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
