'use client'

import * as React from 'react'
import { TagBadge } from '@/components/ui/tag-badge'
import { useTagStore } from '@/lib/stores'
import { cn } from '@/lib/utils/cn'
import { PlusIcon, TrashIcon } from '@/lib/components/icon-adapter'

interface TagInputProps {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function TagInput({
  value = [],
  onChange,
  placeholder = '输入标签...',
  disabled = false,
  className,
}: TagInputProps) {
  const [inputValue, setInputValue] = React.useState('')
  const [isOpen, setIsOpen] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  const availableTags = useTagStore((state) => state.availableTags)
  const addTag = useTagStore((state) => state.addTag)

  // Filter suggestions
  const suggestions = React.useMemo(() => {
    const query = inputValue.toLowerCase().trim()
    return availableTags.filter(
      (tag) => !value.includes(tag) &&  // 排除已选标签
              (query === '' || tag.toLowerCase().includes(query))  // 无输入显示全部，有输入则过滤
    )
  }, [inputValue, availableTags, value])

  // 判断是否应该显示"添加新标签"选项
  const showAddNewTagOption = React.useMemo(() => {
    const query = inputValue.toLowerCase().trim()
    const hasInput = query !== ''
    const hasExactMatch = availableTags.some(tag => tag.toLowerCase() === query)
    return hasInput && !hasExactMatch
  }, [inputValue, availableTags])

  // Add tag to selection
  const addTagToSelection = (tag: string) => {
    const trimmed = tag.trim().toLowerCase()
    if (!trimmed || value.includes(trimmed)) return

    // Add to global tags if new
    addTag(trimmed)

    // Update form value
    onChange([...value, trimmed])
    setInputValue('')
    setIsOpen(false)
  }

  // Remove tag from global tag store
  const handleRemoveTag = (tag: string, e: React.MouseEvent) => {
    e.stopPropagation()  // 防止触发添加标签
    const removeTagFromStore = useTagStore.getState().removeTag
    removeTagFromStore(tag)
    // 如果输入框的值正好是被删除的标签，清空输入框
    if (inputValue.toLowerCase().trim() === tag.toLowerCase()) {
      setInputValue('')
    }
  }

  // Remove tag from selection
  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove))
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault()
      addTagToSelection(inputValue)
    } else if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      // Remove last tag when backspacing empty input
      removeTag(value[value.length - 1])
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  // Handle comma input
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (val.includes(',')) {
      const newTag = val.replace(',', '').trim()
      if (newTag) {
        addTagToSelection(newTag)
      }
      setInputValue('')
    } else {
      setInputValue(val)
      setIsOpen(true)
    }
  }

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={cn('relative', className)}>
      {/* Selected tags display */}
      <div
        className={cn(
          'flex flex-wrap gap-2 p-2 min-h-[42px]',
          'border rounded-md',
          'focus-within:ring-2 focus-within:ring-purple-500 focus-within:border-transparent',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onClick={() => {
          if (!disabled) {
            inputRef.current?.focus()
            setIsOpen(true)  // 点击时展开下拉列表
          }
        }}
      >
        {value.map((tag) => (
          <TagBadge
            key={tag}
            tag={tag}
            onRemove={() => !disabled && removeTag(tag)}
            variant="default"
          />
        ))}

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={value.length === 0 ? placeholder : ''}
          disabled={disabled}
          className="flex-1 min-w-[120px] outline-none bg-transparent text-sm"
        />
      </div>

      {/* Autocomplete dropdown */}
      {isOpen && (suggestions.length > 0 || showAddNewTagOption) && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border rounded-md shadow-lg max-h-[200px] overflow-y-auto"
        >
          {suggestions.map((suggestion) => (
            <div
              key={suggestion}
              className="flex items-center justify-between group hover:bg-gray-100 transition-colors"
            >
              <button
                type="button"
                onClick={() => addTagToSelection(suggestion)}
                className="flex-1 text-left px-3 py-2 text-sm"
              >
                {suggestion}
              </button>
              <button
                type="button"
                onClick={(e) => handleRemoveTag(suggestion, e)}
                className="px-3 py-2 text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors"
                title="删除此标签"
              >
                <TrashIcon className="h-3 w-3" />
              </button>
            </div>
          ))}

          {/* 添加新标签选项 */}
          {showAddNewTagOption && (
            <button
              type="button"
              onClick={() => addTagToSelection(inputValue.trim())}
              className="w-full text-left px-3 py-2 text-sm text-purple-600 hover:bg-purple-50 transition-colors border-t"
            >
              <span className="flex items-center gap-2">
                <PlusIcon className="h-3 w-3" />
                添加新标签: {inputValue.trim()}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
