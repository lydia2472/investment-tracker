# API 文档 / API Documentation

本文档提供投资账户管理系统的完整 API 参考，包括数据模型、状态管理、工具函数和自定义 Hooks。

This document provides a complete API reference for the Investment Account Management System, including data models, state management, utility functions, and custom hooks.

---

## 目录 / Table of Contents

- [数据模型 / Data Models](#数据模型--data-models)
  - [Account (账户)](#account-账户)
  - [Transaction (交易)](#transaction-交易)
  - [枚举类型 / Enum Types](#枚举类型--enum-types)
- [Zustand Store API](#zustand-store-api)
  - [useAccountStore](#useaccountstore)
  - [useTransactionStore](#usetransactionstore)
- [工具函数 / Utility Functions](#工具函数--utility-functions)
- [自定义 Hooks / Custom Hooks](#自定义-hooks--custom-hooks)

---

## 数据模型 / Data Models

### Account (账户)

**文件位置**: `src/types/index.ts`

账户表示用户的财务账户，如银行账户、证券账户、现金等。

An account represents a user's financial account, such as a bank account, securities account, or cash.

```typescript
interface Account {
  id: string                  // 唯一标识符 / Unique identifier (UUID)
  name: string                // 账户名称 / Account name
  type: AccountType           // 账户类型 / Account type
  balance: number             // 当前余额 / Current balance
  initialBalance: number      // 初始余额 / Initial balance
  currency: string            // 币种代码 / Currency code (CNY, USD, etc.)
  description?: string        // 描述信息 / Description (optional)
  color: string               // 颜色标识 / Color identifier (hex color)
  icon?: string               // 图标名称 / Icon name (optional)
  createdAt: Date             // 创建时间 / Creation timestamp
  updatedAt: Date             // 更新时间 / Last update timestamp
}
```

**字段说明 / Field Descriptions**:

| 字段 / Field | 类型 / Type | 必需 / Required | 说明 / Description |
|-------------|------------|---------------|------------------|
| `id` | `string` | ✅ | UUID 格式的唯一标识 |
| `name` | `string` | ✅ | 账户名称，如"招商银行" |
| `type` | `AccountType` | ✅ | 账户类型枚举值 |
| `balance` | `number` | ✅ | 当前余额（根据交易自动更新）|
| `initialBalance` | `number` | ✅ | 创建账户时的初始余额 |
| `currency` | `string` | ✅ | 币种代码，默认 "CNY" |
| `description` | `string` | ❌ | 账户描述或备注 |
| `color` | `string` | ✅ | 用于图表显示的颜色值 |
| `icon` | `string` | ❌ | 图标名称（预留字段）|
| `createdAt` | `Date` | ✅ | 账户创建时间 |
| `updatedAt` | `Date` | ✅ | 最后更新时间 |

---

### Transaction (交易)

**文件位置**: `src/types/index.ts`

交易表示账户的资金流动记录。

A transaction represents a record of fund flow in an account.

```typescript
interface Transaction {
  id: string                      // 唯一标识符 / Unique identifier (UUID)
  accountId: string              // 关联账户 ID / Associated account ID
  type: TransactionType          // 交易类型 / Transaction type
  category: TransactionCategory  // 交易分类 / Transaction category
  amount?: number                // 交易金额 / Transaction amount
  balance?: number               // 余额快照 / Balance snapshot
  transferToAccountId?: string   // 转入账户 ID / Transfer to account ID
  transferFromAccountId?: string // 转出账户 ID / Transfer from account ID
  transferId?: string            // 转账组 ID / Transfer group ID
  description?: string           // 描述 / Description
  note?: string                  // 备注信息 / Additional notes
  tags?: string[]                // 标签数组 / Tags array
  createdAt: Date                // 创建时间 / Creation timestamp
  updatedAt: Date                // 更新时间 / Last update timestamp
}
```

**字段说明 / Field Descriptions**:

| 字段 / Field | 类型 / Type | 必需 / Required | 说明 / Description |
|-------------|------------|---------------|------------------|
| `id` | `string` | ✅ | UUID 格式的唯一标识 |
| `accountId` | `string` | ✅ | 关联的账户 ID |
| `type` | `TransactionType` | ✅ | 交易类型枚举值 |
| `category` | `TransactionCategory` | ✅ | 交易分类枚举值 |
| `amount` | `number` | ❌ | 交易金额（快照类型无此字段）|
| `balance` | `number` | ❌ | 余额快照（快照类型专用）|
| `transferToAccountId` | `string` | ❌ | 转账目标账户 ID |
| `transferFromAccountId` | `string` | ❌ | 转账来源账户 ID |
| `transferId` | `string` | ❌ | 转账组 ID（关联转出和转入）|
| `description` | `string` | ❌ | 交易描述 |
| `note` | `string` | ❌ | 详细备注 |
| `tags` | `string[]` | ❌ | 标签（预留字段）|
| `createdAt` | `Date` | ✅ | 交易创建时间 |
| `updatedAt` | `Date` | ✅ | 最后更新时间 |

---

### 枚举类型 / Enum Types

#### AccountType (账户类型)

```typescript
enum AccountType {
  SECURITIES = 'SECURITIES',  // 证券账户 / Securities account
  BANK = 'BANK',              // 银行账户 / Bank account
  CASH = 'CASH',              // 现金 / Cash
  OTHER = 'OTHER'             // 其他 / Other
}
```

#### TransactionType (交易类型)

```typescript
enum TransactionType {
  INCOME = 'income',          // 收入 / Income
  EXPENSE = 'expense',        // 支出 / Expense
  TRANSFER = 'transfer',      // 转账 / Transfer
  SNAPSHOT = 'snapshot'       // 快照 / Snapshot
}
```

#### TransactionCategory (交易分类)

```typescript
enum TransactionCategory {
  DEPOSIT = 'deposit',                    // 存款 / Deposit
  WITHDRAW = 'withdraw',                  // 取款 / Withdraw
  INVESTMENT_GAIN = 'investment_gain',    // 投资收益 / Investment gain
  INVESTMENT_LOSS = 'investment_loss',    // 投资亏损 / Investment loss
  TRANSFER_OUT = 'transfer_out',          // 转出 / Transfer out
  TRANSFER_IN = 'transfer_in',            // 转入 / Transfer in
  SNAPSHOT = 'snapshot'                   // 快照 / Snapshot
}
```

**分类与类型的关系 / Category-Type Relationship**:

| TransactionType | 可用 TransactionCategory / Available Categories |
|-----------------|------------------------------------------------------|
| `INCOME` | `DEPOSIT`, `TRANSFER_IN`, `INVESTMENT_GAIN` |
| `EXPENSE` | `WITHDRAW`, `TRANSFER_OUT`, `INVESTMENT_LOSS` |
| `TRANSFER` | `TRANSFER_OUT`, `TRANSFER_IN` |
| `SNAPSHOT` | `SNAPSHOT` |

---

## Zustand Store API

### useAccountStore

**文件位置**: `src/lib/stores/account-store.ts`

管理账户状态和操作。

Manages account state and operations.

#### 状态 / State

```typescript
interface AccountState {
  accounts: Account[]  // 账户列表 / List of accounts
}
```

#### 方法 / Methods

##### `getAccounts()`

获取所有账户。

Get all accounts.

```typescript
const accounts = useAccountStore((state) => state.accounts)
// 或 / or
const accounts = useAccountStore((state) => state.getAccounts?.())
```

**返回值 / Returns**: `Account[]`

---

##### `addAccount(accountData)`

创建新账户。

Create a new account.

```typescript
const addAccount = useAccountStore((state) => state.addAccount)

addAccount({
  name: '招商银行',
  type: AccountType.BANK,
  initialBalance: 10000,
  currency: 'CNY',
  color: '#3b82f6',
  description: '工资卡'
})
```

**参数 / Parameters**:
- `accountData.accountName`: `string` - 账户名称
- `accountData.type`: `AccountType` - 账户类型
- `accountData.initialBalance`: `number` - 初始余额
- `accountData.currency`: `string` - 币种（默认 "CNY"）
- `accountData.color`: `string` - 颜色标识（默认 "#3b82f6"）
- `accountData.description`: `string` - 描述（可选）

**返回值 / Returns**: `void`

**副作用 / Side Effects**:
- 创建新账户
- 自动设置 `balance = initialBalance`
- 自动生成 `id`, `createdAt`, `updatedAt`
- 数据持久化到 localStorage

---

##### `updateAccount(id, data)`

更新账户信息。

Update account information.

```typescript
const updateAccount = useAccountStore((state) => state.updateAccount)

updateAccount('account-id', {
  name: '新名称',
  description: '更新后的描述'
})
```

**参数 / Parameters**:
- `id`: `string` - 账户 ID
- `data`: `Partial<Account>` - 要更新的字段

**返回值 / Returns**: `void`

**副作用 / Side Effects**:
- 更新指定字段
- 自动更新 `updatedAt` 时间戳
- 数据持久化到 localStorage

---

##### `deleteAccount(id)`

删除账户及其所有关联交易。

Delete account and all associated transactions.

```typescript
const deleteAccount = useAccountStore((state) => state.deleteAccount)

deleteAccount('account-id')
```

**参数 / Parameters**:
- `id`: `string` - 账户 ID

**返回值 / Returns**: `void`

**副作用 / Side Effects**:
- 删除账户
- 删除该账户的所有交易记录（通过 transaction-store）
- 数据持久化到 localStorage

**警告 / Warning**: 此操作不可逆！

---

##### `updateBalance(id, newBalance)`

更新账户余额（通常由交易自动触发）。

Update account balance (usually triggered automatically by transactions).

```typescript
const updateBalance = useAccountStore((state) => state.updateBalance)

updateBalance('account-id', 15000.00)
```

**参数 / Parameters**:
- `id`: `string` - 账户 ID
- `newBalance`: `number` - 新余额

**返回值 / Returns**: `void`

**副作用 / Side Effects**:
- 更新账户余额
- 自动更新 `updatedAt` 时间戳
- 数据持久化到 localStorage

**注意 / Note**: 通常不需要手动调用此方法，添加交易时会自动更新余额。

---

### useTransactionStore

**文件位置**: `src/lib/stores/transaction-store.ts`

管理交易状态和操作。

Manages transaction state and operations.

#### 状态 / State

```typescript
interface TransactionState {
  transactions: Transaction[]  // 交易列表 / List of transactions
}
```

#### 方法 / Methods

##### `getTransactions()`

获取所有交易。

Get all transactions.

```typescript
const transactions = useTransactionStore((state) => state.transactions)
// 或 / or
const transactions = useTransactionStore((state) => state.getTransactions?.())
```

**返回值 / Returns**: `Transaction[]`

---

##### `addTransaction(transactionData)`

添加新交易（自动更新账户余额）。

Add a new transaction (automatically updates account balance).

```typescript
const addTransaction = useTransactionStore((state) => state.addTransaction)

addTransaction({
  accountId: 'account-id',
  type: TransactionType.INCOME,
  category: TransactionCategory.DEPOSIT,
  amount: 5000,
  description: '工资收入',
  note: '5月份工资'
})
```

**参数 / Parameters**:
- `transactionData.accountId`: `string` - 关联账户 ID
- `transactionData.type`: `TransactionType` - 交易类型
- `transactionData.category`: `TransactionCategory` - 交易分类
- `transactionData.amount`: `number` - 金额（快照类型无需此字段）
- `transactionData.balance`: `number` - 余额快照（仅快照类型）
- `transactionData.description`: `string` - 描述（可选）
- `transactionData.note`: `string` - 备注（可选）

**返回值 / Returns**: `void`

**副作用 / Side Effects**:
- 创建新交易记录
- 自动更新关联账户的余额
  - 收入: `balance += amount`
  - 支出: `balance -= amount`
  - 快照: `balance = balance`
- 自动生成 `id`, `createdAt`, `updatedAt`
- 数据持久化到 localStorage

---

##### `updateTransaction(id, data)`

更新交易信息（自动调整账户余额）。

Update transaction information (automatically adjusts account balance).

```typescript
const updateTransaction = useTransactionStore((state) => state.updateTransaction)

updateTransaction('transaction-id', {
  amount: 6000,
  description: '更新后的描述'
})
```

**参数 / Parameters**:
- `id`: `string` - 交易 ID
- `data`: `Partial<Transaction>` - 要更新的字段

**返回值 / Returns**: `void`

**副作用 / Side Effects**:
- 更新交易记录
- 如果修改 `amount` 或 `accountId`，重新计算并更新账户余额
- 自动更新 `updatedAt` 时间戳
- 数据持久化到 localStorage

---

##### `deleteTransaction(id)`

删除交易（自动恢复账户余额）。

Delete transaction (automatically restores account balance).

```typescript
const deleteTransaction = useTransactionStore((state) => state.deleteTransaction)

deleteTransaction('transaction-id')
```

**参数 / Parameters**:
- `id`: `string` - 交易 ID

**返回值 / Returns**: `void`

**副作用 / Side Effects**:
- 删除交易记录
- 自动恢复关联账户的余额
  - 收入: `balance -= amount`
  - 支出: `balance += amount`
- 数据持久化到 localStorage

---

##### `transfer(fromAccountId, toAccountId, amount, description)`

账户间转账（自动生成双交易记录）。

Transfer funds between accounts (automatically generates dual transaction records).

```typescript
const transfer = useTransactionStore((state) => state.transfer)

transfer(
  'from-account-id',
  'to-account-id',
  1000,
  '生活费转账'
)
```

**参数 / Parameters**:
- `fromAccountId`: `string` - 转出账户 ID
- `toAccountId`: `string` - 转入账户 ID
- `amount`: `number` - 转账金额
- `description`: `string` - 转账描述

**返回值 / Returns**: `void`

**副作用 / Side Effects**:
- 创建两条交易记录：
  1. 转出账户的支出交易（`TRANSFER_OUT`）
  2. 转入账户的收入交易（`TRANSFER_IN`）
- 两条交易共享同一个 `transferId`，方便关联查询
- 自动更新两个账户的余额
- 数据持久化到 localStorage

**生成的交易 / Generated Transactions**:

```typescript
// 转出交易 / Withdraw transaction
{
  type: TransactionType.EXPENSE,
  category: TransactionCategory.TRANSFER_OUT,
  amount: 1000,
  description: '生活费转账 (转出到 [目标账户名])',
  transferToAccountId: 'to-account-id',
  transferId: 'shared-uuid'
}

// 转入交易 / Deposit transaction
{
  type: TransactionType.INCOME,
  category: TransactionCategory.TRANSFER_IN,
  amount: 1000,
  description: '生活费转账 (从 [来源账户名] 转入)',
  transferFromAccountId: 'from-account-id',
  transferId: 'shared-uuid'
}
```

---

## 工具函数 / Utility Functions

### formatCurrency(amount, currency?)

**文件位置**: `src/lib/utils/formatters.ts`

格式化金额为本地化货币字符串。

Format amount as localized currency string.

```typescript
import { formatCurrency } from '@/lib/utils/formatters'

formatCurrency(1234.56)  // "¥1,234.56"
formatCurrency(1000, 'USD')  // "$1,000.00"
```

**参数 / Parameters**:
- `amount`: `number` - 金额数值
- `currency`: `string` - 币种代码（默认 "CNY"）

**返回值 / Returns**: `string` - 格式化的货币字符串

**示例 / Examples**:
```typescript
formatCurrency(0)           // "¥0.00"
formatCurrency(100)         // "¥100.00"
formatCurrency(1234.56)     // "¥1,234.56"
formatCurrency(1000, 'USD') // "$1,000.00"
formatCurrency(1000, 'EUR') // "€1,000.00"
```

---

### formatDate(date)

**文件位置**: `src/lib/utils/formatters.ts`

格式化日期为本地化字符串。

Format date as localized string.

```typescript
import { formatDate } from '@/lib/utils/formatters'

formatDate(new Date())  // "2026/5/20"
```

**参数 / Parameters**:
- `date`: `Date` - 日期对象

**返回值 / Returns**: `string` - 格式化的日期字符串

**示例 / Examples**:
```typescript
formatDate(new Date('2026-05-20'))  // "2026/5/20"
formatDate(new Date('2026-01-01'))  // "2026/1/1"
```

---

### cn(...inputs)

**文件位置**: `src/lib/utils/cn.ts`

合并和条件化 className，结合 clsx 和 tailwind-merge。

Merge and conditionalize className, combining clsx and tailwind-merge.

```typescript
import { cn } from '@/lib/utils'

cn('px-4 py-2', isHover && 'bg-blue-500')
// "px-4 py-2 bg-blue-500" (当 isHover 为 true 时)
```

**参数 / Parameters**:
- `...inputs`: `ClassValue` - className 数组或对象

**返回值 / Returns**: `string` - 合并后的 className 字符串

**用途 / Use Cases**:
- 合并 Tailwind CSS 类名
- 条件化添加类名
- 避免类名冲突（tailwind-merge 自动处理）

---

## 自定义 Hooks / Custom Hooks

### useAccountStatistics()

**文件位置**: `src/lib/hooks/use-account-statistics.ts`

计算和返回账户统计数据。

Calculate and return account statistics.

```typescript
import { useAccountStatistics } from '@/lib/hooks/use-account-statistics'

const stats = useAccountStatistics()

console.log(stats.totalIncome)    // 总收入 / Total income
console.log(stats.totalExpense)   // 总支出 / Total expense
console.log(stats.netIncome)      // 净收入 / Net income
```

#### 返回值 / Returns

```typescript
interface AccountStatistics {
  totalIncome: number          // 总收入 / Total income
  totalExpense: number         // 总支出 / Total expense
  netIncome: number            // 净收入 (收入 - 支出) / Net income
  transactionCount: number     // 交易数量 / Transaction count
  depositCount: number         // 存款次数 / Deposit count
  withdrawCount: number        // 取款次数 / Withdraw count
  investmentGain: number       // 投资收益 / Investment gains
  investmentLoss: number       // 投资亏损 / Investment losses
  lastTransactionDate?: Date   // 最后交易时间 / Last transaction date
}
```

#### 特性 / Characteristics

**性能优化 / Performance Optimization**:
- 使用 `useMemo` 缓存计算结果
- 仅在 `transactions` 变化时重新计算

**计算逻辑 / Calculation Logic**:
```typescript
totalIncome = 所有类型为 INCOME 的交易金额之和
totalExpense = 所有类型为 EXPENSE 的交易金额之和
netIncome = totalIncome - totalExpense
```

---

## 使用示例 / Usage Examples

### 示例 1: 创建账户并添加交易 / Example 1: Create Account and Add Transaction

```typescript
'use client'
import { useAccountStore, useTransactionStore } from '@/lib/stores'
import { AccountType, TransactionType, TransactionCategory } from '@/types'

export function ExampleComponent() {
  const addAccount = useAccountStore((state) => state.addAccount)
  const addTransaction = useTransactionStore((state) => state.addTransaction)

  const handleCreateAccount = () => {
    // 创建账户 / Create account
    addAccount({
      name: '招商银行',
      type: AccountType.BANK,
      initialBalance: 5000,
      currency: 'CNY',
      color: '#3b82f6'
    })
  }

  const handleAddIncome = () => {
    // 添加收入交易 / Add income transaction
    addTransaction({
      accountId: 'account-id',
      type: TransactionType.INCOME,
      category: TransactionCategory.DEPOSIT,
      amount: 1000,
      description: '存款'
    })
  }

  return (
    <div>
      <button onClick={handleCreateAccount}>创建账户</button>
      <button onClick={handleAddIncome}>添加收入</button>
    </div>
  )
}
```

---

### 示例 2: 转账操作 / Example 2: Transfer Operation

```typescript
'use client'
import { useTransactionStore } from '@/lib/stores'

export function TransferExample() {
  const transfer = useTransactionStore((state) => state.transfer)
  const accounts = useAccountStore((state) => state.accounts)

  const handleTransfer = () => {
    const fromAccount = accounts[0]
    const toAccount = accounts[1]

    transfer(
      fromAccount.id,
      toAccount.id,
      500,
      '从储蓄卡转到信用卡'
    )
  }

  return <button onClick={handleTransfer}>转账 500 元</button>
}
```

---

### 示例 3: 统计数据展示 / Example 3: Display Statistics

```typescript
'use client'
import { useAccountStatistics } from '@/lib/hooks/use-account-statistics'
import { formatCurrency } from '@/lib/utils/formatters'

export function StatisticsDisplay() {
  const stats = useAccountStatistics()

  return (
    <div>
      <h2>财务概览 / Financial Overview</h2>
      <p>总收入 / Total Income: {formatCurrency(stats.totalIncome)}</p>
      <p>总支出 / Total Expense: {formatCurrency(stats.totalExpense)}</p>
      <p>净资产 / Net Income: {formatCurrency(stats.netIncome)}</p>
      <p>交易数量 / Transactions: {stats.transactionCount}</p>
    </div>
  )
}
```

---

### 示例 4: 账户列表渲染 / Example 4: Render Account List

```typescript
'use client'
import { useAccountStore } from '@/lib/stores'
import { formatCurrency } from '@/lib/utils/formatters'

export function AccountList() {
  const accounts = useAccountStore((state) => state.accounts)
  const deleteAccount = useAccountStore((state) => state.deleteAccount)

  return (
    <ul>
      {accounts.map((account) => (
        <li key={account.id}>
          <span>{account.name}</span>
          <span>{formatCurrency(account.balance)}</span>
          <button onClick={() => deleteAccount(account.id)}>
            删除 / Delete
          </button>
        </li>
      ))}
    </ul>
  )
}
```

---

## TypeScript 类型导出 / TypeScript Type Exports

所有类型都可以从 `@/types` 导入：

All types can be imported from `@/types`:

```typescript
import {
  Account,
  Transaction,
  AccountType,
  TransactionType,
  TransactionCategory
} from '@/types'
```

---

## 最佳实践 / Best Practices

### 1. Store 使用 / Store Usage

```typescript
// ✅ Good: 只订阅需要的字段 / Good: Subscribe only to needed fields
const accounts = useAccountStore((state) => state.accounts)

// ❌ Bad: 订阅整个 state（可能导致不必要的重渲染）
const state = useAccountStore((state) => state)
```

### 2. 交易类型选择 / Transaction Type Selection

```typescript
// ✅ Good: 根据交易类型选择合适的分类
const getCategoriesForType = (type: TransactionType) => {
  switch (type) {
    case TransactionType.INCOME:
      return [TransactionCategory.DEPOSIT, TransactionCategory.TRANSFER_IN]
    case TransactionType.EXPENSE:
      return [TransactionCategory.WITHDRAW, TransactionCategory.TRANSFER_OUT]
    default:
      return []
  }
}
```

### 3. 金额处理 / Amount Handling

```typescript
// ✅ Good: 使用 formatCurrency 格式化显示
<p>{formatCurrency(transaction.amount || 0)}</p>

// ✅ Good: 计算时使用默认值避免 NaN
const total = (transaction.amount || 0) + (transaction.fee || 0)
```

---

## 错误处理 / Error Handling

### Store 方法错误 / Store Method Errors

**方法会静默失败的情况 / Cases where methods fail silently**:

1. **无效的 ID**: 更新或删除不存在的账户/交易
2. **余额不足**: 转账金额超过转出账户余额（未实现验证）
3. **循环转账**: 转账账户与目标账户相同（应在前端验证）

**建议 / Recommendations**:
- 在调用 store 方法前验证输入
- 使用 try-catch 包裹异步操作（如果有的话）
- 提供用户友好的错误提示

---

**最后更新 / Last Updated**: 2026-05-20
**文档版本 / Document Version**: 1.0.0
