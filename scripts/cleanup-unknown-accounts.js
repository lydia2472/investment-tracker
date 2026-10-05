/**
 * 清理未知账户交易脚本
 * 在浏览器控制台运行此脚本来删除所有引用无效账户的交易
 */

(function cleanupUnknownAccounts() {
  console.log('[清理脚本] 开始清理未知账户交易...')

  try {
    // 读取交易数据
    const transactionsStorage = localStorage.getItem('transaction-storage')
    if (!transactionsStorage) {
      console.error('[清理脚本] 无法读取交易数据')
      return
    }

    const data = JSON.parse(transactionsStorage)
    const state = typeof data.state === 'string' ? JSON.parse(data.state) : data.state
    const allTransactions = state.transactions || []

    // 读取账户数据
    const accountsStorage = localStorage.getItem('account-storage')
    if (!accountsStorage) {
      console.error('[清理脚本] 无法读取账户数据')
      return
    }

    const accountsData = JSON.parse(accountsStorage)
    const accountsState = typeof accountsData.state === 'string' ? JSON.parse(accountsData.state) : accountsData.state
    const accounts = accountsState.accounts || []
    const validAccountIds = new Set(accounts.map((a) => a.id))

    console.log(`[清理脚本] 系统中有 ${accounts.length} 个有效账户`)
    console.log(`[清理脚本] 总共有 ${allTransactions.length} 条交易`)

    // 查找未知账户的交易
    const unknownAccountTransactions = allTransactions.filter((t) => {
      // 账户ID为空或不在有效账户列表中
      return !t.accountId || !validAccountIds.has(t.accountId)
    })

    console.log(`[清理脚本] 发现 ${unknownAccountTransactions.length} 条未知账户的交易`)

    if (unknownAccountTransactions.length === 0) {
      console.log('[清理脚本] 没有发现未知账户的交易，无需清理')
      return
    }

    // 显示前10条
    console.log('[清理脚本] 未知账户交易列表（前10条）:')
    unknownAccountTransactions.slice(0, 10).forEach((txn, index) => {
      console.log(
        `  ${index + 1}. ID: ${txn.id}, 账户ID: ${txn.accountId || '(空)'}, 描述: ${txn.description || '(无)'}, 金额: ${txn.amount}, 类型: ${txn.type}`
      )
    })

    if (unknownAccountTransactions.length > 10) {
      console.log(`[清理脚本] 还有 ${unknownAccountTransactions.length - 10} 条交易未显示`)
    }

    // 询问是否删除
    const shouldDelete = confirm(
      `发现 ${unknownAccountTransactions.length} 条未知账户的交易，确定要删除吗？\n\n这个操作不可撤销！`
    )

    if (!shouldDelete) {
      console.log('[清理脚本] 用户取消删除')
      return
    }

    // 获取交易存储的删除函数
    // 注意：这需要应用已经加载并且useTransactionStore可用
    const event = new CustomEvent('cleanup-unknown-accounts', {
      detail: { idsToDelete: unknownAccountTransactions.map((t) => t.id) }
    })
    window.dispatchEvent(event)

    console.log(`[清理脚本] 已发送删除请求，请刷新页面查看结果`)
    console.log(`[清理脚本] 如果交易没有被删除，请手动刷新页面或访问 /debug 页面使用清理按钮`)
  } catch (error) {
    console.error('[清理脚本] 清理失败:', error)
  }
})()
