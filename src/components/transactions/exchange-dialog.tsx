'use client'

import { Button, Input } from 'animal-island-ui'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { SearchableAccountSelect } from '@/components/ui/searchable-account-select'
import { ArrowRightLeftIcon } from '@/lib/components/icon-adapter'
import { useAccountStore, useTransactionStore } from '@/lib/stores'
import { formatCurrency } from '@/lib/utils/formatters'

import type { Account } from '@/types'

interface ExchangeDialogProps {
  trigger?: React.ReactNode
}

/** 货币符号（仅用于展示） */
const CURRENCY_SYMBOL: Record<string, string> = {
  CNY: '¥',
  USD: '$',
  EUR: '€',
  HKD: 'HK$',
  JPY: '¥',
}

/**
 * 换汇（跨币种转账）：从一个账户换出原币种、向另一个账户换入目标币种。
 * 生成一对带「换汇」标签的 转出/转入 交易（配对删除），汇率记录在备注。
 */
export function ExchangeDialog({ trigger }: ExchangeDialogProps) {
  const [open, setOpen] = useState(false)
  const [fromAccountId, setFromAccountId] = useState<string | undefined>()
  const [toAccountId, setToAccountId] = useState<string | undefined>()
  const [amountFrom, setAmountFrom] = useState('')
  const [amountTo, setAmountTo] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const accounts = useAccountStore((state) => state.accounts)
  const exchange = useTransactionStore((state) => state.exchange)

  const fromAccount = accounts.find((a) => a.id === fromAccountId)
  const toAccount = accounts.find((a) => a.id === toAccountId)

  // 参考汇率：转出金额 / 转入金额（1 目标币种 ≈ n 原币种）
  const rate = useMemo(() => {
    const af = parseFloat(amountFrom)
    const at = parseFloat(amountTo)
    if (!isNaN(af) && !isNaN(at) && af > 0 && at > 0) return af / at
    return null
  }, [amountFrom, amountTo])

  const sameCurrency =
    fromAccount && toAccount && fromAccount.currency === toAccount.currency

  const resetForm = () => {
    setFromAccountId(undefined)
    setToAccountId(undefined)
    setAmountFrom('')
    setAmountTo('')
    setNote('')
    setDate(new Date().toISOString().slice(0, 10))
  }

  const handleSubmit = async () => {
    if (!fromAccount || !toAccount) {
      toast.error('请选择换出和换入账户')
      return
    }
    if (fromAccount.currency === toAccount.currency) {
      toast.error('两个账户币种相同，请使用「添加交易」中的普通转账')
      return
    }
    const af = parseFloat(amountFrom)
    const at = parseFloat(amountTo)
    if (isNaN(af) || af <= 0 || isNaN(at) || at <= 0) {
      toast.error('请输入有效的换出/换入金额')
      return
    }

    setIsSubmitting(true)
    try {
      const rateNote =
        rate != null
          ? `汇率 1 ${toAccount.currency} = ${rate.toFixed(4)} ${fromAccount.currency}`
          : undefined
      const [y, m, d] = date.split('-').map(Number)
      exchange(
        fromAccount.id,
        toAccount.id,
        af,
        at,
        new Date(y, m - 1, d),
        [note.trim(), rateNote].filter(Boolean).join(' · ') || rateNote
      )
      toast.success('换汇已记录', {
        description: `${fromAccount.name} -${formatCurrency(af)}${fromAccount.currency} → ${toAccount.name} +${formatCurrency(at)}${toAccount.currency}`,
      })
      setOpen(false)
    } catch (error) {
      console.error('换汇记录失败:', error)
      toast.error('记录失败，请重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  const symbolOf = (a?: Account) =>
    a ? (CURRENCY_SYMBOL[a.currency] ?? '') + ' ' + a.currency : ''

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) resetForm()
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button type="default" icon={<ArrowRightLeftIcon className="h-4 w-4" />}>
            换汇
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>换汇（跨币种转账）</DialogTitle>
          <DialogDescription>
            从一个账户换出原币种、向另一个账户换入目标币种，生成一对互相关联的转出/转入记录，汇率自动记入备注。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 换出账户 */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">换出账户</label>
            <SearchableAccountSelect
              value={fromAccountId}
              onChange={setFromAccountId}
              accounts={accounts}
              placeholder="选择换出账户"
            />
            {fromAccount && (
              <p className="text-xs text-muted-foreground">
                币种：{fromAccount.currency} {symbolOf(fromAccount)}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              换出金额 {fromAccount ? `(${fromAccount.currency})` : ''}
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="例如 7200"
              value={amountFrom}
              onChange={(e) => setAmountFrom(e.target.value)}
            />
          </div>

          {/* 换入账户 */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium">换入账户</label>
            <SearchableAccountSelect
              value={toAccountId}
              onChange={setToAccountId}
              accounts={accounts}
              placeholder="选择换入账户"
            />
            {toAccount && (
              <p className="text-xs text-muted-foreground">
                币种：{toAccount.currency} {symbolOf(toAccount)}
              </p>
            )}
            {sameCurrency && (
              <p className="text-xs text-red-600">
                两个账户币种相同——换汇无意义，请使用普通转账。
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">
              换入金额 {toAccount ? `(${toAccount.currency})` : ''}
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              placeholder="例如 1000"
              value={amountTo}
              onChange={(e) => setAmountTo(e.target.value)}
            />
          </div>

          {/* 参考汇率 */}
          {rate != null && fromAccount && toAccount && (
            <div className="text-xs text-muted-foreground bg-muted/50 border rounded-lg px-3 py-2">
              汇率 1 {toAccount.currency} ≈ {rate.toFixed(4)} {fromAccount.currency}
              （将自动记入备注）
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium">日期</label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">备注（可选）</label>
            <Input
              placeholder="例如 工行 App 换汇"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button type="default" onClick={() => setOpen(false)} disabled={isSubmitting}>
              取消
            </Button>
            <Button
              type="primary"
              onClick={handleSubmit}
              disabled={isSubmitting || !!sameCurrency}
              className="bg-[#5ec850]"
            >
              {isSubmitting ? '记录中...' : '记录换汇'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
