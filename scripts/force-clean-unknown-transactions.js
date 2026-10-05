/**
 * 强制清理所有未知账户交易（直接操作localStorage）
 * 在Electron的开发者工具控制台中运行
 */

(function forceCleanUnknownTransactions() {
  console.log('========== 开始强制清理 ==========')

  try {
    // 1. 读取账户数据
    const accountStorage = localStorage.getItem('account-storage')
    if (!accountStorage) {
      console.error('❌ 无法读取账户数据')
      alert('无法读取账户数据')
      return
    }

    const accData = JSON.parse(accountStorage)
    const accState = typeof accData.state === 'string' ? JSON.parse(accData.state) : accData.state
    const accounts = accState.accounts || []
    const validAccountIds = new Set(accounts.map((a) => a.id))

    console.log('✅ 系统中的有效账户数量:', accounts.length)

    // 2. 读取交易数据
    const txStorage = localStorage.getItem('transaction-storage')
    if (!txStorage) {
      console.error('❌ 无法读取交易数据')
      alert('无法读取交易数据')
      return
    }

    const txData = JSON.parse(txStorage)
    const txState = typeof txData.state === 'string' ? JSON.parse(txData.state) : txData.state
    const allTransactions = txState.transactions || []

    console.log('✅ 交易总数:', allTransactions.length)

    // 3. 查找未知账户的交易
    const unknownAccountTransactions = allTransactions.filter((t) => {
      return !t.accountId || !validAccountIds.has(t.accountId)
    })

    console.log('⚠️  发现未知账户交易数量:', unknownAccountTransactions.length)

    if (unknownAccountTransactions.length === 0) {
      console.log('✅ 没有发现未知账户的交易，无需清理')
      alert('没有发现未知账户的交易')
      return
    }

    // 4. 显示待删除的交易样本
    console.log('\n前10条待删除的交易:')
    unknownAccountTransactions.slice(0, 10).forEach((t, i) => {
      console.log(`  ${i + 1}. ID: ${t.id}, 账户ID: ${t.accountId || '(空)'}, 描述: ${t.description || '(无)'}, 金额: ${t.amount || 0}`)
    })

    // 5. 确认删除
    const confirmed = confirm(
      `发现 ${unknownAccountTransactions.length} 条未知账户的交易，确定要删除吗？\n\n这个操作不可撤销！`
    )

    if (!confirmed) {
      console.log('❌ 用户取消删除')
      return
    }

    // 6. 执行删除
    const idsToDelete = new Set(unknownAccountTransactions.map((t) => t.id))
    const filteredTransactions = allTransactions.filter((t) => !idsToDelete.has(t.id))

    console.log(`\n删除前: ${allTransactions.length} 条交易`)
    console.log(`删除后: ${filteredTransactions.length} 条交易`)
    console.log(`实际删除: ${allTransactions.length - filteredTransactions.length} 条交易`)

    // 7. 保存修改后的数据
    txState.transactions = filteredTransactions

    if (typeof txData.state === 'string') {
      txData.state = JSON.stringify(txState)
    } else {
      txData.state = txState
    }

    localStorage.setItem('transaction-storage', JSON.stringify(txData))

    console.log('✅ 已保存修改后的交易数据')

    // 8. 验证删除结果
    const verifyData = JSON.parse(localStorage.getItem('transaction-storage') || '{}')
    const verifyState = typeof verifyData.state === 'string' ? JSON.parse(verifyData.state) : verifyData.state
    const verifyCount = verifyState.transactions?.length || 0

    console.log(`✅ 验证：当前localStorage中有 ${verifyCount} 条交易`)

    // 9. 成功提示
    alert(`✅ 成功删除 ${unknownAccountTransactions.length} 条未知账户交易！\n\n页面即将刷新...`)

    console.log('✅ 操作成功，2秒后刷新页面...')
    setTimeout(() => {
      location.reload()
    }, 2000)

  } catch (error) {
    console.error('❌ 清理失败:', error)
    alert('清理失败：' + (error instanceof Error ? error.message : '未知错误'))
  }

  console.log('========== 清理完成 ==========')
})()
