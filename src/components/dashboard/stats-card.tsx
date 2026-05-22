import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrency } from '@/lib/utils/formatters'
import { cn } from '@/lib/utils/cn'

interface StatsCardProps {
  title: string
  value: number
  icon: LucideIcon
  description?: string
  variant?: 'gold' | 'green' | 'blue' | 'red' | 'pink'
  trend?: {
    value: number
    isPositive: boolean
  }
}

export function StatsCard({ title, value, icon: Icon, description, variant = 'green', trend }: StatsCardProps) {
  const variantStyles = {
    gold: 'from-amber-500 to-yellow-500 shadow-amber-500/30',
    green: 'from-emerald-500 to-green-500 shadow-emerald-500/30',
    blue: 'from-blue-500 to-cyan-500 shadow-blue-500/30',
    red: 'from-red-500 to-rose-500 shadow-red-500/30',
    pink: 'from-pink-500 to-rose-500 shadow-pink-500/30',
  }

  return (
    <Card className="group">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={cn(
          "h-10 w-10 rounded-xl bg-gradient-to-br p-2 shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-3",
          variantStyles[variant]
        )}>
          <Icon className="h-full w-full text-white" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
          {formatCurrency(value)}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-2">
            {description}
          </p>
        )}
        {trend && (
          <div className={cn(
            "flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-xl w-fit",
            trend.isPositive
              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400"
              : "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400"
          )}>
            {trend.isPositive ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            <span className="text-xs font-semibold">
              {trend.isPositive ? '+' : '-'}{formatCurrency(Math.abs(trend.value))}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
