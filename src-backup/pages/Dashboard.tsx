import {
  Container,
  Title,
  SimpleGrid,
  Card,
  Text,
  Group,
  Stack,
  Button,
} from '@mantine/core';
import { IconPlus, IconTrendingUp, IconTrendingDown } from '@tabler/icons-react';
import { useAccountStore } from '../store/accountStore';
import { useTransactionStore } from '../store/transactionStore';
import { formatCurrency } from '../utils/formatters';

export const Dashboard = () => {
  const { accounts } = useAccountStore();
  const { transactions } = useTransactionStore();

  // 计算总资产
  const totalAssets = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  // 计算总收入和总支出
  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  // 最近交易
  const recentTransactions = [...transactions]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 10);

  return (
    <Container size="xl">
      <Stack gap="xl">
        <Group justify="space-between">
          <Title order={2}>总览</Title>
        </Group>

        {/* 统计卡片 */}
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
          <Card shadow="sm" p="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">
                总资产
              </Text>
            </Group>
            <Text size="xl" fw={700} c="blue">
              {formatCurrency(totalAssets)}
            </Text>
          </Card>

          <Card shadow="sm" p="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">
                总收入
              </Text>
              <IconTrendingUp size={20} color="green" />
            </Group>
            <Text size="xl" fw={700} c="green">
              {formatCurrency(totalIncome)}
            </Text>
          </Card>

          <Card shadow="sm" p="lg" radius="md" withBorder>
            <Group justify="space-between" mb="xs">
              <Text size="sm" c="dimmed">
                总支出
              </Text>
              <IconTrendingDown size={20} color="red" />
            </Group>
            <Text size="xl" fw={700} c="red">
              {formatCurrency(totalExpense)}
            </Text>
          </Card>
        </SimpleGrid>

        {/* 账户概览 */}
        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Group justify="space-between" mb="md">
            <Title order={4}>账户概览</Title>
            <Button variant="light" size="sm" leftSection={<IconPlus size={14} />}>
              添加账户
            </Button>
          </Group>

          {accounts.length === 0 ? (
            <Text c="dimmed">暂无账户</Text>
          ) : (
            <Stack gap="sm">
              {accounts.map((account) => (
                <Group key={account.id} justify="space-between">
                  <Text fw={500}>{account.name}</Text>
                  <Text c="blue" fw={700}>
                    {formatCurrency(account.balance)}
                  </Text>
                </Group>
              ))}
            </Stack>
          )}
        </Card>

        {/* 最近交易 */}
        <Card shadow="sm" p="lg" radius="md" withBorder>
          <Group justify="space-between" mb="md">
            <Title order={4}>最近交易</Title>
            <Button variant="light" size="sm" leftSection={<IconPlus size={14} />}>
              添加交易
            </Button>
          </Group>

          {recentTransactions.length === 0 ? (
            <Text c="dimmed">暂无交易记录</Text>
          ) : (
            <Stack gap="sm">
              {recentTransactions.map((transaction) => {
                const account = accounts.find(
                  (a) => a.id === transaction.accountId
                );
                const isIncome = transaction.type === 'income';

                return (
                  <Group key={transaction.id} justify="space-between">
                    <div>
                      <Text fw={500}>{transaction.description || '无描述'}</Text>
                      <Text size="sm" c="dimmed">
                        {account?.name} · {transaction.createdAt.toLocaleDateString()}
                      </Text>
                    </div>
                    <Text
                      fw={700}
                      c={isIncome ? 'green' : 'red'}
                    >
                      {isIncome ? '+' : '-'}
                      {formatCurrency(transaction.amount || 0)}
                    </Text>
                  </Group>
                );
              })}
            </Stack>
          )}
        </Card>
      </Stack>
    </Container>
  );
};
