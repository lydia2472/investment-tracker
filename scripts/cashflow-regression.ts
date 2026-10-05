import { calculateCashflowSummary, buildMonthlyCashflowTrend } from '@/lib/utils/cashflow-helpers'
import { getLatestSnapshotMonthReference, groupByCurrency } from '@/lib/utils/currency-helpers'
import {
  calculateProfitsByCurrency,
  getProfitReferenceMonth,
} from '@/lib/utils/currency-profit-helpers'
import { MonthlyDataService } from '@/lib/services/monthly-data-service'
import { useAccountStore } from '@/lib/stores/account-store'
import { useSnapshotStore } from '@/lib/stores/snapshot-store'
import { useTransactionStore } from '@/lib/stores/transaction-store'
import { getAccountBalanceAtDate } from '@/lib/utils/snapshot-balance-helpers'
import {
  createSnapshotImportCleanupPlan,
  importSnapshotsAndCreateProfits,
  type SnapshotImportData,
} from '@/lib/utils/snapshot-import'
import { createSnapshotProfitSyncPlan } from '@/lib/utils/snapshot-profit-sync'
import { exportTransactionsToCSV, exportTransactionsToJSON } from '@/lib/utils/transaction-export'
import {
  expandImportedTransferPairs,
  parseImportedCSV,
  parseImportedJSON,
} from '@/lib/utils/transaction-import'
import {
  applyLegacyMonthlyDataRepair,
  createLegacyMonthlyDataRepairPlan,
} from '@/lib/utils/legacy-monthly-data-repair'
import {
  AccountType,
  TransactionType,
  type Account,
  type MonthlyProfit,
  type Transaction,
} from '@/types'

import type { Snapshot } from '@/lib/stores/snapshot-store'

function assert(condition: unknown, message: string): void {
  if (!condition) {
    throw new Error(message)
  }
}

function resetStores(): void {
  useAccountStore.setState({ accounts: [], version: 0 })
  useTransactionStore.setState({ transactions: [], migrated: false, simplified: false })
  useSnapshotStore.setState({ snapshots: [] })
}

const baseDate = new Date('2026-06-01T08:00:00.000Z')

const accounts: Account[] = [
  {
    id: 'acc-cny',
    name: 'CNY Account',
    type: AccountType.BANK,
    balance: 10000,
    initialBalance: 1000,
    currency: 'CNY',
    color: '#00AA88',
    createdAt: baseDate,
    updatedAt: baseDate,
  },
  {
    id: 'acc-usd',
    name: 'USD Account',
    type: AccountType.BANK,
    balance: 3000,
    initialBalance: 500,
    currency: 'USD',
    color: '#3366FF',
    createdAt: baseDate,
    updatedAt: baseDate,
  },
]

const transactions: Transaction[] = [
  {
    id: 't1',
    accountId: 'acc-cny',
    type: TransactionType.INCOME,
    amount: 5000,
    createdAt: new Date('2026-06-02T08:00:00.000Z'),
    updatedAt: new Date('2026-06-02T08:00:00.000Z'),
  },
  {
    id: 't2',
    accountId: 'acc-cny',
    type: TransactionType.DEPOSIT,
    amount: 2000,
    createdAt: new Date('2026-06-03T08:00:00.000Z'),
    updatedAt: new Date('2026-06-03T08:00:00.000Z'),
  },
  {
    id: 't3',
    accountId: 'acc-cny',
    type: TransactionType.CONSUMPTION,
    amount: 1000,
    createdAt: new Date('2026-06-04T08:00:00.000Z'),
    updatedAt: new Date('2026-06-04T08:00:00.000Z'),
  },
  {
    id: 't4',
    accountId: 'acc-cny',
    type: TransactionType.LOAN,
    amount: 300,
    createdAt: new Date('2026-06-05T08:00:00.000Z'),
    updatedAt: new Date('2026-06-05T08:00:00.000Z'),
  },
  {
    id: 't5',
    accountId: 'acc-cny',
    type: TransactionType.TRANSFER_OUT,
    amount: 800,
    createdAt: new Date('2026-06-06T08:00:00.000Z'),
    updatedAt: new Date('2026-06-06T08:00:00.000Z'),
  },
  {
    id: 't6',
    accountId: 'acc-cny',
    type: TransactionType.INVESTMENT_PROFIT,
    amount: 600,
    createdAt: new Date('2026-06-07T08:00:00.000Z'),
    updatedAt: new Date('2026-06-07T08:00:00.000Z'),
  },
  {
    id: 't7',
    accountId: 'acc-cny',
    type: TransactionType.INVESTMENT_LOSS,
    amount: 100,
    createdAt: new Date('2026-06-08T08:00:00.000Z'),
    updatedAt: new Date('2026-06-08T08:00:00.000Z'),
  },
  {
    id: 't8',
    accountId: 'acc-cny',
    type: TransactionType.TRANSFER_IN,
    amount: 400,
    createdAt: new Date('2026-06-09T08:00:00.000Z'),
    updatedAt: new Date('2026-06-09T08:00:00.000Z'),
  },
  {
    id: 't9',
    accountId: 'acc-usd',
    type: TransactionType.INCOME,
    amount: 100,
    createdAt: new Date('2026-07-01T08:00:00.000Z'),
    updatedAt: new Date('2026-07-01T08:00:00.000Z'),
  },
]

const cnyTransactions = transactions.filter((t) => t.accountId === 'acc-cny')
const summary = calculateCashflowSummary(cnyTransactions)

assert(summary.income === 7000, `cashflow income expected 7000, got ${summary.income}`)
assert(summary.expense === 1300, `cashflow expense expected 1300, got ${summary.expense}`)
assert(summary.net === 5700, `cashflow net expected 5700, got ${summary.net}`)
assert(
  summary.investmentNetProfit === 500,
  `investment net profit expected 500, got ${summary.investmentNetProfit}`
)

const trend = buildMonthlyCashflowTrend(cnyTransactions)
assert(trend.length === 1, `trend point count expected 1, got ${trend.length}`)
assert(trend[0]?.income === 7000, `trend income expected 7000, got ${trend[0]?.income}`)
assert(trend[0]?.expense === 1300, `trend expense expected 1300, got ${trend[0]?.expense}`)

const currencySummary = groupByCurrency(accounts, transactions)
const cnySummary = currencySummary.currencies.find((item) => item.currency === 'CNY')

assert(!!cnySummary, 'CNY currency summary should exist')
assert(cnySummary?.totalIncome === 7000, `CNY income expected 7000, got ${cnySummary?.totalIncome}`)
assert(
  cnySummary?.totalExpense === 1300,
  `CNY expense expected 1300, got ${cnySummary?.totalExpense}`
)
assert(
  cnySummary?.investmentNetProfit === 500,
  `CNY investment net profit expected 500, got ${cnySummary?.investmentNetProfit}`
)

const exportedJson = JSON.parse(exportTransactionsToJSON(cnyTransactions, accounts)) as Array<
  Record<string, unknown>
