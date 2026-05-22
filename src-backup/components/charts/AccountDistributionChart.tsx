import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import type { Account } from '../../types';

interface AccountDistributionChartProps {
  accounts: Account[];
}

export const AccountDistributionChart = ({ accounts }: AccountDistributionChartProps) => {
  if (accounts.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '20px', color: '#999' }}>
        暂无账户数据
      </div>
    );
  }

  const data = accounts.map((account) => ({
    name: account.name,
    value: account.balance,
    color: account.color,
  }));

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) =>
            `${name} ${(percent * 100).toFixed(0)}%`
          }
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip formatter={(value: number) => [`¥${value.toLocaleString()}`, '余额']} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};
