'use client'

import * as PopoverPrimitive from '@radix-ui/react-popover'
import { Input , Button } from 'animal-island-ui'
import { Check, ChevronDown, Search, X } from 'lucide-react'
import * as React from 'react'

import { UNGROUPED, compareInstitutions } from '@/lib/constants/institutions'
import { cn } from '@/lib/utils'
import { forceScrollableWheel } from '@/lib/utils/force-wheel-scroll'

const PopoverRoot = PopoverPrimitive.Root
const PopoverTrigger = PopoverPrimitive.Trigger
const PopoverContent = PopoverPrimitive.Content
const PopoverPortal = PopoverPrimitive.Portal

interface Account {
  id: string
  name: string
  /** 所属渠道：提供时下拉列表按渠道分组展示 */
  institution?: string
  /** 币种：提供时在选项后显示币种徽章 */
  currency?: string
}

interface SearchableAccountSelectProps {
  value: string | undefined
  onChange: (value: string) => void
  accounts: Account[]
  placeholder?: string
  className?: string
  showAllOption?: boolean // 是否显示"所有账户"选项
  allOptionLabel?: string // "所有账户"选项的标签
}

export function SearchableAccountSelect({
  value,
  onChange,
  accounts,
  placeholder = '选择账户',
  className,
  showAllOption = false,
  allOptionLabel = '所有账户',
}: SearchableAccountSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState('')
  const listRef = React.useRef<HTMLDivElement | null>(null)

  // 获取当前选中的账户名称
  const selectedAccount = accounts.find((acc) => acc.id === value)

  // 显示值：如果没有选中值且显示"所有账户"选项，则显示"所有账户"标签
  const displayValue =
    !value && showAllOption ? allOptionLabel : selectedAccount?.name || placeholder

  // 过滤账户
  const filteredAccounts = React.useMemo(() => {
    let result = accounts
    const query = searchQuery.toLowerCase()

    // 如果有搜索查询，过滤账户
    if (searchQuery) {
      result = accounts.filter((acc) => acc.name.toLowerCase().includes(query))
    }

    // 如果启用"所有账户"选项，添加到结果顶部
    if (showAllOption) {
      const allOption: Account = {
        id: '', // 空字符串表示"所有账户"
        name: allOptionLabel,
      }
      // 如果"所有账户"匹配搜索查询，添加到顶部
      if (!searchQuery || allOptionLabel.toLowerCase().includes(query)) {
        result = [allOption, ...result]
      }
    }

    return result
  }, [accounts, searchQuery, showAllOption, allOptionLabel])

  // 选择账户
  const selectAccount = (accountId: string) => {
    onChange(accountId)
    setOpen(false)
    setSearchQuery('')
  }

  // 清除选择
  const clearSelection = () => {
    onChange('')
    setOpen(false)
    setSearchQuery('')
  }

  return (
    <PopoverRoot open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex h-10 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
            className
          )}
        >
          <span className={cn(!value && 'text-muted-foreground')}>{displayValue}</span>
          <div className="flex items-center gap-2">
            {value && (
              <X
                className="h-4 w-4 opacity-50 hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation()
                  clearSelection()
                }}
              />
            )}
            <ChevronDown className="h-4 w-4 opacity-50" />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverPortal>
        <PopoverContent
          align="start"
          sideOffset={4}
          className={cn(
            'relative z-50 w-[--radix-popover-trigger-width] max-w-md overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 p-0'
          )}
        >
          {/* 搜索框 */}
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="搜索账户..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 flex-1 border-none bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 px-0"
              autoFocus
            />
            {searchQuery && (
              <X
                className="h-4 w-4 text-muted-foreground cursor-pointer hover:opacity-70"
                onClick={() => setSearchQuery('')}
              />
            )}
          </div>

          {/* 账户列表 */}
          <div
            ref={listRef}
            onWheelCapture={(event) => {
              const list = listRef.current
              if (!list) {
                return
              }

              if (forceScrollableWheel(list, event.deltaY, event.deltaX)) {
                // 注意：不调用 event.preventDefault() —— wheel 在 Chrome 中是 passive 事件，
                // 调用 preventDefault 会触发 "Unable to preventDefault inside passive event
                // listener" 警告。forceScrollableWheel 已经手动设置了 scrollTop，无需阻止默认行为。
                event.stopPropagation()
              }
            }}
            className="max-h-[340px] overflow-y-auto [overscroll-behavior:auto] [-webkit-overflow-scrolling:touch]"
          >
            {filteredAccounts.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">未找到匹配的账户</div>
            ) : (
              <>
                <div className="px-3 py-1.5 text-xs text-muted-foreground border-b">
                  找到 {filteredAccounts.length} 个账户
                </div>
                {(() => {
                  const renderOption = (account: Account) => {
                    const isSelected = account.id === value
                    return (
                      <div
                        key={account.id}
                        className="relative flex cursor-default select-none items-center rounded-sm px-3 py-2 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer"
                        onClick={() => selectAccount(account.id)}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={cn(
                              'h-4 w-4 border rounded-sm flex items-center justify-center',
                              isSelected ? 'bg-primary border-primary' : 'border-muted'
                            )}
                          >
                            {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                          </span>
                          {account.name}
                          {account.currency && account.currency !== 'CNY' && (
                            <span className="text-[10px] font-mono px-1 rounded bg-muted border text-muted-foreground">
                              {account.currency}
                            </span>
                          )}
                        </span>
                      </div>
                    )
                  }
                  // 搜索时扁平展示；否则按渠道分组（保留账户数组顺序）
                  if (searchQuery) {
                    return filteredAccounts.map(renderOption)
                  }
                  const hasInstitution = filteredAccounts.some((a) => a.institution?.trim())
                  if (!hasInstitution) {
                    return filteredAccounts.map(renderOption)
                  }
                  const groups = new Map<string, Account[]>()
                  for (const acc of filteredAccounts) {
                    const key = acc.institution?.trim() || UNGROUPED
                    if (!groups.has(key)) groups.set(key, [])
                    groups.get(key)!.push(acc)
                  }
                  return Array.from(groups.entries())
                    .sort(([a], [b]) =>
                      compareInstitutions(
                        a === UNGROUPED ? undefined : a,
                        b === UNGROUPED ? undefined : b
                      )
                    )
                    .map(([group, groupAccounts]) => (
                      <div key={group}>
                        <div className="px-3 pt-2 pb-1 text-xs font-semibold text-muted-foreground bg-muted/40 border-b border-t first:border-t-0">
                          {group}
                        </div>
                        {groupAccounts.map(renderOption)}
                      </div>
                    ))
                })()}
              </>
            )}
          </div>
        </PopoverContent>
      </PopoverPortal>
    </PopoverRoot>
  )
}