>
const exportedProfit = exportedJson.find((row) => row.id === 't6')
assert(
  exportedProfit?.cashflowCategory === '不计入收支',
  'investment profit should not count as cashflow in JSON export'
)
assert(
  exportedProfit?.profitModuleCategory === '投资收益',
  'investment profit should be marked as profit module in JSON export'
)

const exportedCsv = exportTransactionsToCSV(cnyTransactions, accounts)
assert(exportedCsv.includes('收支统计归类'), 'CSV header should include cashflow category')
assert(exportedCsv.includes('收益模块归类'), 'CSV header should include profit module category')
assert(exportedCsv.includes('统计口径说明'), 'CSV header should include accounting note')
assert(exportedCsv.includes('不计入收支'), 'CSV should mark non-cashflow records')
assert(exportedCsv.includes('投资收益'), 'CSV should mark profit module records')

const latestMonthOnlyProfits = [
  {
    accountId: 'acc-cny',
    accountName: 'CNY Account',
    year: 2026,
    month: 5,
    startBalance: 1000,
    endBalance: 1080,
    calculatedProfit: 80,
    periodIncome: 0,
    periodExpense: 0,
    netFlow: 0,
    profitRate: 8,
    hasCompleteData: true,
  },
  {
    accountId: 'acc-cny',
    accountName: 'CNY Account',
    year: 2026,
    month: 4,
    startBalance: 900,
    endBalance: 950,
    calculatedProfit: 50,
    periodIncome: 0,
    periodExpense: 0,
    netFlow: 0,
    profitRate: 5.55,
    hasCompleteData: true,
  },
] satisfies MonthlyProfit[]

const defaultProfitSummary = calculateProfitsByCurrency(latestMonthOnlyProfits, accounts)
assert(
  defaultProfitSummary.CNY?.totalProfit === 80,
  `default latest-month profit expected 80, got ${defaultProfitSummary.CNY?.totalProfit}`
)

const profitReferenceMonth = getProfitReferenceMonth(latestMonthOnlyProfits, accounts)
assert(
  profitReferenceMonth?.year === 2026 && profitReferenceMonth?.month === 5,
  `profit reference month expected 2026-05, got ${profitReferenceMonth?.year}-${profitReferenceMonth?.month}`
)

const summarySnapshots: Snapshot[] = [
  {
    id: 'snap-cny-2026-04',
    accountId: 'acc-cny',
    balance: 9800,
    snapshotDate: new Date('2026-04-30T12:00:00.000Z'),
    createdAt: new Date('2026-04-30T12:00:00.000Z'),
    updatedAt: new Date('2026-04-30T12:00:00.000Z'),
  },
  {
    id: 'snap-cny-2026-05',
    accountId: 'acc-cny',
    balance: 10000,
    snapshotDate: new Date('2026-05-31T12:00:00.000Z'),
    createdAt: new Date('2026-05-31T12:00:00.000Z'),
    updatedAt: new Date('2026-05-31T12:00:00.000Z'),
  },
]

const latestSnapshotMonth = getLatestSnapshotMonthReference(accounts, summarySnapshots)
assert(
  latestSnapshotMonth?.year === 2026 && latestSnapshotMonth?.month === 5,
  `latest snapshot reference expected 2026-05, got ${latestSnapshotMonth?.year}-${latestSnapshotMonth?.month}`
)

const snapshotCurrencySummary = groupByCurrency(accounts, transactions, undefined, summarySnapshots)
assert(
  snapshotCurrencySummary.referenceMonth?.year === 2026 &&
    snapshotCurrencySummary.referenceMonth?.month === 5,
  `currency summary reference month expected 2026-05, got ${snapshotCurrencySummary.referenceMonth?.year}-${snapshotCurrencySummary.referenceMonth?.month}`
)

const profitsWithJuneDrift = [
  ...latestMonthOnlyProfits,
  {
    accountId: 'acc-cny',
    accountName: 'CNY Account',
    year: 2026,
    month: 6,
    startBalance: 1080,
    endBalance: 1110,
    calculatedProfit: 30,
    periodIncome: 30,
    periodExpense: 0,
    netFlow: 30,
    profitRate: 2.78,
    hasCompleteData: true,
  },
] satisfies MonthlyProfit[]

const snapshotAnchoredProfitSummary = calculateProfitsByCurrency(
  profitsWithJuneDrift,
  accounts,
  snapshotCurrencySummary.referenceMonth?.year,
  snapshotCurrencySummary.referenceMonth?.month
)
assert(
  snapshotAnchoredProfitSummary.CNY?.totalProfit === 80,
  `snapshot-anchored profit expected 80 for 2026-05, got ${snapshotAnchoredProfitSummary.CNY?.totalProfit}`
)

resetStores()

const cashAccount: Account = {
  id: 'funding-cash',
  name: 'Funding Cash',
  type: AccountType.CASH,
  balance: 10000,
  initialBalance: 10000,
  currency: 'CNY',
  color: '#CC8800',
  createdAt: baseDate,
  updatedAt: baseDate,
}

const fundAccount: Account = {
  id: 'target-fund',
  name: 'Target Fund',
  type: AccountType.FUND,
  balance: 500,
  initialBalance: 500,
  currency: 'CNY',
  color: '#228866',
  createdAt: baseDate,
  updatedAt: baseDate,
}

useAccountStore.setState((state) => ({
  ...state,
  accounts: [cashAccount, fundAccount],
}))

useTransactionStore
  .getState()
  .transfer(
    'funding-cash',
    'target-fund',
    2000,
    'June funding',
    new Date('2026-06-12T08:00:00.000Z')
  )

useTransactionStore.getState().addTransaction({
  accountId: 'target-fund',
  type: TransactionType.TRANSFER_IN,
  amount: 999,
  description: 'legacy orphan transfer in',
  tags: ['投资', '月末'],
  createdAt: new Date('2026-06-15T08:00:00.000Z'),
})

const investmentSummary = MonthlyDataService.getInvestmentSummary(
  'target-fund',
  new Date('2026-06-30T08:00:00.000Z')
)

assert(
  investmentSummary.totalAmount === 2000,
  `monthly investment summary expected 2000, got ${investmentSummary.totalAmount}`
)
assert(
  investmentSummary.sources[0]?.accountId === 'funding-cash',
  `investment source expected funding-cash, got ${investmentSummary.sources[0]?.accountId}`
)

const transferInCountBeforeMonthlyData = useTransactionStore
  .getState()
  .transactions.filter((transaction) => transaction.type === TransactionType.TRANSFER_IN).length

const monthlyDataResult = MonthlyDataService.processMonthlyData({
  accountId: 'target-fund',
  snapshotAmount: 2600,
  snapshotDate: new Date('2026-06-30T08:00:00.000Z'),
  note: 'month end snapshot',
})

const transferInCountAfterMonthlyData = useTransactionStore
  .getState()
  .transactions.filter((transaction) => transaction.type === TransactionType.TRANSFER_IN).length

