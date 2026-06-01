'use client'

import { Footer } from 'animal-island-ui'
import Link from 'next/link'

import { cn } from '@/lib/utils'

interface AppFooterProps {
  className?: string
}

export function AppFooter({ className }: AppFooterProps) {
  const currentYear = new Date().getFullYear()

  return (
    <footer className={cn('w-full', className)} role="contentinfo" aria-label="网站页脚">
      {/* 导航链接区域 */}
      <div
        className="w-full bg-background border-t"
        style={{
          borderColor: 'rgba(159, 146, 125, 0.3)',
          padding: '24px 0',
        }}
      >
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* 左侧: 链接 */}
            <nav
              className="flex flex-wrap justify-center md:justify-start gap-6"
              aria-label="页脚导航"
            >
              <FooterLink href="/help">帮助中心</FooterLink>
              <FooterLink href="/about">关于我们</FooterLink>
              <FooterLink href="/privacy">隐私政策</FooterLink>
              <FooterLink href="/terms">服务条款</FooterLink>
            </nav>

            {/* 右侧: 版权信息 */}
            <p className="text-sm" style={{ color: '#8a7b66' }} aria-label="版权信息">
              © {currentYear} 投资账户管理系统
            </p>
          </div>
        </div>
      </div>

      {/* 装饰性 Footer 组件 */}
      <Footer type="tree" className="w-full" />
    </footer>
  )
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="text-sm font-medium transition-colors hover:text-primary"
      style={{ color: '#725d42' }}
    >
      {children}
    </Link>
  )
}
