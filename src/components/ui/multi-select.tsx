"use client"

import * as React from "react"
import { Check, ChevronDown } from "lucide-react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { cn } from "@/lib/utils"

const MultiSelectRoot = PopoverPrimitive.Root

const MultiSelectTrigger = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <PopoverPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    )}
    {...props}
  >
    {children}
    <ChevronDown className="h-4 w-4 opacity-50" />
  </PopoverPrimitive.Trigger>
))
MultiSelectTrigger.displayName = PopoverPrimitive.Trigger.displayName

const MultiSelectContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = "start", sideOffset = 4, ...props }, ref) => (
  <PopoverPrimitive.Portal>
    <PopoverPrimitive.Content
      ref={ref}
      align={align}
      sideOffset={sideOffset}
      className={cn(
        "relative z-50 max-h-[--radix-select-content-available-height] min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    >
      <div className="p-1">
        {props.children}
      </div>
    </PopoverPrimitive.Content>
  </PopoverPrimitive.Portal>
))
MultiSelectContent.displayName = PopoverPrimitive.Content.displayName

interface MultiSelectProps {
  options: string[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  className?: string
  specialOption?: { value: string; label: string }
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "请选择",
  className,
  specialOption,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const toggleOption = (option: string) => {
    if (value.includes(option)) {
      onChange(value.filter((v) => v !== option))
    } else {
      onChange([...value, option])
    }
  }

  return (
    <MultiSelectRoot open={open} onOpenChange={setOpen}>
      <MultiSelectTrigger className={cn("w-[140px]", className)}>
        <span className={cn(!value.length && "text-muted-foreground")}>
          {value.length > 0 ? `已选${value.length}项` : placeholder}
        </span>
      </MultiSelectTrigger>
      <MultiSelectContent>
        {/* 特殊选项 - 如果存在 */}
        {specialOption && (
          <>
            <div
              className={cn(
                "relative flex w-full cursor-default select-none items-center rounded-sm py-2 pl-2 pr-8 text-sm outline-none cursor-pointer border border-dashed",
                "bg-muted/50 text-muted-foreground",
                value.includes(specialOption.value) && "bg-primary/10 border-primary"
              )}
              onClick={() => toggleOption(specialOption.value)}
            >
              <span className="flex items-center gap-2">
                <span className={cn(
                  "h-4 w-4 border rounded-sm flex items-center justify-center",
                  value.includes(specialOption.value) && "bg-primary border-primary"
                )}>
                  {value.includes(specialOption.value) && (
                    <Check className="h-3 w-3 text-primary-foreground" />
                  )}
                </span>
                <span className="italic">{specialOption.label}</span>
              </span>
            </div>
            {/* 分隔线 */}
            <div className="my-1 border-t border-border" />
          </>
        )}

        {/* 正常选项 */}
        {options.map((option) => (
          <div
            key={option}
            className="relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none hover:bg-accent hover:text-accent-foreground cursor-pointer"
            onClick={() => toggleOption(option)}
          >
            <span className="flex items-center gap-2">
              <span className={cn(
                "h-4 w-4 border rounded-sm flex items-center justify-center",
                value.includes(option) && "bg-primary border-primary"
              )}>
                {value.includes(option) && (
                  <Check className="h-3 w-3 text-primary-foreground" />
                )}
              </span>
              {option}
            </span>
          </div>
        ))}
      </MultiSelectContent>
    </MultiSelectRoot>
  )
}
