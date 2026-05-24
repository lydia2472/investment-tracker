'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  HomeIcon,
  ShellIcon,
  ArrowRightLeftIcon,
  BarChartIcon,
} from '@/lib/components/icon-adapter'
import { ScrollArea } from '@/components/ui/scroll-area'

const navItems = [
  {
    href: '/',
    label: '总览',
    icon: HomeIcon
  },
  {
    href: '/accounts',
    label: '账户',
    icon: ShellIcon
  },
  {
    href: '/transactions',
    label: '交易',
    icon: ArrowRightLeftIcon
  },
  {
    href: '/statistics',
    label: '统计',
    icon: BarChartIcon
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="w-[220px] min-w-[220px] border-r" style={{ backgroundColor: '#f8f8f0' }}>
      {/* Logo Section - Official Specs */}
      <div
        className="px-4 pt-5 pb-3 border-b"
        style={{
          borderBottomColor: '#e8e2d6',
          paddingBottom: '12px',
          paddingTop: '20px',
          paddingLeft: '16px',
          paddingRight: '16px'
        }}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center overflow-hidden" style={{ backgroundColor: '#19c8b9' }}>
            <img
              src="/animal-crossing-icon.jpg"
              alt="Animal Crossing Icon"
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h1
              className="font-[700]"
              style={{
                fontSize: '15px',
                color: '#725d42',
                letterSpacing: '-0.3px'
              }}
            >
              投资管理
            </h1>
            <p className="text-xs" style={{ color: '#8a7b66' }}>智能资产追踪</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 h-[calc(100vh-6.5rem)]">
        <nav style={{ padding: '8px 0' }}>
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className="group flex items-center gap-3 cursor-pointer"
                style={{
                  height: '40px',
                  padding: '0 16px',
                  paddingLeft: '26px',
                  margin: '1px 5px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.15s',
                  color: isActive ? '#fff' : '#8a7b66',
                  backgroundColor: isActive ? '#B7C6E5' : 'transparent'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = '#d6dff0'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }
                }}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* Bottom Info Card */}
        <div
          className="mx-4 mt-6"
          style={{
            padding: '16px',
            borderRadius: '16px',
            backgroundColor: 'rgba(25, 200, 185, 0.1)',
            border: '1px solid rgba(25, 200, 185, 0.2)'
          }}
        >
          <p className="text-xs mb-2" style={{ color: '#8a7b66' }}>需要帮助?</p>
          <p className="text-sm font-[600]" style={{ color: '#725d42' }}>查看使用指南</p>
        </div>
      </ScrollArea>
    </div>
  )
}
