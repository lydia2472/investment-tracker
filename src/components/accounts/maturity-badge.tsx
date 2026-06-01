'use client'

import { useState } from 'react'

import { AlertIcon, CalendarIcon, TrendingUpIcon } from '@/lib/components/icon-adapter'
import { cn } from '@/lib/utils/cn'
import { formatCurrency } from '@/lib/utils/formatters'

interface MaturityBadgeProps {
  maturityDate: Date
  principal: number
  interest: number
  totalAmount: number
  className?: string
}

export function MaturityBadge({
  maturityDate,
  principal,
  interest,
  totalAmount,
  className,
}: MaturityBadgeProps) {
  const [showDetails, setShowDetails] = useState(false)

  const daysSinceMaturity = Math.floor(
    (new Date().getTime() - maturityDate.getTime()) / (1000 * 60 * 60 * 24)
  )

  return (
    <div
      className={cn('relative inline-block', className)}
      onMouseEnter={() => setShowDetails(true)}
      onMouseLeave={() => setShowDetails(false)}
    >
      {/* 主徽章 */}
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-semibold shadow-lg shadow-orange-500/30 cursor-help">
        <AlertIcon className="h-3.5 w-3.5" />
        <span>已到期</span>
        {daysSinceMaturity > 0 && (
          <span className="text-white/80 text-[10px]">{daysSinceMaturity}天</span>
        )}
      </div>

      {/* 悬停详情 */}
      {showDetails && (
        <div className="absolute left-0 top-full mt-2 z-50 w-72 bg-popover border border-border rounded-xl shadow-xl p-4 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="space-y-3">
            {/* 标题 */}
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground border-b border-border pb-2">
              <CalendarIcon className="h-4 w-4 text-orange-500" />
              <span>定期存款到期详情</span>
            </div>

            {/* 到期日 */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">到期日</span>
              <span className="font-medium">{maturityDate.toLocaleDateString('zh-CN')}</span>
            </div>

            {/* 本金 */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">本金</span>
              <span className="font-medium">{formatCurrency(principal)}</span>
            </div>

            {/* 利息 */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">利息</span>
              <span className="font-medium text-green-600">+{formatCurrency(interest)}</span>
            </div>

            {/* 总额 */}
            <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
              <span className="font-semibold text-foreground">总计</span>
              <span className="font-bold text-lg text-orange-600">
                {formatCurrency(totalAmount)}
              </span>
            </div>

            {/* 提示 */}
            <div className="pt-2 text-xs text-muted-foreground text-center">
              点击转账按钮处理到期资金
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
