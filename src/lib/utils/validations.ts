import { z } from 'zod'
import { AccountType, TransactionType } from '@/types'

export const accountSchema = z.object({
  name: z.string().min(1, '账户名称必填'),
  type: z.nativeEnum(AccountType),
  initialBalance: z.number().min(0, '初始余额不能为负'),
  currency: z.string().min(1).default('CNY'),
  color: z.string().min(1).default('#3b82f6'),
  description: z.string().optional(),
})

export const transactionSchema = z.object({
  accountId: z.string().min(1, '请选择账户'),
  type: z.nativeEnum(TransactionType),
  amount: z.number().optional(),
  balance: z.number().optional(),
  description: z.string().optional(),
  note: z.string().optional(),
  tags: z.array(z.string()).optional(),
  date: z.date().default(() => new Date()),
})

export const transferSchema = z.object({
  fromAccountId: z.string().min(1, '请选择转出账户'),
  toAccountId: z.string().min(1, '请选择转入账户'),
  amount: z.number().min(0.01, '转账金额必须大于0'),
  description: z.string().optional(),
  date: z.date().default(() => new Date()),
}).refine(
  (data) => data.fromAccountId !== data.toAccountId,
  { message: '转出和转入账户不能相同', path: ['toAccountId'] }
)
