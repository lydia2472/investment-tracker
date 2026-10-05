'use client'

import { Button } from 'animal-island-ui'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ShieldCheckIcon } from '@/lib/components/icon-adapter'
import {
  applyLegacyMonthlyDataRepair,
  createLegacyMonthlyDataRepairPlan,
} from '@/lib/utils/legacy-monthly-data-repair'
import { formatCurrency } from '@/lib/utils/formatters'

import type { Snapshot } from '@/lib/stores/snapshot-store'
import type { Account, Transaction } from '@/types'

interface LegacyMonthlyDataRepairDialogProps {
  accounts: Account[]
  snapshots: Snapshot[]
  transactions: Transaction[]
  trigger?: React.ReactNode
}

export function LegacyMonthlyDataRepairDialog({
  accounts,
  snapshots,
  transactions,
  trigger,
}: LegacyMonthlyDataRepairDialogProps) {
  const [open, setOpen] = useState(false)
  const [isRepairing, setIsRepairing] = useState(false)
  const [lastRemovedCount, setLastRemovedCount] = useState<number | null>(null)

  const repairPlan = useMemo(
    () => createLegacyMonthlyDataRepairPlan(accounts, snapshots, transactions),
    [accounts, snapshots, transactions]
  )

  const handleRepair = () => {
    if (repairPlan.candidates.length === 0) {
      toast.success('未发现需要修复的历史孤立转入')
      return
    }

    setIsRepairing(true)

    try {
      const result = applyLegacyMonthlyDataRepair(accounts, snapshots, transactions)
      setLastRemovedCount(result.removedTransactionIds.length)

      toast.success('历史修复完成', {
        description:
          `已删除 ${result.removedTransactionIds.length} 条旧孤立转入，` +
          `涉及 ${result.candidates.length} 个历史月份，快照和收益记录已保留。`,
      })
    } catch (error) {
      console.error('历史修复失败:', error)
      toast.error('历史修复失败', {
        description: error instanceof Error ? error.message : '请稍后重试',
      })
    } finally {
      setIsRepairing(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (nextOpen) {
          setLastRemovedCount(null)
        }
      }}
    >
      <DialogTrigger asChild>
        {trigger || (
          <Button
            type="default"
            className="border border-[#d97706] text-[#92400e]"
            icon={<ShieldCheckIcon className="h-4 w-4" />}
          >
            历史修复器
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>历史修复器</DialogTitle>
          <DialogDescription>
            只清理旧月末逻辑自动生成的孤立转入，保留快照和收益/亏损记录。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <div className="font-semibold">本次修复范围</div>
            <div className="mt-2">
              仅匹配同时满足以下特征的旧数据：`TRANSFER_IN`、没有来源账户、没有转账配对、描述为“本月新增投资”、并且能和同月同额快照投资金额一一对应。
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border bg-background p-4">
              <div className="text-xs text-muted-foreground">待修复记录</div>
              <div className="mt-1 text-2xl font-bold">{repairPlan.candidates.length}</div>
            </div>
            <div className="rounded-xl border bg-background p-4">
              <div className="text-xs text-muted-foreground">涉及历史月份</div>
              <div className="mt-1 text-2xl font-bold">
                {new Set(repairPlan.candidates.map((candidate) => `${candidate.accountId}:${candidate.monthKey}`)).size}
              </div>
            </div>
            <div className="rounded-xl border bg-background p-4">
              <div className="text-xs text-muted-foreground">待清理金额</div>
              <div className="mt-1 text-2xl font-bold">{formatCurrency(repairPlan.totalAmount)}</div>
            </div>
          </div>

          {lastRemovedCount !== null && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
              已完成修复，删除了 {lastRemovedCount} 条旧孤立转入。重新打开该对话框会基于当前数据重新扫描。
            </div>
          )}

          {repairPlan.candidates.length === 0 ? (
            <div className="rounded-xl border border-green-200 bg-green-50 p-5 text-sm text-green-900">
              当前没有发现符合条件的历史孤立转入，暂时不需要修复。
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm font-medium">待修复明细</div>
              <div className="space-y-2">
                {repairPlan.candidates.map((candidate) => (
                  <div
                    key={candidate.transactionId}
                    className="flex items-center justify-between rounded-xl border bg-background p-3 text-sm"
                  >
                    <div>
                      <div className="font-medium">
                        {candidate.accountName} · {candidate.monthLabel}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        自动生成的孤立转入将被删除，快照保留
                      </div>
                    </div>
                    <div className="font-semibold text-amber-700">
                      {formatCurrency(candidate.amount)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="default" onClick={() => setOpen(false)}>
              关闭
            </Button>
            <Button
              type="primary"
              className="bg-[#d97706] border-[#d97706]"
              disabled={repairPlan.candidates.length === 0 || isRepairing}
              onClick={handleRepair}
            >
              {isRepairing ? '修复中...' : '确认修复'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
