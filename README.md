# 投资账户管理系统 / Investment Account Management System

一个功能完整的个人投资账户追踪与管理工具 / A comprehensive personal investment account tracking and management tool.

## ✨ 核心功能 / Core Features

- **多账户管理** - 支持证券、银行、现金、其他四种账户类型
- **交易记录** - 收入、支出、转账、快照四种交易类型
- **智能转账** - 自动生成双交易记录，一键完成账户间转账
- **数据统计** - 账户资产分布、收支分析、余额趋势可视化图表
- **本地存储** - 数据保存在浏览器 localStorage，无需服务器，完全私有
- **响应式设计** - 支持桌面、平板、手机等多种设备
- **深色模式** - 支持明亮/深色主题切换

## 🚀 快速开始 / Quick Start

### 环境要求 / Prerequisites

- Node.js 18+
- npm 或 yarn 或 pnpm

### 安装 / Installation

```bash
# 克隆项目 / Clone the repository
git clone https://github.com/yourusername/investment-tracker.git

# 进入项目目录 / Enter the project directory
cd investment-tracker

# 安装依赖 / Install dependencies
npm install
```

### 开发模式 / Development Mode

```bash
# 启动开发服务器 / Start development server
npm run dev

# 打开浏览器访问 / Open browser and visit
http://localhost:3000
```

### 生产构建 / Production Build

```bash
# 构建生产版本 / Build for production
npm run build

# 启动生产服务器 / Start production server
npm start
```

## 📚 文档 / Documentation

完整文档请查阅 `/docs` 目录：

- **[用户使用指南](docs/USER_GUIDE.md)** - 系统功能介绍、操作步骤、常见问题
- **[系统架构文档](docs/ARCHITECTURE.md)** - 技术架构、数据流设计、状态管理
- **[API 文档](docs/API.md)** - 数据模型、Store API、工具函数
- **[开发指南](docs/DEVELOPMENT.md)** - 环境搭建、开发流程、代码规范

## 🛠️ 技术栈 / Tech Stack

- **前端框架**: Next.js 14 (App Router) + React 19
- **UI 组件**: shadcn/ui + Tailwind CSS
- **状态管理**: Zustand (with persist middleware)
- **表单验证**: React Hook Form + Zod
- **数据可视化**: Recharts
- **开发语言**: TypeScript
- **主题管理**: next-themes
- **图标库**: lucide-react

## 📦 项目结构 / Project Structure

```
investment-tracker/
├── src/
│   ├── app/                  # Next.js App Router 页面
│   │   ├── (dashboard)/     # 仪表盘页面组
│   │   │   ├── page.tsx     # 仪表盘首页
│   │   │   ├── accounts/    # 账户管理
│   │   │   ├── transactions/# 交易记录
│   │   │   └── statistics/  # 统计分析
│   │   └── layout.tsx       # 根布局
│   ├── components/          # React 组件
│   │   ├── ui/             # shadcn/ui 基础组件
│   │   ├── accounts/       # 账户相关组件
│   │   ├── transactions/   # 交易相关组件
│   │   ├── charts/         # 图表组件
│   │   ├── dashboard/      # 仪表盘组件
│   │   ├── layout/         # 布局组件
│   │   └── providers/      # Context 提供者
│   ├── lib/                # 工具库
│   │   ├── stores/         # Zustand 状态管理
│   │   │   ├── account-store.ts
│   │   │   └── transaction-store.ts
│   │   ├── utils/          # 工具函数
│   │   └── hooks/          # 自定义 Hooks
│   └── types/              # TypeScript 类型定义
├── docs/                   # 项目文档
├── public/                 # 静态资源
└── package.json
```

## 🌟 功能特性 / Features

### 账户管理 / Account Management

- 支持四种账户类型：证券、银行、现金、其他
- 自定义账户颜色标识
- 实时余额跟踪和更新
- 多币种支持（CNY、USD、EUR、HKD）

### 交易记录 / Transaction Recording

- **收入交易**: 存款、转入、投资收益
- **支出交易**: 取款、转出、投资亏损
- **转账功能**: 自动在两个账户间生成转入和转出记录
- **快照功能**: 记录特定时间点的账户余额

### 数据统计 / Data Statistics

- **账户分布**: 饼图展示各账户资产占比
- **收支分析**: 柱状图对比总收入和总支出
- **余额趋势**: 折线图展示资产变化趋势

### 数据持久化 / Data Persistence

- 所有数据保存在浏览器 localStorage
- 无需服务器，数据完全私有
- 支持导出备份
- 刷新页面数据不丢失

## 🤝 贡献指南 / Contributing

欢迎贡献代码、报告问题或提出改进建议！

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证 / License

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 📧 联系方式 / Contact

如有问题或建议，请通过以下方式联系：

- 提交 [Issue](https://github.com/yourusername/investment-tracker/issues)
- 发送邮件至 your.email@example.com

---

**最后更新**: 2026-05-20 / **Last Updated**: 2026-05-20
