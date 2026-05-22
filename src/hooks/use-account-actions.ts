import { useCallback } from 'react'
import { useAccountStore } from '@/lib/stores'

export function useAccountActions() {
  const deleteAccount = useAccountStore((state) => state.deleteAccount)
  const updateAccount = useAccountStore((state) => state.updateAccount)

  const handleDelete = useCallback((id: string, name: string) => {
    if (confirm(`确定要删除账户"${name}"吗？这将同时删除该账户的所有交易记录。`)) {
      deleteAccount(id)
    }
  }, [deleteAccount])

  const handleDeleteWithWarning = useCallback((id: string, name: string) => {
    const warning = `警告：删除账户"${name}"将同时删除该账户的所有交易记录，且无法恢复！\n\n确定要继续吗？`
    if (confirm(warning)) {
      deleteAccount(id)
    }
  }, [deleteAccount])

  return {
    handleDelete,
    handleDeleteWithWarning,
    deleteAccount,
    updateAccount,
  }
}