assert(
  monthlyDataResult.snapshot.investmentAmount === 2000,
  `monthly snapshot investment amount expected 2000, got ${monthlyDataResult.snapshot.investmentAmount}`
)
assert(
  monthlyDataResult.calculatedProfit === 100,
  `monthly calculated profit expected 100, got ${monthlyDataResult.calculatedProfit}`
)
assert(
  transferInCountAfterMonthlyData === transferInCountBeforeMonthlyData,
  `monthly data should not create extra transfer_in transactions, before ${transferInCountBeforeMonthlyData}, after ${transferInCountAfterMonthlyData}`
)

resetStores()

const goldAccount: Account = {
  id: 'gold-account',
  name: 'Gold Account',
  type: AccountType.GOLD,
  balance: 60000,
  initialBalance: 60000,
  currency: 'CNY',
  color: '#C99A16',
  createdAt: baseDate,
  updatedAt: baseDate,
}

useAccountStore.setState((state) => ({
  ...state,
  accounts: [goldAccount],
}))

useSnapshotStore.setState({
  snapshots: [
    {
      id: 'gold-snapshot-may',
      accountId: 'gold-account',
      balance: 60000,
      snapshotDate: new Date('2026-05-31T08:00:00.000Z'),
      investmentAmount: 0,
      goldMarketPrice: 600,
      goldGrams: 100,
      note: 'gold previous month',
      createdAt: new Date('2026-05-31T08:00:00.000Z'),
      updatedAt: new Date('2026-05-31T08:00:00.000Z'),
    },
  ],
})

const goldMonthlyDataResult = MonthlyDataService.processMonthlyData({
  accountId: 'gold-account',
  snapshotAmount: 0,
  snapshotDate: new Date('2026-06-30T08:00:00.000Z'),
  goldMarketPrice: 620,
  goldGrams: 110,
  goldPurchaseAmount: 6000,
  note: 'gold month end snapshot',
})

assert(
  goldMonthlyDataResult.snapshot.balance === 68200,
  `gold snapshot balance expected 68200, got ${goldMonthlyDataResult.snapshot.balance}`
)
assert(
  goldMonthlyDataResult.snapshot.investmentAmount === 6000,
  `gold purchase amount expected 6000, got ${goldMonthlyDataResult.snapshot.investmentAmount}`
)
assert(
  goldMonthlyDataResult.calculatedProfit === 2200,
  `gold monthly profit expected 2200, got ${goldMonthlyDataResult.calculatedProfit}`
)

const goldSyncPlan = createSnapshotProfitSyncPlan(
  [goldAccount],
  useSnapshotStore.getState().snapshots,
  []
)

assert(
  goldSyncPlan.create.length === 1,
  `gold sync create count expected 1, got ${goldSyncPlan.create.length}`
)
assert(
  goldSyncPlan.create[0]?.amount === 2200,
  `gold sync profit expected 2200, got ${goldSyncPlan.create[0]?.amount}`
)
assert(
  goldSyncPlan.create[0]?.type === TransactionType.INVESTMENT_PROFIT,
  `gold sync type expected investment_profit, got ${goldSyncPlan.create[0]?.type}`
)

resetStores()

const repairCashAccount: Account = {
  id: 'repair-cash',
  name: 'Repair Cash',
  type: AccountType.CASH,
  balance: 8000,
  initialBalance: 8000,
  currency: 'CNY',
  color: '#AA6600',
  createdAt: baseDate,
  updatedAt: baseDate,
}

const repairFundAccount: Account = {
  id: 'repair-fund',
  name: 'Repair Fund',
  type: AccountType.FUND,
  balance: 3000,
  initialBalance: 1000,
  currency: 'CNY',
  color: '#007755',
  createdAt: baseDate,
  updatedAt: baseDate,
}

useAccountStore.setState((state) => ({
  ...state,
  accounts: [repairCashAccount, repairFundAccount],
}))

const legacyRepairDate = new Date('2026-06-30T08:00:00.000Z')

useSnapshotStore.setState({
  snapshots: [
    {
      id: 'repair-snapshot',
      accountId: 'repair-fund',
      balance: 3200,
      investmentAmount: 2000,
      snapshotDate: legacyRepairDate,
      note: 'legacy monthly snapshot',
      createdAt: legacyRepairDate,
      updatedAt: legacyRepairDate,
    },
  ],
})

useTransactionStore.setState({
  transactions: [
    {
      id: 'legacy-orphan-transfer',
      accountId: 'repair-fund',
      type: TransactionType.TRANSFER_IN,
      amount: 2000,
      description: '本月新增投资',
      tags: ['投资', '月末'],
      note: '快照日期: 2026/6/30\n投资金额: 2000.00元',
      createdAt: legacyRepairDate,
      updatedAt: legacyRepairDate,
    },
    {
      id: 'paired-transfer-in',
      accountId: 'repair-fund',
      type: TransactionType.TRANSFER_IN,
      amount: 1200,
      transferFromAccountId: 'repair-cash',
      transferPairId: 'repair-pair-1',
      description: '从 Repair Cash 转入',
      createdAt: new Date('2026-06-15T08:00:00.000Z'),
      updatedAt: new Date('2026-06-15T08:00:00.000Z'),
    },
  ],
  migrated: false,
  simplified: false,
})

const legacyRepairPlan = createLegacyMonthlyDataRepairPlan(
  useAccountStore.getState().accounts,
  useSnapshotStore.getState().snapshots,
  useTransactionStore.getState().transactions
)

assert(
  legacyRepairPlan.candidates.length === 1,
  `legacy repair plan expected 1 candidate, got ${legacyRepairPlan.candidates.length}`
)
assert(
  legacyRepairPlan.candidates[0]?.transactionId === 'legacy-orphan-transfer',
  `legacy repair should target orphan transfer, got ${legacyRepairPlan.candidates[0]?.transactionId}`
)

const legacyRepairResult = applyLegacyMonthlyDataRepair(
  useAccountStore.getState().accounts,
  useSnapshotStore.getState().snapshots,
  useTransactionStore.getState().transactions
)

assert(
  legacyRepairResult.removedTransactionIds.length === 1,
  `legacy repair removed count expected 1, got ${legacyRepairResult.removedTransactionIds.length}`
)
assert(
  !useTransactionStore
    .getState()
    .transactions.some((transaction) => transaction.id === 'legacy-orphan-transfer'),
  'legacy orphan transfer should be removed after repair'
)
assert(
  useTransactionStore
    .getState()
    .transactions.some((transaction) => transaction.id === 'paired-transfer-in'),
  'paired transfer_in should remain after repair'
)

resetStores()

const snapshotDeleteAccount: Account = {
  id: 'snapshot-delete-account',
  name: 'Snapshot Delete Account',
  type: AccountType.FUND,
  balance: 1500,
  initialBalance: 1000,
  currency: 'CNY',
  color: '#336633',
  createdAt: baseDate,
  updatedAt: baseDate,
}

useAccountStore.setState((state) => ({
  ...state,
  accounts: [snapshotDeleteAccount],
}))

