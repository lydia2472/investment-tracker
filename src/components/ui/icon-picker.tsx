'use client'

import * as React from 'react'

import { ACCOUNT_ICONS } from '@/lib/constants/icons'
import { cn } from '@/lib/utils'

interface IconPickerProps {
  value?: string
  onChange: (url: string | undefined) => void
  className?: string
}

export function IconPicker({ value, onChange, className }: IconPickerProps) {
  return (
    <div className={cn('grid grid-cols-5 gap-2', className)}>
      {ACCOUNT_ICONS.map((icon) => (
        <button
          key={icon.id}
          type="button"
          className={cn(
            'relative w-10 h-10 rounded-xl overflow-hidden',
            'border-2 transition-all hover:scale-105',
            'flex items-center justify-center',
            value === icon.emoji
              ? 'border-primary scale-110 ring-2 ring-primary/20'
              : 'border-transparent hover:border-primary/50'
          )}
          onClick={() => onChange(value === icon.emoji ? undefined : icon.emoji)}
          aria-label={`选择图标 ${icon.name}`}
          title={icon.name}
        >
          <span className="text-2xl leading-none" role="img" aria-label={icon.name}>
            {icon.emoji}
          </span>
        </button>
      ))}
    </div>
  )
}
