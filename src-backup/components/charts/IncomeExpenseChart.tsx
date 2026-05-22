import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Transaction, TransactionType } from '../../types';

interface IncomeExpenseChartProps {
  transactions: Transaction[];
}

export const IncomeExpenseChart = ({ transactions }: IncomeExpenseChartProps) => {
  if (transactions.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
        暂无交易数据
      </div>
    );
  }

  // 按日期聚合收支数据
  const dateMap = new Map<string, { income: number; expense: number }>();

  transactions.forEach((txn) => {
    const dateKey = txn.createdAt.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    if (!dateMap.has(dateKey)) {
      dateMap.set(dateKey, { income: 0, expense: 0 });
    }
    const data = dateMap.get(dateKey)!;
    if (txn.type === TransactionType.INCOME) {
      data.income += txn.amount || 0;
    } else if (txn.type === TransactionType.EXPENSE) {
      data.expense += txn.amount || 0;
    }
  });

  const trendData = Array.from(dateMap.entries())
    .map(([date, data]) => ({
      date,
      收入: data.income,
      支出: data.expense,
    }))
    .sort((a, b) => {
      const [aMonth, aDay] = a.date.split('/').map(Number);
      const [bMonth, bDay] = b.date.split('/').map(Number);
      if (aMonth !== bMonth) return aMonth - bMonth;
      return aDay - bDay;
    })
    .slice(-7); // 只显示最近7天

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ marginBottom: '10px', fontSize: '14px' }}>收支趋势（最近7天）</h4>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={trendData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" style={{ fontSize: '12px' }} />
            <YAxis style={{ fontSize: '12px' }} />
            <Tooltip formatter={(value: number) => `¥${value.toLocaleString()}`} />
            <Legend />
            <Line
              type="monotone"
              dataKey="收入"
              stroke="#52c41a"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="支出"
              stroke="#ff4d4f"
              strokeWidth={2}
              dot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
