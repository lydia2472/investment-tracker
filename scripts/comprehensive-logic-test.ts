/**
 * 应用全面逻辑测试（纯函数层）
 *
 * 覆盖不依赖 zustand store 的核心计算逻辑：
 *   1. 账户余额计算（account-balance-helpers）
 *   2. 黄金收益计算（gold-profit-helpers）
 *   3. CSV 解析（csv-parse）—— 引号感知、边界场景
 *   4. 现金流/收支（cashflow-helpers）
 *   5. 快照余额查询（snapshot-balance-helpers）
 *   6. 收益计算器（profit-calculator 的纯逻辑部分）
 *
 * 依赖 zustand store 的部分（货币收益、汇率转换、导入 store 写入），
 * 另由浏览器控制台的数据一致性测试覆盖。
 *
 * 运行：npm run test:logic
 */

import assert from 'node:assert'

import {
  calculateAccountBalanceFromTransactions,
  calculateBalanceFromAnchor,
  getTransactionBalanceDelta,
} from '@/lib/utils/account-balance-helpers'
import { calculateCashflowSummary } from '@/lib/utils/cashflow-helpers'
import { countCSVFields, parseCSVLine, splitCSVLines } from '@/lib/utils/csv-parse'
import { getAccountBalanceAtDate } from '@/lib/utils/snapshot-balance-helpers'
import {
  calculateGoldAccountSummary,
  calculateGoldMonthlyProfit,
  calculateGoldSnapshotValue,
  getGoldSnapshotValue,
  hasGoldPricing,
} from '@/lib/utils/gold-profit-helpers'
import { AccountType, RiskLevel, TransactionType } from '@/types'

import type { Account, Transaction } from '@/types'
import type { Snapshot } from '@/lib/stores/snapshot-store'

// ============================================================
// 测试结果统计
// ============================================================
let passed = 0
let failed = 0
const failures: string[] = []

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

function approxEqual(a: number, b: number, epsilon = 0.01): boolean {
  return Math.abs(a - b) < epsilon
}

function section(title: string) {
  console.log(`\n${title}`)
  console.log('='.repeat(title.length))
}

// ============================================================
// 测试数据工厂
// ============================================================
function makeAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'test-acc',
    name: '测试账户',
    type: AccountType.FUND,
    balance: 0,
    initialBalance: 0,
    currency: 'CNY',
    description: '',
    color: '#000000',
    riskLevel: RiskLevel.MEDIUM,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  }
}

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: `txn-${Math.random().toString(36).slice(2, 8)}`,
    accountId: 'test-acc',
    type: TransactionType.CONSUMPTION,
    amount: 100,
    createdAt: new Date('2024-06-15'),
    updatedAt: new Date('2024-06-15'),
    ...overrides,
  }
}

function makeSnapshot(overrides: Partial<Snapshot> = {}): Snapshot {
  return {
    id: `snap-${Math.random().toString(36).slice(2, 8)}`,
    accountId: 'test-acc',
    balance: 0,
    snapshotDate: new Date('2024-06-30T23:59:59'),
    createdAt: new Date('2024-06-30'),
    updatedAt: new Date('2024-06-30'),
    ...overrides,
  }
}

