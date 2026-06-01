'use client'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getYearsInRange, getMonthsInRange } from '@/lib/utils/date-helpers'

interface MonthSelectorProps {
  year: number
  month: number
  onYearChange: (year: number) => void
  onMonthChange: (month: number) => void
  minYear?: number
  maxYear?: number
  label?: string
}

export function MonthSelector({
  year,
  month,
  onYearChange,
  onMonthChange,
  minYear,
  maxYear,
  label = '选择日期',
}: MonthSelectorProps) {
  const years = getYearsInRange(minYear, maxYear)
  const months = getMonthsInRange()

  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
      <Select value={year.toString()} onValueChange={(y) => onYearChange(parseInt(y))}>
        <SelectTrigger className="w-[100px]">
          <SelectValue placeholder="年份" />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={y.toString()}>
              {y}年
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={month.toString()} onValueChange={(m) => onMonthChange(parseInt(m))}>
        <SelectTrigger className="w-[100px]">
          <SelectValue placeholder="月份" />
        </SelectTrigger>
        <SelectContent>
          {months.map((m) => (
            <SelectItem key={m.value} value={m.value.toString()}>
              {m.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
