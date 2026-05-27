// 交易类型枚举
export enum TransactionType {
  // 收入类型
  INCOME = 'income',          // 收入
  DEPOSIT = 'deposit',        // 存款
  TRANSFER_IN = 'transfer_in', // 转入

  // 支出类型
  CONSUMPTION = 'consumption', // 消费
  TRANSFER_OUT = 'transfer_out', // 转出
  LOAN = 'loan',              // 放贷

  // 转账类型
  TRANSFER = 'transfer',  // 转账（配对创建交易）

  // 特殊类型
  SNAPSHOT = 'snapshot'   // 余额快照
}

// 账户类型
export enum AccountType {
  SECURITIES = 'securities',
  BANK = 'bank',
  CASH = 'cash',
  OTHER = 'other'
}

// 账户接口
export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  initialBalance: number;
  currency: string;
  description?: string;
  color: string;
  icon?: string;
  createdAt: Date;
  updatedAt: Date;
}

// 交易记录接口
export interface Transaction {
  id: string;
  accountId: string;
  type: TransactionType;
  amount?: number;
  balance?: number;
  transferToAccountId?: string;
  transferFromAccountId?: string;
  transferPairId?: string;      // 用于链接转账对
  description?: string;
  note?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

// 统计数据接口
export interface AccountStatistics {
  totalIncome: number;
  totalExpense: number;
  netIncome: number;
  transactionCount: number;
  lastTransactionDate?: Date;
  depositCount: number;
  consumptionCount: number;
}

// 月度收益接口
export interface MonthlyProfit {
  year: number;
  month: number;
  accountId: string;
  accountName: string;
  startBalance: number;        // 月初快照余额
  endBalance: number;          // 月末快照余额
  calculatedProfit: number;    // 计算收益 = endBalance - startBalance - transferIn
  periodIncome: number;        // 期间收入
  periodExpense: number;       // 期间支出
  netFlow: number;            // 净流入 = periodIncome - periodExpense
  profitRate?: number;         // 收益率百分比（新增字段）
  hasCompleteData: boolean;   // 是否有完整的快照对
  startSnapshotId?: string;   // 月初快照ID
  endSnapshotId?: string;     // 月末快照ID
}

// 快照对接口
export interface SnapshotPair {
  start: Transaction | null;   // 月初快照
  end: Transaction | null;     // 月末快照
  periodTransactions: Transaction[];  // 期间的所有交易
}

// 仪表板收益汇总接口
export interface DashboardProfitSummary {
  totalProfit: number;         // 所有账户本月收益总和
  profitRate: number;          // 加权平均收益率
  hasData: boolean;            // 是否存在本月数据
  month: number;               // 当前月份
  year: number;                // 当前年份
}

// 日期范围收益汇总接口
export interface DateRangeProfitSummary {
  totalProfit: number;          // 区间总收益
  averageProfitRate: number;    // 加权平均收益率
  monthCount: number;           // 月份数量
  startYear: number;            // 起始年份
  startMonth: number;           // 起始月份
  endYear: number;              // 结束年份
  endMonth: number;             // 结束月份
  bestMonth?: {                 // 最佳月份
    year: number;
    month: number;
    profit: number;
    accountName: string;
  };
  worstMonth?: {                // 最差月份
    year: number;
    month: number;
    profit: number;
    accountName: string;
  };
  monthlyData: MonthlyProfit[]; // 月度详情数据
  hasData: boolean;             // 是否有数据
}

// 货币统计接口
export interface CurrencyStatistics {
  currency: string              // 货币代码 (CNY, USD, EUR, HKD, JPY)
  symbol: string                // 货币符号 (¥, $, €, HK$, ¥)
  totalAssets: number           // 该货币总资产
  totalIncome: number           // 该货币总收入（只包含 SALARY 类型）
  totalExpense: number          // 该货币总支出（默认排除 TRANSFER_OUT）
  accountCount: number          // 该货币账户数量
  netIncome: number             // 净收入 = totalIncome - totalExpense
}

// 多币种汇总接口
export interface MultiCurrencySummary {
  currencies: CurrencyStatistics[]  // 各货币统计数组
  currencyCount: number             // 货币种类数量
  hasMultipleCurrencies: boolean    // 是否为多币种
}

// 导入交易数据接口（用于导入，id 为可选）
export interface TransactionImport {
  id?: string;
  accountId: string;
  type: TransactionType;
  amount?: number;
  balance?: number;
  transferToAccountId?: string;
  transferFromAccountId?: string;
  transferPairId?: string;
  description?: string;
  note?: string;
  tags?: string[];
  createdAt: Date | string;
  updatedAt?: Date | string;
}

// 导入账户数据接口
export interface AccountImport {
  id?: string;
  name: string;
  type: AccountType;
  balance: number;
  initialBalance: number;
  currency: string;
  description?: string;
  color?: string;
  icon?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

// 导入验证结果
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// 导入结果
export interface ImportResult {
  total: number;
  success: number;
  updated: number;  // 新增：更新的数量
  failed: number;
  errors: Array<{ index: number; row: any; error: string }>;
  updates: number[];  // 新增：需要更新的记录索引
}

// 导入账户结果
export interface AccountImportResult {
  total: number;
  success: number;
  failed: number;
  errors: Array<{ index: number; row: AccountImport; error: string }>;
}
