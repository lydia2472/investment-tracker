import { AlertTriangleIcon, ShieldIcon, CheckCircleIcon } from '@/lib/components/icon-adapter'
import { cn } from '@/lib/utils'
import { getRiskLevelLabel } from '@/lib/utils/risk-level-helpers'
import { RiskLevel } from '@/types'

interface RiskLevelBadgeProps {
  level: RiskLevel
  showIcon?: boolean
  className?: string
}

const RISK_LEVEL_ICONS = {
  [RiskLevel.HIGH]: AlertTriangleIcon,
  [RiskLevel.MEDIUM]: ShieldIcon,
  [RiskLevel.LOW]: CheckCircleIcon,
}

const RISK_LEVEL_STYLES = {
  [RiskLevel.HIGH]:
    'bg-[var(--color-loss)]/10 text-[var(--color-loss)] border-[var(--color-loss)]/30',
  [RiskLevel.MEDIUM]:
    'bg-[var(--color-bells)]/10 text-[var(--color-bells)] border-[var(--color-bells)]/30',
  [RiskLevel.LOW]:
    'bg-[var(--color-profit)]/10 text-[var(--color-profit)] border-[var(--color-profit)]/30',
}

export function RiskLevelBadge({ level, showIcon = true, className }: RiskLevelBadgeProps) {
  const Icon = RISK_LEVEL_ICONS[level]

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium border transition-colors duration-200',
        RISK_LEVEL_STYLES[level],
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {getRiskLevelLabel(level)}
    </span>
  )
}
