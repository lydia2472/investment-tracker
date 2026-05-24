'use client'

import { cn } from '@/lib/utils/cn'
import { Card } from 'animal-island-ui'
import { useState } from 'react'

// Type definitions for adapter components
export interface BadgeProps {
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'profit' | 'loss' | 'bells'
}

export interface AvatarProps {
  children?: React.ReactNode
  className?: string
  fallback?: string
}

export interface ScrollAreaProps {
  children: React.ReactNode
  className?: string
}

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string
}

export interface SkeletonProps {
  className?: string
}

export interface DropdownMenuItem {
  label: string
  onClick: () => void
}

export interface DropdownMenuProps {
  trigger: React.ReactNode
  items: DropdownMenuItem[]
}

export interface TableColumn {
  key: string
  title: string
  render: (value: any) => React.ReactNode
}

export interface TableProps {
  data: any[]
  columns: TableColumn[]
  columnWidths?: string
}

// Badge 适配器 - 语义化状态标签
export function Badge({ children, className, variant = 'default' }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold",
        variant === 'profit' && "bg-[#5ec850]/20 text-[#5ec850]",
        variant === 'loss' && "bg-[#ff6464]/20 text-[#ff6464]",
        variant === 'bells' && "bg-[#d4b030]/20 text-[#d4b030]",
        variant === 'default' && "bg-muted text-foreground",
        className
      )}
    >
      {children}
    </span>
  )
}

// Avatar 适配器 - 用户头像
export function Avatar({ children, className, fallback }: AvatarProps) {
  return (
    <div
      className={cn(
        "h-10 w-10 rounded-full flex items-center justify-center bg-gradient-to-br from-muted to-muted/50 font-semibold text-sm",
        className
      )}
    >
      {children || fallback}
    </div>
  )
}

// ScrollArea 适配器 - 滚动区域
export function ScrollArea({ children, className }: ScrollAreaProps) {
  return (
    <div className={cn("overflow-auto", className)}>
      {children}
    </div>
  )
}

// Textarea 适配器 - 多行文本输入
export function Textarea({ className, ...props }: TextareaProps) {
  return (
    <textarea
      className={cn(
        "w-full px-4 py-3 rounded-3xl border-2 border-[#d4c9b4]",
        "focus:outline-none focus:border-[#ffcc00]",
        "bg-[#f8f8f0] text-[#794f27]",
        "resize-none",
        className
      )}
      {...props}
    />
  )
}

// Skeleton 适配器 - 加载占位符
export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse bg-gradient-to-r from-muted via-muted/50 to-muted bg-[length:200%_100%]",
        className
      )}
    />
  )
}

// DropdownMenu 适配器 - 下拉菜单
export function DropdownMenu({ trigger, items }: DropdownMenuProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="relative">
      <div onClick={() => setOpen(!open)} className="cursor-pointer">
        {trigger}
      </div>
      {open && (
        <Card className="absolute z-50 min-w-[200px] py-2">
          {items.map((item, i) => (
            <button
              key={i}
              onClick={() => { item.onClick(); setOpen(false) }}
              className="w-full px-4 py-2 text-left hover:bg-muted/50 transition-colors"
            >
              {item.label}
            </button>
          ))}
        </Card>
      )}
    </div>
  )
}

// Table 适配器（Card 网格）- 数据表格
export function DataTable({ data, columns, columnWidths = 'repeat(auto-fit, minmax(200px, 1fr))' }: TableProps) {
  return (
    <Card>
      {data.map((row, i) => (
        <div key={i} className="p-4 border-b last:border-b-0">
          <div className="grid gap-2" style={{ gridTemplateColumns: columnWidths }}>
            {columns.map(col => (
              <div key={col.key}>
                <span className="text-xs text-muted-foreground">{col.title}</span>
                <div className="font-medium">{col.render(row[col.key])}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </Card>
  )
}
