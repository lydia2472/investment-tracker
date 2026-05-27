import { RiskLevel } from '@/types'

export const RISK_LEVEL_CONFIG = {
  [RiskLevel.HIGH]: {
    label: '高风险',
    color: '#ff6464',
    description: '高风险投资账户'
  },
  [RiskLevel.MEDIUM]: {
    label: '中风险',
    color: '#d4b030',
    description: '中等风险投资账户'
  },
  [RiskLevel.LOW]: {
    label: '低风险',
    color: '#5ec850',
    description: '低风险投资账户'
  }
} as const

export function getRiskLevelLabel(level: RiskLevel): string {
  return RISK_LEVEL_CONFIG[level].label
}

export function getRiskLevelColor(level: RiskLevel): string {
  return RISK_LEVEL_CONFIG[level].color
}

export function getDefaultRiskLevel(): RiskLevel {
  return RiskLevel.MEDIUM
}
