'use client'

import { Button } from 'animal-island-ui'

import { AlertIcon, TrashIcon } from '@/lib/components/icon-adapter'
import { useTransactionStore } from '@/lib/stores'
import { useSnapshotStore } from '@/lib/stores/snapshot-store'
import { formatCurrency } from '@/lib/utils/formatters'

import type { Account } from '@/types'

interface BatchDeleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  accounts: Account[]
  onConfirm: () => void
  isDeleting?: boolean
}

export function BatchDeleteDialog({
  open,
  onOpenChange,
  accounts,
  onConfirm,
  isDeleting = false,
}: BatchDeleteDialogProps) {
  const getTransactionsByAccount = useTransactionStore((state) => state.getTransactionsByAccount)
  const getSnapshotsByAccount = useSnapshotStore((state) => state.getSnapshotsByAccount)

  // 计算总交易数
  const totalTransactions = accounts.reduce((sum, account) => {
    return sum + getTransactionsByAccount(account.id).length
  }, 0)
  const totalSnapshots = accounts.reduce((sum, account) => {
    return sum + getSnapshotsByAccount(account.id).length
  }, 0)

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div className="fixed inset-0 bg-black/50 z-50" onClick={() => onOpenChange(false)} />
      )}

      {/* Dialog */}
      <div
        className={`
          fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
          bg-white rounded-xl shadow-xl z-50 w-full max-w-md
          transition-all duration-200
          ${open ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}
        `}
      >
        <div className="p-6">
          {/* Header */}
          <div className="mb-4">
            <h2 className="text-xl font-semibold text-red-600 flex items-center gap-2">
              <TrashIcon className="h-5 w-5" />
              确认批量删除
            </h2>
            <p className="text-sm text-muted-foreground mt-1">此操作不可撤销</p>
          </div>

          {/* Warning Message */}
          <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-xl p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertIcon className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-red-900 dark:text-red-100 mb-1">
                  警告：这将删除 {accounts.length} 个账户及其所有关联数据
                </p>
                <p className="text-red-700 dark:text-red-300">
                  共计 {totalTransactions} 条交易记录和 {totalSnapshots} 条快照将被删除
                </p>
              </div>
            </div>
          </div>

          {/* Account List */}
          <div className="max-h-60 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg p-2 mb-4">
            {accounts.map((account) => {
              const transactionCount = getTransactionsByAccount(account.id).length
              return (
                <div
                  key={account.id}
                  className="flex items-center justify-between py-2 px-3 border-b border-gray-100 dark:border-gray-800 last:border-b-0"
                >
                  <div className="flex items-center gap-3">
                    {/* Account Color Indicator */}
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ backgroundColor: account.color }}
                    >
                      {account.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-medium text-sm">{account.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {account.currency} {formatCurrency(account.balance)}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs text-red-600 font-medium">
                    {transactionCount} 条交易 / {getSnapshotsByAccount(account.id).length} 条快照
                  </div>
                </div>
              )
            })}
          </div>

          {/* Actions */}
          <div className="flex gap-3 justify-end">
            <Button
              type="default"
              size="small"
              onClick={() => onOpenChange(false)}
              disabled={isDeleting}
            >
              取消
            </Button>
            <Button
              type="primary"
              size="small"
              onClick={onConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 border-red-600"
              icon={isDeleting ? undefined : <TrashIcon className="h-4 w-4" />}
            >
              {isDeleting ? '删除中...' : '确认删除'}
            </Button>
          </div>
        </div>
      </div>
    </>
  )
}