useSnapshotStore.setState({
  snapshots: [
    {
      id: 'snapshot-june-a',
      accountId: 'snapshot-delete-account',
      balance: 1200,
      snapshotDate: new Date('2026-06-30T08:00:00.000Z'),
      createdAt: new Date('2026-06-30T08:00:00.000Z'),
      updatedAt: new Date('2026-06-30T08:00:00.000Z'),
    },
    {
      id: 'snapshot-june-b',
      accountId: 'snapshot-delete-account',
      balance: 1250,
      snapshotDate: new Date('2026-06-15T08:00:00.000Z'),
      createdAt: new Date('2026-06-15T08:00:00.000Z'),
      updatedAt: new Date('2026-06-15T08:00:00.000Z'),
    },
    {
      id: 'snapshot-july',
      accountId: 'snapshot-delete-account',
      balance: 1500,
      snapshotDate: new Date('2026-07-31T08:00:00.000Z'),
      createdAt: new Date('2026-07-31T08:00:00.000Z'),
      updatedAt: new Date('2026-07-31T08:00:00.000Z'),
    },
  ],
})

const deletedJuneSnapshots = useSnapshotStore
  .getState()
  .deleteSnapshotsForAccountMonth('snapshot-delete-account', new Date('2026-06-20T08:00:00.000Z'))

assert(
  deletedJuneSnapshots === 2,
  `delete snapshots for account month expected 2, got ${deletedJuneSnapshots}`
)
assert(
  useSnapshotStore.getState().snapshots.length === 1,
  `remaining snapshot count expected 1, got ${useSnapshotStore.getState().snapshots.length}`
)
assert(
  useSnapshotStore.getState().snapshots[0]?.id === 'snapshot-july',
  `remaining snapshot expected snapshot-july, got ${useSnapshotStore.getState().snapshots[0]?.id}`
)

const rangedAccounts: Account[] = [
  {
    id: 'range-cny',
    name: 'Range CNY',
    type: AccountType.BANK,
    balance: 4600,
    initialBalance: 3000,
    currency: 'CNY',
    color: '#118833',
    createdAt: baseDate,
    updatedAt: baseDate,
  },
  {
    id: 'range-usd',
    name: 'Range USD',
    type: AccountType.BANK,
    balance: 1050,
    initialBalance: 900,
    currency: 'USD',
    color: '#2255DD',
    createdAt: baseDate,
    updatedAt: baseDate,
  },
]

const rangedTransactions: Transaction[] = [
  {
    id: 'r1',
    accountId: 'range-cny',
    type: TransactionType.INCOME,
    amount: 1000,
    createdAt: new Date('2026-06-10T08:00:00.000Z'),
    updatedAt: new Date('2026-06-10T08:00:00.000Z'),
  },
  {
    id: 'r2',
    accountId: 'range-usd',
    type: TransactionType.CONSUMPTION,
    amount: 20,
    createdAt: new Date('2026-06-11T08:00:00.000Z'),
    updatedAt: new Date('2026-06-11T08:00:00.000Z'),
  },
  {
    id: 'r3',
    accountId: 'range-cny',
    type: TransactionType.DEPOSIT,
    amount: 300,
    createdAt: new Date('2026-07-05T08:00:00.000Z'),
    updatedAt: new Date('2026-07-05T08:00:00.000Z'),
  },
  {
    id: 'r4',
    accountId: 'range-cny',
    type: TransactionType.CONSUMPTION,
    amount: 50,
    createdAt: new Date('2026-07-06T08:00:00.000Z'),
    updatedAt: new Date('2026-07-06T08:00:00.000Z'),
  },
  {
    id: 'r5',
    accountId: 'range-cny',
    type: TransactionType.INVESTMENT_PROFIT,
    amount: 70,
    createdAt: new Date('2026-07-07T08:00:00.000Z'),
    updatedAt: new Date('2026-07-07T08:00:00.000Z'),
  },
  {
    id: 'r6',
    accountId: 'range-usd',
    type: TransactionType.INCOME,
    amount: 200,
    createdAt: new Date('2026-07-12T08:00:00.000Z'),
    updatedAt: new Date('2026-07-12T08:00:00.000Z'),
  },
]

const rangedSnapshots: Snapshot[] = [
  {
    id: 's1',
    accountId: 'range-cny',
    balance: 4200,
    snapshotDate: new Date('2026-06-30T23:59:59.999Z'),
    createdAt: new Date('2026-06-30T23:59:59.999Z'),
    updatedAt: new Date('2026-06-30T23:59:59.999Z'),
  },
  {
    id: 's2',
    accountId: 'range-usd',
    balance: 800,
    snapshotDate: new Date('2026-06-30T23:59:59.999Z'),
    createdAt: new Date('2026-06-30T23:59:59.999Z'),
    updatedAt: new Date('2026-06-30T23:59:59.999Z'),
  },
  {
    id: 's3',
    accountId: 'range-cny',
    balance: 4600,
    snapshotDate: new Date('2026-07-31T23:59:59.999Z'),
    createdAt: new Date('2026-07-31T23:59:59.999Z'),
    updatedAt: new Date('2026-07-31T23:59:59.999Z'),
  },
  {
    id: 's4',
    accountId: 'range-usd',
    balance: 1050,
    snapshotDate: new Date('2026-07-31T23:59:59.999Z'),
    createdAt: new Date('2026-07-31T23:59:59.999Z'),
    updatedAt: new Date('2026-07-31T23:59:59.999Z'),
  },
]

const rangedTrend = buildMonthlyCashflowTrend(rangedTransactions)
assert(
  rangedTrend.length === 2,
  `cross-month trend point count expected 2, got ${rangedTrend.length}`
)
assert(
  rangedTrend[0]?.date === '2026-06',
  `first trend month expected 2026-06, got ${rangedTrend[0]?.date}`
)
assert(
  rangedTrend[0]?.income === 1000,
  `June trend income expected 1000, got ${rangedTrend[0]?.income}`
)
assert(
  rangedTrend[0]?.expense === 20,
  `June trend expense expected 20, got ${rangedTrend[0]?.expense}`
)
assert(
  rangedTrend[1]?.date === '2026-07',
  `second trend month expected 2026-07, got ${rangedTrend[1]?.date}`
)
assert(
  rangedTrend[1]?.income === 500,
  `July trend income expected 500, got ${rangedTrend[1]?.income}`
)
assert(
  rangedTrend[1]?.expense === 50,
  `July trend expense expected 50, got ${rangedTrend[1]?.expense}`
)

const juneRange = {
  startDate: new Date('2026-06-01T00:00:00.000Z'),
  endDate: new Date('2026-06-30T23:59:59.999Z'),
}
const julyRange = {
  startDate: new Date('2026-07-01T00:00:00.000Z'),
  endDate: new Date('2026-07-31T23:59:59.999Z'),
}

const juneSummary = groupByCurrency(rangedAccounts, rangedTransactions, juneRange, rangedSnapshots)
const julySummary = groupByCurrency(rangedAccounts, rangedTransactions, julyRange, rangedSnapshots)

