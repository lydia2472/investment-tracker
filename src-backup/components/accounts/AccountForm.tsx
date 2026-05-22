import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  TextInput,
  NumberInput,
  Select,
  Button,
  Group,
  Stack,
  ColorInput,
} from '@mantine/core';
import { AccountType } from '../../types';
import type { Account } from '../../types';

const accountSchema = z.object({
  name: z.string().min(1, '账户名称不能为空'),
  type: z.nativeEnum(AccountType),
  balance: z.number().min(0, '余额不能为负数'),
  initialBalance: z.number().min(0, '初始余额不能为负数'),
  currency: z.string().default('CNY'),
  description: z.string().optional(),
  color: z.string().default('blue'),
});

type AccountFormData = z.infer<typeof accountSchema>;

interface AccountFormProps {
  account?: Account;
  onSubmit: (data: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

export const AccountForm: React.FC<AccountFormProps> = ({
  account,
  onSubmit,
  onCancel,
}) => {
  const { register, handleSubmit, formState: { errors } } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: account || {
      name: '',
      type: AccountType.BANK,
      balance: 0,
      initialBalance: 0,
      currency: 'CNY',
      color: 'blue',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack>
        <TextInput
          label="账户名称"
          placeholder="输入账户名称"
          {...register('name')}
          error={errors.name?.message}
        />

        <Select
          label="账户类型"
          data={[
            { value: AccountType.SECURITIES, label: '证券账户' },
            { value: AccountType.BANK, label: '银行账户' },
            { value: AccountType.CASH, label: '现金账户' },
            { value: AccountType.OTHER, label: '其他' },
          ]}
          {...register('type')}
        />

        <NumberInput
          label="初始余额"
          placeholder="0.00"
          min={0}
          precision={2}
          {...register('initialBalance', { valueAsNumber: true })}
          error={errors.initialBalance?.message}
        />

        <ColorInput
          label="显示颜色"
          placeholder="选择颜色"
          {...register('color')}
        />

        <TextInput
          label="描述"
          placeholder="账户描述"
          {...register('description')}
        />

        <Group justify="flex-end">
          <Button variant="default" onClick={onCancel}>
            取消
          </Button>
          <Button type="submit">提交</Button>
        </Group>
      </Stack>
    </form>
  );
};
