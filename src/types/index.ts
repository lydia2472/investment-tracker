// 交易类型枚举
export enum TransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
  TRANSFER = 'transfer',
  SNAPSHOT = 'snapshot'
}

// 收入/支出分类
export enum TransactionCategory {
  DEPOSIT = 'deposit',
  WITHDRAW = 'withdraw',
  INVESTMENT_GAIN = 'investment_gain',
  INVESTMENT_LOSS = 'investment_loss',
  TRANSFER_OUT = 'transfer_out',
  TRANSFER_IN = 'transfer_in',
  SNAPSHOT = 'snapshot'
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
  category: TransactionCategory;
  amount?: number;
  balance?: number;
  transferToAccountId?: string;
  transferFromAccountId?: string;
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
  withdrawCount: number;
  investmentGain: number;
  investmentLoss: number;
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
