// 复制这段代码到浏览器控制台运行，清理未知账户的交易
(() => {
  const accountsData = JSON.parse(localStorage.getItem('account-storage'));
  const txData = JSON.parse(localStorage.getItem('transaction-storage'));
  const accounts = typeof accountsData.state === 'string' ? JSON.parse(accountsData.state).accounts : accountsData.state.accounts;
  const txState = typeof txData.state === 'string' ? JSON.parse(txData.state) : txData.state;
  const transactions = txState.transactions;
  const validIds = new Set(accounts.map(a => a.id));
  const unknownTxns = transactions.filter(t => !t.accountId || !validIds.has(t.accountId));
  console.log(`发现 ${unknownTxns.length} 条未知账户交易`);
  if (confirm(`确定要删除 ${unknownTxns.length} 条未知账户交易吗？`)) {
    const idsToDelete = new Set(unknownTxns.map(t => t.id));
    txState.transactions = transactions.filter(t => !idsToDelete.has(t.id));
    if (typeof txData.state === 'string') {
      txData.state = JSON.stringify(txState);
    } else {
      txData.state = txState;
    }
    localStorage.setItem('transaction-storage', JSON.stringify(txData));
    console.log('✅ 清理完成，请刷新页面');
  }
})();
