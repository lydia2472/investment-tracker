import { useState } from 'react';
import {
  Card,
  Text,
  Stack,
  Group,
  Collapse,
  Button,
  Badge,
  Progress,
} from '@mantine/core';
import { IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { useDisclosure } from '@mantine/hooks';
import { useAccountStore } from '../../store/accountStore';
import { formatCurrency } from '../../utils/formatters';
import { AccountDistributionChart } from '../charts/AccountDistributionChart';

export const AccountOverview = () => {
  const { accounts } = useAccountStore();
  const [opened, { toggle }] = useDisclosure(true);

  const totalAssets = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const totalIncome = accounts.length > 0 ? totalAssets : 0;

  return (
    <Stack gap="md">
      <Card shadow="sm" p="lg" radius="md" withBorder>
        <Text size="lg" fw={700} mb="sm">
          账户概览
        </Text>

        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              总资产
            </Text>
            <Text size="xl" fw={700} c="blue">
              {formatCurrency(totalAssets)}
            </Text>
          </Group>

          {accounts.length > 0 && (
            <>
              <Progress
                value={100}
                size="sm"
                color="blue"
              />
            </>
          )}
        </Stack>
      </Card>

      {accounts.length > 0 && (
        <>
          <Card shadow="sm" p="lg" radius="md" withBorder>
            <Group justify="space-between" mb="sm">
              <Text size="md" fw={600}>
                账户列表 ({accounts.length})
              </Text>
              <Button
                variant="subtle"
                size="xs"
                onClick={toggle}
                rightSection={opened ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />}
              >
                {opened ? '收起' : '展开'}
              </Button>
            </Group>

            <Collapse in={opened}>
              <Stack gap="xs">
                {accounts.map((account) => (
                  <Group key={account.id} justify="space-between">
                    <Group>
                      <Badge color={account.color} size="xs" circle />
                      <Text size="sm" fw={500}>
                        {account.name}
                      </Text>
                    </Group>
                    <Text size="sm" c="blue" fw={600}>
                      {formatCurrency(account.balance)}
                    </Text>
                  </Group>
                ))}
              </Stack>
            </Collapse>
          </Card>

          <Card shadow="sm" p="lg" radius="md" withBorder>
            <Text size="md" fw={600} mb="sm">
              账户分布
            </Text>
            <AccountDistributionChart accounts={accounts} />
          </Card>
        </>
      )}
    </Stack>
  );
};