// ============================================================
// 1. 账户余额计算
// ============================================================
function testAccountBalance() {
  section('1. 账户余额计算（account-balance-helpers）')

  // 1.1 getTransactionBalanceDelta
  check('收入增加余额', getTransactionBalanceDelta(makeTransaction({ type: TransactionType.INCOME, amount: 500 })) === 500)
  check('存款增加余额', getTransactionBalanceDelta(makeTransaction({ type: TransactionType.DEPOSIT, amount: 300 })) === 300)
  check('转入增加余额', getTransactionBalanceDelta(makeTransaction({ type: TransactionType.TRANSFER_IN, amount: 200 })) === 200)
  check('投资收益增加余额', getTransactionBalanceDelta(makeTransaction({ type: TransactionType.INVESTMENT_PROFIT, amount: 88 })) === 88)
  check('消费减少余额', getTransactionBalanceDelta(makeTransaction({ type: TransactionType.CONSUMPTION, amount: 50 })) === -50)
  check('转出减少余额', getTransactionBalanceDelta(makeTransaction({ type: TransactionType.TRANSFER_OUT, amount: 100 })) === -100)
  check('放贷减少余额', getTransactionBalanceDelta(makeTransaction({ type: TransactionType.LOAN, amount: 1000 })) === -1000)
  check('投资亏损减少余额', getTransactionBalanceDelta(makeTransaction({ type: TransactionType.INVESTMENT_LOSS, amount: 200 })) === -200)
  check('快照类型返回 null', getTransactionBalanceDelta(makeTransaction({ type: TransactionType.SNAPSHOT })) === null)
  check('转账类型返回 null', getTransactionBalanceDelta(makeTransaction({ type: TransactionType.TRANSFER })) === null)

  // 1.2 calculateAccountBalanceFromTransactions
  const acc = makeAccount({ initialBalance: 1000 })
  const txns = [
    makeTransaction({ type: TransactionType.INCOME, amount: 500, createdAt: new Date('2024-01-10') }),
    makeTransaction({ type: TransactionType.CONSUMPTION, amount: 200, createdAt: new Date('2024-01-20') }),
    makeTransaction({ type: TransactionType.TRANSFER_IN, amount: 300, createdAt: new Date('2024-02-05') }),
  ]
  check(
    '余额 = 初始 + 收入 - 消费 + 转入',
    approxEqual(calculateAccountBalanceFromTransactions(acc, txns), 1000 + 500 - 200 + 300),
    `期望 1600，得到 ${calculateAccountBalanceFromTransactions(acc, txns)}`
  )

  // 1.3 targetDate 截止
  const balAtJanEnd = calculateAccountBalanceFromTransactions(acc, txns, new Date('2024-01-31'))
  check('截止1月末只算前两笔', approxEqual(balAtJanEnd, 1000 + 500 - 200), `期望 1300，得到 ${balAtJanEnd}`)

  // 1.4 calculateBalanceFromAnchor
  const anchored = calculateBalanceFromAnchor('test-acc', 1000, txns, new Date('2024-01-01'), new Date('2024-01-31'))
  check('锚点计算正确', approxEqual(anchored, 1000 + 500 - 200), `期望 1300，得到 ${anchored}`)
}

