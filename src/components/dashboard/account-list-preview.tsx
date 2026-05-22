import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils/formatters'
import type { Account } from '@/types'
import { Wallet } from 'lucide-react'

interface AccountListPreviewProps {
  accounts: Account[]
  limit?: number
}

export function AccountListPreview({ accounts, limit = 5 }: AccountListPreviewProps) {
  if (accounts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>账户概览</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center mb-4">
              <Wallet className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              暂无账户，请先创建账户
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>账户概览</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {accounts.slice(0, limit).map((account) => (
            <div
              key={account.id}
              className="group flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-all duration-200 cursor-pointer hover:scale-[1.01]"
            >
              <div className="flex items-center gap-3">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-3"
                  style={{
                    background: `linear-gradient(135deg, ${account.color}, ${account.color}cc)`,
                    boxShadow: `0 4px 12px ${account.color}40`,
                  }}
                >
                  {account.name.charAt(0).toUpperCase()}
                </div>
                <span className="font-medium">{account.name}</span>
              </div>
              <span className="font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
                {formatCurrency(account.balance)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
