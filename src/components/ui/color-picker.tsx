'use client'

import * as React from 'react'

import { cn } from '@/lib/utils'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  className?: string
}

const presetColors = [
  '#3b82f6', // 蓝色
  '#10b981', // 绿色
  '#f59e0b', // 橙色
  '#ef4444', // 红色
  '#8b5cf6', // 紫色
  '#ec4899', // 粉色
]

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
  return (
    <div className={cn('flex gap-2 flex-wrap', className)}>
      {presetColors.map((color) => (
        <button
          key={color}
          type="button"
          className={cn(
            'w-8 h-8 rounded-full border-2 transition-all hover:scale-105',
            value === color ? 'border-primary scale-110' : 'border-transparent'
          )}
          style={{ backgroundColor: color }}
          onClick={() => onChange(color)}
          aria-label={`选择颜色 ${color}`}
        />
      ))}
      <div className="relative">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'w-8 h-8 rounded-full cursor-pointer border-2 border-transparent',
            'overflow-hidden p-0 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:border-none',
            'hover:scale-105 transition-transform'
          )}
          aria-label="自定义颜色"
        />
        {!presetColors.includes(value) && (
          <div className="absolute inset-0 rounded-full border-2 border-primary pointer-events-none" />
        )}
      </div>
    </div>
  )
}