const juneCny = juneSummary.currencies.find((item) => item.currency === 'CNY')
const juneUsd = juneSummary.currencies.find((item) => item.currency === 'USD')
const julyCny = julySummary.currencies.find((item) => item.currency === 'CNY')
const julyUsd = julySummary.currencies.find((item) => item.currency === 'USD')

assert(
  juneSummary.currencyCount === 2,
  `June currency count expected 2, got ${juneSummary.currencyCount}`
)
assert(
  julySummary.currencyCount === 2,
  `July currency count expected 2, got ${julySummary.currencyCount}`
)
assert(juneCny?.totalAssets === 4200, `June CNY assets expected 4200, got ${juneCny?.totalAssets}`)
assert(juneUsd?.totalAssets === 800, `June USD assets expected 800, got ${juneUsd?.totalAssets}`)
assert(julyCny?.totalAssets === 4600, `July CNY assets expected 4600, got ${julyCny?.totalAssets}`)
assert(julyUsd?.totalAssets === 1050, `July USD assets expected 1050, got ${julyUsd?.totalAssets}`)

assert(juneCny?.totalIncome === 1000, `June CNY income expected 1000, got ${juneCny?.totalIncome}`)
assert(juneCny?.totalExpense === 0, `June CNY expense expected 0, got ${juneCny?.totalExpense}`)
assert(
  juneCny?.investmentNetProfit === 0,
  `June CNY investment net profit expected 0, got ${juneCny?.investmentNetProfit}`
)
assert(juneUsd?.totalIncome === 0, `June USD income expected 0, got ${juneUsd?.totalIncome}`)
assert(juneUsd?.totalExpense === 20, `June USD expense expected 20, got ${juneUsd?.totalExpense}`)

assert(julyCny?.totalIncome === 300, `July CNY income expected 300, got ${julyCny?.totalIncome}`)
assert(julyCny?.totalExpense === 50, `July CNY expense expected 50, got ${julyCny?.totalExpense}`)
assert(
  julyCny?.investmentNetProfit === 70,
  `July CNY investment net profit expected 70, got ${julyCny?.investmentNetProfit}`
)
assert(julyUsd?.totalIncome === 200, `July USD income expected 200, got ${julyUsd?.totalIncome}`)
assert(julyUsd?.totalExpense === 0, `July USD expense expected 0, got ${julyUsd?.totalExpense}`)

const fallbackAccount: Account = {
  id: 'fallback-cny',
  name: 'Fallback CNY',
  type: AccountType.BANK,
  balance: 1120,
  initialBalance: 1000,
  currency: 'CNY',
  color: '#AA5500',
  createdAt: baseDate,
  updatedAt: baseDate,
}

const fallbackTransactions: Transaction[] = [
  {
    id: 'f1',
    accountId: 'fallback-cny',
    type: TransactionType.INCOME,
    amount: 200,
    createdAt: new Date('2026-07-02T08:00:00.000Z'),
    updatedAt: new Date('2026-07-02T08:00:00.000Z'),
  },
  {
    id: 'f2',
    accountId: 'fallback-cny',
    type: TransactionType.INVESTMENT_PROFIT,
    amount: 50,
    createdAt: new Date('2026-07-03T08:00:00.000Z'),
    updatedAt: new Date('2026-07-03T08:00:00.000Z'),
  },
  {
    id: 'f3',
    accountId: 'fallback-cny',
    type: TransactionType.TRANSFER_OUT,
    amount: 100,
    createdAt: new Date('2026-07-04T08:00:00.000Z'),
    updatedAt: new Date('2026-07-04T08:00:00.000Z'),
  },
  {
    id: 'f4',
    accountId: 'fallback-cny',
    type: TransactionType.INVESTMENT_LOSS,
    amount: 30,
    createdAt: new Date('2026-07-05T08:00:00.000Z'),
    updatedAt: new Date('2026-07-05T08:00:00.000Z'),
  },
]

const fallbackBalance = getAccountBalanceAtDate(
  fallbackTransactions,
  fallbackAccount,
  new Date('2026-07-10T23:59:59.999Z')
)
assert(fallbackBalance === 1120, `fallback balance expected 1120, got ${fallbackBalance}`)

const snapshotTransactionAccount: Account = {
  id: 'snapshot-txn-cny',
  name: 'Snapshot Txn CNY',
  type: AccountType.BANK,
  balance: 5200,
  initialBalance: 3000,
  currency: 'CNY',
  color: '#8844AA',
  createdAt: baseDate,
  updatedAt: baseDate,
}

const snapshotTransactions: Transaction[] = [
  {
    id: 'st1',
    accountId: 'snapshot-txn-cny',
    type: TransactionType.SNAPSHOT,
    balance: 5000,
    tags: ['month-end'],
    createdAt: new Date(2026, 5, 30, 23, 59, 59, 999),
    updatedAt: new Date(2026, 5, 30, 23, 59, 59, 999),
  },
  {
    id: 'st2',
    accountId: 'snapshot-txn-cny',
    type: TransactionType.INCOME,
    amount: 100,
    createdAt: new Date(2026, 6, 5, 8, 0, 0, 0),
    updatedAt: new Date(2026, 6, 5, 8, 0, 0, 0),
  },
  {
    id: 'st3',
    accountId: 'snapshot-txn-cny',
    type: TransactionType.INVESTMENT_PROFIT,
    amount: 20,
    createdAt: new Date(2026, 6, 7, 8, 0, 0, 0),
    updatedAt: new Date(2026, 6, 7, 8, 0, 0, 0),
  },
  {
    id: 'st4',
    accountId: 'snapshot-txn-cny',
    type: TransactionType.SNAPSHOT,
    balance: 5300,
    tags: ['month-end'],
    createdAt: new Date(2026, 6, 31, 23, 59, 59, 999),
    updatedAt: new Date(2026, 6, 31, 23, 59, 59, 999),
  },
]

const midJulyBalance = getAccountBalanceAtDate(
  snapshotTransactions,
  snapshotTransactionAccount,
  new Date('2026-07-10T23:59:59.999Z')
)
assert(midJulyBalance === 5120, `mid-July balance expected 5120, got ${midJulyBalance}`)

const directMonthEndBalance = getAccountBalanceAtDate(
  snapshotTransactions,
  snapshotTransactionAccount,
  new Date('2026-07-31T23:59:59.999Z')
)
assert(
  directMonthEndBalance === 5300,
  `month-end snapshot balance expected 5300, got ${directMonthEndBalance}`
)

const storedSnapshotRange = groupByCurrency(
  [snapshotTransactionAccount],
  snapshotTransactions.filter((item) => item.type !== TransactionType.SNAPSHOT),
  {
    startDate: new Date('2026-07-01T00:00:00.000Z'),
    endDate: new Date('2026-07-10T23:59:59.999Z'),
  },
  [
    {
      id: 'ss1',
      accountId: 'snapshot-txn-cny',
      balance: 5000,
      snapshotDate: new Date(2026, 5, 30, 23, 59, 59, 999),
      createdAt: new Date(2026, 5, 30, 23, 59, 59, 999),
      updatedAt: new Date(2026, 5, 30, 23, 59, 59, 999),
    },
    {
      id: 'ss2',
      accountId: 'snapshot-txn-cny',
      balance: 5300,
      snapshotDate: new Date(2026, 6, 31, 23, 59, 59, 999),
      createdAt: new Date(2026, 6, 31, 23, 59, 59, 999),
      updatedAt: new Date(2026, 6, 31, 23, 59, 59, 999),
    },
  ]
)
assert(
  storedSnapshotRange.currencies[0]?.totalAssets === 5120,
  `stored snapshot mid-range assets expected 5120, got ${storedSnapshotRange.currencies[0]?.totalAssets}`
)

