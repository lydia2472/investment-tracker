import { Card, Text, Select, Stack, Button, Group } from '@mantine/core';
import { IconFilter, IconX } from '@tabler/icons-react';
import type { Account } from '../../types';

interface TransactionFiltersProps {
  accounts: Account[];
  selectedAccountId: string | 'all';
  onAccountChange: (value: string | 'all') => void;
  onReset: () => void;
}

export const TransactionFilters = ({
  accounts,
  selectedAccountId,
  onAccountChange,
  onReset,
}: TransactionFiltersProps) => {
  return (
    <Card shadow="sm" p="lg" radius="md" withBorder>
      <Group justify="space-between" mb="sm">
        <Text size="md" fw={600} leftSection={<IconFilter size={16} />}>
          筛选
        </Text>
        <Button
          variant="subtle"
          size="xs"
          leftSection={<IconX size={14} />}
          onClick={onReset}
        >
          重置
        </Button>
      </Group>

      <Stack gap="sm">
        <Select
          label="账户"
          placeholder="全部账户"
          data={[
            { value: 'all', label: '全部账户' },
            ...accounts.map((acc) => ({
              value: acc.id,
              label: acc.name,
            })),
          ]}
          value={selectedAccountId}
          onChange={(value) => onAccountChange(value as string | 'all')}
          size="xs"
        />
      </Stack>
    </Card>
  );
};
