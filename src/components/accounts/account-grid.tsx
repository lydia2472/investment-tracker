import { Card } from 'animal-island-ui'
import { AccountCard } from './account-card'
import type { Account } from '@/types'

interface AccountGridProps {
  accounts: Account[]
  onDelete: (id: string, name: string) => void
  onEdit?: (account: Account) => void
  emptyMessage?: string
}

export function AccountGrid({ accounts, onDelete, onEdit, emptyMessage }: AccountGridProps) {
  if (accounts.length === 0) {
    return (
      <Card color="app-yellow">
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {emptyMessage || '暂无账户，点击右上角"添加账户"创建您的第一个账户'}
          </p>
        </div>
      </Card>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {accounts.map((account) => (
        <AccountCard
          key={account.id}
          account={account}
          onDelete={onDelete}
          onEdit={onEdit}
        />
      ))}
    </div>
  )
}