const transferAccounts: Account[] = [
  {
    id: 'transfer-cny-a',
    name: 'Transfer CNY A',
    type: AccountType.BANK,
    balance: 1450,
    initialBalance: 1000,
    currency: 'CNY',
    color: '#009977',
    createdAt: baseDate,
    updatedAt: baseDate,
  },
  {
    id: 'transfer-cny-b',
    name: 'Transfer CNY B',
    type: AccountType.BANK,
    balance: 1300,
    initialBalance: 700,
    currency: 'CNY',
    color: '#7755AA',
    createdAt: baseDate,
    updatedAt: baseDate,
  },
]

const transferTransactions: Transaction[] = [
  {
    id: 'tt1',
    accountId: 'transfer-cny-a',
    type: TransactionType.INCOME,
    amount: 500,
    createdAt: new Date(2026, 6, 2, 9, 0, 0, 0),
    updatedAt: new Date(2026, 6, 2, 9, 0, 0, 0),
  },
  {
    id: 'tt2',
    accountId: 'transfer-cny-a',
    type: TransactionType.TRANSFER_OUT,
    amount: 200,
    transferToAccountId: 'transfer-cny-b',
    transferPairId: 'pair-1',
    createdAt: new Date(2026, 6, 3, 9, 0, 0, 0),
    updatedAt: new Date(2026, 6, 3, 9, 0, 0, 0),
  },
  {
    id: 'tt3',
    accountId: 'transfer-cny-b',
    type: TransactionType.TRANSFER_IN,
    amount: 200,
    transferFromAccountId: 'transfer-cny-a',
    transferPairId: 'pair-1',
    createdAt: new Date(2026, 6, 3, 9, 0, 0, 0),
    updatedAt: new Date(2026, 6, 3, 9, 0, 0, 0),
  },
  {
    id: 'tt4',
    accountId: 'transfer-cny-b',
    type: TransactionType.DEPOSIT,
    amount: 400,
    createdAt: new Date(2026, 6, 4, 9, 0, 0, 0),
    updatedAt: new Date(2026, 6, 4, 9, 0, 0, 0),
  },
  {
    id: 'tt5',
    accountId: 'transfer-cny-a',
    type: TransactionType.CONSUMPTION,
    amount: 50,
    createdAt: new Date(2026, 6, 5, 9, 0, 0, 0),
    updatedAt: new Date(2026, 6, 5, 9, 0, 0, 0),
  },
  {
    id: 'tt6',
    accountId: 'transfer-cny-b',
    type: TransactionType.INVESTMENT_PROFIT,
    amount: 20,
    createdAt: new Date(2026, 6, 6, 9, 0, 0, 0),
    updatedAt: new Date(2026, 6, 6, 9, 0, 0, 0),
  },
  {
    id: 'tt7',
    accountId: 'transfer-cny-a',
    type: TransactionType.INVESTMENT_LOSS,
    amount: 10,
    createdAt: new Date(2026, 6, 7, 9, 0, 0, 0),
    updatedAt: new Date(2026, 6, 7, 9, 0, 0, 0),
  },
]

const transferSummary = groupByCurrency(transferAccounts, transferTransactions)
const transferCny = transferSummary.currencies.find((item) => item.currency === 'CNY')

assert(!!transferCny, 'transfer CNY summary should exist')
assert(
  transferSummary.currencyCount === 1,
  `transfer currency count expected 1, got ${transferSummary.currencyCount}`
)
assert(
  transferCny?.totalAssets === 2750,
  `transfer total assets expected 2750, got ${transferCny?.totalAssets}`
)
assert(
  transferCny?.totalIncome === 900,
  `transfer total income expected 900, got ${transferCny?.totalIncome}`
)
assert(
  transferCny?.totalExpense === 50,
  `transfer total expense expected 50, got ${transferCny?.totalExpense}`
)
assert(
  transferCny?.netIncome === 850,
  `transfer net income expected 850, got ${transferCny?.netIncome}`
)
assert(
  transferCny?.investmentNetProfit === 10,
  `transfer investment net profit expected 10, got ${transferCny?.investmentNetProfit}`
)
assert(
  transferCny?.accountBalances['transfer-cny-a'] === 1450,
  `transfer account A balance expected 1450, got ${transferCny?.accountBalances['transfer-cny-a']}`
)
assert(
  transferCny?.accountBalances['transfer-cny-b'] === 1300,
  `transfer account B balance expected 1300, got ${transferCny?.accountBalances['transfer-cny-b']}`
)

const transferMidRange = {
  startDate: new Date(2026, 6, 1, 0, 0, 0, 0),
  endDate: new Date(2026, 6, 4, 23, 59, 59, 999),
}
const transferMidSummary = groupByCurrency(transferAccounts, transferTransactions, transferMidRange)
const transferMidCny = transferMidSummary.currencies[0]

assert(
  transferMidCny?.totalAssets === 2600,
  `transfer mid-range assets expected 2600, got ${transferMidCny?.totalAssets}`
)
assert(
  transferMidCny?.totalIncome === 900,
  `transfer mid-range income expected 900, got ${transferMidCny?.totalIncome}`
)
assert(
  transferMidCny?.totalExpense === 0,
  `transfer mid-range expense expected 0, got ${transferMidCny?.totalExpense}`
)
assert(
  transferMidCny?.investmentNetProfit === 0,
  `transfer mid-range investment net profit expected 0, got ${transferMidCny?.investmentNetProfit}`
)

const transferAccountABalance = getAccountBalanceAtDate(
  transferTransactions,
  transferAccounts[0]!,
  new Date(2026, 6, 7, 23, 59, 59, 999)
)
const transferAccountBBalance = getAccountBalanceAtDate(
  transferTransactions,
  transferAccounts[1]!,
  new Date(2026, 6, 7, 23, 59, 59, 999)
)

assert(
  transferAccountABalance === 1240,
  `transfer account A calculated balance expected 1240, got ${transferAccountABalance}`
)
assert(
  transferAccountBBalance === 1320,
  `transfer account B calculated balance expected 1320, got ${transferAccountBBalance}`
)

