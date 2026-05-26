'use client'

import * as React from 'react'
import { XIcon } from '@/lib/components/icon-adapter'
import { cn } from '@/lib/utils/cn'

interface TagBadgeProps {
  tag: string
  onRemove?: () => void
  variant?: 'default' | 'secondary' | 'outline'
  className?: string
}

export function TagBadge({
  tag,
  onRemove,
  variant = 'default',
  className,
}: TagBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
        'transition-colors duration-200',
        {
          'bg-purple-100 text-purple-800': variant === 'default',
          'bg-gray-100 text-gray-800 border border-gray-300':
            variant === 'secondary',
          'border border-foreground/20': variant === 'outline',
        },
        onRemove && 'pr-1',
        className
      )}
    >
      <span>{tag}</span>
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="rounded-full p-0.5 hover:bg-black/10 transition-colors"
          aria-label={`Remove ${tag} tag`}
        >
          <XIcon className="h-3 w-3" />
        </button>
      )}
    </span>
  )
}
