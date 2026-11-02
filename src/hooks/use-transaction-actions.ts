import { useCallback } from 'react'

import { confirmAsync } from '@/components/ui/confirm-dialog'
import { useTransactionStore } from '@/lib/stores'

export function useTransactionActions() {
  const deleteTransaction = useTransactionStore((state) => state.deleteTransaction)
  const updateTransaction = useTransactionStore((state) => state.updateTransaction)

  const handleDelete = useCallback(
    async (id: string) => {
      if (await confirmAsync({ title: '确定要删除这条交易记录吗？', danger: true })) {
        deleteTransaction(id)
      }
    },
    [deleteTransaction]
  )

  const handleDeleteWithDescription = useCallback(
    async (id: string, description: string) => {
      if (await confirmAsync({ title: `确定要删除交易"${description}"吗？`, danger: true })) {
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
