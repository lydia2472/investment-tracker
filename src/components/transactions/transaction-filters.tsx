'use client'

import { useState } from 'react'
import { Input } from 'animal-island-ui'
import { Button } from 'animal-island-ui'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { TransactionType } from '@/types'
import { useAccountStore, useTagStore } from '@/lib/stores'
import { XIcon, ChevronDownIcon } from '@/lib/components/icon-adapter'
import { cn } from '@/lib/utils/cn'
import { MultiSelect } from '@/components/ui/multi-select'

export interface TransactionFilters {
  accountId?: string
  type?: TransactionType
  tags?: string[]
  search?: string
  dateRange?: {
    from: Date
    to: Date
  }
}

interface TransactionFiltersProps {
  filters: TransactionFilters
  onFiltersChange: (filters: TransactionFilters) => void
}

export function TransactionFilters({
  filters,
  onFiltersChange,
}: TransactionFiltersProps) {
  const accounts = useAccountStore((state) => state.accounts)
  const availableTags = useTagStore((state) => state.availableTags)

  // 清除单个过滤条件
  const clearFilter = (key: keyof TransactionFilters) => {
    const newFilters = { ...filters }
    delete newFilters[key]
    onFiltersChange(newFilters)
  }

  // 重置所有过滤条件
  const resetAllFilters = () => {
    onFiltersChange({})
  }

  // 检查是否有任何过滤条件
  const hasFilters = Object.keys(filters).length > 0

  return (
    <div className="space-y-4">
      {/* 过滤器行 */}
      <div className="flex flex-wrap gap-2">
        {/* 账户过滤 */}
        <div className="flex items-center gap-1">
          <Select
            value={filters.accountId || 'all'}
            onValueChange={(value) => {
              onFiltersChange({
                ...filters,
                accountId: value === 'all' ? undefined : value,
              })
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="所有账户" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有账户</SelectItem>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {filters.accountId && (
            <Button
              type="default"
              size="small"
              className="h-8 w-8 hover:bg-muted/50"
              onClick={() => clearFilter('accountId')}
            >
              <XIcon className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* 交易类型过滤 */}
        <div className="flex items-center gap-1">
          <Select
            value={filters.type || 'all'}
            onValueChange={(value) => {
              onFiltersChange({
                ...filters,
                type: value === 'all' ? undefined : (value as TransactionType),
              })
            }}
          >
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="所有类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">所有类型</SelectItem>
              <SelectItem value={TransactionType.INCOME}>收入</SelectItem>
              <SelectItem value={TransactionType.DEPOSIT}>存款</SelectItem>
              <SelectItem value={TransactionType.TRANSFER_IN}>转入</SelectItem>
              <SelectItem value={TransactionType.CONSUMPTION}>消费</SelectItem>
              <SelectItem value={TransactionType.TRANSFER_OUT}>转出</SelectItem>
              <SelectItem value={TransactionType.LOAN}>放贷</SelectItem>
              <SelectItem value={TransactionType.TRANSFER}>转账</SelectItem>
              <SelectItem value={TransactionType.SNAPSHOT}>快照</SelectItem>
            </SelectContent>
          </Select>
          {filters.type && (
            <Button
              type="default"
              size="small"
              className="h-8 w-8 hover:bg-muted/50"
              onClick={() => clearFilter('type')}
            >
              <XIcon className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* 标签过滤 */}
        <div className="flex items-center gap-1">
          <MultiSelect
            options={availableTags}
            value={filters.tags || []}
            onChange={(tags) => onFiltersChange({
              ...filters,
              tags: tags.length > 0 ? tags : undefined
            })}
            placeholder="选择标签"
            specialOption={{ value: "__BLANK__", label: "无标签" }}
          />
          {filters.tags && filters.tags.length > 0 && (
            <Button
              type="default"
              size="small"
              className="h-8 w-8 hover:bg-muted/50"
              onClick={() => clearFilter('tags')}
            >
              <XIcon className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* 日期范围过滤 */}
        <div className="flex items-center gap-1">
          <Input
            type="date"
            value={filters.dateRange?.from ? formatToDateInput(filters.dateRange.from) : ''}
            onChange={(e) => {
              const from = e.target.value ? new Date(e.target.value) : undefined
              onFiltersChange({
                ...filters,
                dateRange: from
                  ? { from, to: filters.dateRange?.to || new Date() }
                  : undefined,
              })
            }}
            className="w-[140px]"
          />
          <span className="text-muted-foreground">至</span>
          <Input
            type="date"
            value={filters.dateRange?.to ? formatToDateInput(filters.dateRange.to) : ''}
            onChange={(e) => {
              const to = e.target.value ? new Date(e.target.value) : undefined
              onFiltersChange({
                ...filters,
                dateRange: to
                  ? { from: filters.dateRange?.from || new Date(), to }
                  : undefined,
              })
            }}
            className="w-[140px]"
          />
          {filters.dateRange && (
            <Button
              type="default"
              size="small"
              className="h-8 w-8 hover:bg-muted/50"
              onClick={() => clearFilter('dateRange')}
            >
              <XIcon className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* 重置所有过滤器 */}
        {hasFilters && (
          <Button
            type="default"
            size="small"
            className="border-2 border-[#5ec850]/50"
            onClick={resetAllFilters}
            title="重置所有过滤器"
          >
            <ChevronDownIcon className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}

// 辅助函数：将 Date 转换为 date input 的格式 (YYYY-MM-DD)
function formatToDateInput(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
