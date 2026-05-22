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
} from '@mantine/core';
import { TransactionType, TransactionCategory } from '../../types';
import type {
  Transaction,
  Account,
} from '../../types';

const transactionSchema = z.object({
  accountId: z.string().min(1, '请选择账户'),
  type: z.nativeEnum(TransactionType),
  category: z.nativeEnum(TransactionCategory),
  amount: z.number().optional(),
  balance: z.number().optional(),
  description: z.string().optional(),
  note: z.string().optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
  accounts: Account[];
  onSubmit: (data: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({
  accounts,
  onSubmit,
  onCancel,
}) => {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: TransactionType.INCOME,
      category: TransactionCategory.DEPOSIT,
    },
  });

  const transactionType = watch('type');

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Stack>
        <Select
          label="账户"
          placeholder="选择账户"
          data={accounts.map((acc) => ({
            value: acc.id,
            label: acc.name,
          }))}
          {...register('accountId')}
          error={errors.accountId?.message}
        />

        <Select
          label="交易类型"
          data={[
            { value: TransactionType.INCOME, label: '收入' },
            { value: TransactionType.EXPENSE, label: '支出' },
            { value: TransactionType.SNAPSHOT, label: '快照' },
          ]}
          {...register('type')}
        />

        <Select
          label="分类"
          data={
            transactionType === TransactionType.INCOME
              ? [
                  {
                    value: TransactionCategory.DEPOSIT,
                    label: '充值',
                  },
                  {
                    value: TransactionCategory.INVESTMENT_GAIN,
                    label: '投资收益',
                  },
                  {
                    value: TransactionCategory.TRANSFER_IN,
                    label: '转入',
                  },
                ]
              : transactionType === TransactionType.EXPENSE
              ? [
                  {
                    value: TransactionCategory.WITHDRAW,
                    label: '提现',
                  },
                  {
                    value: TransactionCategory.INVESTMENT_LOSS,
                    label: '投资损失',
                  },
                  {
                    value: TransactionCategory.TRANSFER_OUT,
                    label: '转出',
                  },
                ]
              : [{ value: TransactionCategory.SNAPSHOT, label: '快照' }]
          }
          {...register('category')}
        />

        {transactionType !== TransactionType.SNAPSHOT ? (
          <NumberInput
            label="金额"
            placeholder="输入金额"
            min={0}
            precision={2}
            {...register('amount', { valueAsNumber: true })}
            error={errors.amount?.message}
          />
        ) : (
          <NumberInput
            label="快照金额"
            placeholder="输入快照金额"
            min={0}
            precision={2}
            {...register('balance', { valueAsNumber: true })}
            error={errors.balance?.message}
          />
        )}

        <TextInput
          label="描述"
          placeholder="交易描述"
          {...register('description')}
        />

        <TextInput
          label="备注"
          placeholder="备注信息"
          {...register('note')}
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
