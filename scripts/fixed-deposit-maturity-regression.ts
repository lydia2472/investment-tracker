import { subMonths, subDays, addMonths } from 'date-fns'

import { FixedDepositRenewalService } from '@/lib/services/fixed-deposit-renewal-service'
import { InterestSyncService } from '@/lib/services/interest-sync-service'
import { MaturityReminderService } from '@/lib/services/maturity-reminder-service'
import { useAccountStore } from '@/lib/stores/account-store'
import { useSnapshotStore } from '@/lib/stores/snapshot-store'
import { useTransactionStore } from '@/lib/stores/transaction-store'
import { AccountType, InterestPaymentFrequency, TransactionType, type Account } from '@/types'

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

function createBaseAccount(overrides: Partial<Account>): Account {
  const now = new Date()

  return {
    id: overrides.id || 'account-id',
    name: overrides.name || 'Account',
    type: overrides.type || AccountType.BANK,
    balance: overrides.balance ?? 0,
    initialBalance: overrides.initialBalance ?? 0,
    currency: overrides.currency || 'CNY',
    color: overrides.color || '#00AA88',
    createdAt: overrides.createdAt || now,
    updatedAt: overrides.updatedAt || now,
    description: overrides.description,
    icon: overrides.icon,
    riskLevel: overrides.riskLevel,
    fixedDepositConfig: overrides.fixedDepositConfig,
  }
}

resetStores()

const today = new Date()
const fixedStartDate = subMonths(today, 4)
const fixedMaturityDate = subMonths(today, 1)

const fundingAccount = createBaseAccount({
  id: 'bank-main',
  name: 'Main Bank',
  type: AccountType.BANK,
  balance: 50000,
  initialBalance: 50000,
})

const fixedDepositAccount = createBaseAccount({
  id: 'fixed-main',
  name: 'Fixed Deposit',
  type: AccountType.FIXED_DEPOSIT,
  balance: 10000,
  initialBalance: 10000,
  fixedDepositConfig: {
    principal: 10000,
    interestRate: 12,
    startDate: fixedStartDate,
    maturityDate: fixedMaturityDate,
    interestPaymentFrequency: InterestPaymentFrequency.MATURITY,
    autoRollOver: false,
  },
})

useAccountStore.setState((state) => ({
  ...state,
  accounts: [fundingAccount, fixedDepositAccount],
}))

InterestSyncService.syncAllInterest()

const interestTransactions = useTransactionStore
  .getState()
  .transactions.filter(
    (transaction) =>
      transaction.accountId === fixedDepositAccount.id &&
      transaction.type === TransactionType.INCOME &&
      transaction.isInterestPayment
  )

const snapshotTransactions = useTransactionStore
  .getState()
  .transactions.filter(
    (transaction) =>
      transaction.accountId === fixedDepositAccount.id &&
      transaction.type === TransactionType.SNAPSHOT &&
      transaction.isInterestPayment
  )

assert(interestTransactions.length > 0, 'fixed deposit should generate interest transactions before maturity')
assert(snapshotTransactions.length > 0, 'fixed deposit should generate snapshot transactions before maturity')

const maturityDetails = MaturityReminderService.getMaturityDetails(fixedDepositAccount)
assert(!!maturityDetails, 'maturity details should exist for fixed deposit account')

const maturedDeposits = MaturityReminderService.getMaturedDeposits()
assert(maturedDeposits.length === 1, `expected 1 matured deposit, got ${maturedDeposits.length}`)

const fixedBalanceAfterSync = useAccountStore.getState().getAccount(fixedDepositAccount.id)?.balance
assert(
  fixedBalanceAfterSync === maturityDetails!.totalAmount,
  `fixed deposit balance after interest sync should equal maturity total ${maturityDetails!.totalAmount}, got ${fixedBalanceAfterSync}`
)

useTransactionStore.getState().transfer(
  fixedDepositAccount.id,
  fundingAccount.id,
  maturityDetails!.totalAmount,
  '定期存款到期转出',
  subDays(today, 1),
  {
    transferOutTags: ['到期转出'],
    transferInTags: ['到期转入'],
  }
)

const fixedBalanceAfterMaturityTransfer = useAccountStore.getState().getAccount(fixedDepositAccount.id)
  ?.balance
assert(
  fixedBalanceAfterMaturityTransfer === 0,
  `fixed deposit balance should be 0 after maturity transfer, got ${fixedBalanceAfterMaturityTransfer}`
)

assert(
  MaturityReminderService.getMaturedDeposits().length === 0,
  'maturity reminder should disappear after maturity transfer'
)

FixedDepositRenewalService.renewFixedDeposit({
  fromAccountId: fundingAccount.id,
  toAccountId: fixedDepositAccount.id,
  amount: maturityDetails!.totalAmount,
  newConfig: {
    startDate: today,
    maturityDate: addMonths(today, 6),
    interestRate: 8,
    interestPaymentFrequency: InterestPaymentFrequency.MATURITY,
    autoRollOver: false,
  },
  transferDate: today,
})

const renewedAccount = useAccountStore.getState().getAccount(fixedDepositAccount.id)
assert(!!renewedAccount?.fixedDepositConfig, 'renewed fixed deposit should keep fixed deposit config')
assert(
  renewedAccount?.balance === maturityDetails!.totalAmount,
  `renewed fixed deposit balance should equal renewed principal ${maturityDetails!.totalAmount}, got ${renewedAccount?.balance}`
)
assert(
  renewedAccount?.initialBalance === maturityDetails!.totalAmount,
  `renewed fixed deposit initial balance should equal renewed principal ${maturityDetails!.totalAmount}, got ${renewedAccount?.initialBalance}`
)

const legacyInterestTransactions = useTransactionStore
  .getState()
  .transactions.filter(
    (transaction) =>
      transaction.accountId === fixedDepositAccount.id &&
      transaction.type === TransactionType.INCOME &&
      transaction.isInterestPayment &&
      new Date(transaction.createdAt) < today
  )

assert(
  legacyInterestTransactions.length > 0,
  'legacy interest transactions should remain for history, but must not affect renewed balance'
)

const autoRollOverAccount = createBaseAccount({
  id: 'fixed-auto-rollover',
  name: 'Auto Roll Over Fixed',
  type: AccountType.FIXED_DEPOSIT,
  balance: 5000,
  initialBalance: 5000,
  fixedDepositConfig: {
    principal: 5000,
    interestRate: 6,
    startDate: subMonths(today, 3),
    maturityDate: subDays(today, 3),
    interestPaymentFrequency: InterestPaymentFrequency.MATURITY,
    autoRollOver: true,
  },
})

useAccountStore.setState((state) => ({
  ...state,
  accounts: [...state.accounts, autoRollOverAccount],
}))

const autoRollOverMatured = MaturityReminderService.isMaturedAndNotTransferred(autoRollOverAccount)

console.log(
  JSON.stringify(
    {
      fixedDepositBalanceAfterSync: fixedBalanceAfterSync,
      maturityTotalAmount: maturityDetails!.totalAmount,
      fixedDepositBalanceAfterMaturityTransfer: fixedBalanceAfterMaturityTransfer,
      renewedBalance: renewedAccount?.balance,
      renewedInitialBalance: renewedAccount?.initialBalance,
      interestTransactionCount: interestTransactions.length,
      snapshotTransactionCount: snapshotTransactions.length,
      autoRollOverStillNeedsManualHandling: autoRollOverMatured,
    },
    null,
    2
  )
)

assert(
  autoRollOverMatured === true,
  'auto roll over deposits are still treated as manually pending in current implementation'
)

console.log('fixed deposit maturity regression passed')
