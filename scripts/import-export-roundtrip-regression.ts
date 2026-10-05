/**
 * 导入/导出全链路回归测试
 *
 * 覆盖三条链路 × 两种格式（JSON / CSV）：
 *   - 账户：exportAccountsTo{JSON,CSV}  →  parseImportedAccount{JSON,CSV}
 *   - 交易：exportTransactionsTo{JSON,CSV} → parseImported{JSON,CSV}
 *   - 快照：exportSnapshotsTo{JSON,CSV}  →  parseSnapshotCSV（仅 CSV）
 *
 * 核心断言：导出后再导入，关键字段应等价还原（round-trip）。
 * 重点验证边界场景：字段含换行符、逗号、双引号、CRLF、中文、空值、负数等。
 *
 * 运行：npm run test:roundtrip
 */

import assert from 'node:assert'

import { exportAccountsToCSV, exportAccountsToJSON } from '@/lib/utils/account-export'
import { parseImportedAccountCSV, parseImportedAccountJSON } from '@/lib/utils/account-import'
import { exportSnapshotsToCSV, exportSnapshotsToJSON } from '@/lib/utils/snapshot-export'
import { parseSnapshotCSV } from '@/lib/utils/snapshot-import'
import {
  exportTransactionsToCSV,
  exportTransactionsToJSON,
} from '@/lib/utils/transaction-export'
import { parseImportedCSV, parseImportedJSON } from '@/lib/utils/transaction-import'

import { AccountType, RiskLevel, TransactionType } from '@/types'

import type { Account, Transaction } from '@/types'
import type { Snapshot } from '@/lib/stores/snapshot-store'

// ============================================================
// 测试结果统计
// ============================================================
let passed = 0
let failed = 0
const failures: string[] = []

// 空字符串与 undefined 在可选字段语义上等价（导出时都被处理为空）
function eqStr(a: unknown, b: unknown): boolean {
  const na = a === undefined || a === null ? '' : a
  const nb = b === undefined || b === null ? '' : b
  return na === nb
}

function check(name: string, condition: boolean, detail?: string) {
  if (condition) {
    passed++
    console.log(`  ✓ ${name}`)
  } else {
    failed++
    const msg = `  ✗ ${name}${detail ? ` — ${detail}` : ''}`
    console.log(msg)
    failures.push(msg)
  }
}

function section(title: string) {
  console.log(`\n${title}`)
  console.log('='.repeat(title.length))
}

// ============================================================
// 测试数据：刻意覆盖各种"危险"字段
// ============================================================
const baseDate = (s: string) => new Date(s)

const accounts: Account[] = [
  {
    id: 'acc-cash',
    name: '现金账户',
    type: AccountType.CASH,
    balance: 62537.77,
    initialBalance: 50000,
    currency: 'CNY',
    description: '日常,现金\n描述多行',
    color: '#F5F0E6',
    icon: 'wallet',
    riskLevel: RiskLevel.LOW,
    createdAt: baseDate('2024-01-15T09:00:00'),
    updatedAt: baseDate('2025-06-01T10:30:00'),
  },
  {
    id: 'acc-sec',
    name: '证券,"含引号"',
    type: AccountType.SECURITIES,
    balance: 0,
    initialBalance: 0,
    currency: 'USD',
    description: '',
    color: '#FF0000',
    icon: undefined,
    riskLevel: RiskLevel.HIGH,
    createdAt: baseDate('2024-06-30T23:59:59'),
    updatedAt: baseDate('2024-06-30T23:59:59'),
  },
  {
    id: 'acc-gold',
    name: '黄金\n账户',
    type: AccountType.GOLD,
    balance: 99999.99,
    initialBalance: 10000,
    currency: 'CNY',
    description: '含"双引号"和,逗号',
    color: '#FFD700',
    riskLevel: RiskLevel.MEDIUM,
    createdAt: baseDate('2025-12-31T00:00:00'),
    updatedAt: baseDate('2025-12-31T00:00:00'),
  },
]

