import { useState, useMemo } from 'react';
import { Card, Text, Stack, ScrollArea } from '@mantine/core';
import { useAccountStore } from '../../store/accountStore';
import { useTransactionStore } from '../../store/transactionStore';
import { TransactionFilters } from './TransactionFilters';
import { IncomeExpenseChart } from '../charts/IncomeExpenseChart';
import { CategoryStatsChart } from '../charts/CategoryStatsChart';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

export const TransactionDetails = () => {
  const { accounts } = useAccountStore();
  const { transactions } = useTransactionStore();
  const [selectedAccountId, setSelectedAccountId] = useState<string | 'all'>('all');

  // 筛选交易
  const filteredTransactions = useMemo(() => {
    if (selectedAccountId === 'all') {
      return transactions;
    }
    return transactions.filter((t) => t.accountId === selectedAccountId);
  }, [transactions, selectedAccountId]);

  // 最近交易（显示最近10笔）
  const recentTransactions = useMemo(() => {
    return [...filteredTransactions]
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10);
  }, [filteredTransactions]);

  const handleReset = () => {
    setSelectedAccountId('all');
  };

  return (
    <Stack gap="md">
      <Text size="lg" fw={700}>
        交易详情
      </Text>

      <TransactionFilters
        accounts={accounts}
        selectedAccountId={selectedAccountId}
        onAccountChange={setSelectedAccountId}
        onReset={handleReset}
      />

      {recentTransactions.length > 0 && (
        <>
          <Card shadow="sm" p="lg" radius="md" withBorder>
            <Text size="md" fw={600} mb="sm">
              最近交易 ({recentTransactions.length})
            </Text>
            <ScrollArea.Autosize mah={250} type="auto" offsetScrollbars>
              <Stack gap="xs">
                {recentTransactions.map((txn) => {
                  const account = accounts.find((a) => a.id === txn.accountId);
                  const isIncome = txn.type === 'income';

                  return (
                    <div
                      key={txn.id}
                      style={{
                        padding: '8px',
                        borderBottom: '1px solid #f0f0f0',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <Text size="sm" fw={500}>
                          {txn.description || '无描述'}
                        </Text>
                        <Text
                          size="sm"
                          fw={700}
                          c={isIncome ? 'green' : 'red'}
                        >
                          {isIncome ? '+' : '-'}
                          {formatCurrency(txn.amount || 0)}
                        </Text>
                      </div>
                      <Text size="xs" c="dimmed">
                        {account?.name} · {formatDateTime(txn.createdAt)}
                      </Text>
                    </div>
                  );
                })}
              </Stack>
            </ScrollArea.Autosize>
          </Card>

          <Card shadow="sm" p="lg" radius="md" withBorder>
            <IncomeExpenseChart transactions={filteredTransactions} />
          </Card>

          <Card shadow="sm" p="lg" radius="md" withBorder>
            <Text size="md" fw={600} mb="sm">
              分类统计
            </Text>
            <CategoryStatsChart transactions={filteredTransactions} />
          </Card>
        </>
      )}

      {recentTransactions.length === 0 && (
        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Text c="dimmed" ta="center">
            暂无交易记录
          </Text>
        </Card>
      )}
    </Stack>
  );
};