const exportSourceAccounts: Account[] = [
  {
    id: 'source-cny-main',
    name: 'Shared CNY Main',
    type: AccountType.BANK,
    balance: 1800,
    initialBalance: 1000,
    currency: 'CNY',
    color: '#117799',
    createdAt: baseDate,
    updatedAt: baseDate,
  },
  {
    id: 'source-cny-secondary',
    name: 'Shared CNY Secondary',
    type: AccountType.BANK,
    balance: 900,
    initialBalance: 600,
    currency: 'CNY',
    color: '#995511',
    createdAt: baseDate,
    updatedAt: baseDate,
  },
  {
    id: 'source-usd',
    name: 'Shared USD',
    type: AccountType.BANK,
    balance: 1500,
    initialBalance: 1200,
    currency: 'USD',
    color: '#2244CC',
    createdAt: baseDate,
    updatedAt: baseDate,
  },
]

const importTargetAccounts: Account[] = [
  {
    id: 'target-cny-main',
    name: 'Shared CNY Main',
    type: AccountType.BANK,
    balance: 0,
    initialBalance: 0,
    currency: 'CNY',
    color: '#117799',
    createdAt: baseDate,
    updatedAt: baseDate,
  },
  {
    id: 'target-cny-secondary',
    name: 'Shared CNY Secondary',
    type: AccountType.BANK,
    balance: 0,
    initialBalance: 0,
    currency: 'CNY',
    color: '#995511',
    createdAt: baseDate,
    updatedAt: baseDate,
  },
  {
    id: 'target-usd',
    name: 'Shared USD',
    type: AccountType.BANK,
    balance: 0,
    initialBalance: 0,
    currency: 'USD',
    color: '#2244CC',
    createdAt: baseDate,
    updatedAt: baseDate,
  },
]

const exportSourceTransactions: Transaction[] = [
  {
    id: 'ex1',
    accountId: 'source-cny-main',
    type: TransactionType.TRANSFER_OUT,
    amount: 150,
    transferToAccountId: 'source-cny-secondary',
    transferPairId: 'expair-1',
    description: 'transfer to secondary',
    createdAt: new Date(2026, 7, 1, 10, 0, 0, 0),
    updatedAt: new Date(2026, 7, 1, 10, 0, 0, 0),
  },
  {
    id: 'ex2',
    accountId: 'source-cny-secondary',
    type: TransactionType.TRANSFER_IN,
    amount: 150,
    transferFromAccountId: 'source-cny-main',
    transferPairId: 'expair-1',
    description: 'transfer from main',
    createdAt: new Date(2026, 7, 1, 10, 0, 0, 0),
    updatedAt: new Date(2026, 7, 1, 10, 0, 0, 0),
  },
  {
    id: 'ex3',
    accountId: 'source-usd',
    type: TransactionType.INCOME,
    amount: 250,
    description: 'usd salary',
    createdAt: new Date(2026, 7, 2, 10, 0, 0, 0),
    updatedAt: new Date(2026, 7, 2, 10, 0, 0, 0),
  },
  {
    id: 'ex4',
    accountId: 'source-usd',
    type: TransactionType.INVESTMENT_LOSS,
    amount: 40,
    description: 'usd drawdown',
    createdAt: new Date(2026, 7, 3, 10, 0, 0, 0),
    updatedAt: new Date(2026, 7, 3, 10, 0, 0, 0),
  },
]

const exportedRoundTripJson = exportTransactionsToJSON(
  exportSourceTransactions,
  exportSourceAccounts
)
const exportedRoundTripCsv = exportTransactionsToCSV(exportSourceTransactions, exportSourceAccounts)

const parsedJsonRoundTrip = parseImportedJSON(exportedRoundTripJson, importTargetAccounts)
const parsedCsvRoundTrip = parseImportedCSV(exportedRoundTripCsv, importTargetAccounts)

const singleLineTransferInExpanded = expandImportedTransferPairs([
  {
    accountId: 'target-cny-secondary',
    type: TransactionType.TRANSFER_IN,
    amount: 500,
    transferFromAccountId: 'target-cny-main',
    description: 'from main',
    createdAt: new Date(2026, 7, 5, 10, 0, 0, 0),
  },
])

assert(
  singleLineTransferInExpanded.length === 2,
  `single-line transfer_in expansion expected 2 rows, got ${singleLineTransferInExpanded.length}`
)
assert(
  singleLineTransferInExpanded.some(
    (item) =>
      item.type === TransactionType.TRANSFER_OUT &&
      item.accountId === 'target-cny-main' &&
      item.transferToAccountId === 'target-cny-secondary'
  ),
  'single-line transfer_in should generate source transfer_out row'
)

const singleLineTransferExpanded = expandImportedTransferPairs([
  {
    accountId: 'target-cny-main',
    type: TransactionType.TRANSFER,
    amount: 700,
    transferToAccountId: 'target-cny-secondary',
    description: 'generic transfer',
    createdAt: new Date(2026, 7, 6, 10, 0, 0, 0),
  },
])

assert(
  singleLineTransferExpanded.length === 2,
  `single-line transfer expansion expected 2 rows, got ${singleLineTransferExpanded.length}`
)
assert(
  singleLineTransferExpanded.some(
    (item) =>
      item.type === TransactionType.TRANSFER_IN &&
      item.accountId === 'target-cny-secondary' &&
      item.transferFromAccountId === 'target-cny-main'
  ),
  'single-line transfer should generate target transfer_in row'
)

const jsonTransferOut = parsedJsonRoundTrip.find((item) => item.id === 'ex1')
const jsonTransferIn = parsedJsonRoundTrip.find((item) => item.id === 'ex2')
const jsonUsdLoss = parsedJsonRoundTrip.find((item) => item.id === 'ex4')

assert(
  parsedJsonRoundTrip.length === 4,
  `JSON roundtrip count expected 4, got ${parsedJsonRoundTrip.length}`
)
assert(
  jsonTransferOut?.accountId === 'target-cny-main',
  `JSON transfer out account remap expected target-cny-main, got ${jsonTransferOut?.accountId}`
)
assert(
  jsonTransferOut?.transferToAccountId === 'target-cny-secondary',
  `JSON transfer out target remap expected target-cny-secondary, got ${jsonTransferOut?.transferToAccountId}`
)
assert(
  jsonTransferIn?.accountId === 'target-cny-secondary',
  `JSON transfer in account remap expected target-cny-secondary, got ${jsonTransferIn?.accountId}`
)
assert(
  jsonTransferIn?.transferFromAccountId === 'target-cny-main',
  `JSON transfer in source remap expected target-cny-main, got ${jsonTransferIn?.transferFromAccountId}`
)
assert(
  jsonUsdLoss?.type === TransactionType.INVESTMENT_LOSS,
  `JSON investment loss type expected investment_loss, got ${jsonUsdLoss?.type}`
)

const csvTransferOut = parsedCsvRoundTrip.find((item) => item.id === 'ex1')
const csvTransferIn = parsedCsvRoundTrip.find((item) => item.id === 'ex2')
const csvUsdIncome = parsedCsvRoundTrip.find((item) => item.id === 'ex3')
const csvUsdLoss = parsedCsvRoundTrip.find((item) => item.id === 'ex4')

