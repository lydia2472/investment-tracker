'use client'

import * as React from 'react'
import { useTagStore } from '@/lib/stores'
import { TagBadge } from '@/components/ui/tag-badge'
import { Button } from 'animal-island-ui'
import { PlusIcon, TrashIcon } from '@/lib/components/icon-adapter'
import { Input } from 'animal-island-ui'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'

export function TagManager() {
  const [open, setOpen] = React.useState(false)
  const [newTag, setNewTag] = React.useState('')
  const [filter, setFilter] = React.useState('')

  const { availableTags, addTag, removeTag } = useTagStore()

  const filteredTags = React.useMemo(() => {
    if (!filter.trim()) return availableTags
    return availableTags.filter((tag) =>
      tag.toLowerCase().includes(filter.toLowerCase())
    )
  }, [availableTags, filter])

  const handleAddTag = () => {
    const trimmed = newTag.trim().toLowerCase()
    if (!trimmed) {
      toast.error('标签不能为空')
      return
    }
    if (availableTags.includes(trimmed)) {
      toast.error('标签已存在')
      return
    }
    addTag(trimmed)
    setNewTag('')
    toast.success('标签添加成功')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button htmlType="button" type="default" className="text-sm">
          <PlusIcon className="h-4 w-4 mr-1" />
          管理标签
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>标签管理</DialogTitle>
          <DialogDescription>
            管理全局预设标签，这些标签将在所有账户的交易中可用
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          {/* Add new tag */}
          <div className="flex gap-2">
            <Input
              placeholder="输入新标签..."
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <Button onClick={handleAddTag} htmlType="button" type="default">
              <PlusIcon className="h-4 w-4" />
            </Button>
          </div>

          {/* Filter tags */}
          <Input
            placeholder="筛选标签..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />

          {/* Tags grid */}
          <div className="flex flex-wrap gap-2">
            {filteredTags.map((tag) => (
              <div key={tag} className="relative group">
                <TagBadge tag={tag} variant="outline" />
                <button
                  onClick={() => removeTag(tag)}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="删除标签"
                >
                  <TrashIcon className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>

          {filteredTags.length === 0 && (
            <p className="text-center text-muted-foreground py-8">
              {filter ? '未找到匹配的标签' : '暂无标签，请添加新标签'}
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
