/**
 * 彻底清理未知账户交易记录
 * 运行方式：node scripts/cleanup-unknown-transactions-final.js
 */

// 读取 localStorage 数据
function getLocalStorageData() {
  // 读取账户数据
  const accountsStorage = localStorage.getItem('account-storage')
  const transactionsStorage = localStorage.getItem('transaction-storage')

  if (!accountsStorage || !transactionsStorage) {
    console.error('无法读取 localStorage 数据')
    return null
  }

  // 解析账户数据
  const accountsData = JSON.parse(accountsStorage)
  const accountsState = typeof accountsData.state === 'string'
    ? JSON.parse(accountsData.state)
    : accountsData.state
  const accounts = accountsState.accounts || []

  // 解析交易数据
  const transactionsData = JSON.parse(transactionsStorage)
  const transactionsState = typeof transactionsData.state === 'string'
    ? JSON.parse(transactionsData.state)
    : transactionsData.state
  const transactions = transactionsState.transactions || []

  return { accounts, transactions, accountsData, transactionsData }
}

// 分析未知账户交易
function analyzeUnknownAccounts() {
  const data = getLocalStorageData()
  if (!data) {
    console.error('无法获取数据')
    return
  }

  const { accounts, transactions } = data

  // 构建有效账户ID集合
  const validAccountIds = new Set(accounts.map(a => a.id))

  console.log('========== 账户数据检查 ==========')
  console.log(`✅ 有效账户数量: ${accounts.length}`)
  console.log(`✅ 有效账户ID列表:`, Array.from(validAccountIds))

  // 查找未知账户的交易
  const unknownAccountTxns = transactions.filter(t => {
    return !t.accountId || !validAccountIds.has(t.accountId)
  })

  console.log(`\n========== 交易数据检查 ==========`)
  console.log(`✅ 交易总数: ${transactions.length}`)
  console.log(`⚠️  未知账户交易数量: ${unknownAccountTxns.length}`)

  if (unknownAccountTxns.length > 0) {
    console.log('\n========== 未知账户交易详情 ==========')

    // 按账户ID分组统计
    const byAccount = new Map()
    unknownAccountTxns.forEach(t => {
      const accountId = t.accountId || '(空)'
      if (!byAccount.has(accountId)) {
        byAccount.set(accountId, [])
      }
      byAccount.get(accountId).push(t)
    })

    console.log('按账户ID分组统计:')
    byAccount.forEach((txns, accountId) => {
      console.log(`\n账户ID: ${accountId}`)
      console.log(`  交易数量: ${txns.length}`)
      console.log(`  前5条交易:`)
      txns.slice(0, 5).forEach((t, i) => {
        console.log(`    ${i + 1}. ${t.description || '(无描述)'} - 金额: ${t.amount || 0} - 类型: ${t.type}`)
      })
    })

    return { unknownAccountTxns, byAccount, transactions, transactionsData: data.transactionsData }
  }

  console.log('\n✅ 没有发现未知账户的交易')
  return null
}

// 清理未知账户交易
function cleanupUnknownTransactions() {
  const analysis = analyzeUnknownAccounts()

  if (!analysis) {
    console.log('没有需要清理的交易')
    return
  }

  const { unknownAccountTxns, transactions, transactionsData } = analysis

  console.log('\n========== 开始清理 ==========')

  const idsToDelete = new Set(unknownAccountTxns.map(t => t.id))
  console.log(`准备删除 ${idsToDelete.size} 条未知账户的交易`)

  // 过滤交易
  const filteredTransactions = transactions.filter(t => !idsToDelete.has(t.id))

  console.log(`删除前: ${transactions.length} 条交易`)
  console.log(`删除后: ${filteredTransactions.length} 条交易`)
  console.log(`实际删除: ${transactions.length - filteredTransactions.length} 条交易`)

  // 保存修改后的数据
  const txData = transactionsData
  const txState = typeof txData.state === 'string'
    ? JSON.parse(txData.state)
    : txData.state

  txState.transactions = filteredTransactions

  if (typeof txData.state === 'string') {
    txData.state = JSON.stringify(txState)
  } else {
    txData.state = txState
  }

  localStorage.setItem('transaction-storage', JSON.stringify(txData))

  console.log('\n✅ 清理完成！')
  console.log('请刷新页面以查看更新后的数据')
}

// 执行清理
console.log('开始分析未知账户交易...\n')
cleanupUnknownTransactions()
