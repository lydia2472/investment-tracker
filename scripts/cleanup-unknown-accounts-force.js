/**
 * 强制清理未知账户交易脚本（增强版）
 * 直接操作localStorage，不依赖应用状态
 * 在浏览器控制台运行此脚本
 */

(function cleanupUnknownAccountsForce() {
  console.log('[强制清理] 开始强制清理未知账户交易...')

  try {
    // 1. 读取交易数据
    const transactionsStorage = localStorage.getItem('transaction-storage')
    if (!transactionsStorage) {
      console.error('[强制清理] 无法读取交易数据')
      alert('无法读取交易数据')
      return
    }

    const txData = JSON.parse(transactionsStorage)
    const txState = typeof txData.state === 'string' ? JSON.parse(txData.state) : txData.state
    const allTransactions = txState.transactions || []

    console.log(`[强制清理] 读取到 ${allTransactions.length} 条交易`)

    // 2. 读取账户数据
    const accountsStorage = localStorage.getItem('account-storage')
    if (!accountsStorage) {
      console.error('[强制清理] 无法读取账户数据')
      alert('无法读取账户数据')
      return
    }

    const accData = JSON.parse(accountsStorage)
    const accState = typeof accData.state === 'string' ? JSON.parse(accData.state) : accData.state
    const accounts = accState.accounts || []
    const validAccountIds = new Set(accounts.map((a) => a.id))

    console.log(`[强制清理] 系统中有 ${accounts.length} 个有效账户`)
    console.log(`[强制清理] 有效账户ID列表:`, Array.from(validAccountIds))

    // 3. 查找未知账户的交易
    const unknownAccountTransactions = allTransactions.filter((t) => {
      return !t.accountId || !validAccountIds.has(t.accountId)
    })

    console.log(`[强制清理] 发现 ${unknownAccountTransactions.length} 条未知账户的交易`)

    if (unknownAccountTransactions.length === 0) {
      alert('没有发现未知账户的交易')
      console.log('[强制清理] 没有发现未知账户的交易，无需清理')
      return
    }

    // 4. 显示前10条待删除的交易
    console.log('[强制清理] 待删除的交易列表（前10条）:')
    unknownAccountTransactions.slice(0, 10).forEach((txn, index) => {
      console.log(
        `  ${index + 1}. ID: ${txn.id}, 账户ID: ${txn.accountId || '(空)'}, 描述: ${txn.description || '(无)'}, 金额: ${txn.amount || 0}, 类型: ${txn.type}`
      )
    })

    if (unknownAccountTransactions.length > 10) {
      console.log(`[强制清理] 还有 ${unknownAccountTransactions.length - 10} 条交易未显示`)
    }

    // 5. 确认删除
    const shouldDelete = confirm(
      `发现 ${unknownAccountTransactions.length} 条未知账户的交易，确定要删除吗？\n\n这个操作不可撤销！`
    )

    if (!shouldDelete) {
      console.log('[强制清理] 用户取消删除')
      return
    }

    // 6. 执行删除：直接修改localStorage
    const idsToDelete = new Set(unknownAccountTransactions.map((t) => t.id))
    const filteredTransactions = allTransactions.filter((t) => !idsToDelete.has(t.id))

    console.log(`[强制清理] 删除前: ${allTransactions.length} 条交易`)
    console.log(`[强制清理] 删除后: ${filteredTransactions.length} 条交易`)
    console.log(`[强制清理] 实际删除: ${allTransactions.length - filteredTransactions.length} 条交易`)

    // 7. 保存修改后的数据
    txState.transactions = filteredTransactions

    // 处理state可能是字符串的情况
    if (typeof txData.state === 'string') {
      txData.state = JSON.stringify(txState)
    } else {
      txData.state = txState
    }

    localStorage.setItem('transaction-storage', JSON.stringify(txData))

    console.log('[强制清理] 已保存修改后的交易数据')

    // 8. 验证删除结果
    const verifyData = JSON.parse(localStorage.getItem('transaction-storage') || '{}')
    const verifyState = typeof verifyData.state === 'string' ? JSON.parse(verifyData.state) : verifyData.state
    const verifyCount = verifyState.transactions?.length || 0

    console.log(`[强制清理] 验证：当前localStorage中有 ${verifyCount} 条交易`)

    // 9. 成功提示并刷新页面
    alert(`✅ 成功删除 ${unknownAccountTransactions.length} 条未知账户交易！\n\n页面即将刷新...`)

    console.log('[强制清理] 操作成功，2秒后刷新页面...')
    setTimeout(() => {
      location.reload()
    }, 2000)
  } catch (error) {
    console.error('[强制清理] 清理失败:', error)
    alert('清理失败：' + (error instanceof Error ? error.message : '未知错误'))
  }
})()
