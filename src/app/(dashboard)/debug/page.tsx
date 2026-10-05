'use client'

import { useEffect, useState, useCallback } from 'react'
import { Button } from 'animal-island-ui'
import { RefreshCwIcon } from 'lucide-react'
import { toast } from 'sonner'
import { useAccountStore, useTransactionStore } from '@/lib/stores'
import { findDuplicateProfitTransactions, getDuplicateProfitIdsToDelete } from '@/lib/utils/cleanup-duplicate-profits'

export default function DebugPage() {
  const [profitTxns, setProfitTxns] = useState<any[]>([])
  const [duplicates, setDuplicates] = useState<Map<string, any[]>>(new Map())
  const [unknownAccountTxns, setUnknownAccountTxns] = useState<any[]>([])
  const [localStorageAccounts, setLocalStorageAccounts] = useState<any[]>([])
  const [isRefreshing, setIsRefreshing] = useState(false)

  const accounts = useAccountStore((state) => state.accounts)
  const deleteMultiple = useTransactionStore((state) => state.deleteMultiple)

  // 强制刷新localStorage数据
  const handleForceRefresh = useCallback(() => {
    setIsRefreshing(true)
    try {
      // 强制从localStorage重新读取账户数据
      const accountsStorage = localStorage.getItem('account-storage')
      if (accountsStorage) {
        const data = JSON.parse(accountsStorage)
        const state = typeof data.state === 'string' ? JSON.parse(data.state) : data.state
        const rawAccounts = state.accounts || []
        setLocalStorageAccounts(rawAccounts)

        console.log('[强制刷新] localStorage中的账户数据:', rawAccounts)
        console.log('[强制刷新] 账户数量:', rawAccounts.length)
        console.log('[强制刷新] 完整的localStorage数据:', data)

        // 同时触发zustand store的重新hydration
        useAccountStore.persist.rehydrate()

        toast.success(`已强制刷新，发现 ${rawAccounts.length} 个账户`)
      } else {
        toast.error('localStorage中没有账户数据')
      }

      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error) {
      console.error('刷新失败:', error)
      toast.error('刷新失败')
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    // 读取localStorage中的原始账户数据
    let validAccountIds = new Set<string>()
    try {
      const accountsStorage = localStorage.getItem('account-storage')
      if (accountsStorage) {
        const data = JSON.parse(accountsStorage)
        const state = typeof data.state === 'string' ? JSON.parse(data.state) : data.state
        const rawAccounts = state.accounts || []
        setLocalStorageAccounts(rawAccounts)

        // 使用localStorage中的账户数据构建有效账户ID集合（这是真实的数据）
        validAccountIds = new Set(rawAccounts.map((a: any) => a.id))

        console.log('[诊断页面] localStorage中的账户数量:', rawAccounts.length)
        console.log('[诊断页面] localStorage中的账户列表:', rawAccounts.map((a: any) => `${a.name} (${a.id})`))
      }
    } catch (error) {
      console.error('读取localStorage账户数据失败:', error)
    }

    console.log('[诊断页面] zustand store中的账户数量:', accounts.length)
    console.log('[诊断页面] zustand store中的账户列表:', accounts.map((a: any) => `${a.name} (${a.id})`))
    console.log('[诊断页面] 使用localStorage中的有效账户ID:', Array.from(validAccountIds))

    // 读取交易数据
    try {
      const transactionsStorage = localStorage.getItem('transaction-storage')
      if (transactionsStorage) {
        const data = JSON.parse(transactionsStorage)
        // Zustand persist 存储的格式可能是 {state: {...}}
        const state = typeof data.state === 'string' ? JSON.parse(data.state) : data.state
        const allTransactions = state.transactions || []

        // 查找未知账户的交易
        const unknownAccountTransactions = allTransactions.filter((t: any) => {
          // 账户ID为空或不在有效账户列表中
          return !t.accountId || !validAccountIds.has(t.accountId)
        })
        setUnknownAccountTxns(unknownAccountTransactions)
        console.log('[诊断页面] 发现未知账户交易数量:', unknownAccountTransactions.length)

        const profitTransactions = allTransactions.filter((t: any) =>
          t.tags && t.tags.includes('投资收益')
        )
        setProfitTxns(profitTransactions)

        // 检测重复交易
        const duplicateGroups = findDuplicateProfitTransactions(allTransactions)
        setDuplicates(duplicateGroups)
      }
    } catch (error) {
      console.error('解析交易数据失败:', error)
    }
  }, [accounts]) // 当账户变化时重新计算

  // 清理未知账户交易
  const handleCleanupUnknownAccounts = () => {
    try {
      if (unknownAccountTxns.length === 0) {
        toast.success('没有发现未知账户的交易')
        return
      }

      const idsToDelete = unknownAccountTxns.map((t) => t.id)

      if (confirm(`发现 ${unknownAccountTxns.length} 条未知账户的交易，确定要删除吗？`)) {
        // 使用强制清理：直接操作localStorage
        const transactionsStorage = localStorage.getItem('transaction-storage')
        if (!transactionsStorage) {
          toast.error('无法读取交易数据')
          return
        }

        const txData = JSON.parse(transactionsStorage)
        const txState = typeof txData.state === 'string' ? JSON.parse(txData.state) : txData.state
        const allTransactions = txState.transactions || []

        const idsSet = new Set(idsToDelete)
        const filteredTransactions = allTransactions.filter((t: any) => !idsSet.has(t.id))

        console.log(`[清理] 删除前: ${allTransactions.length} 条交易`)
        console.log(`[清理] 删除后: ${filteredTransactions.length} 条交易`)
        console.log(`[清理] 实际删除: ${allTransactions.length - filteredTransactions.length} 条交易`)

        // 保存修改后的数据
        txState.transactions = filteredTransactions
        if (typeof txData.state === 'string') {
          txData.state = JSON.stringify(txState)
        } else {
          txData.state = txState
        }
        localStorage.setItem('transaction-storage', JSON.stringify(txData))

        toast.success(`已强制删除 ${unknownAccountTxns.length} 条未知账户的交易`)

        // 刷新页面
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      }
    } catch (error) {
      console.error('清理未知账户交易失败:', error)
      toast.error('清理失败：' + (error instanceof Error ? error.message : '未知错误'))
    }
  }

  // 清理重复交易
  const handleCleanupDuplicates = () => {
    try {
      const transactionsStorage = localStorage.getItem('transaction-storage')
      if (!transactionsStorage) {
        toast.error('无法读取交易数据')
        return
      }

      const data = JSON.parse(transactionsStorage)
      const state = typeof data.state === 'string' ? JSON.parse(data.state) : data.state
      const allTransactions = state.transactions || []

      // 获取需要删除的重复交易ID
      const idsToDelete = getDuplicateProfitIdsToDelete(allTransactions)

      if (idsToDelete.length === 0) {
        toast.success('没有发现重复的交易')
        return
      }

      if (confirm(`发现 ${idsToDelete.length} 条重复交易，确定要删除吗？`)) {
        deleteMultiple(idsToDelete)
        toast.success(`已删除 ${idsToDelete.length} 条重复交易`)

        // 刷新页面
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      }
    } catch (error) {
      console.error('清理重复交易失败:', error)
      toast.error('清理失败：' + (error instanceof Error ? error.message : '未知错误'))
    }
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <h1 className="text-2xl font-bold">诊断页面</h1>

      {/* 收益交易 */}
      <div className="bg-white border rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-4">收益交易列表</h2>
        {profitTxns.length === 0 ? (
          <p className="text-gray-500">没有找到收益交易</p>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">序号</th>
                <th className="text-left p-2">账户ID</th>
                <th className="text-left p-2">描述</th>
                <th className="text-left p-2">金额</th>
                <th className="text-left p-2">标签</th>
              </tr>
            </thead>
            <tbody>
              {profitTxns.map((txn, index) => (
                <tr key={index} className="border-b">
                  <td className="p-2">{index + 1}</td>
                  <td className="p-2 font-mono text-sm">{txn.accountId}</td>
                  <td className="p-2">{txn.description}</td>
                  <td className="p-2">{txn.amount}</td>
                  <td className="p-2">{txn.tags?.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 系统账户 */}
      <div className="bg-white border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">系统账户对比</h2>
          <Button
            type="default"
            onClick={handleForceRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2"
          >
            <RefreshCwIcon className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            强制刷新
          </Button>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {/* Zustand Store */}
          <div>
            <h3 className="text-md font-semibold mb-2 text-blue-600">
              Zustand Store ({accounts.length} 个账户)
            </h3>
            {accounts.length === 0 ? (
              <p className="text-gray-500 text-sm">没有找到账户</p>
            ) : (
              <div className="space-y-1">
                {accounts.map((account, index) => (
                  <div key={account.id} className="text-sm p-1 bg-gray-50 rounded">
                    {index + 1}. {account.name} ({account.id.slice(0, 8)}...)
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* LocalStorage */}
          <div>
            <h3 className="text-md font-semibold mb-2 text-green-600">
              LocalStorage ({localStorageAccounts.length} 个账户)
            </h3>
            {localStorageAccounts.length === 0 ? (
              <p className="text-gray-500 text-sm">没有找到账户</p>
            ) : (
              <div className="space-y-1">
                {localStorageAccounts.map((account: any, index: number) => (
                  <div key={account.id} className="text-sm p-1 bg-gray-50 rounded">
                    {index + 1}. {account.name} ({account.id.slice(0, 8)}...)
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 警告信息 */}
        {accounts.length !== localStorageAccounts.length && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm text-yellow-800">
              ⚠️ <strong>数据不同步！</strong> Zustand Store有{accounts.length}个账户，LocalStorage有{localStorageAccounts.length}个账户。
            </p>
            <p className="text-xs text-yellow-700 mt-1">
              请刷新页面或检查浏览器控制台的详细日志。
            </p>
          </div>
        )}
      </div>

      {/* 诊断信息 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold mb-2">诊断说明</h2>
        <div className="text-sm space-y-2">
          <p>
            <strong>绿色背景</strong>表示账户ID匹配，该账户存在。
          </p>
          <p>
            <strong>白色背景</strong>表示账户ID不匹配，该账户可能不存在或已被删除。
          </p>
          <p className="text-red-600 font-semibold">
            如果有收益交易的账户ID在系统账户列表中找不到，这就是显示"未知账户"的原因。
          </p>
        </div>
      </div>

      {/* 未知账户交易 */}
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">未知账户交易</h2>
          {unknownAccountTxns.length > 0 && (
            <Button
              type="primary"
              danger
              onClick={handleCleanupUnknownAccounts}
            >
              清理 {unknownAccountTxns.length} 条未知账户交易
            </Button>
          )}
        </div>

        {unknownAccountTxns.length === 0 ? (
          <p className="text-sm text-muted-foreground">没有发现未知账户的交易</p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-red-700">
              发现 <strong>{unknownAccountTxns.length}</strong> 条引用了不存在账户的交易
            </p>

            <div className="bg-white border rounded p-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">序号</th>
                    <th className="text-left p-2">账户ID</th>
                    <th className="text-left p-2">描述</th>
                    <th className="text-left p-2">金额</th>
                    <th className="text-left p-2">类型</th>
                  </tr>
                </thead>
                <tbody>
                  {unknownAccountTxns.slice(0, 10).map((txn, index) => (
                    <tr key={txn.id} className="border-b">
                      <td className="p-2">{index + 1}</td>
                      <td className="p-2 font-mono text-xs text-red-600">{txn.accountId || '(空)'}</td>
                      <td className="p-2">{txn.description || '(无描述)'}</td>
                      <td className="p-2">{txn.amount || 0}</td>
                      <td className="p-2">{txn.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {unknownAccountTxns.length > 10 && (
                <p className="text-xs text-gray-500 mt-2">
                  还有 {unknownAccountTxns.length - 10} 条交易未显示...
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 重复交易检测 */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">重复交易检测</h2>
          {duplicates.size > 0 && (
            <Button
              type="primary"
              danger
              onClick={handleCleanupDuplicates}
            >
              清理 {duplicates.size} 组重复交易
            </Button>
          )}
        </div>

        {duplicates.size === 0 ? (
          <p className="text-sm text-muted-foreground">没有发现重复的投资收益交易</p>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-orange-700">
              发现 <strong>{duplicates.size}</strong> 组重复的投资收益/亏损交易
            </p>

            {Array.from(duplicates.entries()).map(([key, txns]) => (
              <div key={key} className="bg-white border rounded p-3 text-sm">
                <div className="font-medium mb-2">
                  {key.split('-').slice(1, 4).join('-')} {/* year-month-type */}
                </div>
                <div className="space-y-1">
                  {txns.map((txn, index) => (
                    <div
                      key={txn.id}
                      className={index === 0 ? 'text-green-700' : 'text-red-700'}
                      style={{ paddingLeft: `${index * 20}px` }}
                    >
                      {index === 0 ? '✓ ' : '✗ '}
                      {txn.description || '(无描述)'} - {(txn.amount || 0).toFixed(2)}元
                      {txn.tags && ` [${txn.tags.join(', ')}]`}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
