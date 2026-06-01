'use client'

import { Button , Input } from 'animal-island-ui'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ArrowRightLeftIcon, InfoIcon } from '@/lib/components/icon-adapter'
import { FixedDepositRenewalService } from '@/lib/services/fixed-deposit-renewal-service'
import { MaturityReminderService } from '@/lib/services/maturity-reminder-service'
import { useTransactionStore , useAccountStore } from '@/lib/stores'
import { formatCurrency } from '@/lib/utils/formatters'

import { RenewalDialog } from './renewal-dialog'

interface TransferDialogProps {
  trigger?: React.ReactNode
  fromAccountId?: string
}

export function TransferDialog({ trigger, fromAccountId }: TransferDialogProps) {
  const [open, setOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [fromAccount, setFromAccount] = useState<string>(fromAccountId || '')
  const [toAccount, setToAccount] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const [description, setDescription] = useState('')

  // 续存对话框状态
  const [showRenewalDialog, setShowRenewalDialog] = useState(false)
  const [renewalData, setRenewalData] = useState<{
    fromAccountId: string
    toAccountId: string
    amount: number
  } | null>(null)

  // 到期存款转账状态
  const [isMaturedDeposit, setIsMaturedDeposit] = useState(false)
  const [maturityDetails, setMaturityDetails] = useState<{
    principal: number
    interest: number
    totalAmount: number
    maturityDate: Date
  } | null>(null)

  const transfer = useTransactionStore((state) => state.transfer)
  const accounts = useAccountStore((state) => state.accounts)

  // 当转出账户改变时，检查是否是已到期的定期存款
  useEffect(() => {
    if (!fromAccount) {
      setIsMaturedDeposit(false)
      setMaturityDetails(null)
      return
    }

    const account = accounts.find((acc) => acc.id === fromAccount)
    if (!account) {
      setIsMaturedDeposit(false)
      setMaturityDetails(null)
      return
    }

    const details = MaturityReminderService.getMaturityDetails(account)
    if (details && MaturityReminderService.isMatured(account)) {
      setIsMaturedDeposit(true)
      setMaturityDetails(details)
      // 自动填充转账金额
      setAmount(details.totalAmount)
      // 自动添加描述
      setDescription(`定期存款到期转出 (${details.maturityDate.toLocaleDateString('zh-CN')})`)
    } else {
      setIsMaturedDeposit(false)
      setMaturityDetails(null)
    }
  }, [fromAccount, accounts])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    console.log(`\n[转账对话框] ========== 表单提交 ==========`)
    console.log(`  转出账户: ${fromAccount}`)
    console.log(`  转入账户: ${toAccount}`)
    console.log(`  金额: ${amount}`)

    // Validation
    if (!fromAccount || !toAccount) {
      console.log(`  → 验证失败：未选择账户`)
      toast.error('请选择转出和转入账户')
      return
    }

    if (fromAccount === toAccount) {
      toast.error('转出和转入账户不能相同')
      return
    }

    if (!amount || amount <= 0) {
      toast.error('请输入有效的转账金额')
      return
    }

    // 检测续存场景
    console.log(`\n[转账对话框] 检测续存场景:`)
    console.log(`  转入账户ID: ${toAccount}`)
    console.log(`  转账金额: ${amount}`)

    const isRenewal = FixedDepositRenewalService.isRenewalTransfer(toAccount, amount)
    console.log(`  检测结果: ${isRenewal ? '是续存场景' : '不是续存场景'}`)

    if (isRenewal) {
      console.log('[转账对话框] 检测到续存场景，打开续存配置对话框')
      setRenewalData({ fromAccountId: fromAccount, toAccountId: toAccount, amount })
      setShowRenewalDialog(true)
      return
    }

    setIsSubmitting(true)
    try {
      transfer(fromAccount, toAccount, amount, description || '转账', new Date())

      const fromAccountData = accounts.find((acc) => acc.id === fromAccount)
      const toAccountData = accounts.find((acc) => acc.id === toAccount)

      toast.success('转账成功', {
        description: `已从 ${fromAccountData?.name || '未知账户'} 转账 ${amount.toFixed(2)} 到 ${toAccountData?.name || '未知账户'}`,
      })

      // Reset form
      setFromAccount(fromAccountId || '')
      setToAccount('')
      setAmount(0)
      setDescription('')
      setOpen(false)
    } catch (error) {
      console.error('转账失败:', error)
      toast.error('转账失败', {
        description: '请检查输入信息后重试',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // 续存成功后的回调
  const handleRenewalSuccess = () => {
    // 重置表单
    setFromAccount(fromAccountId || '')
    setToAccount('')
    setAmount(0)
    setDescription('')
    setOpen(false)
  }

  // 过滤可用账户（排除已选的转出账户）
  const availableToAccounts = accounts.filter((acc) => acc.id !== fromAccount)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            type="default"
            size="small"
            className="flex-1"
            icon={<ArrowRightLeftIcon className="h-4 w-4" />}
          >
            转账
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>账户转账</DialogTitle>
          <DialogDescription>在两个账户之间转账资金</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 转出账户 */}
          <div className="space-y-2">
            <Label htmlFor="from-account">转出账户</Label>
            <Select value={fromAccount} onValueChange={setFromAccount} required>
              <SelectTrigger id="from-account">
                <SelectValue placeholder="选择转出账户" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{account.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({account.currency} {account.balance.toFixed(2)})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 转入账户 */}
          <div className="space-y-2">
            <Label htmlFor="to-account">转入账户</Label>
            <Select value={toAccount} onValueChange={setToAccount} required>
              <SelectTrigger id="to-account">
                <SelectValue placeholder="选择转入账户" />
              </SelectTrigger>
              <SelectContent>
                {availableToAccounts.map((account) => (
                  <SelectItem key={account.id} value={account.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{account.name}</span>
                      <span className="text-xs text-muted-foreground">
                        ({account.currency} {account.balance.toFixed(2)})
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 到期明细（仅当转出账户是已到期的定期存款时显示） */}
          {isMaturedDeposit && maturityDetails && (
            <div className="bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-950/20 dark:to-red-950/20 border border-orange-200 dark:border-orange-900 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-orange-900 dark:text-orange-100">
                <InfoIcon className="h-4 w-4" />
                <span>定期存款到期明细</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">本金</span>
                  <span className="font-medium">{formatCurrency(maturityDetails.principal)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">利息</span>
                  <span className="font-medium text-green-600">
                    +{formatCurrency(maturityDetails.interest)}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-orange-200 dark:border-orange-800">
                  <span className="font-semibold text-foreground">总计</span>
                  <span className="font-bold text-lg text-orange-600">
                    {formatCurrency(maturityDetails.totalAmount)}
                  </span>
                </div>
              </div>
              <div className="text-xs text-muted-foreground text-center pt-1">
                定期存款到期，建议一次性转出全部金额
              </div>
            </div>
          )}

          {/* 转账金额 */}
          <div className="space-y-2">
            <Label htmlFor="amount">
              转账金额
              {isMaturedDeposit && (
                <span className="ml-2 text-xs text-orange-600 font-normal">
                  (已锁定为本金+利息总额)
                </span>
              )}
            </Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amount || ''}
              onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
              required
              readOnly={isMaturedDeposit}
              className={isMaturedDeposit ? 'bg-muted cursor-not-allowed' : ''}
            />
            {isMaturedDeposit && (
              <p className="text-xs text-muted-foreground">
                定期存款到期，转账金额已自动计算并锁定
              </p>
            )}
          </div>

          {/* 描述 */}
          <div className="space-y-2">
            <Label htmlFor="description">描述（可选）</Label>
            <Input
              id="description"
              type="text"
              placeholder="转账说明"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="default" onClick={() => setOpen(false)} disabled={isSubmitting}>
              取消
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              disabled={isSubmitting}
              className="bg-[#5ec850]"
            >
              {isSubmitting ? '转账中...' : '确认转账'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>

      {/* 续存配置对话框 */}
      {renewalData && (
        <RenewalDialog
          open={showRenewalDialog}
          onOpenChange={setShowRenewalDialog}
          fromAccountId={renewalData.fromAccountId}
          toAccountId={renewalData.toAccountId}
          amount={renewalData.amount}
          onSuccess={handleRenewalSuccess}
        />
      )}
    </Dialog>
  )
}