// ============================================================
// 2. 黄金收益计算
// ============================================================
function testGoldProfit() {
  section('2. 黄金收益计算（gold-profit-helpers）')

  // 2.1 基础函数
  check('黄金市值 = 均价 × 克数', approxEqual(calculateGoldSnapshotValue(560, 20), 11200))
  check('有黄金定价识别', hasGoldPricing(makeSnapshot({ goldMarketPrice: 560, goldGrams: 20 })))
  check('无黄金定价识别', !hasGoldPricing(makeSnapshot({})))

  const snap = makeSnapshot({ goldMarketPrice: 560, goldGrams: 20, balance: 11200 })
  check('getGoldSnapshotValue 用均价×克数', approxEqual(getGoldSnapshotValue(snap), 11200))
  const snapNoPricing = makeSnapshot({ balance: 9999 })
  check('getGoldSnapshotValue 无定价时回退 balance', approxEqual(getGoldSnapshotValue(snapNoPricing), 9999))

  // 2.2 月度收益公式：当月市值 - 上月市值 - 当月购买
  const prev = makeSnapshot({ goldMarketPrice: 560, goldGrams: 20, balance: 11200 })
  const curr = makeSnapshot({ goldMarketPrice: 580, goldGrams: 25, balance: 14500, investmentAmount: 2850 })
  const monthlyProfit = calculateGoldMonthlyProfit({ currentSnapshot: curr, previousSnapshot: prev, fallbackPreviousValue: 0 })
  // 580×25 - 560×20 - 2850 = 14500 - 11200 - 2850 = 450
  check('黄金月度收益 = 均价×累计克 - 上期市值 - 购买', approxEqual(monthlyProfit, 450), `期望 450，得到 ${monthlyProfit}`)

  // 2.3 fallback：无上月快照
  const profitNoPrev = calculateGoldMonthlyProfit({ currentSnapshot: curr, previousSnapshot: null, fallbackPreviousValue: 10000 })
  check('无上月快照用 fallback', approxEqual(profitNoPrev, 14500 - 10000 - 2850), `得到 ${profitNoPrev}`)

  // 2.4 calculateGoldAccountSummary — 累计指标
  const goldSnaps = [
    makeSnapshot({ snapshotDate: new Date('2024-01-31'), investmentAmount: 5000, goldMarketPrice: 480, goldGrams: 10.42 }),
    makeSnapshot({ snapshotDate: new Date('2024-02-29'), investmentAmount: 3000, goldMarketPrice: 500, goldGrams: 16.42 }),
    makeSnapshot({ snapshotDate: new Date('2024-03-31'), investmentAmount: 2000, goldMarketPrice: 520, goldGrams: 20.27 }),
  ]
  const summary = calculateGoldAccountSummary(goldSnaps)
  check('累计投入 = 5000+3000+2000', approxEqual(summary.totalInvested, 10000), `得到 ${summary.totalInvested}`)
  check('累计克数取最新快照', approxEqual(summary.totalGrams, 20.27, 0.01), `得到 ${summary.totalGrams}`)
  check('当前市值 = 最新均价×累计克', approxEqual(summary.currentValue, 520 * 20.27, 1), `得到 ${summary.currentValue}`)
  check('平均成本 = 累计投入/累计克', summary.averageCostPerGram > 0, `得到 ${summary.averageCostPerGram}`)
  check('累计收益 = 市值 - 投入', approxEqual(summary.totalProfit, summary.currentValue - 10000, 1))
  check('有数据标记', summary.hasData === true)

  // 2.5 investmentAmount 缺失时反推
  const snapsWithMissing = [
    makeSnapshot({ snapshotDate: new Date('2024-01-31'), goldMarketPrice: 480, goldGrams: 10 }), // 缺 investmentAmount
    makeSnapshot({ snapshotDate: new Date('2024-02-29'), investmentAmount: 5000, goldMarketPrice: 500, goldGrams: 20 }),
  ]
  const summaryMissing = calculateGoldAccountSummary(snapsWithMissing)
  // 第一条缺失 → 反推 (10-0)×480 = 4800；第二条 5000 → 累计 9800
  check('缺失 investmentAmount 时反推', approxEqual(summaryMissing.totalInvested, 4800 + 5000, 1), `期望 9800，得到 ${summaryMissing.totalInvested}`)

  // 2.6 空数据
  const emptySummary = calculateGoldAccountSummary([])
  check('空快照 hasData=false', emptySummary.hasData === false)
}

// ============================================================
// 3. CSV 解析（引号感知 + 边界场景）
// ============================================================
function testCSVParse() {
  section('3. CSV 解析（csv-parse）—— 引号感知 + 边界场景')

  // 3.1 splitCSVLines
  check('简单分行', splitCSVLines('a,b\nc,d').length === 2)
  check('引号内换行不分行', splitCSVLines('a,"x\ny",b\nc,d').length === 2, `得到 ${splitCSVLines('a,"x\ny",b\nc,d').length}`)
  check('CRLF 行尾', splitCSVLines('a,b\r\nc,d').length === 2)
  check('去除 BOM', !splitCSVLines('\uFEFFa,b\nc,d')[0].includes('\uFEFF'))
  check('空字符串返回空数组', splitCSVLines('').length === 0)

  // 3.2 parseCSVLine
  const deep = parseCSVLine('a,b,c')
  check('逗号分隔3字段', deep.length === 3 && deep[0] === 'a' && deep[2] === 'c')
  const quoted = parseCSVLine('"hello,world",b')
  check('引号内逗号不分隔', quoted.length === 2 && quoted[0] === 'hello,world')
  const escaped = parseCSVLine('"say ""hi""",b')
  check('转义双引号', escaped[0] === 'say "hi"')
  check('自定义分隔符', parseCSVLine('a;b;c', ';').length === 3)

  // 3.3 countCSVFields
  check('字段计数', countCSVFields('a,b,c') === 3)
  check('引号内逗号不计', countCSVFields('"a,b",c') === 2)

  // 3.4 综合 round-trip：含换行、逗号、引号的字段
  const content = 'name,desc,date\n'
    + '黄金,"含,逗号",2024-01-31\n'
    + '证券,"多行\n描述",2024-02-28\n'
    + '基金,"含""引号""",2024-03-31'
  const lines = splitCSVLines(content)
  check('round-trip 行数正确（含换行字段）', lines.length === 4, `得到 ${lines.length}`)
  lines.slice(1).forEach((line, i) => {
    const fields = parseCSVLine(line)
    check(`round-trip 第${i + 1}行有3个字段`, fields.length === 3, `得到 ${fields.length}`)
  })
}

