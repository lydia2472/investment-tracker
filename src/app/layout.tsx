import { Cursor } from 'animal-island-ui'

import './globals.css'

import 'animal-island-ui/style'
import { Toaster } from 'sonner'

import { StoreProvider } from '@/components/providers/store-provider'
import { ThemeProvider } from '@/components/providers/theme-provider'

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: '投资账户管理系统',
  description: '个人投资账户追踪与管理',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <Cursor>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <StoreProvider>{children}</StoreProvider>
            <Toaster />
          </ThemeProvider>
        </Cursor>
      </body>
    </html>
  )
}
