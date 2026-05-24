'use client'
import { ThemeToggle } from './theme-toggle'
import { Button } from 'animal-island-ui'
import { MenuIcon, BellIcon, SearchIcon } from '@/lib/components/icon-adapter'
import { Input } from 'animal-island-ui'

export function Header() {
  return (
    <header className="h-16 border-b glass flex items-center justify-between px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4 flex-1">
        <Button type="default" size="small" className="md:hidden shrink-0 hover:bg-muted/50">
          <MenuIcon className="h-5 w-5" />
        </Button>

        {/* Search Bar */}
        <div className="hidden md:flex relative max-w-md flex-1">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="搜索账户、交易..."
            className="pl-10 bg-background/50 border-border/50 rounded-xl"
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
