'use client'

import { Button, Input } from 'animal-island-ui'
import { format } from 'date-fns'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { useAccountStore, useSnapshotStore, useTransactionStore } from '@/lib/stores'
import { getGoldSnapshotValue } from '@/lib/utils/gold-profit-helpers'
import { formatCurrency } from '@/lib/utils/formatters'
import { cn } from '@/lib/utils/cn'
import { v4 as uuidv4 } from 'uuid'

import type { Account } from '@/types'

interface SellGoldDialogProps {
  account: Account
  trigger?: React.ReactNode
}

export function SellGoldDialog({ account, trigger }: SellGoldDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [sellGrams, setSellGrams] = useState<string>('')
  const [sellPrice, setSellPrice] = useState<string>('')
  const [targetAccountId, setTargetAccountId] = useState<string | undefined>(undefined)
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))

  const accounts = useAccountStore((state) => state.accounts)
  const allSnapshots = useSnapshotStore((state) => state.snapshots)
  const addTransaction = useTransactionStore((state) => state.addTransaction)
  const updateSnapshot = useSnapshotStore((state) => state.updateSnapshot)

  // 最新快照（取当前克数和均价）
  const latestSnapshot = useMemo(() => {
    return allSnapshots
      .filter((s) => s.accountId === account.id)
      .sort((a, b) => new Date(b.snapshotDate).getTime() - new Date(a.snapshotDate).getTime())[0]
  }, [allSnapshots, account.id])

  const currentGrams = latestSnapshot?.goldGrams ?? 0
  const currentPrice = latestSnapshot?.goldMarketPrice ?? 0
  const currentValue = latestSnapshot ? getGoldSnapshotValue(latestSnapshot) : 0

  // 可选的目标账户（排除黄金账户自身）
  const targetAccounts = accounts.filter((a) => a.id !== account.id)

  // 卖出计算
  const gramsNum = parseFloat(sellGrams) || 0
  const priceNum = parseFloat(sellPrice) || 0
  const totalAmount = gramsNum * priceNum
  const remainingGrams = currentGrams - gramsNum
  const isValid = gramsNum > 0 && priceNum > 0 && gramsNum <= currentGrams && targetAccountId

  const handleSubmit = () => {
    if (!isValid) {
      if (gramsNum > currentGrams) {
        toast.error(`卖出克数不能超过持有克数（${currentGrams.toFixed(4)}克）`)
      } else if (!targetAccountId) {
        toast.error('请选择卖出款项转入的账户')
      } else {
        toast.error('请填写有效的克数和单价')
      }
      return
    }

    setIsSubmitting(true)
    try {
      const now = new Date()
      const txnDate = new Date(date)
      txnDate.setHours(12, 0, 0, 0)
      const pairId = `gold-sell-${account.id}:${targetAccountId}:${gramsNum}:${now.getTime()}`

      // 1. 黄金账户转出
      addTransaction({
        accountId: account.id,
        type: 'transfer_out' as any,
        amount: totalAmount,
        transferToAccountId: targetAccountId,
        transferPairId: pairId,
        description: `卖出黄金 ${gramsNum.toFixed(4)}克 × ${priceNum.toFixed(2)}元/克`,
        tags: ['黄金卖出'],
        createdAt: txnDate,
      })

      // 2. 目标账户转入
      addTransaction({
        accountId: targetAccountId,
        type: 'transfer_in' as any,
        amount: totalAmount,
        transferFromAccountId: account.id,
        transferPairId: pairId,
        description: `来自黄金卖出 ${gramsNum.toFixed(4)}克`,
        tags: ['黄金卖出'],
        createdAt: txnDate,
      })

      // 3. 更新最新快照的克数（扣除卖出部分）
      if (latestSnapshot) {
        const newGrams = Math.max(0, currentGrams - gramsNum)
        const newBalance = newGrams * currentPrice
        updateSnapshot(latestSnapshot.id, {
          goldGrams: newGrams,
          balance: newBalance,
        })
      }

      toast.success(`已卖出 ${gramsNum.toFixed(4)}克黄金，获得 ${formatCurrency(totalAmount)}`)
      setOpen(false)
      setSellGrams('')
      setSellPrice('')
      setTargetAccountId(undefined)
    } catch (error) {
      console.error('卖出黄金失败:', error)
      toast.error('操作失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="default" size="small">
            卖出黄金
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>卖出黄金</DialogTitle>
          <DialogDescription>
            卖出部分黄金并换回现金。系统会自动生成转账记录并更新持仓克数。
          </DialogDescription>
        </DialogHeader>

        {/* 当前持仓信息 */}
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 p-3 text-xs text-amber-900 dark:text-amber-200">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <p className="opacity-70">当前克数</p>
              <p className="font-bold">{currentGrams.toFixed(4)} 克</p>
            </div>
            <div>
              <p className="opacity-70">最新均价</p>
              <p className="font-bold">{formatCurrency(currentPrice)}/克</p>
            </div>
            <div>
              <p className="opacity-70">当前市值</p>
              <p className="font-bold">{formatCurrency(currentValue)}</p>
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                卖出克数
                <span className="text-destructive ml-1">*</span>
              </label>
              <Input
                type="number"
                step="0.0001"
                min="0"
                max={currentGrams}
                placeholder="例如 50"
                value={sellGrams}
                onChange={(e) => setSellGrams(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                卖出单价（元/克）
                <span className="text-destructive ml-1">*</span>
              </label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="例如 580"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              卖出款项转入账户
              <span className="text-destructive ml-1">*</span>
            </label>
            <Select value={targetAccountId} onValueChange={setTargetAccountId}>
              <SelectTrigger>
                <SelectValue placeholder="选择接收款项的账户" />
              </SelectTrigger>
              <SelectContent>
                {targetAccounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name}（{acc.currency}）
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">日期</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          {/* 卖出预览 */}
          {gramsNum > 0 && priceNum > 0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 dark:bg-blue-950/30 p-3 text-xs text-blue-900 dark:text-blue-200 space-y-1">
              <div className="flex justify-between">
                <span>卖出金额</span>
                <span className="font-semibold">{formatCurrency(totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>卖出后剩余克数</span>
                <span className={cn('font-semibold', remainingGrams < 0 && 'text-red-600')}>
                  {remainingGrams.toFixed(4)} 克
                </span>
              </div>
              {remainingGrams >= 0 && currentPrice > 0 && (
                <div className="flex justify-between pt-1 border-t border-blue-200 dark:border-blue-900">
                  <span>卖出后预估市值</span>
                  <span className="font-semibold">
                    {formatCurrency(remainingGrams * currentPrice)}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="default" onClick={() => setOpen(false)} disabled={isSubmitting}>
              取消
            </Button>
            <Button type="primary" onClick={handleSubmit} disabled={isSubmitting || !isValid}>
              确认卖出
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
