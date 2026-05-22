import { Card, Text, Group, Badge, Button, ActionIcon } from '@mantine/core';
import { IconPencil, IconTrash, IconArrowRight } from '@tabler/icons-react';
import { AccountType } from '../../types';
import type { Account } from '../../types';
import { formatCurrency } from '../../utils/formatters';

interface AccountCardProps {
  account: Account;
  onEdit: (account: Account) => void;
  onDelete: (id: string) => void;
  onTransfer?: (account: Account) => void;
}

export const AccountCard: React.FC<AccountCardProps> = ({
  account,
  onEdit,
  onDelete,
  onTransfer,
}) => {
  const accountTypeLabels = {
    [AccountType.SECURITIES]: '证券账户',
    [AccountType.BANK]: '银行账户',
    [AccountType.CASH]: '现金账户',
    [AccountType.OTHER]: '其他',
  };

  return (
    <Card shadow="sm" p="lg" radius="md" withBorder>
      <Group justify="space-between" mb="xs">
        <Text fw={500} size="lg">
          {account.name}
        </Text>
        <Badge color={account.color}>{accountTypeLabels[account.type]}</Badge>
      </Group>

      <Text size="xl" fw={700} c="blue" mb="sm">
        {formatCurrency(account.balance)}
      </Text>

      {account.description && (
        <Text size="sm" c="dimmed" mb="md">
          {account.description}
        </Text>
      )}

      <Group>
        <Button
          variant="light"
          size="xs"
          leftSection={<IconPencil size={14} />}
          onClick={() => onEdit(account)}
        >
          编辑
        </Button>

        {onTransfer && (
          <Button
            variant="light"
            size="xs"
            leftSection={<IconArrowRight size={14} />}
            onClick={() => onTransfer(account)}
          >
            转账
          </Button>
        )}

        <ActionIcon
          color="red"
          variant="light"
          size="lg"
          onClick={() => onDelete(account.id)}
        >
          <IconTrash size={16} />
        </ActionIcon>
      </Group>
    </Card>
  );
};