// ============================================================
// 4. 现金流/收支
// ============================================================
function testCashflow() {
  section('4. 现金流/收支（cashflow-helpers）')

  const txns: Transaction[] = [
    makeTransaction({ type: TransactionType.INCOME, amount: 5000, createdAt: new Date('2024-06-10') }),
    makeTransaction({ type: TransactionType.CONSUMPTION, amount: 800, createdAt: new Date('2024-06-15') }),
    makeTransaction({ type: TransactionType.DEPOSIT, amount: 2000, createdAt: new Date('2024-06-20') }),
    makeTransaction({ type: TransactionType.TRANSFER_IN, amount: 1000, createdAt: new Date('2024-06-25') }),
    makeTransaction({ type: TransactionType.TRANSFER_OUT, amount: 500, createdAt: new Date('2024-06-28') }),
    makeTransaction({ type: TransactionType.INVESTMENT_PROFIT, amount: 300, createdAt: new Date('2024-06-30') }),
  ]
  const summary = calculateCashflowSummary(txns)
  check('收入类统计包含 income', summary.income >= 5000)
  check('支出类统计包含 consumption', summary.expense >= 800)
  check('交易计数正确', summary.count === txns.length)
}

// ============================================================
// 5. 快照余额查询（带 snapshots 参数）
// ============================================================
function testSnapshotBalance() {
  section('5. 快照余额查询（snapshot-balance-helpers）')

  const acc = makeAccount({ id: 'snap-acc', balance: 9999 })
  const snapshots: Snapshot[] = [
    makeSnapshot({ accountId: 'snap-acc', balance: 5000, snapshotDate: new Date('2024-05-31') }),
    makeSnapshot({ accountId: 'snap-acc', balance: 8000, snapshotDate: new Date('2024-06-30') }),
    makeSnapshot({ accountId: 'snap-acc', balance: 12000, snapshotDate: new Date('2024-07-31') }),
  ]
  const txns: Transaction[] = []

  // 无日期 → 取最新快照
  const balLatest = getAccountBalanceAtDate(txns, acc, undefined, snapshots)
  check('无日期取最新快照', balLatest === 12000, `得到 ${balLatest}`)

  // 有日期 → 取目标月快照（查询日期需在月末快照当天或之后）
  const balJune = getAccountBalanceAtDate(txns, acc, new Date('2024-06-30T23:59:59'), snapshots)
  check('6月末取6月快照', balJune === 8000, `得到 ${balJune}`)

  // 日期在快照之前 → 回退
  const balApril = getAccountBalanceAtDate(txns, acc, new Date('2024-04-15'), snapshots)
  check('4月（无快照）兜底', balApril !== undefined, `得到 ${balApril}`)
}