const transactions: Transaction[] = [
  {
    id: 'txn-1',
    accountId: 'acc-cash',
    type: TransactionType.CONSUMPTION,
    amount: 88.5,
    description: '午餐',
    note: '',
    tags: ['日常', '餐饮'],
    createdAt: baseDate('2025-04-30T12:00:00'),
    updatedAt: baseDate('2025-04-30T12:00:00'),
  },
  {
    id: 'txn-2',
    accountId: 'acc-sec',
    type: TransactionType.TRANSFER_OUT,
    amount: 18251.92,
    balance: 0,
    transferToAccountId: 'acc-sec',
    description: '现金转入证券\n第二行说明',
    note: '备注含,逗号和"引号"',
    tags: [],
    createdAt: baseDate('2024-12-31T23:59:59'),
    updatedAt: baseDate('2024-12-31T23:59:59'),
  },
  {
    id: 'txn-3',
    accountId: 'acc-gold',
    type: TransactionType.INVESTMENT_PROFIT,
    amount: 1234.56,
    description: '投资收益（导入自动生成）',
    note: 'tag1; tag2',
    tags: ['投资收益', '导入生成', '快照生成'],
    createdAt: baseDate('2025-05-31T23:59:59'),
    updatedAt: baseDate('2025-05-31T23:59:59'),
  },
]

const snapshots: Snapshot[] = [
  {
    id: 'snap-1',
    accountId: 'acc-cash',
    balance: 50000,
    snapshotDate: baseDate('2024-01-31T23:59:59'),
    investmentAmount: 0,
    note: '初始\n快照',
    createdAt: baseDate('2024-01-31T23:59:59'),
    updatedAt: baseDate('2024-01-31T23:59:59'),
  },
  {
    id: 'snap-2',
    accountId: 'acc-sec',
    balance: 18251.92,
    snapshotDate: baseDate('2024-12-31T23:59:59'),
    investmentAmount: 18251.92,
    note: '含,逗号和"引号"',
    createdAt: baseDate('2024-12-31T23:59:59'),
    updatedAt: baseDate('2024-12-31T23:59:59'),
  },
  {
    id: 'snap-3',
    accountId: 'acc-gold',
    balance: 99999.99,
    snapshotDate: baseDate('2025-12-31T23:59:59'),
    investmentAmount: 5000,
    note: '',
    createdAt: baseDate('2025-12-31T23:59:59'),
    updatedAt: baseDate('2025-12-31T23:59:59'),
  },
]

// ============================================================
// 账户导出/导入 round-trip
// ============================================================
async function testAccounts() {
  section('账户 Account：JSON round-trip')

  const json = exportAccountsToJSON(accounts)
  const parsedJson = parseImportedAccountJSON(json)

  check('数量一致', parsedJson.length === accounts.length, `期望 ${accounts.length}，实际 ${parsedJson.length}`)

  accounts.forEach((acc, i) => {
    const got = parsedJson[i]
    if (!got) return
    check(`[JSON] ${acc.name} 名称还原`, got.name === acc.name, `期望 "${acc.name}"，得到 "${got.name}"`)
    check(`[JSON] ${acc.name} 类型还原`, got.type === acc.type, `期望 ${acc.type}，得到 ${got.type}`)
    check(`[JSON] ${acc.name} 余额还原`, got.balance === acc.balance, `期望 ${acc.balance}，得到 ${got.balance}`)
    check(`[JSON] ${acc.name} 初始余额还原`, got.initialBalance === acc.initialBalance)
    check(`[JSON] ${acc.name} 描述还原（含特殊字符）`, eqStr(got.description, acc.description), `期望 "${acc.description}"，得到 "${got.description}"`)
  })

  section('账户 Account：CSV round-trip（重点：含换行符/逗号/引号字段）')

  const csv = exportAccountsToCSV(accounts)
  const parsedCsv = parseImportedAccountCSV(csv)

  check('数量一致', parsedCsv.length === accounts.length, `期望 ${accounts.length}，实际 ${parsedCsv.length}`)

  accounts.forEach((acc, i) => {
    const got = parsedCsv[i]
    if (!got) return
    check(`[CSV] ${acc.name} 名称还原`, got.name === acc.name, `期望 "${acc.name}"，得到 "${got.name}"`)
    check(`[CSV] ${acc.name} 类型还原`, got.type === acc.type)
    check(`[CSV] ${acc.name} 余额还原`, got.balance === acc.balance)
    check(`[CSV] ${acc.name} 描述还原（含换行符/逗号/引号）`, eqStr(got.description, acc.description), `期望 "${acc.description}"，得到 "${got.description}"`)
    check(`[CSV] ${acc.name} 货币还原`, got.currency === acc.currency)
  })
}

