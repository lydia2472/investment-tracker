import { useState } from 'react';
import {
  Container,
  Title,
  Group,
  Button,
  Modal,
  SimpleGrid,
  Stack,
} from '@mantine/core';
import { IconPlus } from '@tabler/icons-react';
import { useAccountStore } from '../store/accountStore';
import type { Account } from '../types';
import { AccountCard } from '../components/accounts/AccountCard';
import { AccountForm } from '../components/accounts/AccountForm';

export const Accounts = () => {
  const { accounts, addAccount, updateAccount, deleteAccount } =
    useAccountStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | undefined>();

  const handleAdd = () => {
    setEditingAccount(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个账户吗？')) {
      deleteAccount(id);
    }
  };

  const handleSubmit = (data: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingAccount) {
      updateAccount(editingAccount.id, data);
    } else {
      addAccount(data);
    }
    setIsModalOpen(false);
  };

  return (
    <Container size="xl">
      <Stack gap="xl">
        <Group justify="space-between">
          <Title order={2}>账户管理</Title>
          <Button leftSection={<IconPlus size={14} />} onClick={handleAdd}>
            添加账户
          </Button>
        </Group>

        {accounts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Title order={4} c="dimmed">
              暂无账户
            </Title>
            <Button mt="md" leftSection={<IconPlus size={14} />} onClick={handleAdd}>
              创建第一个账户
            </Button>
          </div>
        ) : (
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }}>
            {accounts.map((account) => (
              <AccountCard
                key={account.id}
                account={account}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </SimpleGrid>
        )}

        <Modal
          opened={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingAccount ? '编辑账户' : '添加账户'}
          size="sm"
        >
          <AccountForm
            account={editingAccount}
            onSubmit={handleSubmit}
            onCancel={() => setIsModalOpen(false)}
          />
        </Modal>
      </Stack>
    </Container>
  );
};