assert(
  parsedCsvRoundTrip.length === 4,
  `CSV roundtrip count expected 4, got ${parsedCsvRoundTrip.length}`
)
assert(
  csvTransferOut?.accountId === 'target-cny-main',
  `CSV transfer out account remap expected target-cny-main, got ${csvTransferOut?.accountId}`
)
assert(
  csvTransferOut?.transferToAccountId === 'target-cny-secondary',
  `CSV transfer out target remap expected target-cny-secondary, got ${csvTransferOut?.transferToAccountId}`
)
assert(
  csvTransferIn?.transferFromAccountId === 'target-cny-main',
  `CSV transfer in source remap expected target-cny-main, got ${csvTransferIn?.transferFromAccountId}`
)
assert(
  csvUsdIncome?.accountId === 'target-usd',
  `CSV USD income account remap expected target-usd, got ${csvUsdIncome?.accountId}`
)
assert(
  csvUsdLoss?.type === TransactionType.INVESTMENT_LOSS,
  `CSV investment loss type expected investment_loss, got ${csvUsdLoss?.type}`
)

const snapshotImportAccounts: Account[] = [
  {
    id: 'snap-import-cny',
    name: 'Snapshot Import CNY',
    type: AccountType.BANK,
    balance: 0,
    initialBalance: 1000,
    currency: 'CNY',
    color: '#336655',
    createdAt: baseDate,
    updatedAt: baseDate,
  },
]

const snapshotImportData: SnapshotImportData[] = [
  {
    accountName: 'Snapshot Import CNY',
    date: new Date(2026, 0, 31, 23, 59, 59, 999),
    snapshotBalance: 1200,
    transferIn: 100,
  },
  {
    accountName: 'Snapshot Import CNY',
    date: new Date(2026, 1, 28, 23, 59, 59, 999),
    snapshotBalance: 1500,
    transferIn: 200,
  },
  {
    accountName: 'Snapshot Import CNY',
    date: new Date(2026, 2, 31, 23, 59, 59, 999),
    snapshotBalance: 1600,
    transferIn: 50,
  },
]

const existingManagedTransactions: Transaction[] = [
  {
    id: 'old-sync-profit',
    accountId: 'snap-import-cny',
    type: TransactionType.INVESTMENT_PROFIT,
    amount: 999,
    description: '2026年2月投资收益（旧记录）',
    tags: ['投资收益', '快照生成'],
    createdAt: new Date(2026, 1, 28, 23, 59, 59, 999),
    updatedAt: new Date(2026, 1, 28, 23, 59, 59, 999),
  },
]

const existingSnapshotsForCleanup: Snapshot[] = [
  {
    id: 'old-snapshot-feb',
    accountId: 'snap-import-cny',
    balance: 1499,
    snapshotDate: new Date(2026, 1, 28, 23, 59, 59, 999),
    createdAt: new Date(2026, 1, 28, 23, 59, 59, 999),
    updatedAt: new Date(2026, 1, 28, 23, 59, 59, 999),
  },
]

const snapshotCleanupPlan = createSnapshotImportCleanupPlan(
  snapshotImportData,
  snapshotImportAccounts,
  existingManagedTransactions,
  existingSnapshotsForCleanup
)

assert(
  snapshotCleanupPlan.transactionIds.includes('old-sync-profit'),
  'snapshot cleanup should include old managed profit transaction'
)
assert(
  snapshotCleanupPlan.snapshotIds.includes('old-snapshot-feb'),
  'snapshot cleanup should include old snapshot in imported month'
)

const importedSnapshotsCreated: Array<{
  accountId: string
  balance: number
  snapshotDate: Date
  investmentAmount?: number
  note?: string
}> = []
const importedProfitTransactionsCreated: Array<Omit<Transaction, 'id'>> = []

const snapshotImportResult = importSnapshotsAndCreateProfits(
  snapshotImportData,
  snapshotImportAccounts.map((account) => ({ id: account.id, name: account.name })),
  (transaction) => {
    importedProfitTransactionsCreated.push(transaction)
  },
  (snapshot) => {
    importedSnapshotsCreated.push(snapshot)
  }
)

assert(
  snapshotImportResult.success === 3,
  `snapshot import success expected 3, got ${snapshotImportResult.success}`
)
assert(
  snapshotImportResult.profitCreated === 2,
  `snapshot import manual profit count expected 2, got ${snapshotImportResult.profitCreated}`
)
assert(
  importedSnapshotsCreated.length === 3,
  `snapshot import created snapshot count expected 3, got ${importedSnapshotsCreated.length}`
)
assert(
  importedProfitTransactionsCreated.length === 2,
  `snapshot import manual transaction count expected 2, got ${importedProfitTransactionsCreated.length}`
)

const syncPlanAfterSnapshotImport = createSnapshotProfitSyncPlan(
  snapshotImportAccounts,
  importedSnapshotsCreated.map((snapshot, index) => ({
    id: `generated-snapshot-${index}`,
    accountId: snapshot.accountId,
    balance: snapshot.balance,
    snapshotDate: snapshot.snapshotDate,
    investmentAmount: snapshot.investmentAmount,
    note: snapshot.note,
    createdAt: snapshot.snapshotDate,
    updatedAt: snapshot.snapshotDate,
  })),
  importedProfitTransactionsCreated.map((transaction, index) => ({
    ...transaction,
    id: `generated-profit-${index}`,
  }))
)

assert(
  syncPlanAfterSnapshotImport.create.length === 1,
  `snapshot sync create count expected 1, got ${syncPlanAfterSnapshotImport.create.length}`
)
assert(
  syncPlanAfterSnapshotImport.update.length === 2,
  `snapshot sync update count expected 2, got ${syncPlanAfterSnapshotImport.update.length}`
)
assert(
  syncPlanAfterSnapshotImport.deleteIds.length === 0,
  `snapshot sync delete count expected 0, got ${syncPlanAfterSnapshotImport.deleteIds.length}`
)
assert(
  syncPlanAfterSnapshotImport.create[0]?.amount === 100,
  `snapshot sync first-month profit expected 100, got ${syncPlanAfterSnapshotImport.create[0]?.amount}`
)
assert(
  syncPlanAfterSnapshotImport.create[0]?.type === TransactionType.INVESTMENT_PROFIT,
  `snapshot sync first-month type expected investment_profit, got ${syncPlanAfterSnapshotImport.create[0]?.type}`
)
assert(
  syncPlanAfterSnapshotImport.update.every((item) =>
    String(item.updates.description || '').includes('快照自动同步')
  ),
  'snapshot sync updates should normalize manual import descriptions to synchronized copy'
)

console.log('cashflow regression passed')
console.log(
  JSON.stringify(
    {
      summary,
      trend,
      cnySummary,
      rangedTrend,
      juneSummary,
      julySummary,
      fallbackBalance,
      midJulyBalance,
      directMonthEndBalance,
      storedSnapshotRange,
      transferSummary,
      transferMidSummary,
      transferAccountABalance,
      transferAccountBBalance,
      parsedJsonRoundTrip,
      parsedCsvRoundTrip,
      snapshotCleanupPlan,
      snapshotImportResult,
      syncPlanAfterSnapshotImport,
    },
    null,
    2
  )
)
