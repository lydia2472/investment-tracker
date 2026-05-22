# 系统架构文档 / System Architecture Documentation

本文档详细说明投资账户管理系统的技术架构设计。

This document provides a detailed technical architecture overview of the Investment Account Management System.

---

## 目录 / Table of Contents

- [系统架构概述 / System Overview](#系统架构概述--system-overview)
- [技术栈选择 / Technology Stack](#技术栈选择--technology-stack)
- [目录结构 / Directory Structure](#目录结构--directory-structure)
- [数据流设计 / Data Flow](#数据流设计--data-flow)
- [状态管理 / State Management](#状态管理--state-management)
- [组件设计模式 / Component Design](#组件设计模式--component-design)
- [关键业务逻辑 / Key Business Logic](#关键业务逻辑--key-business-logic)
- [本地存储策略 / Local Storage Strategy](#本地存储策略--local-storage-strategy)
- [响应式设计 / Responsive Design](#响应式设计--responsive-design)

---

## 系统架构概述 / System Overview

### 整体架构 / Overall Architecture

系统采用现代化的单页应用 (SPA) 架构，基于 Next.js 14 App Router 构建：

The system uses a modern Single Page Application (SPA) architecture built on Next.js 14 App Router:

```
┌─────────────────────────────────────────────────┐
│                  User Interface                  │
│           (shadcn/ui Components + Tailwind)        │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│            Presentation Layer                     │
│         (React Components + Pages)                │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│            Business Logic Layer                  │
│         (Custom Hooks + Utils)                    │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│            State Management Layer                │
│              (Zustand Stores)                     │
└────────────────────┬────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────┐
│            Data Persistence Layer                 │
│           (Browser localStorage)                   │
└──────────────────────────────────────────────────┘
```

### 架构特点 / Architectural Characteristics

1. **组件化设计 / Component-Based Design**
   - 所有 UI 元素封装为可复用组件
   - 所有 UI elements are encapsulated as reusable components

2. **单向数据流 / Unidirectional Data Flow**
   - Zustand 管理全局状态
   - Zustand manages global state
   - 组件通过 Hooks 订阅状态变化
   - Components subscribe to state changes via Hooks

3. **客户端渲染 / Client-Side Rendering**
   - 使用 'use client' 指令启用 React 客户端功能
   - 'use client' directive enables React client features
   - 所有状态管理和交互在浏览器中执行
   - All state management and interactions execute in browser

4. **本地优先 / Local-First**
   - 数据存储在浏览器 localStorage
   - Data stored in browser localStorage
   - 无需服务器依赖
   - No server dependency

---

## 技术栈选择 / Technology Stack

### 前端框架 / Frontend Framework

**Next.js 14 (App Router)**
- ✅ React Server Components 支持
- ✅ 文件系统路由
- ✅ 内置代码分割和优化
- ✅ 优秀的开发者体验

**为什么选择 Next.js 而非 Vite + React Router？**
- 更好的 SEO 支持（未来可能需要）
- 内置优化和代码分割
- 更一致的文件组织结构

### UI 组件库 / UI Component Library

**shadcn/ui + Tailwind CSS**
- ✅ 可定制的组件系统
- ✅ 基于 Radix UI 的无障碍访问
- ✅ TypeScript 原生支持
- ✅ 代码直接复制到项目中，完全可控

**为什么选择 shadcn/ui 而非 Mantine UI？**
- 更现代的设计风格
- 更小的包体积
- 更好的 TypeScript 支持
- 更灵活的定制能力

### 状态管理 / State Management

**Zustand**
- ✅ 简洁的 API 设计
- ✅ 内置 persist 中间件
- ✅ 优秀的 TypeScript 支持
- ✅ 无需 Context Provider 包装

**为什么选择 Zustand 而非 Redux？**
- 更少的样板代码
- 更直观的 API
- 更小的包体积
- 内置持久化解决方案

### 表单处理 / Form Handling

**React Hook Form + Zod**
- ✅ 高性能表单验证
- ✅ 类型安全的 schema 定义
- ✅ 优秀的开发者体验
- ✅ 最小化重渲染

### 数据可视化 / Data Visualization

**Recharts**
- ✅ React 原生图表库
- ✅ 声明式组件 API
- ✅ 响应式设计
- ✅ 支持自定义图表样式

---

## 目录结构 / Directory Structure

### 完整项目结构 / Complete Project Structure

```
investment-tracker/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (dashboard)/             # Dashboard route group
│   │   │   ├── layout.tsx          # Dashboard layout wrapper
│   │   │   ├── page.tsx            # Dashboard overview page
│   │   │   ├── accounts/
│   │   │   │   └── page.tsx        # Accounts management page
│   │   │   ├── transactions/
│   │   │   │   └── page.tsx        # Transactions page
│   │   │   └── statistics/
│   │   │       └── page.tsx        # Statistics page
│   │   ├── layout.tsx              # Root layout with providers
│   │   └── globals.css             # Global styles
│   │
│   ├── components/                   # React Components
│   │   ├── ui/                     # shadcn/ui base components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   └── ... (17+ components)
│   │   │
│   │   ├── accounts/               # Account-related components
│   │   │   ├── account-card.tsx    # Account display card
│   │   │   ├── account-form-dialog.tsx  # Account CRUD form
│   │   │   └── account-list.tsx    # Account list with filters
│   │   │
│   │   ├── transactions/           # Transaction components
│   │   │   ├── transaction-table.tsx  # Transaction history table
│   │   │   ├── transaction-form-dialog.tsx  # Transaction CRUD
│   │   │   └── transfer-form-dialog.tsx    # Transfer form
│   │   │
│   │   ├── charts/                 # Data visualization
│   │   │   ├── account-distribution-chart.tsx
│   │   │   ├── income-expense-chart.tsx
│   │   │   └── balance-trend-chart.tsx
│   │   │
│   │   ├── dashboard/              # Dashboard components
│   │   │   ├── stats-cards.tsx
│   │   │   ├── accounts-overview.tsx
│   │   │   └── recent-transactions.tsx
│   │   │
│   │   ├── layout/                 # Layout components
│   │   │   ├── sidebar.tsx         # Navigation sidebar
│   │   │   ├── header.tsx          # Top header bar
│   │   │   └── theme-toggle.tsx    # Dark/light mode switch
│   │   │
│   │   └── providers/              # Context providers
│   │       ├── theme-provider.tsx # Theme context
│   │       └── store-provider.tsx # Zustand store initializer
│   │
│   ├── lib/                         # Utility libraries
│   │   ├── stores/                 # Zustand state management
│   │   │   ├── account-store.ts    # Account state & actions
│   │   │   ├── transaction-store.ts  # Transaction state & actions
│   │   │   └── index.ts           # Store exports
│   │   │
│   │   ├── utils/                  # Utility functions
│   │   │   ├── cn.ts              # className merger (clsx + twMerge)
│   │   │   ├── formatters.ts      # Currency & date formatters
│   │   │   └── validations.ts     # Zod validation schemas
│   │   │
│   │   └── hooks/                  # Custom React hooks
│   │       └── use-account-statistics.ts  # Statistics calculation
│   │
│   └── types/                       # TypeScript type definitions
│       └── index.ts                # All type definitions
│
├── docs/                            # Project documentation
│   ├── README.md
│   ├── USER_GUIDE.md
│   ├── ARCHITECTURE.md
│   ├── API.md
│   └── DEVELOPMENT.md
│
├── public/                          # Static assets
├── components.json                  # shadcn/ui configuration
├── next.config.js                   # Next.js configuration
├── tailwind.config.js               # Tailwind CSS configuration
├── tsconfig.json                    # TypeScript configuration
└── package.json                     # Dependencies and scripts
```

### 文件组织原则 / File Organization Principles

1. **按功能分组 / Group by Feature**
   - `accounts/` - 账户相关组件
   - `transactions/` - 交易相关组件
   - `dashboard/` - 仪表盘组件

2. **按类型分层 / Layer by Type**
   - `app/` - 页面和路由
   - `components/` - UI 组件
   - `lib/` - 业务逻辑和工具
   - `types/` - 类型定义

3. **单一职责 / Single Responsibility**
   - 每个文件只负责一个功能
   - 每个组件保持专注和简洁

---

## 数据流设计 / Data Flow

### 状态更新流程 / State Update Flow

```
User Action (用户操作)
    ↓
Component Event Handler (组件事件处理)
    ↓
Zustand Store Action (状态管理器操作)
    ↓
State Update (状态更新)
    ↓
Re-render Components (组件重新渲染)
    ↓
UI Reflects New State (UI 反映新状态)
```

### 示例：添加交易 / Example: Add Transaction

```typescript
// 1. 用户点击"添加交易"按钮
// User clicks "Add Transaction" button

// 2. TransactionFormDialog 组件处理表单提交
// TransactionFormDialog component handles form submit
const onSubmit = (data: FormValues) => {
  addTransaction({
    accountId: data.accountId,
    type: data.type,
    amount: data.amount,
    // ...
  })
}

// 3. 调用 transaction-store 的 addTransaction 方法
// Calls addTransaction method from transaction-store
addTransaction: (transactionData) => {
  set((state) => ({
    transactions: [
      {
        id: uuid(),
        createdAt: new Date(),
        ...transactionData
      },
      ...state.transactions
    ]
  }))
}

// 4. Zustand 更新状态
// Zustand updates state
// 所有订阅该状态的组件自动重新渲染
// All components subscribed to this state re-render

// 5. UI 自动更新
// UI automatically updates
// - 交易列表显示新交易
// - 账户余额更新
// - 统计数据重新计算
```

### 数据持久化流程 / Data Persistence Flow

```
State Change (状态变化)
    ↓
Zustand persist middleware (persist 中间件)
    ↓
Serialize to JSON (序列化为 JSON)
    ↓
Save to localStorage (保存到 localStorage)
    ↓
Key: 'account-storage' or 'transaction-storage'
```

---

## 状态管理 / State Management

### Zustand Store 设计 / Zustand Store Design

#### Account Store (账户状态管理)

**位置**: `src/lib/stores/account-store.ts`

**状态结构**:
```typescript
interface AccountState {
  accounts: Account[]                    // 账户列表
  addAccount: (account: AccountData) => void
  updateAccount: (id: string, data: Partial<Account>) => void
  deleteAccount: (id: string) => void
  updateBalance: (id: string, newBalance: number) => void
}
```

**关键方法**:
- `addAccount`: 创建新账户
- `updateAccount`: 更新账户信息
- `deleteAccount`: 删除账户（同时删除关联交易）
- `updateBalance`: 更新账户余额（由交易自动触发）

#### Transaction Store (交易状态管理)

**位置**: `src/lib/stores/transaction-store.ts`

**状态结构**:
```typescript
interface TransactionState {
  transactions: Transaction[]
  addTransaction: (transaction: TransactionData) => void
  updateTransaction: (id: string, data: Partial<Transaction>) => void
  deleteTransaction: (id: string) => void
  transfer: (fromId: string, toId: string, amount: number, desc: string) => void
}
```

**关键方法**:
- `addTransaction`: 创建新交易（自动更新账户余额）
- `updateTransaction`: 更新交易信息（自动调整余额）
- `deleteTransaction`: 删除交易（自动恢复余额）
- `transfer`: 账户转账（生成双交易记录）

### 持久化策略 / Persistence Strategy

**配置**:
```typescript
export const useAccountStore = create<AccountState>()(
  persist(
    (set, get) => ({
      // Store implementation
    }),
    {
      name: 'account-storage',  // localStorage key
      partialize: (state) => ({ accounts: state.accounts })
    }
  )
)
```

**特性**:
- 自动序列化/反序列化
- 页面刷新后状态恢复
- 只持久化必要数据（partialize）

### Store 间通信 / Inter-Store Communication

**问题**: Transaction Store 需要更新 Account Store 的余额

**解决方案**: 懒加载 Account Store
```typescript
// 在 transaction-store.ts 中
const addTransaction = (transactionData) => {
  // 创建交易
  const transaction = { /* ... */ }

  // 懒加载 account store
  const updateBalance = useAccountStore.getState().updateBalance

  // 更新关联账户余额
  updateBalance(transactionData.accountId, newBalance)

  // 添加交易到列表
  set((state) => ({ transactions: [transaction, ...state.transactions] }))
}
```

**优点**:
- 避免循环依赖
- 保持代码解耦
- 更容易测试

---

## 组件设计模式 / Component Design

### 组件层次结构 / Component Hierarchy

```
RootLayout (根布局)
├── ThemeProvider (主题提供者)
├── StoreProvider (状态提供者)
└── DashboardLayout (仪表盘布局)
    ├── Sidebar (侧边导航)
    ├── Header (顶部栏)
    │   └── ThemeToggle (主题切换)
    └── Main Content (主内容区)
        ├── Dashboard Page (总览页)
        │   ├── StatsCards (统计卡片)
        │   ├── AccountsOverview (账户概览)
        │   └── RecentTransactions (最近交易)
        ├── Accounts Page (账户页)
        │   └── AccountList (账户列表)
        │       └── AccountCard (账户卡片)
        ├── Transactions Page (交易页)
        │   └── TransactionTable (交易表格)
        └── Statistics Page (统计页)
            ├── AccountDistributionChart (账户分布图)
            ├── IncomeExpenseChart (收支对比图)
            └── BalanceTrendChart (余额趋势图)
```

### 组件设计原则 / Component Design Principles

#### 1. 单一职责 / Single Responsibility

每个组件只负责一个功能：
- `AccountCard`: 只显示单个账户
- `TransactionTable`: 只显示交易列表
- `StatsCards`: 只显示统计数据

#### 2. 可复用性 / Reusability

通用组件抽取到 `components/ui/`：
- `Button`, `Card`, `Dialog`, `Form` 等基础组件
- 可以在任何页面中使用

#### 3. 受控与非受控 / Controlled vs Uncontrolled

**受控组件** (推荐):
```typescript
// 表单输入由 React Hook Form 控制
<Controller
  name="fieldName"
  control={control}
  render={({ field }) => <Input {...field} />}
/>
```

**非受控组件**:
```typescript
// 使用 Zustand store 的状态
const accounts = useAccountStore((state) => state.accounts)
```

#### 4. Props 接口设计 / Props Interface Design

```typescript
interface AccountCardProps {
  account: Account           // 必需数据
  compact?: boolean          // 可选配置
  onEdit?: (id: string) => void  // 回调函数
}

// 使用默认值
function AccountCard({ account, compact = false, onEdit }: AccountCardProps) {
  // ...
}
```

---

## 关键业务逻辑 / Key Business Logic

### 1. 转账双交易生成 / Transfer Dual Transaction Generation

**业务需求**: 账户间转账需要同时记录转出和转入

**实现方案**:
```typescript
transfer: (fromAccountId, toAccountId, amount, description) => {
  const now = new Date()
  const transferId = uuid()

  // 创建转出交易
  addTransaction({
    accountId: fromAccountId,
    type: TransactionType.EXPENSE,
    category: TransactionCategory.TRANSFER_OUT,
    amount,
    description: `${description} (转出到 ${getAccountName(toAccountId)})`,
    transferToAccountId: toAccountId,
    transferId,
  })

  // 创建转入交易
  addTransaction({
    accountId: toAccountId,
    type: TransactionType.INCOME,
    category: TransactionCategory.TRANSFER_IN,
    amount,
    description: `${description} (从 ${getAccountName(fromAccountId)} 转入)`,
    transferFromAccountId: fromAccountId,
    transferId,
  })
}
```

**关键点**:
- 两条交易共享 `transferId`，方便关联查询
- 转出账户余额减少
- 转入账户余额增加
- 描述自动包含对方账户名称

### 2. 余额自动更新 / Automatic Balance Update

**触发时机**:
- 添加收入/支出交易
- 删除交易
- 编辑交易金额

**实现逻辑**:
```typescript
const addTransaction = (transactionData) => {
  // 1. 创建交易
  const transaction = { id: uuid(), createdAt: new Date(), ...transactionData }

  // 2. 计算新余额
  const account = useAccountStore.getState().accounts.find(a => a.id === transactionData.accountId)
  const currentBalance = account?.balance || 0
  const newBalance = transactionData.type === TransactionType.INCOME
    ? currentBalance + (transactionData.amount || 0)
    : currentBalance - (transactionData.amount || 0)

  // 3. 更新账户余额
  useAccountStore.getState().updateBalance(transactionData.accountId, newBalance)

  // 4. 添加交易记录
  set((state) => ({
    transactions: [transaction, ...state.transactions]
  }))
}
```

### 3. 统计数据计算 / Statistics Calculation

**优化策略**: 使用 `useMemo` 避免重复计算

```typescript
export function useAccountStatistics(): AccountStatistics {
  const transactions = useTransactionStore((state) => state.transactions)

  return useMemo(() => {
    const stats: AccountStatistics = {
      totalIncome: 0,
      totalExpense: 0,
      netIncome: 0,
      // ...
    }

    // 遍历交易计算统计
    transactions.forEach((txn) => {
      if (txn.type === TransactionType.INCOME) {
        stats.totalIncome += txn.amount || 0
      }
      if (txn.type === TransactionType.EXPENSE) {
        stats.totalExpense += txn.amount || 0
      }
    })

    stats.netIncome = stats.totalIncome - stats.totalExpense
    return stats
  }, [transactions])
}
```

---

## 本地存储策略 / Local Storage Strategy

### 存储结构 / Storage Structure

**键名**:
- `account-storage`: 账户数据
- `transaction-storage`: 交易数据

**数据格式**: JSON

**示例**:
```json
// localStorage['account-storage']
{
  "state": {
    "accounts": [
      {
        "id": "123e4567-e89b-12d3-a456-426614174000",
        "name": "招商银行",
        "type": "BANK",
        "balance": 10000.00,
        "initialBalance": 5000.00,
        "currency": "CNY",
        "color": "#3b82f6",
        "createdAt": "2026-05-20T10:00:00.000Z",
        "updatedAt": "2026-05-20T12:00:00.000Z"
      }
    ]
  },
  "version": 0
}
```

### 数据同步 / Data Synchronization

**自动同步**:
- Zustand persist 中间件自动监听状态变化
- 每次状态更新后 1ms 内同步到 localStorage
- 页面刷新时自动从 localStorage 恢复状态

**手动同步** (如需要):
```typescript
// 强制保存
useAccountStore.persist.setOptions({ partialize: (state) => ({ accounts: state.accounts }) })

// 强制恢复
const hydrated = useAccountStore.persist.hasHydrated()
```

### 数据容量限制 / Storage Capacity Limits

**限制**: localStorage 通常有 5-10MB 限制

**估算**:
- 单个账户: ~300 bytes
- 单笔交易: ~400 bytes
- 1000 个账户 + 10000 笔交易 ≈ 5MB

**建议**:
- 定期清理历史数据
- 实现数据分页或归档功能

---

## 响应式设计 / Responsive Design

### 断点策略 / Breakpoint Strategy

使用 Tailwind CSS 默认断点：

```typescript
// mobile (default): < 768px
// md: ≥ 768px (tablet)
// lg: ≥ 1024px (desktop)
// xl: ≥ 1280px (wide screen)
```

### 实现示例 / Implementation Examples

#### 1. 栅格布局 / Grid Layout

```typescript
// 仪表盘统计卡片
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
  <StatsCard />
  <StatsCard />
  <StatsCard />
  <StatsCard />
</div>

// 手机: 1列
// 平板: 2列
// 桌面: 4列
```

#### 2. 弹性布局 / Flex Layout

```typescript
// 侧边栏 + 主内容区
<div className="flex flex-col md:flex-row">
  <Sidebar className="w-full md:w-64" />
  <main className="flex-1">
    {children}
  </main>
</div>

// 手机: 垂直布局，侧边栏折叠
// 桌面: 水平布局，侧边栏固定显示
```

#### 3. 隐藏/显示 / Hide/Show

```typescript
// 桌面端显示，移动端隐藏
<Button className="hidden md:inline-flex" />

// 移动端显示，桌面端隐藏
<Button className="md:hidden" />
```

### 移动端优化 / Mobile Optimization

1. **触摸友好**: 按钮至少 44x44px
2. **响应式字体**: 使用 `text-sm` / `text-base` / `text-lg`
3. **横向滚动**: 表格使用 `ScrollArea` 组件
4. **汉堡菜单**: 小屏幕显示菜单按钮

---

## 性能优化 / Performance Optimization

### 1. 代码分割 / Code Splitting

**Next.js 自动处理**:
- 页面级别代码分割
- 动态导入大型图表组件

### 2. 组件懒加载 / Lazy Loading

```typescript
// 懒加载大型图表组件
const BalanceTrendChart = dynamic(() => import('@/components/charts/balance-trend-chart'), {
  loading: () => <Skeleton className="h-[400px]" />,
  ssr: false
})
```

### 3. 状态优化 / State Optimization

**使用选择器避免不必要的重渲染**:
```typescript
// ❌ Bad: 整个 state 变化都会重渲染
const accounts = useAccountStore((state) => state)

// ✅ Good: 只订阅需要的部分
const accounts = useAccountStore((state) => state.accounts)
```

### 4. 计算缓存 / Computed Caching

**使用 useMemo 缓存计算结果**:
```typescript
const sortedTransactions = useMemo(() => {
  return [...transactions].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
}, [transactions])
```

---

## 安全性考虑 / Security Considerations

### 1. 输入验证 / Input Validation

**使用 Zod schema 验证所有输入**:
```typescript
const accountSchema = z.object({
  name: z.string().min(1, '账户名称必填'),
  initialBalance: z.number().min(0, '余额不能为负'),
  // ...
})
```

### 2. XSS 防护 / XSS Protection

**React 自动转义输出**:
```typescript
// 自动转义，防止 XSS
<div>{userInput}</div>

// 避免使用 dangerouslySetInnerHTML
```

### 3. 数据隐私 / Data Privacy

**所有数据保存在本地**:
- 不发送到服务器
- 不被第三方追踪
- 用户完全控制数据

---

## 扩展性设计 / Extensibility

### 1. 添加新功能 / Adding New Features

**步骤**:
1. 在 `types/index.ts` 添加新类型
2. 在 `lib/stores/` 创建新 store 或扩展现有 store
3. 在 `components/` 创建新组件
4. 在 `app/` 添加新页面

### 2. 添加新图表 / Adding New Charts

**步骤**:
1. 在 `components/charts/` 创建新图表组件
2. 使用 Recharts 组件构建图表
3. 使用 `useTransactionStore` 和 `useAccountStore` 获取数据
4. 在统计页面引入新图表

### 3. 自定义主题 / Custom Theme

**修改 Tailwind 配置**:
```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#your-color',
        secondary: '#your-color',
      }
    }
  }
}
```

---

## 总结 / Summary

投资账户管理系统采用现代化的前端架构，具有以下特点：

The Investment Account Management System uses a modern frontend architecture with the following characteristics:

1. **模块化设计** - 高内聚低耦合的组件和模块
2. **类型安全** - 完整的 TypeScript 类型定义
3. **状态管理** - 简洁高效的 Zustand 方案
4. **响应式** - 支持所有设备尺寸
5. **可扩展** - 易于添加新功能和修改
6. **本地优先** - 数据完全私有，无需服务器

---

**最后更新 / Last Updated**: 2026-05-20
**文档版本 / Document Version**: 1.0.0
