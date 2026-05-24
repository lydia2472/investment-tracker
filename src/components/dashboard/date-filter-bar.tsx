'use client'

import { useState, useMemo } from 'react'
import { Button } from 'animal-island-ui'
import { MonthSelector } from './month-selector'
import { startOfMonth, endOfMonth, subMonths } from 'date-fns'

export interface DateRange {
  startDate?: Date
  endDate?: Date
}

interface DateFilterBarProps {
  value: DateRange | undefined
  onChange: (range: DateRange | undefined) => void
}

export function DateFilterBar({ value, onChange }: DateFilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  // 自定义日期范围状态
  const [startYear, setStartYear] = useState(new Date().getFullYear())
  const [startMonth, setStartMonth] = useState(new Date().getMonth() + 1)
  const [endYear, setEndYear] = useState(new Date().getFullYear())
  const [endMonth, setEndMonth] = useState(new Date().getMonth() + 1)

  // 判断当前选中的预设
  const activePreset = useMemo(() => {
    if (!value) return 'all'

    const now = new Date()
    const currentMonthStart = startOfMonth(now)
    const currentMonthEnd = endOfMonth(now)

    // 本月
    if (value.startDate?.getTime() === currentMonthStart.getTime() &&
        value.endDate?.getTime() === currentMonthEnd.getTime()) {
      return 'current'
    }

    // 最近3个月
    const threeMonthsAgo = startOfMonth(subMonths(now, 2))
    if (value.startDate?.getTime() === threeMonthsAgo.getTime() &&
        value.endDate?.getTime() === currentMonthEnd.getTime()) {
      return '3months'
    }

    // 最近6个月
    const sixMonthsAgo = startOfMonth(subMonths(now, 5))
    if (value.startDate?.getTime() === sixMonthsAgo.getTime() &&
        value.endDate?.getTime() === currentMonthEnd.getTime()) {
      return '6months'
    }

    // 最近1年
    const oneYearAgo = startOfMonth(subMonths(now, 11))
    if (value.startDate?.getTime() === oneYearAgo.getTime() &&
        value.endDate?.getTime() === currentMonthEnd.getTime()) {
      return '12months'
    }

    return 'custom'
  }, [value])

  // 预设按钮配置
  const presets = [
    { label: '全部', value: undefined, key: 'all' },
    { label: '本月', value: getCurrentMonthRange(), key: 'current' },
    { label: '最近3个月', value: getLastNMonthsRange(3), key: '3months' },
    { label: '最近6个月', value: getLastNMonthsRange(6), key: '6months' },
    { label: '最近1年', value: getLastNMonthsRange(12), key: '12months' },
  ]

  // 应用自定义日期范围
  const applyCustomRange = () => {
    const startDate = startOfMonth(new Date(startYear, startMonth - 1))
    const endDate = endOfMonth(new Date(endYear, endMonth - 1))

    if (endDate < startDate) {
      alert('结束日期不能早于开始日期')
      return
    }

    onChange({ startDate, endDate })
    setIsExpanded(false)
  }

  return (
    <div className="space-y-4">
      {/* 预设按钮 */}
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-muted-foreground">日期范围:</span>
        {presets.map((preset) => (
          <Button
            key={preset.key}
            type={activePreset === preset.key ? 'primary' : 'default'}
            size="small"
            className={activePreset === preset.key ? 'bg-[#5ec850]' : 'border-2 border-[#5ec850]/50'}
            onClick={() => onChange(preset.value)}
          >
            {preset.label}
          </Button>
        ))}
        <Button
          type="default"
          size="small"
          className="hover:bg-muted/50"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? '收起' : '自定义'}
        </Button>
      </div>

      {/* 自定义日期范围选择器 */}
      {isExpanded && (
        <div className="flex flex-wrap items-center gap-4 rounded-lg border border-[#5ec850]/20 bg-muted/20 p-4">
          <MonthSelector
            label="起始"
            year={startYear}
            month={startMonth}
            onYearChange={setStartYear}
            onMonthChange={setStartMonth}
          />
          <span className="text-muted-foreground">至</span>
          <MonthSelector
            label="结束"
            year={endYear}
            month={endMonth}
            onYearChange={setEndYear}
            onMonthChange={setEndMonth}
          />
          <Button size="small" type="primary" className="bg-[#5ec850]" onClick={applyCustomRange}>
            应用
          </Button>
        </div>
      )}
    </div>
  )
}

// 辅助函数：获取本月范围
function getCurrentMonthRange(): DateRange {
  const now = new Date()
  return {
    startDate: startOfMonth(now),
    endDate: endOfMonth(now),
  }
}

// 辅助函数：获取最近N个月范围
function getLastNMonthsRange(months: number): DateRange {
  const now = new Date()
  return {
    startDate: startOfMonth(subMonths(now, months - 1)),
    endDate: endOfMonth(now),
  }
}
