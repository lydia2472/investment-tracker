import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // 静态导出配置（用于 Electron 生产模式）
  output: 'export',

  // 图片优化配置（Electron 静态模式不支持 Image 优化）
  images: {
    unoptimized: true,
  },

  // 禁用 X-Powered-By 头
  poweredByHeader: false,

  // 构建输出目录（Electron 需要）
  distDir: '.next',
}

export default nextConfig
