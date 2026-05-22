import { useState } from 'react';
import {
  Container,
  Title,
  Group,
  Button,
  Modal,
  Stack,
  Card,
  Select,
} from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useAccountStore } from '../store/accountStore';
import { useTransactionStore } from '../store/transactionStore';
import type { Transaction, Account } from '../types';
import { TransactionForm } from '../components/transactions/TransactionForm';
import { formatCurrency, formatDateTime } from '../utils/formatters';

export const Transactions = () => {
  const { accounts } = useAccountStore();
  const { transactions, addTransaction, deleteTransaction } =
    useTransactionStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterAccountId, setFilterAccountId] = useState<string | undefined>();

  // 按时间倒序排序交易
  const sortedTransactions = [...transactions]
    .filter((t) => !filterAccountId || t.accountId === filterAccountId)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const handleAdd = () => {
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这条交易记录吗？')) {
      deleteTransaction(id);
    }
  };

  const handleSubmit = (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => {
    addTransaction(data);
    setIsModalOpen(false);
  };

  return (
    <Container size="xl">
      <Stack gap="xl">
        <Group justify="space-between">
          <Title order={2}>交易记录</Title>
          <Button leftSection={<IconPlus size={14} />} onClick={handleAdd}>
            添加交易
          </Button>
        </Group>

        {/* 筛选器 */}
        <Group>
          <Select
            placeholder="全部账户"
            clearable
            data={accounts.map((acc) => ({
              value: acc.id,
              label: acc.name,
            }))}
            value={filterAccountId}
            onChange={(value) => setFilterAccountId(value || undefined)}
            w={200}
          />
        </Group>

        {/* 交易列表 */}
        {sortedTransactions.length === 0 ? (
          <Card shadow="sm" p="xl" radius="md" withBorder>
            <div style={{ textAlign: 'center' }}>
              <Title order={4} c="dimmed">
                暂无交易记录
              </Title>
              <Button mt="md" leftSection={<IconPlus size={14} />} onClick={handleAdd}>
                添加第一笔交易
              </Button>
            </div>
          </Card>
        ) : (
          <Stack gap="sm">
            {sortedTransactions.map((transaction) => {
              const account = accounts.find(
                (a) => a.id === transaction.accountId
              );
              const isIncome = transaction.type === 'income';
              const isExpense = transaction.type === 'expense';
              const isSnapshot = transaction.type === 'snapshot';

              return (
                <Card
                  key={transaction.id}
                  shadow="sm"
                  p="md"
                  radius="md"
                  withBorder
                >
                  <Group justify="space-between">
                    <div style={{ flex: 1 }}>
                      <Group mb="xs">
                        <Text fw={500}>
                          {transaction.description || '无描述'}
                        </Text>
                        {isSnapshot && (
                          <span style={{ fontSize: 12, color: '#868e96' }}>
                            (快照)
                          </span>
                        )}
                      </Group>
                      <Group gap="xs">
                        <Text size="sm" c="dimmed">
                          {account?.name}
                        </Text>
                        <Text size="sm" c="dimmed">
                          ·
                        </Text>
                        <Text size="sm" c="dimmed">
                          {formatDateTime(transaction.createdAt)}
                        </Text>
                      </Group>
                    </div>
                    <Group>
                      <Text
                        size="lg"
                        fw={700}
                        c={
                          isSnapshot
                            ? 'blue'
                            : isIncome
                            ? 'green'
                            : 'red'
                        }
                      >
                        {isSnapshot
                          ? formatCurrency(transaction.balance || 0)
                          : isIncome
                          ? '+'
                          : '-'}
                        {isSnapshot
                          ? ''
                          : formatCurrency(transaction.amount || 0)}
                      </Text>
                      <Button
                        variant="light"
                        color="red"
                        size="xs"
                        onClick={() => handleDelete(transaction.id)}
                      >
                        删除
                      </Button>
                    </Group>
                  </Group>
                </Card>
              );
            })}
          </Stack>
        )}

        <Modal
          opened={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="添加交易"
          size="sm"
        >
          <TransactionForm
            accounts={accounts}
            onSubmit={handleSubmit}
            onCancel={() => setIsModalOpen(false)}
          />
        </Modal>
      </Stack>
    </Container>
  );
};
