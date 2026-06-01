/**
 * 清理重复交易记录和快照的工具函数
 * 可以在浏览器控制台或应用中调用
 */

import { useTransactionStore } from '@/lib/stores/transaction-store'
import { useSnapshotStore } from '@/lib/stores/snapshot-store'

export interface CleanupResult {
  duplicateTransactions: number
  duplicateSnapshots: number
  remainingTransactions: number
  remainingSnapshots: number
  removedTransactionIds: string[]
  removedSnapshotIds: string[]
}

/**
 * 清理重复的交易记录和快照
 * @returns 清理结果统计
 */
export function cleanupDuplicates(): CleanupResult {
  console.log('========== 开始清理重复记录 ==========')

  // 获取所有数据
  const transactionStore = useTransactionStore.getState()
  const snapshotStore = useSnapshotStore.getState()

  const transactions = transactionStore.transactions
  const snapshots = snapshotStore.snapshots

  console.log('原始交易数量:', transactions.length)
  console.log('原始快照数量:', snapshots.length)

  // 1. 查找重复的交易（基于 accountId + createdAt + type）
  const transactionMap = new Map<string, string>()
  const duplicateTransactionIds: string[] = []
  const duplicateTransactionDetails: any[] = []

  transactions.forEach((txn) => {
    const date = txn.createdAt instanceof Date ? txn.createdAt : new Date(txn.createdAt)
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const key = `${txn.accountId}:${dateKey}:${txn.type}`

    if (transactionMap.has(key)) {
      // 发现重复
      duplicateTransactionIds.push(txn.id)
      duplicateTransactionDetails.push({
        key,
        existingId: transactionMap.get(key),
        duplicateId: txn.id,
        accountId: txn.accountId,
        date: dateKey,
        type: txn.type
      })
    } else {
      // 第一次出现
      transactionMap.set(key, txn.id)
    }
  })

  // 2. 查找重复的快照（基于 accountId + snapshotDate）
  const snapshotMap = new Map<string, string>()
  const duplicateSnapshotIds: string[] = []
  const duplicateSnapshotDetails: any[] = []

  snapshots.forEach((snap) => {
    const date = snap.snapshotDate instanceof Date ? snap.snapshotDate : new Date(snap.snapshotDate)
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const key = `${snap.accountId}:${dateKey}`

    if (snapshotMap.has(key)) {
      // 发现重复
      duplicateSnapshotIds.push(snap.id)
      duplicateSnapshotDetails.push({
        key,
        existingId: snapshotMap.get(key),
        duplicateId: snap.id,
        accountId: snap.accountId,
        date: dateKey
      })
    } else {
      // 第一次出现
      snapshotMap.set(key, snap.id)
    }
  })

  // 输出重复详情
  if (duplicateTransactionDetails.length > 0) {
    console.log('发现重复交易:', duplicateTransactionDetails.length, '条')
    console.table(duplicateTransactionDetails)
  }

  if (duplicateSnapshotDetails.length > 0) {
    console.log('发现重复快照:', duplicateSnapshotDetails.length, '条')
    console.table(duplicateSnapshotDetails)
  }

  // 3. 删除重复的交易
  if (duplicateTransactionIds.length > 0) {
    transactionStore.deleteMultiple(duplicateTransactionIds)
    console.log('✓ 已删除', duplicateTransactionIds.length, '条重复交易')
  }

  // 4. 删除重复的快照
  if (duplicateSnapshotIds.length > 0) {
    duplicateSnapshotIds.forEach((id) => {
      snapshotStore.deleteSnapshot(id)
    })
    console.log('✓ 已删除', duplicateSnapshotIds.length, '条重复快照')
  }

  // 5. 返回结果
  const result: CleanupResult = {
    duplicateTransactions: duplicateTransactionIds.length,
    duplicateSnapshots: duplicateSnapshotIds.length,
    remainingTransactions: transactionStore.transactions.length,
    remainingSnapshots: snapshotStore.snapshots.length,
    removedTransactionIds: duplicateTransactionIds,
    removedSnapshotIds: duplicateSnapshotIds
  }

  console.log('========== 清理完成 ==========')
  console.log('最终交易数量:', result.remainingTransactions)
  console.log('最终快照数量:', result.remainingSnapshots)

  return result
}

/**
 * 仅检查重复，不删除
 */
export function checkDuplicates() {
  const transactionStore = useTransactionStore.getState()
  const snapshotStore = useSnapshotStore.getState()

  const transactions = transactionStore.transactions
  const snapshots = snapshotStore.snapshots

  console.log('========== 检查重复记录 ==========')
  console.log('交易数量:', transactions.length)
  console.log('快照数量:', snapshots.length)

  // 查找重复的交易
  const transactionMap = new Map<string, any>()
  const duplicateTransactions: any[] = []

  transactions.forEach((txn) => {
    const date = txn.createdAt instanceof Date ? txn.createdAt : new Date(txn.createdAt)
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const key = `${txn.accountId}:${dateKey}:${txn.type}`

    if (transactionMap.has(key)) {
      duplicateTransactions.push({
        ...txn,
        existingId: transactionMap.get(key).id
      })
    } else {
      transactionMap.set(key, txn)
    }
  })

  // 查找重复的快照
  const snapshotMap = new Map<string, any>()
  const duplicateSnapshots: any[] = []

  snapshots.forEach((snap) => {
    const date = snap.snapshotDate instanceof Date ? snap.snapshotDate : new Date(snap.snapshotDate)
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const key = `${snap.accountId}:${dateKey}`

    if (snapshotMap.has(key)) {
      duplicateSnapshots.push({
        ...snap,
        existingId: snapshotMap.get(key).id
      })
    } else {
      snapshotMap.set(key, snap)
    }
  })

  console.log('重复交易:', duplicateTransactions.length, '条')
  if (duplicateTransactions.length > 0) {
    console.table(duplicateTransactions.map((d, i) => ({
      '#': i + 1,
      '账户ID': d.accountId,
      '日期': new Date(d.createdAt).toLocaleDateString(),
      '类型': d.type,
      '保留ID': d.existingId,
      '删除ID': d.id
    })))
  }

  console.log('重复快照:', duplicateSnapshots.length, '条')
  if (duplicateSnapshots.length > 0) {
    console.table(duplicateSnapshots.map((d, i) => ({
      '#': i + 1,
      '账户ID': d.accountId,
      '日期': new Date(d.snapshotDate).toLocaleDateString(),
      '保留ID': d.existingId,
      '删除ID': d.id
    })))
  }

  return {
    duplicateTransactions,
    duplicateSnapshots
  }
}

// 将函数暴露到全局，以便在控制台调用
if (typeof window !== 'undefined') {
  ;(window as any).cleanupDuplicates = cleanupDuplicates
  ;(window as any).checkDuplicates = checkDuplicates
  console.log('✓ 清理工具已加载')
  console.log('  - checkDuplicates() 检查重复记录')
  console.log('  - cleanupDuplicates() 清理重复记录')
}
