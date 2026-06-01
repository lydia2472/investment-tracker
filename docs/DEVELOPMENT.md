# 开发指南

本文档为开发者提供投资账户管理系统的开发环境搭建、工作流程、代码规范和部署指南。

---

## 目录

- [环境搭建](#环境搭建)
- [开发工作流](#开发工作流)
- [代码规范](#代码规范)
- [组件开发指南](#组件开发指南)
- [测试策略](#测试策略)
- [部署流程](#部署流程)
- [扩展开发建议](#扩展开发建议)

---

## 环境搭建

### 前置要求

在开始开发之前，请确保您的开发环境满足以下要求：

- **Node.js**: 18.x 或更高版本
- **npm**: 8.x 或更高版本（或 yarn/pnpm）
- **Git**: 用于版本控制
- **代码编辑器**: 推荐 VS Code

### 安装步骤

#### 1. 克隆项目

```bash
cd /path/to/projects
git clone <repository-url>
cd investment-tracker
```

#### 2. 安装依赖

```bash
npm install
# 或 / or
yarn install
# 或 / or
pnpm install
```

#### 3. 启动开发服务器

```bash
npm run dev
# 或 / or
yarn dev
# 或 / or
pnpm dev
```

应用将在 [http://localhost:3000](http://localhost:3000) 启动。

#### 4. 构建生产版本

```bash
npm run build
npm start
```

### 推荐的 VS Code 扩展

- **ESLint**: 代码质量检查
- **Prettier**: 代码格式化
- **Tailwind CSS IntelliSense**: Tailwind 类名自动补全
- **TypeScript Importer**: 自动导入 TypeScript 模块
- **Auto Rename Tag**: 自动重命名配对的 HTML/XML 标签

### VS Code 设置配置

在项目根目录创建 `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "tailwindCSS.experimental.classRegex": [["cn\\(([^)]*)\\)", "[\"'`]([^\"'`]*).*?[\"'`]"]]
}
```

---

## 开发工作流

### 分支策略

推荐使用 Git Flow 工作流：

```
main (主分支)
├── develop (开发分支)
│   ├── feature/xxx (功能分支)
│   ├── bugfix/xxx (修复分支)
│   └── hotfix/xxx (紧急修复分支)
```

**工作流程**:

1. 从 `develop` 创建功能分支

   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/add-export-function
   ```

2. 开发并提交代码

   ```bash
   git add .
   git commit -m "feat: 添加数据导出功能"
   ```

3. 推送到远程并创建 Pull Request

   ```bash
   git push origin feature/add-export-function
   ```

4. 代码审查通过后合并到 `develop`

### 提交信息规范

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>(<scope>): <subject>

<body>
```

**类型 (type)**:

- `feat`: 新功能
- `fix`: Bug 修复
- `docs`: 文档更新
- `style`: 代码格式调整（不影响功能）
- `refactor`: 代码重构
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具链相关

**示例**:

```bash
feat(accounts): 添加账户批量删除功能

fix(transaction): 修复转账时余额计算错误

docs(readme): 更新安装说明

refactor(store): 重构状态管理逻辑
```

### 代码审查清单

在提交 Pull Request 前，请确认：

- [ ] 代码已通过 ESLint 检查
- [ ] 代码已通过 TypeScript 类型检查
- [ ] 新功能已添加必要的注释
- [ ] 文档已相应更新
- [ ] 没有引入调试代码（console.log 等）
- [ ] 没有硬编码的配置值
- [ ] 敏感信息未提交到代码库

---

## 代码规范

### TypeScript 规范

#### 1. 类型定义

**优先使用 interface 定义对象类型**:

```typescript
// ✅ Good
interface Account {
  id: string
  name: string
}

// ❌ Avoid: 除非需要联合类型
type Account = {
  id: string
  name: string
}
```

#### 2. 可选属性

```typescript
// ✅ Good: 明确标记可选属性
interface User {
  name: string
  email?: string
}

// ❌ Bad: 使用 undefined 可能导致类型错误
interface User {
  name: string
  email: string | undefined
}
```

#### 3. 类型导入

```typescript
// ✅ Good: 从类型文件导入
import { Account, AccountType } from '@/types'

// ❌ Bad: 重复定义类型
interface Account {
  // ...
}
```

### React 组件规范

#### 1. 组件命名

**使用 PascalCase 命名组件文件和组件**:

```
components/
├── AccountCard.tsx       ✅ Good
├── account-card.tsx       ❌ Bad
├── account_card.tsx       ❌ Bad
```

#### 2. 函数组件

**优先使用函数组件和 Hooks**:

```typescript
// ✅ Good: 函数组件 + Hooks
function AccountCard({ account }: AccountCardProps) {
  const [isOpen, setIsOpen] = useState(false)
  // ...
}

// ❌ Avoid: 类组件（除非必要）
class AccountCard extends React.Component {
  // ...
}
```

#### 3. Props 定义

**使用 interface 定义 Props**:

```typescript
// ✅ Good
interface AccountCardProps {
  account: Account
  onEdit?: (id: string) => void
}

export function AccountCard({ account, onEdit }: AccountCardProps) {
  // ...
}

// ✅ Also Good: 使用 children 属性
interface LayoutProps {
  children: React.ReactNode
  header?: string
}
```

#### 4. Hooks 使用规则

```typescript
// ✅ Good: Hooks 在顶层调用
function Component() {
  const [state, setState] = useState()
  const ref = useRef()

  useEffect(() => {
    // ...
  }, [])

  return <div />
}

// ❌ Bad: Hooks 在条件或循环中调用
function Component() {
  if (condition) {
    const [state, setState] = useState()  // Error!
  }
}
```

### 状态管理规范

#### Zustand Store 定义

```typescript
// ✅ Good: 清晰的 Store 结构
interface AccountState {
  // 状态 / State
  accounts: Account[]

  // 操作 / Actions
  addAccount: (account: AccountData) => void
  updateAccount: (id: string, data: Partial<Account>) => void
  deleteAccount: (id: string) => void
}

export const useAccountStore = create<AccountState>()(
  persist(
    (set, get) => ({
      accounts: [],
      addAccount: (accountData) => {
        // 实现逻辑
      },
      // ...
    })),
    { name: 'account-storage' }
  )
)
```

#### 状态选择器

```typescript
// ✅ Good: 只订阅需要的字段
const accounts = useAccountStore((state) => state.accounts)
const addAccount = useAccountStore((state) => state.addAccount)

// ❌ Bad: 订阅整个 store
const store = useAccountStore((state) => state)
```

### 样式规范

#### Tailwind CSS 使用

```typescript
// ✅ Good: 使用 shadcn/ui 组件和 Tailwind 类
<Card className="p-4 hover:shadow-md transition-shadow">
  <Button className="w-full">点击</Button>
</Card>

// ❌ Bad: 内联样式
<div style={{ padding: '16px' }}>
  <button style={{ width: '100%' }}>点击</button>
</div>

// ❌ Bad: 自定义 CSS（除非必要）
// styles.module.css
.custom-card {
  padding: 16px;
}
```

#### 响应式设计

```typescript
// ✅ Good: 使用 Tailwind 响应式类
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
  {/* ... */}
</div>

// ✅ Good: 条件化响应式
<div className={cn(
  'flex flex-col',
  'md:flex-row'
)}>
```

---

## 组件开发指南

### 创建新组件

#### 1. 基础组件结构

```typescript
'use client'  // 如果使用 Hooks 或浏览器 API

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface MyComponentProps {
  title: string
  subtitle?: string
  onAction?: () => void
}

export function MyComponent({
  title,
  subtitle,
  onAction
}: MyComponentProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold">{title}</h2>
      {subtitle && (
        <p className="text-muted-foreground">{subtitle}</p>
      )}
      {onAction && (
        <button onClick={onAction}>操作</button>
      )}
    </div>
  )
}
```

#### 2. 使用 shadcn/ui 组件

```typescript
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export function MyDialog() {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>标题</DialogTitle>
        </DialogHeader>
        {/* 内容 */}
      </DialogContent>
    </Dialog>
  )
}
```

#### 3. 表单组件

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const formSchema = z.object({
  username: z.string().min(3, '用户名至少3个字符'),
  email: z.string().email('邮箱格式不正确'),
})

export function MyForm() {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: '',
      email: '',
    },
  })

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    console.log(data)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="username"
          render={({ field }) => (
            <FormItem>
              <FormLabel>用户名</FormLabel>
              <FormControl>
                <Input placeholder="请输入用户名" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">提交</Button>
      </form>
    </Form>
  )
}
```

### 组件文件组织

```
components/
├── ui/                    # shadcn/ui 基础组件（不修改）
├── accounts/             # 按功能分组的组件
│   ├── account-card.tsx
│   ├── account-form.tsx
│   └── account-list.tsx
└── shared/               # 共享组件
    ├── loading-spinner.tsx
    └── error-boundary.tsx
```

---

## 测试策略

### 单元测试

推荐使用 **Jest** 和 **React Testing Library**:

#### 安装测试依赖

```bash
npm install --save-dev jest @testing-library/react @testing-library/jest-dom
```

#### 示例测试

```typescript
// __tests__/components/AccountCard.test.tsx

import { render, screen, fireEvent } from '@testing-library/react'
import { AccountCard } from '@/components/accounts/account-card'
import { AccountType } from '@/types'

describe('AccountCard', () => {
  const mockAccount = {
    id: '1',
    name: '测试账户',
    type: AccountType.BANK,
    balance: 1000,
    initialBalance: 500,
    currency: 'CNY',
    color: '#3b82f6',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  it('should render account name and balance', () => {
    render(<AccountCard account={mockAccount} />)

    expect(screen.getByText('测试账户')).toBeInTheDocument()
    expect(screen.getByText('¥1,000.00')).toBeInTheDocument()
  })

  it('should call deleteAccount when delete button is clicked', () => {
    const mockDelete = jest.fn()
    render(<AccountCard account={mockAccount} onDelete={mockDelete} />)

    const deleteButton = screen.getByRole('button', { name: /删除/i })
    fireEvent.click(deleteButton)

    expect(mockDelete).toHaveBeenCalledWith('1')
  })
})
```

### E2E 测试

推荐使用 **Playwright**:

#### 安装 Playwright

```bash
npm install --save-dev @playwright/test
```

#### 示例 E2E 测试

```typescript
// e2e/create-account.spec.ts

import { test, expect } from '@playwright/test'

test('should create a new account', async ({ page }) => {
  await page.goto('http://localhost:3000/accounts')

  // 点击添加账户按钮
  await page.click('button:has-text("添加账户")')

  // 填写表单
  await page.fill('[placeholder="账户名称"]', '测试账户')
  await page.selectOption('select[name="type"]', 'BANK')
  await page.fill('[placeholder="0.00"]', '1000')

  // 提交表单
  await page.click('button:has-text("创建")')

  // 验证账户已创建
  await expect(page.locator('text=测试账户')).toBeVisible()
})
```

### 运行测试

```bash
# 单元测试
npm test

# E2E 测试
npx playwright test

# 测试覆盖率
npm run test:coverage
```

---

## 部署流程

### Vercel 部署（推荐）

#### 1. 准备工作

确保项目已推送到 GitHub 仓库。

#### 2. 连接 Vercel

1. 访问 [vercel.com](https://vercel.com)
2. 使用 GitHub 账号登录
3. 点击 "New Project"
4. 导入您的 GitHub 仓库

#### 3. 配置项目

```bash
# 自动检测配置
Framework Preset: Next.js
Root Directory: ./
Build Command: npm run build
Output Directory: .next
Install Command: npm install
```

#### 4. 部署

点击 "Deploy" 按钮，Vercel 将自动：

- 安装依赖
- 运行构建命令
- 部署到 CDN

**完成！** 您的应用将在 `https://your-project.vercel.app` 可访问。

### 自定义服务器部署

#### 1. 构建应用

```bash
npm run build
```

#### 2. 启动生产服务器

```bash
npm start
# 应用将在 http://localhost:3000 运行
```

#### 3. 使用 PM2 守护进程

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start npm --name "investment-tracker" -- start

# 保存 PM2 配置
pm2 save

# 设置开机自启
pm2 startup
```

#### 4. Nginx 反向代理

```nginx
server {
  listen 80;
  server_name your-domain.com;

  location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
  }
}
```

### Docker 部署

#### Dockerfile

```dockerfile
FROM node:18-alpine AS base

# 安装依赖
FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

# 构建应用
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# 生产镜像
FROM base AS runner
WORKDIR /app
ENV NODE_ENV production
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT 3000
CMD ["node", "server.js"]
```

#### docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - '3000:3000'
    environment:
      - NODE_ENV=production
    restart: unless-stopped
```

#### 部署命令

```bash
# 构建镜像
docker build -t investment-tracker .

# 运行容器
docker run -p 3000:3000 investment-tracker

# 或使用 docker-compose
docker-compose up -d
```

---

## 扩展开发建议

### 1. 添加数据导出功能

**步骤**:

1. 创建导出工具函数

```typescript
// src/lib/utils/export.ts
export function exportData() {
  const accounts = useAccountStore.getState().accounts
  const transactions = useTransactionStore.getState().transactions

  const data = {
    accounts,
    transactions,
    exportDate: new Date().toISOString(),
  }

  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: 'application/json',
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `investment-tracker-backup-${Date.now()}.json`
  link.click()
  URL.revokeObjectURL(url)
}
```

2. 创建导入函数

```typescript
export async function importData(file: File) {
  const text = await file.text()
  const data = JSON.parse(text)

  // 验证数据格式
  if (!data.accounts || !data.transactions) {
    throw new Error('无效的备份文件')
  }

  // 导入数据
  // ...
}
```

3. 添加 UI 组件

```typescript
// src/components/settings/data-management.tsx
export function DataManagement() {
  return (
    <div>
      <Button onClick={exportData}>导出数据</Button>
      <input
        type="file"
        accept=".json"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) importData(file)
        }}
      />
    </div>
  )
}
```

### 2. 添加图表类型

**步骤**:

1. 创建新图表组件

```typescript
// src/components/charts/monthly-trend-chart.tsx
'use client'
import { useTransactionStore } from '@/lib/stores'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export function MonthlyTrendChart() {
  const transactions = useTransactionStore((state) => state.transactions)

  // 按月汇总数据
  const monthlyData = useMemo(() => {
    const monthlyMap = new Map<string, number>()

    transactions.forEach((txn) => {
      if (txn.amount) {
        const monthKey = txn.createdAt.toISOString().slice(0, 7) // YYYY-MM
        const current = monthlyMap.get(monthKey) || 0
        monthlyMap.set(monthKey, current + txn.amount)
      }
    })

    return Array.from(monthlyMap.entries()).map(([month, amount]) => ({
      month,
      amount
    }))
  }, [transactions])

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={monthlyData}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="amount" stroke="#3b82f6" />
      </LineChart>
    </ResponsiveContainer>
  )
}
```

2. 在统计页面引入

```typescript
// src/app/(dashboard)/statistics/page.tsx
import { MonthlyTrendChart } from '@/components/charts/monthly-trend-chart'

export default function StatisticsPage() {
  return (
    <Tabs defaultValue="accounts">
      <TabsList>
        <TabsTrigger value="accounts">账户分布</TabsTrigger>
        <TabsTrigger value="monthly">月度趋势</TabsTrigger>
      </TabsList>

      <TabsContent value="monthly">
        <Card>
          <CardHeader>
            <CardTitle>月度收支趋势</CardTitle>
          </CardHeader>
          <CardContent>
            <MonthlyTrendChart />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
```

### 3. 添加预算功能

**步骤**:

1. 定义 Budget 类型

```typescript
// src/types/index.ts
export interface Budget {
  id: string
  category: TransactionCategory
  amount: number
  period: 'monthly' | 'yearly'
  createdAt: Date
  updatedAt: Date
}
```

2. 创建 Budget Store

```typescript
// src/lib/stores/budget-store.ts
interface BudgetState {
  budgets: Budget[]
  addBudget: (budget: BudgetData) => void
  updateBudget: (id: string, data: Partial<Budget>) => void
  deleteBudget: (id: string) => void
}

export const useBudgetStore = create<BudgetState>()(
  persist(
    (set, get) => ({
      budgets: [],
      addBudget: (budgetData) => {
        const budget: Budget = {
          id: uuid(),
          createdAt: new Date(),
          updatedAt: new Date(),
          ...budgetData,
        }
        set((state) => ({
          budgets: [...state.budgets, budget],
        }))
      },
      // ...
    }),
    { name: 'budget-storage' }
  )
)
```

3. 创建预算对比图表

```typescript
// src/components/charts/budget-comparison-chart.tsx
export function BudgetComparisonChart() {
  const budgets = useBudgetStore((state) => state.budgets)
  const transactions = useTransactionStore((state) => state.transactions)

  // 计算实际支出
  const actualSpending = budgets.map((budget) => {
    const spent = transactions
      .filter(t => t.category === budget.category)
      .reduce((sum, t) => sum + (t.amount || 0), 0)

    return {
      category: budget.category,
      budget: budget.amount,
      spent,
      remaining: budget.amount - spent
    }
  })

  return (
    <ResponsiveContainer width="100%" height={400}>
      <BarChart data={actualSpending}>
        <XAxis dataKey="category" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="budget" fill="#94a3b8" name="预算" />
        <Bar dataKey="spent" fill="#ef4444" name="实际支出" />
      </BarChart>
    </ResponsiveContainer>
  )
}
```

### 4. 添加搜索和筛选

```typescript
// src/components/transactions/transaction-filters.tsx
'use client'
import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { TransactionType, TransactionCategory } from '@/types'

export function TransactionFilters({ onFilter }: { onFilter: (filters: any) => void }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  const handleFilterChange = () => {
    onFilter({
      searchQuery,
      type: typeFilter === 'all' ? undefined : typeFilter,
      category: categoryFilter === 'all' ? undefined : categoryFilter
    })
  }

  return (
    <div className="flex gap-4">
      <Input
        placeholder="搜索描述..."
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value)
          handleFilterChange()
        }}
      />
      <Select value={typeFilter} onValueChange={(value) => {
        setTypeFilter(value)
        handleFilterChange()
      }}>
        <SelectTrigger>
          <SelectValue placeholder="交易类型" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">全部</SelectItem>
          <SelectItem value={TransactionType.INCOME}>收入</SelectItem>
          <SelectItem value={TransactionType.EXPENSE}>支出</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
```

### 5. 添加主题自定义

```typescript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          // ...
          900: '#0c4a6e',
        },
      },
    },
  },
}
```

---

## 性能优化建议

### 1. 代码分割

```typescript
// 动态导入大型图表组件
const BalanceTrendChart = dynamic(
  () => import('@/components/charts/balance-trend-chart'),
  {
    loading: () => <Skeleton className="h-[400px]" />,
    ssr: false
  }
)
```

### 2. 虚拟滚动

对于大量数据（如超过 1000 条交易），使用虚拟滚动：

```bash
npm install react-window
```

```typescript
import { FixedSizeList } from 'react-window'

export function VirtualizedTransactionList({ transactions }) {
  const Row = ({ index, style }) => (
    <div style={style}>
      {/* 渲染单个交易 */}
    </div>
  )

  return (
    <FixedSizeList
      height={600}
      itemCount={transactions.length}
      itemSize={80}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  )
}
```

### 3. 防抖和节流

```typescript
import { useDebouncedCallback } from 'use-debounce'

export function SearchInput() {
  const [query, setQuery] = useState('')

  const debouncedSearch = useDebouncedCallback(
    (value) => {
      // 执行搜索
      performSearch(value)
    },
    300
  )

  return (
    <Input
      value={query}
      onChange={(e) => {
        setQuery(e.target.value)
        debouncedSearch(e.target.value)
      }}
    />
  )
}
```

---

## 故障排除

### 常见问题

#### 1. localStorage 数据丢失

**原因**: 浏览器清理缓存或隐身模式

**解决**:

- 提醒用户定期导出备份
- 实现 IndexedDB 作为辅助存储

#### 2. 图表不显示

**原因**: 数据为空或组件未正确加载

**解决**:

```typescript
if (accounts.length === 0) {
  return <div>暂无数据</div>
}
```

#### 3. TypeScript 类型错误

**原因**: 类型定义不完整或不匹配

**解决**:

```bash
# 重新生成类型
npm run postinstall
```

---

## 参考资源

- [Next.js 文档](https://nextjs.org/docs)
- [shadcn/ui 文档](https://ui.shadcn.com)
- [Zustand 文档](https://github.com/pmndrs/zustand)
- [Recharts 文档](https://recharts.org)
- [Tailwind CSS 文档](https://tailwindcss.com)
- [React Hook Form 文档](https://react-hook-form.com)
- [Zod 文档](https://zod.dev)

---

**最后更新**: 2026-05-20
**文档版本**: 1.0.0