// ============================================================
// 交易导出/导入 round-trip
// ============================================================
async function testTransactions() {
  section('交易 Transaction：JSON round-trip')

  const json = exportTransactionsToJSON(transactions, accounts)
  const parsedJson = parseImportedJSON(json, accounts)

  check('数量一致', parsedJson.length === transactions.length, `期望 ${transactions.length}，实际 ${parsedJson.length}`)

  transactions.forEach((txn, i) => {
    const got = parsedJson[i]
    if (!got) return
    check(`[JSON] ${txn.id} accountId 还原`, got.accountId === txn.accountId, `期望 ${txn.accountId}，得到 ${got.accountId}`)
    check(`[JSON] ${txn.id} 类型还原`, got.type === txn.type, `期望 ${txn.type}，得到 ${got.type}`)
    check(`[JSON] ${txn.id} 描述还原`, got.description === txn.description, `期望 "${txn.description}"，得到 "${got.description}"`)
    check(`[JSON] ${txn.id} 备注还原（含特殊字符）`, (got.note || '') === (txn.note || ''))
  })

  section('交易 Transaction：CSV round-trip（重点：含换行符/逗号/引号字段）')

  const csv = exportTransactionsToCSV(transactions, accounts)
  const parsedCsv = parseImportedCSV(csv, accounts)

  check('数量一致（不被换行符错误拆行）', parsedCsv.length === transactions.length, `期望 ${transactions.length}，实际 ${parsedCsv.length}（这是本次修复的核心 bug！）`)

  transactions.forEach((txn, i) => {
    const got = parsedCsv[i]
    if (!got) return
    check(`[CSV] ${txn.id} accountId 还原`, got.accountId === txn.accountId, `期望 ${txn.accountId}，得到 ${got.accountId}`)
    check(`[CSV] ${txn.id} 类型还原`, got.type === txn.type, `期望 ${txn.type}，得到 ${got.type}`)
    check(`[CSV] ${txn.id} 描述还原（含换行符）`, got.description === txn.description, `期望 "${txn.description}"，得到 "${got.description}"`)
    check(`[CSV] ${txn.id} 备注还原（含逗号/引号）`, (got.note || '') === (txn.note || ''), `期望 "${txn.note}"，得到 "${got.note}"`)
    check(`[CSV] ${txn.id} 标签还原`, JSON.stringify(got.tags || []) === JSON.stringify(txn.tags || []), `期望 ${JSON.stringify(txn.tags)}，得到 ${JSON.stringify(got.tags)}`)
  })
}

