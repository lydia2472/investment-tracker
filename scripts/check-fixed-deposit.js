// 定期存款账户诊断脚本
// 在浏览器控制台运行此脚本来检查定期存款配置

console.log('%c========== 定期存款账户诊断 ==========', 'color: #ff0000; font-size: 16px; font-weight: bold;');

// 从localStorage读取账户数据
const accountsData = localStorage.getItem('account-storage');
if (!accountsData) {
  console.error('❌ 没有找到账户数据');
} else {
  const parsed = JSON.parse(accountsData);
  const accounts = parsed.state.accounts;

  console.log(`📊 总账户数: ${accounts.length}`);

  // 筛选定期存款账户
  const fixedDepositAccounts = accounts.filter(acc => acc.type === 'fixed_deposit');

  console.log(`\n🏦 定期存款账户数: ${fixedDepositAccounts.length}`);

  if (fixedDepositAccounts.length === 0) {
    console.warn('⚠️ 没有找到定期存款账户！');
    console.log('所有账户类型:', accounts.map(a => `${a.name} (${a.type})`));
  } else {
    fixedDepositAccounts.forEach((account, index) => {
      console.log(`\n%c定期存款账户 #${index + 1}:`, 'color: #00ff00; font-weight: bold;');
      console.log(`  名称: ${account.name}`);
      console.log(`  ID: ${account.id}`);
      console.log(`  余额: ${account.balance}`);
      console.log(`  类型: ${account.type}`);
      console.log(`  创建时间: ${account.createdAt}`);
      console.log(`  更新时间: ${account.updatedAt}`);

      if (account.fixedDepositConfig) {
        const config = account.fixedDepositConfig;
        console.log(`  %c✅ 有定期存款配置:`, 'color: #00ff00; font-weight: bold;');
        console.log(`    本金: ${config.principal}`);
        console.log(`    年利率: ${config.interestRate}%`);
        console.log(`    起息日: ${config.startDate}`);
        console.log(`    到期日: ${config.maturityDate}`);
        console.log(`    付息频率: ${config.interestPaymentFrequency}`);
        console.log(`    自动滚存: ${config.autoRollOver}`);

        // 检查日期是否有效
        const startDate = new Date(config.startDate);
        const maturityDate = new Date(config.maturityDate);
        const today = new Date();

        console.log(`\n    日期检查:`);
        console.log(`      起息日解析: ${startDate instanceof Date && !isNaN(startDate) ? '✅' : '❌'} ${startDate.toLocaleDateString('zh-CN')}`);
        console.log(`      到期日解析: ${maturityDate instanceof Date && !isNaN(maturityDate) ? '✅' : '❌'} ${maturityDate.toLocaleDateString('zh-CN')}`);
        console.log(`      今天: ${today.toLocaleDateString('zh-CN')}`);
        console.log(`      是否已到期: ${today >= maturityDate ? '✅ 是' : '❌ 否'}`);
        console.log(`      是否在未来: ${startDate > today ? '⚠️ 是' : '❌ 否'}`);

      } else {
        console.warn(`  ⚠️ 没有定期存款配置 (fixedDepositConfig)`);
      }
    });
  }
}

// 检查交易数据
console.log(`\n%c========== 交易数据检查 ==========', 'color: #ff0000; font-size: 16px; font-weight: bold;`);

const transactionsData = localStorage.getItem('transaction-storage');
if (!transactionsData) {
  console.error('❌ 没有找到交易数据');
} else {
  const parsed = JSON.parse(transactionsData);
  const transactions = parsed.state.transactions;

  console.log(`📝 总交易数: ${transactions.length}`);

  // 筛选利息收入交易
  const interestTransactions = transactions.filter(t =>
    t.type === 'income' &&
    t.tags &&
    t.tags.includes('利息')
  );

  console.log(`💰 利息收入交易数: ${interestTransactions.length}`);

  if (interestTransactions.length === 0) {
    console.warn('⚠️ 没有找到利息收入交易！');
  } else {
    console.log('\n利息收入列表:');
    interestTransactions.forEach((txn, index) => {
      console.log(`  #${index + 1}:`);
      console.log(`    账户ID: ${txn.accountId}`);
      console.log(`    金额: ${txn.amount}`);
      console.log(`    描述: ${txn.description}`);
      console.log(`    日期: ${txn.createdAt}`);
      console.log(`    标签: ${txn.tags ? txn.tags.join(', ') : 'N/A'}`);
      if (txn.interestPeriod) {
        console.log(`    计息期间: ${txn.interestPeriod.startDate} - ${txn.interestPeriod.endDate}`);
      }
      console.log('');
    });
  }

  // 筛选快照交易
  const snapshotTransactions = transactions.filter(t =>
    t.type === 'snapshot' &&
    t.isInterestPayment === true
  );

  console.log(`\n📊 定期存款快照交易数: ${snapshotTransactions.length}`);

  if (snapshotTransactions.length > 0) {
    console.log('快照交易示例（前5个）:');
    snapshotTransactions.slice(0, 5).forEach((txn, index) => {
      console.log(`  #${index + 1}:`);
      console.log(`    账户ID: ${txn.accountId}`);
      console.log(`    余额: ${txn.balance}`);
      console.log(`    描述: ${txn.description}`);
      console.log(`    日期: ${txn.createdAt}`);
      console.log('');
    });
  }
}

console.log('\n%c========== 诊断完成 ==========\\n', 'color: #ff0000; font-size: 16px; font-weight: bold;');
