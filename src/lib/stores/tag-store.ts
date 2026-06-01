import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { DEFAULT_TAGS } from '@/lib/constants/tags'

interface TagState {
  availableTags: string[]
  addTag: (tag: string) => void
  removeTag: (tag: string) => void
  hasTag: (tag: string) => boolean
}

export const useTagStore = create<TagState>()(
  persist(
    (set, get) => ({
      // Initialize with default tags
      availableTags: [...DEFAULT_TAGS],

      addTag: (tag: string) => {
        const trimmed = tag.trim().toLowerCase()
        if (!trimmed || get().availableTags.includes(trimmed)) return
        set((state) => ({
          availableTags: [...state.availableTags, trimmed],
        }))
      },

      removeTag: (tag: string) => {
        set((state) => ({
          availableTags: state.availableTags.filter((t) => t !== tag),
        }))
      },

      hasTag: (tag: string) => {
        return get().availableTags.includes(tag)
      },
    }),
    {
      name: 'tag-storage',
      version: 1,
    }
  )
)
