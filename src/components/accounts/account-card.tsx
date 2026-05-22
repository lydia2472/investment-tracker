import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AccountTypeBadge } from './account-type-badge'
import { formatCurrency } from '@/lib/utils/formatters'
import { cn } from '@/lib/utils/cn'
import type { Account } from '@/types'
import { TrendingUp, TrendingDown, Edit, Trash2 } from 'lucide-react'

interface AccountCardProps {
  account: Account
  onDelete: (id: string, name: string) => void
  onEdit?: (account: Account) => void
}

export function AccountCard({ account, onDelete, onEdit }: AccountCardProps) {
  const balanceGrowth = account.balance - account.initialBalance
  const isPositiveGrowth = balanceGrowth > 0

  return (
    <Card className="group hover:scale-[1.02] transition-all duration-300 overflow-hidden">
      {/* Top gradient bar */}
      <div
        className="h-2 w-full"
        style={{
          background: `linear-gradient(90deg, ${account.color}, ${account.color}aa)`,
        }}
      />

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="h-12 w-12 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-3"
              style={{
                background: `linear-gradient(135deg, ${account.color}, ${account.color}cc)`,
                boxShadow: `0 8px 16px ${account.color}40`,
              }}
            >
              <span className="text-white text-lg font-bold">
                {account.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="font-semibold text-lg">{account.name}</h3>
              <p className="text-sm text-muted-foreground">
                {account.description || '无描述'}
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Balance display */}
          <div className="p-4 rounded-2xl bg-muted/50">
            <p className="text-sm text-muted-foreground mb-1">当前余额</p>
            <p className="text-3xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
              {formatCurrency(account.balance)}
            </p>
          </div>

          {/* Account info */}
          <div className="flex gap-2 flex-wrap">
            <AccountTypeBadge type={account.type} />
            <span className="text-xs bg-muted px-3 py-1.5 rounded-xl font-medium">
              {account.currency}
            </span>
          </div>

          {/* Growth indicator */}
          {balanceGrowth !== 0 && (
            <div className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-xl",
              isPositiveGrowth
                ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
                : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
            )}>
              {isPositiveGrowth ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <TrendingDown className="h-4 w-4" />
              )}
              <div className="flex flex-col">
                <span className="text-xs font-semibold">
                  {isPositiveGrowth ? '增长' : '减少'}
                </span>
                <span className="text-xs font-bold">
                  {formatCurrency(Math.abs(balanceGrowth))}
                </span>
              </div>
            </div>
          )}

          {/* Initial balance reference */}
          <div className="flex justify-between text-sm text-muted-foreground pt-2 border-t border-border/50">
            <span>初始余额</span>
            <span className="font-medium">{formatCurrency(account.initialBalance)}</span>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 pt-2">
            {onEdit && (
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onEdit(account)}
              >
                <Edit className="h-4 w-4 mr-1" />
                编辑
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              className={cn(
                "flex-1 bg-gradient-to-r from-red-500 to-rose-500 text-white shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40 hover:scale-[1.02]"
              )}
              onClick={() => onDelete(account.id, account.name)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              删除
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
