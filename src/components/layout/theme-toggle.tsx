'use client'
import { Button } from 'animal-island-ui'
import { useTheme } from 'next-themes'
import * as React from 'react'

import { MoonIcon, SunIcon } from '@/lib/components/icon-adapter'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) return null

  return (
    <Button
      type="default"
      size="small"
      className="hover:bg-muted/50"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
    >
      {theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
    </Button>
  )
}