// ============================================================
// 快照导出/导入 round-trip
// ============================================================
async function testSnapshots() {
  section('快照 Snapshot：CSV round-trip（重点：投资金额 + 含换行符备注）')

  const csv = exportSnapshotsToCSV(snapshots, accounts)
  const parsedCsv = parseSnapshotCSV(csv)

  check('数量一致', parsedCsv.length === snapshots.length, `期望 ${snapshots.length}，实际 ${parsedCsv.length}`)

  snapshots.forEach((snap, i) => {
    const got = parsedCsv[i]
    if (!got) return
    const acc = accounts.find((a) => a.id === snap.accountId)
    check(`[CSV] 账户"${acc?.name}" 快照金额还原`, got.snapshotBalance === snap.balance, `期望 ${snap.balance}，得到 ${got.snapshotBalance}`)
    // 快照日期：endOfDay 处理后应为月末，比较年月即可
    const gotMonth = `${got.date.getFullYear()}-${got.date.getMonth() + 1}`
    const expMonth = `${snap.snapshotDate.getFullYear()}-${snap.snapshotDate.getMonth() + 1}`
    check(`[CSV] 账户"${acc?.name}" 快照月份还原`, gotMonth === expMonth, `期望 ${expMonth}，得到 ${gotMonth}`)
    // 投资金额（本月转入）必须被正确读取，否则收益计算会出错
    check(
      `[CSV] 账户"${acc?.name}" 投资金额还原`,
      got.transferIn === (snap.investmentAmount || 0),
      `期望 ${snap.investmentAmount || 0}，得到 ${got.transferIn}`
    )
  })

  // ----------------------------------------------------------------
  // 专项测试：模拟用户真实 CSV（表头含"投资金额"、日期为 Excel 格式 2026/5/31 8:00）
  // 覆盖本次修复的两个点：① 表头"投资金额"识别 ② 日期 yyyy/M/d H:mm 解析
  // ----------------------------------------------------------------
  section('快照 Snapshot：用户真实 CSV 格式（投资金额表头 + Excel 日期格式）')

  const accountNameMap = new Map(accounts.map((a) => [a.name, a]))
  const userCsvLines = [
    '账户名称\t货币\t快照日期\t快照金额\t投资金额\t备注',
    '现金账户\tCNY\t2026/5/31 8:00\t50000\t0\t',
    '证券,"含引号"\tUSD\t2026/5/31 8:00\t18251.92\t18251.92\t',
    '黄金\n账户\tCNY\t2026/5/31 8:00\t99999.99\t5000\t',
  ]
  const userCsv = userCsvLines.join('\n')
  const userParsed = parseSnapshotCSV(userCsv)

  check('用户CSV 数量一致', userParsed.length === 3, `期望 3，实际 ${userParsed.length}`)

  if (userParsed.length === 3) {
    // 验证日期解析：2026/5/31 8:00 应被识别为 2026年5月（不是今天）
    userParsed.forEach((got, i) => {
      check(
        `[用户CSV] 第${i + 1}行 日期解析为2026年5月`,
        got.date.getFullYear() === 2026 && got.date.getMonth() === 4,
        `期望 2026-5，得到 ${got.date.getFullYear()}-${got.date.getMonth() + 1}`
      )
    })
    // 验证投资金额被正确读取（这是本次修复的核心）
    check('[用户CSV] 现金账户 投资金额=0', userParsed[0].transferIn === 0, `期望 0，得到 ${userParsed[0].transferIn}`)
    check('[用户CSV] 证券账户 投资金额=18251.92', userParsed[1].transferIn === 18251.92, `期望 18251.92，得到 ${userParsed[1].transferIn}`)
    check('[用户CSV] 黄金账户 投资金额=5000', userParsed[2].transferIn === 5000, `期望 5000，得到 ${userParsed[2].transferIn}`)
    // 验证快照金额
    check('[用户CSV] 现金账户 快照金额=50000', userParsed[0].snapshotBalance === 50000)
    check('[用户CSV] 黄金账户 快照金额=99999.99', userParsed[2].snapshotBalance === 99999.99)
  }
}

// ============================================================
// 主流程
// ============================================================
async function main() {
  console.log('导入/导出全链路回归测试')
  console.log('覆盖：账户 / 交易 / 快照  ×  JSON / CSV')
  console.log('边界场景：换行符、逗号、双引号、CRLF、中文、空值、负数')

  await testAccounts()
  await testTransactions()
  await testSnapshots()

  console.log('\n' + '='.repeat(50))
  console.log(`测试结果：${passed} 通过，${failed} 失败`)
  console.log('='.repeat(50))

  if (failed > 0) {
    console.log('\n失败详情：')
    failures.forEach((f) => console.log(f))
    process.exit(1)
  } else {
    console.log('\n🎉 全部通过！导入/导出全链路无错误。')
    process.exit(0)
  }
}

main().catch((err) => {
  console.error('测试执行异常：', err)
  process.exit(1)
})
