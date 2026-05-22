'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Wallet,
  ArrowRightLeft,
  BarChart3,
  Sparkles,
} from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

const navItems = [
  {
    href: '/',
    label: '总览',
    icon: LayoutDashboard,
    gradient: 'from-emerald-500 to-green-500'
  },
  {
    href: '/accounts',
    label: '账户',
    icon: Wallet,
    gradient: 'from-emerald-500 to-green-500'
  },
  {
    href: '/transactions',
    label: '交易',
    icon: ArrowRightLeft,
    gradient: 'from-blue-500 to-cyan-500'
  },
  {
    href: '/statistics',
    label: '统计',
    icon: BarChart3,
    gradient: 'from-pink-500 to-rose-500'
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="w-72 border-r glass">
      {/* Logo Section with Gradient */}
      <div className="p-6 border-b bg-gradient-to-r from-emerald-500/10 to-green-500/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-green-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 dark:from-emerald-400 dark:to-green-400 bg-clip-text text-transparent">
              投资管理
            </h1>
            <p className="text-xs text-muted-foreground">智能资产追踪</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 h-[calc(100vh-7rem)]">
        <nav className="p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 cursor-pointer',
                  isActive
                    ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg scale-[1.02]`
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:scale-[1.02]'
                )}
              >
                <Icon className={cn(
                  "h-5 w-5 transition-transform duration-200",
                  isActive && "scale-110",
                  !isActive && "group-hover:scale-110"
                )} />
                <span className="relative">
                  {item.label}
                  {isActive && (
                    <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-white/50 rounded-full" />
                  )}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* Bottom Info Card */}
        <div className="mx-4 mt-6 p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/20">
          <p className="text-xs text-muted-foreground mb-2">需要帮助?</p>
          <p className="text-sm font-medium">查看使用指南</p>
        </div>
      </ScrollArea>
    </div>
  )
}
