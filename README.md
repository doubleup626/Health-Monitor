# 🏭 深地矿井健康监测系统

一个基于 ZeppOS 智能手表的实时健康监测系统，用于矿井作业工人的生理指标监控和安全预警。

## 📋 项目简介

本系统由两个主要部分组成：

### 1. **health-monitor-web** - Web 监控平台
- 🖥️ **前端**：Vue 3 + Element Plus，深色科技风格 UI
- ⚙️ **后端**：Node.js + SQLite
- 📊 **功能**：实时数据监控、设备管理、员工管理、报警中心、AI 健康分析

### 2. **calories** - ZeppOS 手表应用
- ⌚ **平台**：ZeppOS (Amazfit Active 2)
- 📡 **功能**：自动采集生理数据、实时上传、设备 ID 显示
- ⏱️ **频率**：每 1 分钟自动采集并推送数据

---

## 🚀 快速开始

### **前置要求**

- Node.js 18+ 
- npm 或 yarn
- ZeppOS 开发环境（用于手表应用开发）

### **1. 克隆项目**

```bash
git clone git@github.com:doubleup626/Health-Monitor.git
cd Health-Monitor
```

### **2. 部署 Web 监控平台**

```bash
# 进入后端目录
cd health-monitor-web/server
npm install

# 初始化数据库
npm run init-db

# 启动后端服务
node server.js
```

```bash
# 新开一个终端，进入前端目录
cd health-monitor-web/frontend
npm install

# 启动前端开发服务器
npm run dev
```

访问：http://localhost:8080

### **3. 部署手表应用**

```bash
cd calories

# 安装依赖
npm install

# 使用 Zeus CLI 构建并安装到手表
zeus build
zeus install
```

**配置服务器地址**：

编辑 `calories/app-side/index.js` 第 4 行：
```javascript
const SERVER_URL = "http://YOUR_SERVER_IP:3000/api/health-data";
```

---

## 📱 系统架构

```
┌─────────────────┐
│  ZeppOS 手表    │  ← 每分钟采集数据
│  (Amazfit)      │
└────────┬────────┘
         │ BLE
         ↓
┌─────────────────┐
│  手机 App-Side  │  ← 通过 WiFi 上传
└────────┬────────┘
         │ HTTP
         ↓
┌─────────────────┐
│  后端服务器     │  ← Node.js + SQLite
│  (port 3000)    │
└────────┬────────┘
         │ WebSocket
         ↓
┌─────────────────┐
│  前端 Dashboard │  ← Vue 3 实时监控
│  (port 8080)    │
└─────────────────┘
```

---

## 🎯 核心功能

### **Web 监控平台**

✅ **实时监控面板**
- 工人健康数据实时显示（心率、血氧、压力、体温等）
- 在线/离线状态（2分钟超时判断）
- 数据更新时间显示
- 安全状态预警（正常/警告/危险）

✅ **设备管理**
- 设备 CRUD 操作
- 设备绑定/解绑员工
- 设备状态管理（在线/离线/维护）
- 设备详情（统计数据、健康指数）

✅ **员工管理**
- 员工信息管理
- 员工状态（在职/离职）
- 设备绑定状态
- 工作统计数据

✅ **报警中心**
- 实时报警列表
- 报警级别分类（低/中/高）
- 报警处理记录

✅ **AI 健康分析**
- DeepSeek AI 智能分析
- 风险评估
- 健康建议
- 应急措施指导

### **ZeppOS 手表应用**

✅ **自动数据采集**
- 心率（实时、静息、最大值）
- 血氧饱和度
- 压力指数
- 体温
- 步数、卡路里、距离
- 气压、海拔高度

✅ **自动上传**
- 每 1 分钟自动采集并推送
- 通过 BLE → 手机 → WiFi → 服务器
- 失败自动重试

✅ **设备显示**
- 显示设备 ID
- 绑定状态提示
- 实时数据预览

---

## 🗂️ 项目结构

