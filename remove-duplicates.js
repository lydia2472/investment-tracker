/**
 * 删除重复交易记录和快照的脚本
 * 运行方式: node remove-duplicates.js
 */

const fs = require('fs');
const path = require('path');

// 读取 localStorage 数据文件路径
// Electron 通常将数据存储在以下位置之一
const possiblePaths = [
  path.join(process.env.APPDATA || process.env.HOME, 'investment-tracker', 'localStorage'),
  path.join(process.env.HOME, '.config', 'investment-tracker', 'localStorage'),
  path.join(__dirname, '.next', 'server', 'static'),
  // 添加更多可能的路径...
];

console.log('========== 开始清理重复记录 ==========\n');

// 尝试查找并读取存储文件
let storagePath = null;
for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    storagePath = p;
    break;
  }
}

if (!storagePath) {
  console.error('❌ 未找到存储文件，请手动指定路径');
  console.log('请检查以下位置之一：');
  possiblePaths.forEach(p => console.log('  -', p));
  process.exit(1);
}

console.log('📂 存储路径:', storagePath);
console.log('');

// 读取存储数据
let storageData = {};
try {
  const content = fs.readFileSync(storagePath, 'utf8');
  storageData = JSON.parse(content);
} catch (error) {
  console.error('❌ 无法读取存储文件:', error.message);
  process.exit(1);
}

// 获取交易和快照数据
const transactions = storageData['transaction-storage'] || storageData.transactions || [];
const snapshots = storageData['snapshot-storage'] || storageData.snapshots || [];

console.log('📊 原始数据统计:');
console.log('  交易记录:', transactions.length, '条');
console.log('  快照记录:', snapshots.length, '条');
console.log('');

// 1. 查找重复的交易
console.log('🔍 检查重复交易...');
const transactionMap = new Map();
const duplicateTransactionIds = new Set();

transactions.forEach((txn) => {
  const date = new Date(txn.createdAt);
  const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const key = `${txn.accountId}:${dateKey}:${txn.type}`;

  if (transactionMap.has(key)) {
    duplicateTransactionIds.add(txn.id);
    const existing = transactionMap.get(key);
    console.log('  ⚠️  发现重复交易:', {
      账户: txn.accountId,
      日期: dateKey,
      类型: txn.type,
      保留ID: existing,
      删除ID: txn.id
    });
  } else {
    transactionMap.set(key, txn.id);
  }
});

// 2. 查找重复的快照
console.log('');
console.log('🔍 检查重复快照...');
const snapshotMap = new Map();
const duplicateSnapshotIds = new Set();

snapshots.forEach((snap) => {
  const date = new Date(snap.snapshotDate);
  const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const key = `${snap.accountId}:${dateKey}`;

  if (snapshotMap.has(key)) {
    duplicateSnapshotIds.add(snap.id);
    const existing = snapshotMap.get(key);
    console.log('  ⚠️  发现重复快照:', {
      账户: snap.accountId,
      日期: dateKey,
      保留ID: existing,
      删除ID: snap.id
    });
  } else {
    snapshotMap.set(key, snap.id);
  }
});

console.log('');
console.log('📋 清理统计:');
console.log('  重复交易:', duplicateTransactionIds.size, '条');
console.log('  重复快照:', duplicateSnapshotIds.size, '条');

// 3. 执行删除
if (duplicateTransactionIds.size === 0 && duplicateSnapshotIds.size === 0) {
  console.log('');
  console.log('✅ 没有发现重复记录，无需清理');
  process.exit(0);
}

console.log('');
console.log('🗑️  开始删除重复记录...');

// 删除重复的交易
if (duplicateTransactionIds.size > 0) {
  const originalLength = transactions.length;
  const updatedTransactions = transactions.filter(t => !duplicateTransactionIds.has(t.id));
  storageData['transaction-storage'] = updatedTransactions;
  storageData.transactions = updatedTransactions;
  console.log(`  ✓ 已删除 ${originalLength - updatedTransactions.length} 条重复交易`);
}

// 删除重复的快照
if (duplicateSnapshotIds.size > 0) {
  const originalLength = snapshots.length;
  const updatedSnapshots = snapshots.filter(s => !duplicateSnapshotIds.has(s.id));
  storageData['snapshot-storage'] = updatedSnapshots;
  storageData.snapshots = updatedSnapshots;
  console.log(`  ✓ 已删除 ${originalLength - updatedSnapshots.length} 条重复快照`);
}

// 4. 保存更新后的数据
try {
  fs.writeFileSync(storagePath, JSON.stringify(storageData, null, 2));
  console.log('');
  console.log('✅ 数据已保存到:', storagePath);
} catch (error) {
  console.error('❌ 保存失败:', error.message);
  process.exit(1);
}

// 5. 显示最终结果
console.log('');
console.log('========== 清理完成 ==========');
console.log('📊 最终统计:');
console.log('  交易记录:', storageData['transaction-storage']?.length || storageData.transactions?.length || 0, '条');
console.log('  快照记录:', storageData['snapshot-storage']?.length || storageData.snapshots?.length || 0, '条');
console.log('');
console.log('💡 提示：请重启应用或刷新页面查看更新后的数据');
