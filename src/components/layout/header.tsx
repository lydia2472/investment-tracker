'use client'
import { ThemeToggle } from './theme-toggle'
import { Button } from 'animal-island-ui'
import { BellIcon, SearchIcon } from '@/lib/components/icon-adapter'
import { Input } from 'animal-island-ui'

export function Header() {
  return (
    <header className="h-16 border-b glass flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4 flex-1">
        {/* Search Bar */}
        <div className="hidden md:flex relative max-w-md flex-1">
          <Input
            type="search"
            placeholder="搜索账户、交易..."
            className="bg-background/50 border-border/50 rounded-xl"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button type="default" size="small" className="relative hover:bg-muted/50">
          <BellIcon className="h-5 w-5" />
          <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
        </Button>
        <ThemeToggle />
      </div>
    </header>
  )
}