```
Health-Monitor/
├── health-monitor-web/          # Web 监控平台
│   ├── server/                  # 后端服务
│   │   ├── server.js           # 主服务器
│   │   ├── database.js         # 数据库操作
│   │   ├── database-init.sql   # 数据库初始化
│   │   ├── safety-check.js     # 安全检测逻辑
│   │   └── ai-analysis.js      # AI 分析集成
│   ├── frontend/               # 前端应用
│   │   ├── src/
│   │   │   ├── views/          # 页面组件
│   │   │   ├── stores/         # Pinia 状态管理
│   │   │   ├── router/         # Vue Router
│   │   │   └── App.vue         # 主组件
│   │   └── index.html
│   ├── README.md               # 详细文档
│   ├── QUICK_START.md          # 快速开始指南
│   └── DEPLOYMENT.md           # 部署指南
│
├── calories/                    # ZeppOS 手表应用
│   ├── app-service/            # 后台服务
│   │   └── data-collector.js   # 数据采集器
│   ├── app-side/               # 手机端服务
│   │   └── index.js            # Side Service
│   ├── page/                   # 手表页面
│   │   └── gt/
│   │       └── index.js        # 主页面
│   ├── utils/                  # 工具函数
│   │   ├── sensors.js          # 传感器封装
│   │   ├── storage.js          # 本地存储
│   │   └── config.js           # 配置文件
│   ├── app.json                # 应用配置
│   ├── README.md               # 项目说明
│   └── PROJECT_SUMMARY.md      # 项目总结
│
└── README.md                    # 本文件
```

---

## ⚙️ 配置说明

### **后端配置**

`health-monitor-web/server/server.js`:
```javascript
const PORT = process.env.PORT || 3000;
const HOSTNAME = '0.0.0.0';
```

### **前端配置**

`health-monitor-web/frontend/vite.config.js`:
```javascript
server: {
  port: 8080,
  proxy: {
    '/api': 'http://localhost:3000'
  }
}
```

### **手表应用配置**

`calories/app-side/index.js`:
```javascript
const SERVER_URL = "http://YOUR_SERVER_IP:3000/api/health-data";
```

`calories/app-service/data-collector.js`:
```javascript
const COLLECT_INTERVAL_MINUTES = 1;  // 采集间隔（分钟）
```

---

## 🔧 开发指南

### **后端开发**

```bash
cd health-monitor-web/server
npm install

# 开发模式（自动重启）
npm run dev

# 生产模式
npm start
```

### **前端开发**

```bash
cd health-monitor-web/frontend
npm install

# 开发模式（热更新）
npm run dev

# 构建生产版本
npm run build
```

### **手表应用开发**

```bash
cd calories
npm install

# 构建
zeus build

# 安装到模拟器
zeus preview

# 安装到真机
zeus install
```

---

## 📊 数据库结构

SQLite 数据库包含以下表：

- `workers` - 工人信息
- `devices` - 设备信息
- `health_realtime` - 实时健康数据
- `health_history` - 历史健康数据
- `alerts` - 报警记录
- `ai_analysis` - AI 分析记录
- `operation_logs` - 操作日志

详细结构请查看：`health-monitor-web/server/database-init.sql`

---

## 🎨 技术栈

### **后端**
- Node.js 18+
- SQLite 3
- WebSocket
- DeepSeek AI API

### **前端**
- Vue 3
- Vite
- Element Plus
- Pinia
- Vue Router
- Axios

### **手表应用**
- ZeppOS API 2.0
- ZML (Zepp Mini Language)
- JavaScript ES6+

---

## 📖 文档

- [Web 平台完整文档](./health-monitor-web/README.md)
- [Web 平台快速开始](./health-monitor-web/QUICK_START.md)
- [Web 平台部署指南](./health-monitor-web/DEPLOYMENT.md)
- [手表应用项目说明](./calories/README.md)
- [手表应用项目总结](./calories/PROJECT_SUMMARY.md)
- [手表应用部署指南](./calories/DEPLOYMENT_GUIDE.md)

---

## 🔐 安全说明

### **生产环境部署注意事项**

1. **修改数据库密码**（如果使用 MySQL/PostgreSQL）
2. **启用 HTTPS**（Web 服务器）
3. **配置防火墙**（只开放必要端口）
4. **定期备份数据库**
5. **配置 API 密钥**（DeepSeek AI）

---

## 🐛 常见问题

### **1. 手表无法连接服务器**

- 检查服务器 IP 地址是否正确
- 确保手机和服务器在同一网络
- 检查防火墙是否允许 3000 端口

### **2. 前端显示"离线"但手表在推送数据**

- 清除浏览器缓存（Ctrl+Shift+N 无痕模式）
- 检查后端日志是否收到数据
- 确认时区设置正确（使用本地时间）

### **3. 数据统计显示为空**

- 确保设备已绑定员工
- 等待手表推送数据（1分钟）
- 检查数据库中是否有数据

---

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

## 📝 许可证

MIT License

---

## 👨‍💻 作者

doubleup626

---

## 🙏 致谢

- ZeppOS 开发文档
- Vue.js 社区
- Element Plus 组件库
- DeepSeek AI

---

**⭐ 如果这个项目对你有帮助，请给个 Star！**

