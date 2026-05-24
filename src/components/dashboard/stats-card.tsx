import { Card } from 'animal-island-ui'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { formatCurrencyCompact } from '@/lib/utils/formatters'
import { cn } from '@/lib/utils/cn'
import { acnhColors, variantToColorKey } from '@/lib/utils/color-mapper'
import { iconClasses, animationClasses } from '@/lib/utils/design-classes'

interface StatsCardProps {
  title: string
  value: number
  icon: React.ComponentType<{ className?: string }>
  description?: string
  variant?: 'gold' | 'green' | 'blue' | 'red' | 'pink'
  trend?: {
    value: number
    isPositive: boolean
  }
}

/**
 * 映射 StatsCard variant 到官方 NookPhone Card color
 *
 * 官方调色板（13 种）：
 * - default: rgb(247,243,223) with #725d42 text
 * - app-pink: #f8a6b2 with white text
 * - purple: #b77dee with white text
 * - app-blue: #889df0 with white text
 * - app-yellow: #f7cd67 with #725d42 text
 * - app-orange: #e59266 with white text
 * - app-teal: #82d5bb with white text
 * - app-green: #8ac68a with white text
 * - app-red: #fc736d with white text
 * - lime-green: #d1da49 with #3d5a1a text
 * - yellow-green: #ecdf52 with #725d42 text
 * - brown: #9a835a with white text
 * - warm-peach-pink: #e18c6f with white text
 */
const mapVariantToCardColor = (variant: string): 'app-yellow' | 'app-green' | 'app-blue' | 'app-red' | 'warm-peach-pink' => {
  const colorMap: Record<string, 'app-yellow' | 'app-green' | 'app-blue' | 'app-red' | 'warm-peach-pink'> = {
    gold: 'app-yellow',          // 铃钱金 → app-yellow
    green: 'app-green',          // 萝卜绿 → app-green
    blue: 'app-blue',            // 天空蓝 → app-blue
    red: 'app-red',              // 烂萝卜红 → app-red
    pink: 'warm-peach-pink',     // 温柔粉 → warm-peach-pink
  }
  return colorMap[variant] || 'app-blue'
}

/**
 * 映射 variant 到官方 NookPhone 背景色（用于图标背景）
 * 使用统一的颜色映射工具
 */
const getVariantBackground = (variant: string): string => {
  const colorKey = variantToColorKey[variant] || variantToColorKey.blue
  const colorHex = acnhColors.nookphone[colorKey]
  return `bg-[${colorHex}]`
}

/**
 * 判断是否需要使用深色文字（用于浅色背景）
 */
const needsDarkText = (cardColor: string): boolean => {
  const lightBackgroundColors = ['app-yellow', 'lime-green', 'yellow-green']
  return lightBackgroundColors.includes(cardColor)
}

export function StatsCard({
  title,
  value,
  icon: Icon,
  description,
  variant = 'green',
  trend
}: StatsCardProps) {
  // 使用官方 NookPhone 颜色映射，移除自定义渐变
  const cardColor = mapVariantToCardColor(variant)
  const iconBg = getVariantBackground(variant)
  const useDarkText = needsDarkText(cardColor)
  const textColor = useDarkText ? '#725d42' : '#fff'

  return (
    <Card
      color={cardColor}
      className="group"
    >
      {/* 标题栏 */}
      <div className="flex flex-row items-center justify-between p-6 pb-2">
        <h3 className="text-sm font-semibold" style={{ color: textColor }}>
          {title}
        </h3>

        {/* 图标背景：使用统一的图标容器类 */}
        <div className={cn(iconClasses.container, iconClasses.hover, iconBg)}>
          <Icon className="h-full w-full text-white" />
        </div>
      </div>

      {/* 内容区 */}
      <div className="p-6 pt-0">
        {/* 金额显示：使用官方字体颜色和字重 */}
        <div
          className="text-3xl font-black"
          style={{
            color: textColor,
            letterSpacing: '0.02em'
          }}
        >
          💰 {formatCurrencyCompact(value)}
        </div>

        {description && (
          <p
            className="text-xs mt-2"
            style={{
              color: useDarkText ? '#725d42' : 'rgba(255,255,255,0.8)',
              fontWeight: 500
            }}
          >
            {description}
          </p>
        )}

        {/* 趋势指示器：使用统一状态色 */}
        {trend && (
          <div
            className={cn(
              "flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-xl w-fit transition-all",
              trend.isPositive
                ? "bg-[var(--animal-success)] text-white"
                : "bg-[var(--animal-error)] text-white"
            )}
            style={{
              boxShadow: trend.isPositive
                ? '0 3px 0 0 var(--animal-success-active)'
                : '0 3px 0 0 var(--animal-error-active)'
            }}
          >
            {trend.isPositive ? (
              <TrendingUp className="h-3.5 w-3.5" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5" />
            )}
            <span className="text-xs font-bold" style={{ letterSpacing: '0.02em' }}>
              {trend.isPositive ? '+' : '-'}💰 {formatCurrencyCompact(Math.abs(trend.value))}
            </span>
          </div>
        )}
      </div>
    </Card>
  )
}
