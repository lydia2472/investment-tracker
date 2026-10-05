/**
 * 诊断未知账户交易
 * 在Electron的开发者工具控制台中运行
 */

(function diagnoseUnknownAccounts() {
  console.log('========== 开始诊断未知账户 ==========')

  // 1. 读取账户数据
  const accountStorage = localStorage.getItem('account-storage')
  if (!accountStorage) {
    console.error('❌ 无法读取账户数据')
    return
  }

  const accData = JSON.parse(accountStorage)
  const accState = typeof accData.state === 'string' ? JSON.parse(accData.state) : accData.state
  const accounts = accState.accounts || []
  const validAccountIds = new Set(accounts.map((a) => a.id))

  console.log('✅ 系统中的有效账户数量:', accounts.length)
  console.log('✅ 有效账户ID列表:', Array.from(validAccountIds))

  // 2. 读取交易数据
  const txStorage = localStorage.getItem('transaction-storage')
  if (!txStorage) {
    console.error('❌ 无法读取交易数据')
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
    console.log('✅ 没有发现未知账户的交易')
    return
  }

  // 4. 分析未知账户的交易
  console.log('\n========== 未知账户交易详情 ==========')

  // 按accountId分组
  const byAccountId = new Map()
  unknownAccountTransactions.forEach((t) => {
    const id = t.accountId || '(空)'
    if (!byAccountId.has(id)) {
      byAccountId.set(id, [])
    }
    byAccountId.get(id).push(t)
  })

  console.log('按账户ID分组统计:')
  byAccountId.forEach((txns, accountId) => {
    console.log(`\n账户ID: ${accountId}`)
    console.log(`  交易数量: ${txns.length}`)
    console.log(`  前5条交易:`)
    txns.slice(0, 5).forEach((t, i) => {
      console.log(`    ${i + 1}. ${t.description || '(无描述)'} - 金额: ${t.amount || 0} - 类型: ${t.type}`)
    })
  })

  // 5. 检查是否所有账户都是真正"未知"的
  console.log('\n========== 验证账户ID ==========')
  const allAccountIdsInTxns = new Set(allTransactions.filter(t => t.accountId).map(t => t.accountId))
  console.log('交易中使用的所有账户ID数量:', allAccountIdsInTxns.size)

  const missingAccountIds = []
  allAccountIdsInTxns.forEach((id) => {
    if (!validAccountIds.has(id)) {
      missingAccountIds.push(id)
    }
  })

  console.log('不在系统中的账户ID数量:', missingAccountIds.length)
  if (missingAccountIds.length > 0) {
    console.log('不在系统中的账户ID列表:', missingAccountIds)
  }

  console.log('\n========== 诊断完成 ==========')
  console.log('建议操作:')
  console.log('1. 如果发现未知账户交易，点击debug页面的"清理"按钮')
  console.log('2. 或者运行强制清理脚本')
})()
