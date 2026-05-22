'use client'

import { useAccountStore } from '@/lib/stores'
import { AccountGrid } from '@/components/accounts/account-grid'
import { AddAccountDialog } from '@/components/accounts/add-account-dialog'
import { useAccountActions } from '@/hooks/use-account-actions'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'

export default function AccountsPage() {
  const accounts = useAccountStore((state) => state.accounts)
  const { handleDelete } = useAccountActions()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">账户管理</h2>
          <p className="text-muted-foreground">
            管理您的所有投资账户
          </p>
        </div>
        <AddAccountDialog
          trigger={
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              添加账户
            </Button>
          }
        />
      </div>

      <AccountGrid
        accounts={accounts}
        onDelete={handleDelete}
      />
    </div>
  )
}
