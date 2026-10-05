'use client'

import { Input , Button } from 'animal-island-ui'

import { MultiSelect } from '@/components/ui/multi-select'
import { useAvailableTags } from '@/hooks/use-tag-assets'
import { XIcon, ChevronDownIcon } from '@/lib/components/icon-adapter'
import { useAccountStore } from '@/lib/stores'
import { TransactionType } from '@/types'

import type { TransactionFilters as SharedTransactionFilters } from '@/lib/utils/transaction-filtering'

export type TransactionFilters = SharedTransactionFilters

interface TransactionFiltersProps {
  filters: TransactionFilters
  onFiltersChange: (filters: TransactionFilters) => void
}

export function TransactionFilters({ filters, onFiltersChange }: TransactionFiltersProps) {
  const accounts = useAccountStore((state) => state.accounts)
  const availableTags = useAvailableTags()

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
          <MultiSelect
            options={accounts.map((acc) => ({
              label: acc.name,
              value: acc.id,
            }))}
            value={
              Array.isArray(filters.accountId)
                ? filters.accountId
                : filters.accountId
                  ? [filters.accountId]
                  : []
            }
            onChange={(accountIds) => {
              onFiltersChange({
                ...filters,
                accountId: accountIds.length > 0 ? accountIds : undefined,
              })
            }}
            placeholder="选择账户"
            className="w-[140px]"
          />
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

        {/* 货币过滤：按账户币种筛选（动态生成，只显示实际存在的货币） */}
        {(() => {
          const currencyOptions = Array.from(new Set(accounts.map((acc) => acc.currency)))
          if (currencyOptions.length <= 1) return null
          return (
            <div className="flex items-center gap-1">
              <MultiSelect
                options={currencyOptions.map((c) => ({ label: c, value: c }))}
                value={filters.currencies || []}
                onChange={(currencies) => {
                  onFiltersChange({
                    ...filters,
                    currencies: currencies.length > 0 ? currencies : undefined,
                  })
                }}
                placeholder="选择货币"
                className="w-[120px]"
              />
              {filters.currencies && (
                <Button
                  type="default"
                  size="small"
                  className="h-8 w-8 hover:bg-muted/50"
                  onClick={() => clearFilter('currencies')}
                >
                  <XIcon className="h-3 w-3" />
                </Button>
              )}
            </div>
          )
        })()}

        {/* 交易类型过滤 */}
        <div className="flex items-center gap-1">
          <MultiSelect
            options={[
              { label: '收入', value: TransactionType.INCOME },
              { label: '存款', value: TransactionType.DEPOSIT },
              { label: '消费', value: TransactionType.CONSUMPTION },
              { label: '放贷', value: TransactionType.LOAN },
              { label: '转入', value: TransactionType.TRANSFER_IN },
              { label: '转出', value: TransactionType.TRANSFER_OUT },
              { label: '投资收益', value: TransactionType.INVESTMENT_PROFIT },
              { label: '投资亏损', value: TransactionType.INVESTMENT_LOSS },
            ]}
            value={filters.types || []}
            onChange={(types) =>
              onFiltersChange({
                ...filters,
                types: types.length > 0 ? (types as TransactionType[]) : undefined,
              })
            }
            placeholder="选择类型"
          />
          {filters.types && filters.types.length > 0 && (
            <Button
              type="default"
              size="small"
              className="h-8 w-8 hover:bg-muted/50"
              onClick={() => clearFilter('types')}
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
            onChange={(tags) =>
              onFiltersChange({
                ...filters,
                tags: tags.length > 0 ? tags : undefined,
              })
            }
            placeholder="选择标签"
            specialOption={{ value: '__BLANK__', label: '无标签' }}
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
              const from = e.target.value
                ? (() => {
                    // 使用本地时区的午夜时间，避免UTC时区问题
                    const [year, month, day] = e.target.value.split('-').map(Number)
                    return new Date(year, month - 1, day, 0, 0, 0)
                  })()
                : undefined
              onFiltersChange({
                ...filters,
                dateRange:
                  from || filters.dateRange?.to
                    ? { from, to: filters.dateRange?.to }
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
              const to = e.target.value
                ? (() => {
                    // 使用本地时区的午夜时间，避免UTC时区问题
                    const [year, month, day] = e.target.value.split('-').map(Number)
                    return new Date(year, month - 1, day, 0, 0, 0)
                  })()
                : undefined
              onFiltersChange({
                ...filters,
                dateRange:
                  filters.dateRange?.from || to
                    ? { from: filters.dateRange?.from, to }
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
