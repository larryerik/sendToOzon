# SendToOzon 发货计划管理系统

一个基于React和Supabase的发货计划管理系统，专门用于Ozon电商平台的发货计划制定和管理。

## 功能特性

- **Ozon产品集成**: 通过Ozon API获取产品信息
- **发货计划创建**: 创建和管理发货计划
- **智能计算**: 基于历史数据和安全库存自动计算推荐发货箱数
- **集群管理**: 支持多个发货集群的配置和管理
- **发货点配置**: 管理不同的发货点信息
- **账户设置**: 配置Ozon API凭据

## 技术栈

- **前端**: React 19, React Router v7, Tailwind CSS
- **构建工具**: Vite 7
- **后端**: Supabase (认证、数据库、Edge Functions)
- **状态管理**: React Context API
- **代码检查**: ESLint

## 核心功能模块

### 1. 发货计划创建
- 通过Ozon API搜索和选择产品
- 选择发货集群
- 系统自动计算推荐发货箱数
- 保存发货计划

### 2. Edge Functions
- `ozon-products`: 获取Ozon产品列表
- `shipping-calculator`: 计算发货计划

### 3. 数据库表结构
- `products`: 存储产品历史数据（库存、日销量等）
- `shipping_plans`: 发货计划主表
- `plan_products`: 计划产品表
- `plan_clusters`: 计划集群表
- `plan_allocations`: 计划分配表

## 安装和运行

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev

# 构建生产版本
pnpm build
```

## 环境变量配置

创建 `.env` 文件并配置以下变量：

```
VITE_SUPABASE_URL=你的Supabase项目URL
VITE_SUPABASE_ANON_KEY=你的Supabase匿名密钥
```

## 数据库设置

运行 `database-schema.sql` 中的SQL脚本创建必要的数据表。

## 测试Edge Functions

```bash
node test-shipping-calculator.js
node test-ozon-function.js
```
