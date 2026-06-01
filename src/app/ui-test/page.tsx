'use client'

import { Wallet, TrendingUp, TrendingDown, DollarSign, PiggyBank, CreditCard } from 'lucide-react'

import { StatsCard } from '@/components/dashboard/stats-card'

export default function UITestPage() {
  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-2">UI 改进测试页面</h1>
          <p className="text-muted-foreground">这个页面展示了所有应用的 UI/UX 改进</p>
        </div>

        {/* Stats Cards with all variants */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">统计卡片 - 所有颜色变体</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              title="总资产"
              value={125000.5}
              icon={Wallet}
              description="3 个账户"
              variant="green"
            />
            <StatsCard
              title="总收入"
              value={45000.0}
              icon={TrendingUp}
              description="累计收入"
              variant="green"
              trend={{ value: 5000, isPositive: true }}
            />
            <StatsCard
              title="总支出"
              value={32000.0}
              icon={TrendingDown}
              description="累计支出"
              variant="red"
              trend={{ value: 2000, isPositive: false }}
            />
            <StatsCard
              title="净资产"
              value={13000.0}
              icon={DollarSign}
              description="收支差额"
              variant="gold"
            />
          </div>
        </div>

        {/* More color variants */}
        <div>
          <h2 className="text-2xl font-semibold mb-4">更多颜色变体</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <StatsCard title="储蓄账户" value={50000.0} icon={PiggyBank} variant="blue" />
            <StatsCard title="信用卡" value={-2500.0} icon={CreditCard} variant="pink" />
          </div>
        </div>

        {/* Instructions */}
        <div className="p-6 bg-muted/50 rounded-2xl">
          <h3 className="text-lg font-semibold mb-2">检查以下效果：</h3>
          <ul className="list-disc list-inside space-y-2 text-sm">
            <li>✨ 图标应该有彩色渐变背景</li>
            <li>🎨 不同卡片使用不同颜色（绿色、红色、金色、蓝色、粉色）</li>
            <li>💫 鼠标悬停在卡片上时，图标应该放大并旋转</li>
            <li>📈 有趋势指示器的卡片显示绿色（增长）或红色（下降）标签</li>
            <li>🌈 数值使用渐变文字效果</li>
            <li>🎯 卡片应该有圆角和阴影效果</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
