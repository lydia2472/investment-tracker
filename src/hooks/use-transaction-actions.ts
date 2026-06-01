import { useCallback } from 'react'

import { useTransactionStore } from '@/lib/stores'

export function useTransactionActions() {
  const deleteTransaction = useTransactionStore((state) => state.deleteTransaction)
  const updateTransaction = useTransactionStore((state) => state.updateTransaction)

  const handleDelete = useCallback(
    (id: string) => {
      if (confirm('确定要删除这条交易记录吗？')) {
        deleteTransaction(id)
      }
    },
    [deleteTransaction]
  )

  const handleDeleteWithDescription = useCallback(
    (id: string, description: string) => {
      if (confirm(`确定要删除交易"${description}"吗？`)) {
        deleteTransaction(id)
      }
    },
    [deleteTransaction]
  )

  return {
    handleDelete,
    handleDeleteWithDescription,
    deleteTransaction,
    updateTransaction,
  }
}
