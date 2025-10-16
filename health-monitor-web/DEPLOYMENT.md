# 🚀 完整部署指南

## 📋 系统概述

**深地矿井工人健康监测系统** 是一个基于 Vue3 + Node.js + SQLite 的实时健康监测平台，具备：

- ✅ 实时健康数据监控
- ✅ AI 安全分析（DeepSeek）
- ✅ WebSocket 实时推送
- ✅ 科技工业风 UI
- ✅ 报警管理系统

---

## ✅ 已完成功能清单

### 后端 (Node.js + Express)

- [x] 数据库设计（SQLite）
  - workers（工人表）
  - devices（设备表）
  - health_realtime（实时数据表）
  - health_history（历史数据表）
  - alerts（报警表）
  - ai_analysis（AI 分析表）

- [x] API 接口（27 个）
  - 健康数据接收
  - 工人管理
  - 设备管理
  - 实时数据查询
  - 历史数据查询
  - 报警管理
  - AI 分析

- [x] 安全检测模块
  - 心率阈值检测
  - 血氧阈值检测
  - 压力阈值检测
  - 深度危险检测
  - 自动报警触发

- [x] AI 分析模块
  - DeepSeek API 集成
  - 多维度安全分析
  - 应急措施建议
  - 救援指导生成

- [x] WebSocket 实时推送
  - 实时数据更新
  - 报警推送
  - 设备状态更新

### 前端 (Vue3 + Element Plus)

- [x] 主监控面板
  - 设备统计卡片
  - 工人实时卡片
  - 安全状态颜色编码
  - AI 分析对话框
  - 自动刷新（5秒）

- [x] 工人详情页
  - 基本信息展示
  - 实时数据面板
  - ECharts 历史趋势图
  - AI 安全分析
  - 数据时间范围选择

- [x] 报警中心
  - 报警统计
  - 筛选和查询
  - 报警详情
  - 报警处理记录

- [x] 全局功能
  - WebSocket 自动重连
  - 桌面通知
  - 响应式布局
  - 科技工业风主题

---

## 🔧 环境要求

- **Node.js**: >= 16.0.0
- **npm**: >= 8.0.0
- **操作系统**: Windows / macOS / Linux
- **浏览器**: Chrome / Edge / Firefox (最新版本)

---

## 📦 安装部署

### 步骤 1：克隆或下载项目

```powershell
cd d:\Zepp_workspace
# 项目已在 health-monitor-web 文件夹中
```

### 步骤 2：安装后端依赖

```powershell
cd d:\Zepp_workspace\health-monitor-web\server
npm install
```

**后端依赖：**
- express
- sqlite3
- body-parser
- cors
- ws (WebSocket)
- axios

### 步骤 3：安装前端依赖

```powershell
cd d:\Zepp_workspace\health-monitor-web\frontend
npm install
```

**前端依赖：**
- vue (3.x)
- vue-router
- pinia
- element-plus
- @element-plus/icons-vue
- echarts
- vite

### 步骤 4：初始化数据库

```powershell
cd d:\Zepp_workspace\health-monitor-web\server
npm run init-db
```

这将：
- 创建 `health_monitor.db` 数据库
- 创建所有表结构
- 插入测试数据（3个工人，3个设备）

---

## 🚀 启动服务

### 方式 1：一键启动（推荐）

```powershell
cd d:\Zepp_workspace\health-monitor-web
powershell -ExecutionPolicy Bypass -File start-all.ps1
```

这个脚本会自动：
1. 检查环境
2. 安装依赖
3. 初始化数据库
4. 启动后端（3000端口）
5. 启动前端（8080端口）

### 方式 2：分别启动

**启动后端：**
```powershell
cd d:\Zepp_workspace\health-monitor-web\server
npm start
```

**启动前端（新终端）：**
```powershell
cd d:\Zepp_workspace\health-monitor-web\frontend
npm run dev
```

---

## 🌐 访问地址

启动成功后：

- **前端界面**: http://localhost:8080
- **后端 API**: http://localhost:3000
- **WebSocket**: ws://localhost:3000

---

## 🧪 功能测试

### 1. 测试后端 API

```powershell
# 测试连通性
Invoke-WebRequest http://localhost:3000/ping

# 获取工人列表
Invoke-WebRequest http://localhost:3000/api/workers

# 获取设备统计
Invoke-WebRequest http://localhost:3000/api/devices/stats

# 获取实时数据
Invoke-WebRequest http://localhost:3000/api/realtime/all
```

### 2. 测试前端页面

访问 http://localhost:8080，应该看到：

✅ **主监控面板**
- 顶部 4 个统计卡片
- 工人实时监控卡片
- WebSocket 连接状态（绿色 = 成功）

✅ **工人详情**
- 点击任意工人卡片 → 跳转详情页
- 查看历史趋势图表
- 点击"AI 分析"按钮

✅ **报警中心**
- 左侧菜单 → 报警中心
- 查看报警列表
- 测试筛选功能

### 3. 测试手表数据推送

从手表端推送数据：
```javascript
// 手表自动每 5 分钟推送
// 或点击"手动采集"按钮
```

观察：
- ✅ 后端终端显示"收到健康数据"
- ✅ 前端页面自动更新（WebSocket）
- ✅ 数据库已保存

### 4. 测试 AI 分析

