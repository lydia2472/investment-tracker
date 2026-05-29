"use client"

import * as React from "react"
import { Check, ChevronDown, Search, X } from "lucide-react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { cn } from "@/lib/utils"
import { Input } from "animal-island-ui"
import { Button } from "animal-island-ui"

const PopoverRoot = PopoverPrimitive.Root
const PopoverTrigger = PopoverPrimitive.Trigger
const PopoverContent = PopoverPrimitive.Content
const PopoverPortal = PopoverPrimitive.Portal

interface Account {
  id: string
  name: string
}

interface SearchableAccountSelectProps {
  value: string | undefined
  onChange: (value: string) => void
  accounts: Account[]
  placeholder?: string
  className?: string
  showAllOption?: boolean  // 是否显示"所有账户"选项
  allOptionLabel?: string  // "所有账户"选项的标签
}

export function SearchableAccountSelect({
  value,
  onChange,
  accounts,
  placeholder = "选择账户",
  className,
  showAllOption = false,
  allOptionLabel = "所有账户",
}: SearchableAccountSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  // 获取当前选中的账户名称
  const selectedAccount = accounts.find(acc => acc.id === value)

  // 显示值：如果没有选中值且显示"所有账户"选项，则显示"所有账户"标签
  const displayValue = !value && showAllOption ? allOptionLabel : (selectedAccount?.name || placeholder)

  // 过滤账户
  const filteredAccounts = React.useMemo(() => {
    let result = accounts
    const query = searchQuery.toLowerCase()

    // 如果有搜索查询，过滤账户
    if (searchQuery) {
      result = accounts.filter(acc =>
        acc.name.toLowerCase().includes(query)
      )
    }

    // 如果启用"所有账户"选项，添加到结果顶部
    if (showAllOption) {
      const allOption: Account = {
        id: "",  // 空字符串表示"所有账户"
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
    setSearchQuery("")
  }

  // 清除选择
  const clearSelection = () => {
    onChange("")
    setOpen(false)
    setSearchQuery("")
  }

  return (
    <PopoverRoot open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex h-10 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        >
          <span className={cn(!value && "text-muted-foreground")}>
            {displayValue}
          </span>
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
            "relative z-50 w-[--radix-popover-trigger-width] max-w-md max-h-[400px] overflow-y-auto [overscroll-behavior:auto] [-webkit-overflow-scrolling:touch] rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 p-0"
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
                onClick={() => setSearchQuery("")}
              />
            )}
          </div>

          {/* 账户列表 */}
          <div className="max-h-[340px] overflow-y-auto [overscroll-behavior:auto] [-webkit-overflow-scrolling:touch]">
            {filteredAccounts.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                未找到匹配的账户
              </div>
            ) : (
              <>
                <div className="px-3 py-1.5 text-xs text-muted-foreground border-b">
                  找到 {filteredAccounts.length} 个账户
                </div>
                {filteredAccounts.map((account) => {
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
                            "h-4 w-4 border rounded-sm flex items-center justify-center",
                            isSelected ? "bg-primary border-primary" : "border-muted"
                          )}
                        >
                          {isSelected && (
                            <Check className="h-3 w-3 text-primary-foreground" />
                          )}
                        </span>
                        {account.name}
                      </span>
                    </div>
                  )
                })}
              </>
            )}
          </div>
        </PopoverContent>
      </PopoverPortal>
    </PopoverRoot>
  )
}
