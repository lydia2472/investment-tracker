import type { Metadata } from 'next'
import { Nunito } from 'next/font/google'
import { Noto_Sans_SC } from 'next/font/google'
import { Zen_Maru_Gothic } from 'next/font/google'
import './globals.css'
import 'animal-island-ui/style'
import { ThemeProvider } from '@/components/providers/theme-provider'
import { StoreProvider } from '@/components/providers/store-provider'
import { Toaster } from 'sonner'
import { Cursor } from 'animal-island-ui'

// 配置主字体 - Nunito (英文/拉丁文)
const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900']
})

// 配置中文字体 - Noto Sans SC
const notoSansSC = Noto_Sans_SC({
  subsets: ['latin'],
  variable: '--font-noto-sans-sc',
  display: 'swap',
  weight: ['400', '500', '700']
})

// 配置日文字体 - Zen Maru Gothic
const zenMaruGothic = Zen_Maru_Gothic({
  subsets: ['latin'],
  variable: '--font-zen-maru-gothic',
  display: 'swap',
  weight: ['400', '500', '700']
})

export const metadata: Metadata = {
  title: '投资账户管理系统',
  description: '个人投资账户追踪与管理',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning className={`${nunito.variable} ${notoSansSC.variable} ${zenMaruGothic.variable}`}>
      <body>
        <Cursor>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <StoreProvider>
              {children}
            </StoreProvider>
            <Toaster />
          </ThemeProvider>
        </Cursor>
      </body>
    </html>
  )
}