1. 在主监控面板点击任意工人的"AI分析"
2. 等待 1-3 秒
3. 查看分析结果：
   - 风险等级
   - 风险分析
   - 健康状况
   - 安全建议

---

## 📊 数据流程图

```
┌─────────────┐
│  手表端     │ (ZeppOS App)
│  数据采集   │
└──────┬──────┘
       │ 每5分钟自动推送
       ↓
┌─────────────┐
│  手机端     │ (Side Service)
│  数据转发   │
└──────┬──────┘
       │ HTTP POST
       ↓
┌─────────────────────────────┐
│  后端服务器 (Node.js)        │
│  ┌─────────────────────┐    │
│  │ 1. 接收数据         │    │
│  │ 2. 安全检测         │    │
│  │ 3. 保存数据库       │    │
│  │ 4. WebSocket 推送   │    │
│  └─────────────────────┘    │
└──────┬──────────────────────┘
       │ WebSocket
       ↓
┌─────────────────────────────┐
│  前端页面 (Vue3)             │
│  ┌─────────────────────┐    │
│  │ 1. 实时显示         │    │
│  │ 2. 图表可视化       │    │
│  │ 3. 报警提示         │    │
│  │ 4. AI 分析          │    │
│  └─────────────────────┘    │
└─────────────────────────────┘
```

---

## 🔑 配置说明

### 后端配置

**服务器端口** (`server/server.js`)
```javascript
const PORT = process.env.PORT || 3000;
```

**DeepSeek API Key** (`server/ai-analysis.js`)
```javascript
const DEEPSEEK_API_KEY = 'sk-886bedda24214b5190ba5add0ba4029e';
```

**安全阈值** (`server/safety-check.js`)
```javascript
const SAFETY_THRESHOLDS = {
  heartRate: { min: 50, max: 120, danger: 140 },
  bloodOxygen: { min: 90, danger: 85 },
  stress: { max: 80, danger: 90 },
  altitude: { danger: -500 } // 深度超过 500m
};
```

### 前端配置

**开发服务器端口** (`frontend/vite.config.js`)
```javascript
export default defineConfig({
  server: {
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  }
});
```

---

## 🏗️ 生产部署

### 构建前端

```powershell
cd d:\Zepp_workspace\health-monitor-web\frontend
npm run build
```

生成的文件在 `frontend/dist/` 目录。

### 部署到生产服务器

1. **上传文件：**
   - 上传 `server/` 目录
   - 上传 `frontend/dist/` 目录

2. **安装依赖：**
   ```bash
   cd server
   npm install --production
   ```

3. **配置环境变量：**
   ```bash
   export PORT=3000
   export NODE_ENV=production
   export DEEPSEEK_API_KEY=your-api-key
   ```

4. **启动服务：**
   ```bash
   # 使用 PM2 (推荐)
   npm install -g pm2
   pm2 start server.js --name health-monitor
   
   # 或使用 systemd
   sudo systemctl start health-monitor
   ```

5. **配置 Nginx 反向代理：**
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;
       
       # 前端静态文件
       location / {
           root /path/to/frontend/dist;
           try_files $uri $uri/ /index.html;
       }
       
       # API 代理
       location /api {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
       }
       
       # WebSocket 代理
       location /ws {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "Upgrade";
       }
   }
   ```

---

## 🔒 安全建议

1. **API Key 保护：**
   - 使用环境变量存储 DeepSeek API Key
   - 不要提交到 Git

2. **数据库备份：**
   ```powershell
   # 定期备份数据库
   Copy-Item server/health_monitor.db server/backups/health_monitor_$(Get-Date -Format 'yyyyMMdd').db
   ```

3. **HTTPS 配置：**
   - 生产环境必须使用 HTTPS
   - 配置 SSL 证书

4. **访问控制：**
   - 添加用户认证
   - 实现权限管理

---

## 📈 性能优化

1. **前端优化：**
   - 使用懒加载路由
   - 图片压缩
   - 代码分割

2. **后端优化：**
   - 添加 Redis 缓存
   - 数据库索引优化
   - API 响应压缩

3. **WebSocket 优化：**
   - 心跳检测
   - 消息队列
   - 负载均衡

---

## 🐛 常见问题

### Q1: 端口被占用？

```powershell
# 查找占用 3000 端口的进程
netstat -ano | findstr :3000

# 结束进程
taskkill /PID <PID> /F
```

### Q2: 数据库初始化失败？

```powershell
# 删除旧数据库
Remove-Item server/health_monitor.db

# 重新初始化
cd server
npm run init-db
```

### Q3: WebSocket 连接失败？

检查：
- 后端服务器是否运行
- 防火墙是否开放 3000 端口
- 浏览器是否支持 WebSocket

### Q4: AI 分析请求超时？

可能原因：
- 网络问题
- DeepSeek API 限流
- API Key 过期

解决：
- 检查网络连接
- 查看 API Key 余额
- 增加请求超时时间

---

## 📞 技术支持

- **项目文档**: `README.md`
- **快速开始**: `QUICK_START.md`
- **前端说明**: `前端使用说明.md`
- **测试指南**: `如何测试.md`

---

## 🎉 部署完成！

**现在你已经拥有一个完整的深地矿井健康监测系统！**

访问地址：
- 开发环境: http://localhost:8080
- 生产环境: https://your-domain.com

✨ 享受科技工业风的实时监控体验！