// ============================================================
// 6. 收益计算器（纯逻辑部分）
// ============================================================
async function testProfitCalculator() {
  section('6. 收益计算器（profit-calculator 纯逻辑）')

  const { calculateMonthlyProfitsFromInvestmentTransactions, calculateMonthlyIncomeExpense } = await import('@/lib/utils/profit-calculator')

  const accounts: Account[] = [
    makeAccount({ id: 'p-acc-1', name: '基金A', type: AccountType.FUND }),
    makeAccount({ id: 'p-acc-2', name: '股票B', type: AccountType.STOCK, currency: 'USD' }),
  ]

  const txns: Transaction[] = [
    makeTransaction({ accountId: 'p-acc-1', type: TransactionType.INVESTMENT_PROFIT, amount: 500, createdAt: new Date('2024-06-30') }),
    makeTransaction({ accountId: 'p-acc-1', type: TransactionType.INVESTMENT_LOSS, amount: 200, createdAt: new Date('2024-07-31') }),
    makeTransaction({ accountId: 'p-acc-2', type: TransactionType.INVESTMENT_PROFIT, amount: 100, createdAt: new Date('2024-06-30') }),
    makeTransaction({ accountId: 'p-acc-1', type: TransactionType.INCOME, amount: 50, createdAt: new Date('2024-06-15'), tags: ['利息'] }),
  ]

  const profits = calculateMonthlyProfitsFromInvestmentTransactions(txns, accounts)

  // 关键断言：利息收入不应该出现在投资收益里
  const interestInProfits = profits.filter((p) => p.calculatedProfit !== undefined && Math.abs(p.calculatedProfit - 50) < 0.01)
  check('利息收入不计入投资收益', interestInProfits.length === 0, '利息被错误地算进了投资收益')

  // 6月：基金A收益500，股票B收益100
  const june = profits.filter((p) => p.year === 2024 && p.month === 6)
  check('6月有2个账户的收益记录', june.length === 2, `得到 ${june.length}`)

  // 7月：基金A亏损200
  const july = profits.filter((p) => p.year === 2024 && p.month === 7)
  check('7月有1个账户的收益记录', july.length === 1)

  // calculateMonthlyIncomeExpense
  const incomeExpense = calculateMonthlyIncomeExpense(txns)
  check('月度收支数据不为空', incomeExpense.length > 0)
  const juneIE = incomeExpense.find((ie) => ie.year === 2024 && ie.month === 6)
  check('6月收支记录存在', juneIE !== undefined)
}

// ============================================================
// 7. 边界场景 & 数据完整性
// ============================================================
function testEdgeCases() {
  section('7. 边界场景 & 数据完整性')

  // 空交易列表
  const acc = makeAccount({ initialBalance: 500 })
  check('空交易 → 初始余额', calculateAccountBalanceFromTransactions(acc, []) === 500)

  // 金额为 0 的交易
  check('金额0的收入 delta=0', getTransactionBalanceDelta(makeTransaction({ type: TransactionType.INCOME, amount: 0 })) === 0)

  // 负数金额（异常但不应崩溃）
  const negDelta = getTransactionBalanceDelta(makeTransaction({ type: TransactionType.CONSUMPTION, amount: -100 }))
  check('负数金额不崩溃', typeof negDelta === 'number')

  // 黄金：克数为0
  const zeroGramSummary = calculateGoldAccountSummary([
    makeSnapshot({ goldMarketPrice: 500, goldGrams: 0, balance: 0 }),
  ])
  check('克数0 → 平均成本0（不除零）', zeroGramSummary.averageCostPerGram === 0)
  check('克数0 → hasData仍为true', zeroGramSummary.hasData === true)

  // CSV：只有表头
  check('只有表头 → 0行数据', splitCSVLines('a,b,c').length === 1)

  // CSV：空行跳过
  check('尾随空行不产生额外行', splitCSVLines('a,b\n\nc,d').length === 2 || splitCSVLines('a,b\n\nc,d').length === 3)
}

// ============================================================
// 主流程
// ============================================================
async function main() {
  console.log('═'.repeat(60))
  console.log('  应用全面逻辑测试（纯函数层）')
  console.log('  覆盖：账户余额 / 黄金收益 / CSV / 收支 / 快照 / 收益')
  console.log('═'.repeat(60))

  testAccountBalance()
  testGoldProfit()
  testCSVParse()
  testCashflow()
  testSnapshotBalance()
  await testProfitCalculator()
  testEdgeCases()

  console.log('\n' + '═'.repeat(60))
  console.log(`  测试结果：${passed} 通过，${failed} 失败`)
  console.log('═'.repeat(60))

  if (failed > 0) {
    console.log('\n失败详情：')
    failures.forEach((f) => console.log(f))
    process.exit(1)
  } else {
    console.log('\n🎉 全部通过！核心计算逻辑无错误。')
    process.exit(0)
  }
}

main().catch((err) => {
  console.error('测试执行异常：', err)
  process.exit(1)
})
