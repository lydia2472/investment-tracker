import { useCallback } from 'react'
import { toast } from 'sonner'

import { useAccountStore, useTransactionStore } from '@/lib/stores'

export function useAccountActions() {
  const deleteAccount = useAccountStore((state) => state.deleteAccount)
  const deleteAccounts = useAccountStore((state) => state.deleteAccounts)
  const updateAccount = useAccountStore((state) => state.updateAccount)
  const getAccount = useAccountStore((state) => state.getAccount)
  const deleteTransactionsByAccountIds = useTransactionStore(
    (state) => state.deleteTransactionsByAccountIds
  )
  const getTransactionsByAccount = useTransactionStore((state) => state.getTransactionsByAccount)

  const handleDelete = useCallback(
    (id: string, name: string) => {
      if (confirm(`确定要删除账户"${name}"吗？这将同时删除该账户的所有交易记录。`)) {
        deleteAccount(id)
      }
    },
    [deleteAccount]
  )

  const handleDeleteWithWarning = useCallback(
    (id: string, name: string) => {
      const warning = `警告：删除账户"${name}"将同时删除该账户的所有交易记录，且无法恢复！\n\n确定要继续吗？`
      if (confirm(warning)) {
        deleteAccount(id)
      }
    },
    [deleteAccount]
  )

  const handleBatchDelete = useCallback(
    (accountIds: string[]) => {
      if (accountIds.length === 0) {
        toast.error('请选择要删除的账户')
        return
      }

      // 获取账户信息
      const accounts = accountIds.map((id) => getAccount(id)).filter(Boolean)

      if (accounts.length === 0) {
        toast.error('未找到有效的账户')
        return
      }

      // 计算总交易数
      const totalTransactions = accountIds.reduce((sum, accountId) => {
        return sum + getTransactionsByAccount(accountId).length
      }, 0)

      // 确认对话框
      const accountNames = accounts.map((acc) => acc?.name).join('、')
      const confirmMessage = `确定要删除以下 ${accounts.length} 个账户吗？\n\n账户：${accountNames}\n关联交易：${totalTransactions} 条\n\n此操作不可撤销！`

      if (!confirm(confirmMessage)) {
        return
      }

      try {
        // 1. 先删除所有关联的交易
        deleteTransactionsByAccountIds(accountIds)

        // 2. 删除账户
        deleteAccounts(accountIds)

        // 3. 显示成功提示
        toast.success(`已成功删除 ${accounts.length} 个账户及其 ${totalTransactions} 条交易记录`)
      } catch (error) {
        console.error('批量删除账户失败:', error)
        toast.error('删除失败，请稍后重试')
      }
    },
    [getAccount, getTransactionsByAccount, deleteTransactionsByAccountIds, deleteAccounts]
  )

  return {
    handleDelete,
    handleDeleteWithWarning,
    handleBatchDelete,
    deleteAccount,
    updateAccount,
  }
}
