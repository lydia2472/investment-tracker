/**
 * 在浏览器控制台运行此脚本来检查账户数据
 */

(function checkAccountData() {
  console.log('========== 账户数据检查 ==========')

  // 1. 检查localStorage中的account-storage
  const accountStorage = localStorage.getItem('account-storage')
  if (accountStorage) {
    const data = JSON.parse(accountStorage)
    const state = typeof data.state === 'string' ? JSON.parse(data.state) : data.state
    const accounts = state.accounts || []
    console.log('1. localStorage account-storage:', accounts.length, '个账户')
    console.log('   账户列表:', accounts.map(a => `${a.name} (${a.id})`))
  } else {
    console.log('1. localStorage account-storage: 不存在')
  }

  // 2. 检查所有localStorage keys
  console.log('2. 所有localStorage keys:')
  Object.keys(localStorage).forEach(key => {
    if (key.includes('account') || key.includes('Account')) {
      const data = localStorage.getItem(key)
      console.log(`   ${key}:`, data ? data.substring(0, 100) + '...' : 'empty')
    }
  })

  // 3. 检查是否有其他存储
  const allKeys = Object.keys(localStorage)
  console.log('3. 所有localStorage keys总数:', allKeys.length)
  console.log('   完整列表:', allKeys)

  // 4. 检查页面上的实际DOM元素
  const accountCards = document.querySelectorAll('[data-testid*="account"], .account-card, [class*="account"]')
  console.log('4. 页面上找到的账户相关DOM元素:', accountCards.length)

  // 5. 如果使用React DevTools，尝试获取React state
  console.log('========== 检查完成 ==========')
  console.log('请在控制台运行以下命令查看更多信息:')
  console.log('- Object.keys(localStorage)')
  console.log('- localStorage.getItem("account-storage")')
  console.log('- document.documentElement.innerHTML')
})()
