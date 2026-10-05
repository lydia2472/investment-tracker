'use client'

import { Button, Input } from 'animal-island-ui'
import { format } from 'date-fns'
import { useState } from 'react'
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
import { useAccountStore, useHoldingStore } from '@/lib/stores'
import { calculateHoldingProfit } from '@/lib/utils/holding-calculations'
import { formatCurrency } from '@/lib/utils/formatters'
import { cn } from '@/lib/utils/cn'

import { PlusIcon } from '@/lib/components/icon-adapter'

import type { Holding } from '@/lib/stores/holding-store'

export function AddRecordDialog({ trigger }: { trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedHoldingId, setSelectedHoldingId] = useState<string | undefined>(undefined)
  const [shares, setShares] = useState<string>('')
  const [nav, setNav] = useState<string>('')
  const [costPrice, setCostPrice] = useState<string>('')
  const [recordDate, setRecordDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [note, setNote] = useState<string>('')

  const accounts = useAccountStore((state) => state.accounts)
  const holdings = useHoldingStore((state) => state.holdings)
  const allRecords = useHoldingStore((state) => state.records)
  const getLatestRecord = useHoldingStore((state) => state.getLatestRecord)
  const addRecord = useHoldingStore((state) => state.addRecord)

  const accountMap = new Map(accounts.map((a) => [a.id, a]))
  const selectedHolding: Holding | undefined = holdings.find((h) => h.id === selectedHoldingId)
  const selectedAccount = selectedHolding ? accountMap.get(selectedHolding.accountId) : undefined

  // 选择持仓时，自动带出上月的持仓成本（定投默认沿用上月，有变化可修改）
  const handleSelectHolding = (id: string) => {
    setSelectedHoldingId(id)
    const holding = holdings.find((h) => h.id === id)
    if (holding) {
      const latest = getLatestRecord(id)
      // 优先用上月记录的 costPrice，回退到 Holding 的固定成本
      const defaultCost = latest?.costPrice ?? holding.costPrice
      setCostPrice(String(defaultCost))
    }
  }

  // 收益预览（用当前填写的 costPrice）
  const sharesNum = parseFloat(shares) || 0
  const navNum = parseFloat(nav) || 0
  const costNum = parseFloat(costPrice) || 0
  const previewProfit =
    selectedHolding && sharesNum > 0 && navNum > 0
      ? calculateHoldingProfit(selectedHolding, {
          id: 'preview',
          holdingId: selectedHolding.id,
          shares: sharesNum,
          nav: navNum,
          costPrice: costNum > 0 ? costNum : undefined,
          recordDate: new Date(recordDate),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      : null

  const handleSubmit = () => {
    if (!selectedHoldingId) {
      toast.error('请选择持仓账户')
      return
    }
    if (sharesNum <= 0) {
      toast.error('请输入有效的份额')
      return
    }
    if (navNum <= 0) {
      toast.error('请输入有效的净值')
      return
    }

    setIsSubmitting(true)
    try {
      addRecord({
        holdingId: selectedHoldingId,
        shares: sharesNum,
        nav: navNum,
        costPrice: costNum > 0 ? costNum : selectedHolding?.costPrice,
        recordDate: new Date(recordDate),
        note: note || undefined,
      })
      toast.success('月度记录添加成功')
      setOpen(false)
      setSelectedHoldingId(undefined)
      setCostPrice('')
      setShares('')
      setNav('')
      setNote('')
    } catch (error) {
      console.error('添加记录失败:', error)
      toast.error('添加失败')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="default" icon={<PlusIcon />}>
            录入月度
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>录入月度份额</DialogTitle>
          <DialogDescription>
            录入当月累计持有份额和基金净值，系统自动计算收益。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">选择持仓账户</label>
            {holdings.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                请先添加持仓账户
              </p>
            ) : (
              <Select value={selectedHoldingId} onValueChange={handleSelectHolding}>
                <SelectTrigger>
                  <SelectValue placeholder="选择持仓账户" />
                </SelectTrigger>
                <SelectContent>
                  {holdings.map((h) => {
                    const acc = accountMap.get(h.accountId)
                    return (
                      <SelectItem key={h.id} value={h.id}>
                        {acc?.name ?? '未知账户'}（成本 {h.costPrice}）
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                累计份额
                <span className="text-destructive ml-1">*</span>
              </label>
              <Input
                type="number"
                step="0.0001"
                min="0"
                placeholder="当前总份额"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                基金净值
                <span className="text-destructive ml-1">*</span>
              </label>
              <Input
                type="number"
                step="0.0001"
                min="0"
                placeholder="元/份"
                value={nav}
                onChange={(e) => setNav(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                持仓成本
                <span className="text-muted-foreground ml-1">(可改)</span>
              </label>
              <Input
                type="number"
                step="0.0001"
                min="0"
                placeholder="默认沿用上月"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">日期</label>
            <Input
              type="date"
              value={recordDate}
              onChange={(e) => setRecordDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">备注</label>
            <Input
              type="text"
              placeholder="可选"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* 收益预览 */}
          {previewProfit && previewProfit.hasData && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 space-y-1">
              <div className="flex justify-between">
                <span>当前市值</span>
                <span className="font-semibold">{formatCurrency(previewProfit.marketValue)}</span>
              </div>
              <div className="flex justify-between">
                <span>投入成本</span>
                <span className="font-semibold">{formatCurrency(previewProfit.totalCost)}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-blue-200">
                <span>累计收益</span>
                <span
                  className={cn(
                    'font-bold',
                    previewProfit.profit >= 0 ? 'text-green-600' : 'text-red-600'
                  )}
                >
                  {previewProfit.profit >= 0 ? '+' : ''}
                  {formatCurrency(previewProfit.profit)}
                  <span className="ml-1">
                    ({(previewProfit.profitRate * 100).toFixed(2)}%)
                  </span>
                </span>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="default" onClick={() => setOpen(false)} disabled={isSubmitting}>
              取消
            </Button>
            <Button
              type="primary"
              onClick={handleSubmit}
              disabled={isSubmitting || holdings.length === 0}
            >
              添加
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
