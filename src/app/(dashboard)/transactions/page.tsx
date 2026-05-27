'use client'

import { useState } from 'react'
import { useTransactionStore, useAccountStore } from '@/lib/stores'
import { Divider } from 'animal-island-ui'
import { TransactionTable } from '@/components/transactions/transaction-table'
import { TransactionFilters, type TransactionFilters as TransactionFiltersType } from '@/components/transactions/transaction-filters'
import { AddTransactionDialog } from '@/components/transactions/add-transaction-dialog'
import { EditTransactionDialog } from '@/components/transactions/edit-transaction-dialog'
import { ExportDialog } from '@/components/transactions/export-dialog'
import { ImportDialog } from '@/components/transactions/import-dialog'
import { useTransactionActions } from '@/hooks/use-transaction-actions'
import { Button } from 'animal-island-ui'
import { PlusIcon } from '@/lib/components/icon-adapter'

export default function TransactionsPage() {
  const transactions = useTransactionStore((state) => state.transactions)
  const accounts = useAccountStore((state) => state.accounts)
  const { handleDelete } = useTransactionActions()

  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null)
  const [filters, setFilters] = useState<TransactionFiltersType>({})

  // 根据筛选条件过滤交易
  const getFilteredTransactions = () => {
    return transactions.filter(txn => {
      if (filters.accountId && txn.accountId !== filters.accountId) return false
      if (filters.type && txn.type !== filters.type) return false
      if (filters.tags && filters.tags.length > 0) {
        if (!txn.tags || txn.tags.length === 0) return false
        const hasAllTags = filters.tags.every(tag => txn.tags?.includes(tag))
        if (!hasAllTags) return false
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        const account = accounts.find(a => a.id === txn.accountId)
        const accountName = account?.name.toLowerCase() || ''
        const description = (txn.description || '').toLowerCase()
        if (!accountName.includes(searchLower) && !description.includes(searchLower)) {
          return false
        }
      }
      return true
    })
  }

  const filteredTransactions = getFilteredTransactions()

  const handleEdit = (id: string) => {
    setEditingTransactionId(id)
    setEditDialogOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">交易记录</h2>
          <p className="text-muted-foreground">
            查看和管理所有交易流水
          </p>
        </div>
        <div className="flex gap-2">
          <ExportDialog
            transactions={transactions}
            filteredTransactions={filteredTransactions}
            accounts={accounts}
          />
          <ImportDialog />
          <AddTransactionDialog
            trigger={
              <Button type="primary" className="bg-[#5ec850]" icon={<PlusIcon className="h-4 w-4" />}>
                添加交易
              </Button>
            }
          />
        </div>
      </div>

      <TransactionFilters
        filters={filters}
        onFiltersChange={setFilters}
      />

      <Divider type="line-brown" style={{ margin: '16px 0' }} />

      <TransactionTable
        transactions={transactions}
        accounts={accounts}
        filters={filters}
        onDelete={handleDelete}
        onEdit={handleEdit}
      />

      <EditTransactionDialog
        transactionId={editingTransactionId}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
    </div>
  )
}
