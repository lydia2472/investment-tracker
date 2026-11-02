'use client'

import { Divider , Button } from 'animal-island-ui'
import { startTransition, useDeferredValue, useMemo, useState } from 'react'

import { StatementImportDialog } from '@/components/snapshots/statement-import-dialog'
import { AddTransactionDialog } from '@/components/transactions/add-transaction-dialog'
import { EditTransactionDialog } from '@/components/transactions/edit-transaction-dialog'
import { ExchangeDialog } from '@/components/transactions/exchange-dialog'
import { ExportDialog } from '@/components/transactions/export-dialog'
import { ImportDialog } from '@/components/transactions/import-dialog'
import {
  TransactionFilters,
  type TransactionFilters as TransactionFiltersType,
} from '@/components/transactions/transaction-filters'
import { TransactionTable } from '@/components/transactions/transaction-table'
import { confirmAsync } from '@/components/ui/confirm-dialog'
import { useTransactionActions } from '@/hooks/use-transaction-actions'
import { PlusIcon } from '@/lib/components/icon-adapter'
import { useTransactionStore, useAccountStore } from '@/lib/stores'
import { filterTransactions } from '@/lib/utils/transaction-filtering'
import { TransactionType } from '@/types'

export default function TransactionsPage() {
  const allTransactions = useTransactionStore((state) => state.transactions)
  // 过滤掉 SNAPSHOT 类型的交易，但保留 TRANSFER_IN 类型
  const transactions = allTransactions.filter((t) => t.type !== TransactionType.SNAPSHOT)
  const accounts = useAccountStore((state) => state.accounts)
  const { handleDelete } = useTransactionActions()
  const { deleteMultiple } = useTransactionStore((state) => state)

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null)
  const [filters, setFilters] = useState<TransactionFiltersType>({})
  const deferredFilters = useDeferredValue(filters)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  const filteredTransactions = useMemo(
    () => filterTransactions(transactions, accounts, deferredFilters),
    [transactions, accounts, deferredFilters]
  )

  const visibleSelectedIds = useMemo(() => {
    const visibleIds = new Set(filteredTransactions.map((transaction) => transaction.id))
    return new Set(Array.from(selectedIds).filter((transactionId) => visibleIds.has(transactionId)))
  }, [filteredTransactions, selectedIds])

  const handleEdit = (id: string) => {
    setEditingTransactionId(id)
    setEditDialogOpen(true)
  }

  const handleBatchDelete = async () => {
    if (visibleSelectedIds.size === 0) return

    const confirmed = await confirmAsync({
      title: `确定要删除选中的 ${visibleSelectedIds.size} 条交易吗？`,
      description: '此操作不可撤销。',
      confirmText: '删除',
      danger: true,
    })

    if (confirmed) {
      deleteMultiple(Array.from(visibleSelectedIds))
      setSelectedIds(new Set())
    }
  }

  const handleClearSelection = () => {
    setSelectedIds(new Set())
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">交易记录</h2>
          <p className="text-muted-foreground">查看和管理所有交易流水</p>
        </div>
        <div className="flex gap-2">
          <ExportDialog
            transactions={transactions}
            filteredTransactions={filteredTransactions}
            accounts={accounts}
          />
          <ImportDialog />
          <StatementImportDialog />
          <ExchangeDialog />
          <AddTransactionDialog
            trigger={
              <Button
                type="primary"
                className="bg-[#5ec850]"
                icon={<PlusIcon className="h-4 w-4" />}
              >
                添加交易
              </Button>
            }
          />
        </div>
      </div>

      {/* 批量操作栏 */}
      {visibleSelectedIds.size > 0 && (
        <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900 rounded-lg flex items-center justify-between">
          <div className="text-sm font-medium">
            已选择 <span className="text-blue-600 dark:text-blue-300">{visibleSelectedIds.size}</span>{' '}
            条当前可见交易
          </div>
          <div className="flex gap-2">
            <Button type="primary" danger onClick={handleBatchDelete}>
              批量删除
            </Button>
            <Button type="default" onClick={handleClearSelection}>
              清除选择
            </Button>
          </div>
        </div>
      )}

      <TransactionFilters
        filters={filters}
        onFiltersChange={(nextFilters) => {
          startTransition(() => {
            setFilters(nextFilters)
          })
        }}
      />

      <Divider type="line-brown" style={{ margin: '16px 0' }} />

      <TransactionTable
        transactions={transactions}
        accounts={accounts}
        filteredTransactions={filteredTransactions}
        filters={filters}
        onDelete={handleDelete}
        onEdit={handleEdit}
        selectedIds={visibleSelectedIds}
        onSelectionChange={setSelectedIds}
      />

      <EditTransactionDialog
        transactionId={editingTransactionId}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </div>
  )
}
