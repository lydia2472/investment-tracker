'use client'

import { Button } from 'animal-island-ui'
import { useState } from 'react'

import { XIcon } from '@/lib/components/icon-adapter'
import { cn } from '@/lib/utils/cn'

interface TagFilterBarProps {
  availableTags: string[]
  value: string[]
  onChange: (tags: string[]) => void
}

export function TagFilterBar({ availableTags, value, onChange }: TagFilterBarProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const toggleTag = (tag: string) => {
    if (value.includes(tag)) {
      onChange(value.filter((t) => t !== tag))
    } else {
      onChange([...value, tag])
    }
  }

  const clearSelection = () => {
    onChange([])
  }

  const handleToggleExpand = () => {
    setIsExpanded(!isExpanded)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          标签筛选
          {value.length > 0 && (
            <span className="ml-2 text-sm text-muted-foreground">(已选 {value.length} 个)</span>
          )}
        </h3>
        <div className="flex gap-2">
          {value.length > 0 && (
            <Button type="default" size="small" onClick={clearSelection}>
              清除
            </Button>
          )}
          <Button type="default" size="small" onClick={handleToggleExpand}>
            {isExpanded ? '收起' : '展开'}
          </Button>
        </div>
      </div>

      {isExpanded && (
        <div className="flex flex-wrap gap-2">
          {availableTags.length === 0 ? (
            <p className="text-sm text-muted-foreground">暂无可用标签</p>
          ) : (
            availableTags.map((tag) => {
              const isSelected = value.includes(tag)
              return (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                    'border',
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-background text-foreground border-border hover:bg-secondary'
                  )}
                >
                  {tag}
                  {isSelected && <span className="ml-2">✓</span>}
                </button>
              )
            })
          )}
        </div>
      )}

      {/* 已选标签展示 */}
      {value.length > 0 && !isExpanded && (
        <div className="flex flex-wrap gap-2">
          {value.map((tag) => (
            <div
              key={tag}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm"
            >
              <span>{tag}</span>
              <button
                onClick={() => toggleTag(tag)}
                className="hover:bg-primary/20 rounded-full p-0.5"
              >
                <XIcon className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
