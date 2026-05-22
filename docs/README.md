# 投资账户管理系统 - 文档中心

欢迎查阅投资账户管理系统的完整文档。

## 📚 文档目录

### [用户使用指南](USER_GUIDE.md)
**目标读者**: 系统用户

包含以下内容：
- 快速开始教程
- 账户管理操作指南
- 交易记录详细说明
- 统计分析功能介绍
- 常见问题解答 (FAQ)

**适合**: 如果您是第一次使用本系统，或者想了解如何使用特定功能

---

### [系统架构文档](ARCHITECTURE.md)
**目标读者**: 开发者、技术决策者

包含以下内容：
- 系统架构概述
- 技术栈选择理由
- 目录结构说明
- 数据流设计
- 状态管理方案 (Zustand)
- 组件设计模式
- 关键业务逻辑实现

**适合**: 如果您想了解系统如何工作，或者需要进行技术选型决策

---

### [API 文档](API.md)
**目标读者**: 开发者

包含以下内容：
- 数据模型定义 (Account, Transaction)
- Zustand Store API
- 工具函数说明
- 自定义 Hooks
- 枚举类型定义

**适合**: 如果您需要扩展系统功能或进行二次开发

---

### [开发指南](DEVELOPMENT.md)
**目标读者**: 开发者

包含以下内容：
- 开发环境搭建
- 开发工作流程
- 代码规范和最佳实践
- 组件开发指南
- 测试策略
- 部署流程

**适合**: 如果您想参与项目开发或部署自己的实例

---

## 🚀 快速导航

### 我想...

**...了解如何使用系统**
→ 阅读 [用户使用指南](USER_GUIDE.md)

**...了解系统架构**
→ 阅读 [系统架构文档](ARCHITECTURE.md)

**...进行二次开发**
→ 阅读 [API 文档](API.md) 和 [开发指南](DEVELOPMENT.md)

**...部署到生产环境**
→ 阅读 [开发指南 - 部署流程](DEVELOPMENT.md#部署流程)

---

## 🌟 核心功能

### 多账户管理
- 支持证券、银行、现金、其他四种账户类型
- 自定义账户颜色标识
- 实时余额跟踪

### 交易记录
- 收入、支出、转账、快照四种交易类型
- 自动关联账户
- 交易分类管理

### 智能转账
- 一键完成账户间转账
- 自动生成转出和转入两条交易记录
- 自动更新双方账户余额

### 数据统计
- 账户资产分布饼图
- 收支对比柱状图
- 余额趋势折线图

### 本地存储
- 数据持久化保存在浏览器
- 无需服务器，数据完全私有
- 支持导出备份

---

## 🛠️ 技术栈

- **前端框架**: Next.js 14 (App Router) + React 19
- **UI 组件**: shadcn/ui + Tailwind CSS
- **状态管理**: Zustand (with persist middleware)
- **表单验证**: React Hook Form + Zod
- **数据可视化**: Recharts
- **开发语言**: TypeScript

---

## 📦 项目结构

```
investment-tracker/
├── src/
│   ├── app/                  # Next.js App Router 页面
│   │   ├── (dashboard)/     # 仪表盘页面组
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
│   │   ├── utils/          # 工具函数
│   │   └── hooks/          # 自定义 Hooks
│   └── types/              # TypeScript 类型定义
├── docs/                   # 项目文档
└── public/                 # 静态资源
```

详细结构说明请参阅 [系统架构文档 - 目录结构](ARCHITECTURE.md#目录结构)

---

## 🤝 贡献指南

欢迎贡献代码、报告问题或提出改进建议！

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

---

## 📄 许可证

本项目采用 MIT 许可证 - 详见 LICENSE 文件

---

## 📧 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 [Issue](https://github.com/yourusername/investment-tracker/issues)
- 发送邮件至 your.email@example.com

---

**最后更新**: 2026-05-20
