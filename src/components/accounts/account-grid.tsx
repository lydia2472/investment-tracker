import { Card } from 'animal-island-ui'
import { useState, type DragEvent } from 'react'

import { cn } from '@/lib/utils/cn'

import { AccountCard } from './account-card'

import type { Account } from '@/types'

interface AccountGridProps {
  accounts: Account[]
  onDelete: (id: string, name: string) => void
  onEdit?: (account: Account) => void
  onToggleArchive?: (id: string) => void
  emptyMessage?: string
  // 新增 props
  selectedAccountIds?: Set<string>
  onToggleSelection?: (accountId: string) => void
  isBulkSelectionMode?: boolean
  onReorder?: (draggedId: string, targetId: string) => void
}

export function AccountGrid({
  accounts,
  onDelete,
  onEdit,
  onToggleArchive,
  emptyMessage,
  selectedAccountIds = new Set(),
  onToggleSelection,
  isBulkSelectionMode = false,
  onReorder,
}: AccountGridProps) {
  const [draggingAccountId, setDraggingAccountId] = useState<string | null>(null)
  const [dropTargetAccountId, setDropTargetAccountId] = useState<string | null>(null)

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

  const isDragEnabled = !isBulkSelectionMode && !!onReorder

  const handleDragStart = (event: DragEvent<HTMLDivElement>, accountId: string) => {
    if (!isDragEnabled) {
      return
    }

    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', accountId)
    setDraggingAccountId(accountId)
    setDropTargetAccountId(accountId)
  }

  const handleDragEnd = () => {
    setDraggingAccountId(null)
    setDropTargetAccountId(null)
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>, accountId: string) => {
    if (!isDragEnabled || !draggingAccountId || draggingAccountId === accountId) {
      return
    }

    event.preventDefault()
    if (dropTargetAccountId !== accountId) {
      setDropTargetAccountId(accountId)
    }
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>, accountId: string) => {
    if (!isDragEnabled || !draggingAccountId || draggingAccountId === accountId) {
      handleDragEnd()
      return
    }

    event.preventDefault()
    onReorder?.(draggingAccountId, accountId)
    handleDragEnd()
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {accounts.map((account) => (
        <div
          key={account.id}
          draggable={isDragEnabled}
          onDragStart={(event) => handleDragStart(event, account.id)}
          onDragEnd={handleDragEnd}
          onDragOver={(event) => handleDragOver(event, account.id)}
          onDrop={(event) => handleDrop(event, account.id)}
          className={cn(
            'transition-all',
            isDragEnabled && 'cursor-move',
            draggingAccountId === account.id && 'opacity-50',
            dropTargetAccountId === account.id &&
              draggingAccountId !== account.id &&
              'scale-[1.01] rounded-2xl ring-2 ring-primary/50 ring-offset-2'
          )}
        >
          <AccountCard
            account={account}
            onDelete={onDelete}
            onEdit={onEdit}
            onToggleArchive={onToggleArchive}
            isSelected={selectedAccountIds.has(account.id)}
            onToggleSelection={() => onToggleSelection?.(account.id)}
            isBulkSelectionMode={isBulkSelectionMode}
          />
        </div>
      ))}
    </div>
  )
}
