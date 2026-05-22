import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Transaction, TransactionCategory, TransactionType } from '../../types';

interface CategoryStatsChartProps {
  transactions: Transaction[];
}

export const CategoryStatsChart = ({ transactions }: CategoryStatsChartProps) => {
  if (transactions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
        暂无交易数据
      </div>
    );
  }

  // 分类统计
  const categoryMap = new Map<string, number>();

  const categoryLabels: Record<string, string> = {
    [TransactionCategory.DEPOSIT]: '充值',
    [TransactionCategory.WITHDRAW]: '提现',
    [TransactionCategory.INVESTMENT_GAIN]: '投资收益',
    [TransactionCategory.INVESTMENT_LOSS]: '投资损失',
    [TransactionCategory.TRANSFER_OUT]: '转出',
    [TransactionCategory.TRANSFER_IN]: '转入',
  };

  transactions.forEach((txn) => {
    // 跳过转账和快照
    if (
      txn.category === TransactionCategory.TRANSFER_OUT ||
      txn.category === TransactionCategory.TRANSFER_IN ||
      txn.category === TransactionCategory.SNAPSHOT
    ) {
      return;
    }

    const label = categoryLabels[txn.category] || txn.category;
    if (!categoryMap.has(label)) {
      categoryMap.set(label, 0);
    }
    categoryMap.set(label, categoryMap.get(label)! + (txn.amount || 0));
  });

  const data = Array.from(categoryMap.entries())
    .map(([category, amount]) => ({
      category,
      金额: amount,
    }))
    .sort((a, b) => b.金额 - a.金额);

  if (data.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
        暂无分类数据
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" style={{ fontSize: '12px' }} />
        <YAxis dataKey="category" type="category" width={80} style={{ fontSize: '12px' }} />
        <Tooltip formatter={(value: number) => `¥${value.toLocaleString()}`} />
        <Bar dataKey="金额" fill="#1890ff" />
      </BarChart>
    </ResponsiveContainer>
  );
};
