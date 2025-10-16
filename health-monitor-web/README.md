# 🏭 深地矿井工人健康监测系统

**科技工业风格 | Vue 3 + SQLite + DeepSeek AI**

---

## 📋 系统概述

深地矿井工人健康监测系统是一套完整的实时健康数据采集、分析和预警系统。通过智能手表采集工人的生理数据和环境数据，实时传输到 Web 端进行监控，并使用 AI 进行安全分析。

### 核心功能

1. **实时数据监控**
   - 心率、血氧、压力、体温等生理指标
   - 气压、海拔（深度）等环境数据
   - 步数、卡路里等活动数据

2. **智能安全预警**
   - 多级阈值检测（正常/警告/危险）
   - 自动报警和通知
   - 历史数据趋势分析

3. **AI 安全分析**
   - DeepSeek AI 深度分析
   - 风险评估和健康状况判断
   - 安全建议和应急措施
   - 救援指导

4. **设备管理**
   - 在线/离线设备统计
   - 工人设备绑定
   - 实时状态更新

---

## 🚀 快速开始

### 1. 安装依赖

#### 后端

```bash
cd health-monitor-web/server
npm install
```

#### 前端

```bash
cd health-monitor-web/frontend
npm install
```

---

### 2. 初始化数据库

```bash
cd health-monitor-web/server
npm run init-db
```

**数据库文件位置**：`server/health_monitor.db`

**测试数据已自动导入**：
- 3 个测试工人（W001-张三, W002-李四, W003-王五）
- 3 个测试设备（10092800, 10092801, 10092802）

---

### 3. 启动后端服务器

```bash
cd health-monitor-web/server
npm start
```

**服务器地址**：
- HTTP: `http://localhost:3000`
- WebSocket: `ws://localhost:3000`

**API 文档**：访问 `http://localhost:3000` 查看所有接口

---

### 4. 启动前端开发服务器

```bash
cd health-monitor-web/frontend
npm run dev
```

**前端地址**：`http://localhost:8080`

---

## 📡 API 接口文档

### 数据接收（原有接口，保持兼容）

```
POST /api/health-data
```

**请求体**（与手表端兼容）：
```json
{
  "type": "batch",
  "count": 1,
  "worker_id": "W001",  // 可选，新增字段
  "data": [{
    "timestamp": 1759901899000,
    "deviceId": 10092800,
    "heartRate": { "current": 88, "last": 88, "resting": 55 },
    "bloodOxygen": { "value": 95 },
    "stress": { "value": 32 },
    // ...
  }]
}
```

### 工人管理

```
GET    /api/workers              # 获取所有工人
GET    /api/workers/:workerId    # 获取单个工人
POST   /api/workers              # 创建工人
PUT    /api/workers/:workerId    # 更新工人
```

### 设备管理

```
GET    /api/devices              # 获取所有设备
GET    /api/devices/stats        # 获取设备统计
```

### 实时数据

```
GET    /api/realtime/all         # 所有工人实时数据
GET    /api/realtime/:workerId   # 单个工人实时数据
```

### 历史数据

```
GET    /api/history/:workerId?start=timestamp&end=timestamp&limit=100
```

### 报警管理

```
GET    /api/alerts/pending                 # 未处理报警
GET    /api/alerts?worker_id=W001&level=3  # 所有报警
POST   /api/alerts/:alertId/handle         # 处理报警
```

### AI 分析

```
POST   /api/ai/analyze/:workerId  # 请求 AI 分析
GET    /api/ai/history/:workerId  # 获取分析历史
```

---

## 🤖 AI 分析功能

### DeepSeek API 配置

**API Key**：`sk-886bedda24214b5190ba5add0ba4029e`  
**模型**：`deepseek-chat`  
**配置文件**：`server/ai-analysis.js`

### AI 提示词特点

1. **包含完整工人信息**
   - 姓名、工号、年龄、岗位等

2. **包含当前生理数据**
   - 心率、血氧、压力、体温等

3. **包含历史数据趋势**
   - 最近 1 小时的数据变化
   - 表格形式展示趋势

4. **包含异常指标**
   - 安全阈值检测结果
   - 报警信息

### AI 返回结果

```json
{
  "risk_level": "低风险|中风险|高风险|紧急危险",
  "risk_analysis": "综合风险分析...",
  "health_status": "健康状况描述...",
  "safety_advice": "安全建议...",
  "emergency_measures": "应急措施...",
  "rescue_guidance": "救援指导..."
}
```

---

## ⚠️ 安全阈值配置

**配置文件**：`server/safety-check.js`

### 心率阈值

```javascript
{
  min: 50,          // 最低心率
  max: 120,         // 最高心率
  warning: 110,     // 警告心率
  danger: 140       // 危险心率
}
```

### 血氧阈值

```javascript
{
  min: 90,          // 最低血氧
  warning: 92,      // 警告血氧
  danger: 85        // 危险血氧
}
```

### 压力阈值

```javascript
{
  max: 80,          // 最高压力
  warning: 70,      // 警告压力
  danger: 90        // 危险压力
}
```

### 深度阈值

```javascript
{
  warning: -500,    // 警告深度（米）
  danger: -1000     // 危险深度（米）
}
```

---

## 🔄 实时数据更新机制

### WebSocket 连接

```javascript
const ws = new WebSocket('ws://localhost:3000');

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  
  if (message.type === 'realtime_update') {
    // 更新前端数据
    updateWorkerData(message.worker_id, message.data);
  }
};
```

### 自动推送时机

1. ✅ 收到手表数据后立即推送
2. ✅ 检测到安全阈值超限时推送
3. ✅ 设备状态变化时推送

---

## 🎨 前端界面设计（科技工业风格）

### 配色方案

```css
/* 主色调 */
--bg-primary: #0a0e1a;     /* 深色背景 */
--bg-secondary: #1a2332;   /* 次级背景 */
--accent-primary: #00ff88; /* 主要强调色（荧光绿） */
--accent-danger: #ff3366;  /* 危险色（红） */
--accent-warning: #ffaa00; /* 警告色（黄） */
--text-primary: #e0e0e0;   /* 主文本 */
--text-secondary: #88ccff; /* 次级文本 */
```

### 界面元素

1. **Neon 发光效果**
   ```css
   text-shadow: 0 0 10px #00ff88;
   box-shadow: 0 0 15px rgba(0, 255, 136, 0.5);
   ```

2. **网格背景**
   ```css
   background-image: linear-gradient(#1a2332 1px, transparent 1px),
                     linear-gradient(90deg, #1a2332 1px, transparent 1px);
   background-size: 20px 20px;
   ```

3. **玻璃态效果**
   ```css
   background: rgba(26, 35, 50, 0.8);
   backdrop-filter: blur(10px);
   border: 1px solid rgba(0, 255, 136, 0.2);
   ```

---

## 📊 数据库表结构

### workers（工人信息）
- worker_id（工号）
- name（姓名）
- age, gender, position, team
- emergency_contact（紧急联系人）

### devices（设备信息）
- device_id（设备ID）
- worker_id（关联工人）
- is_active（是否激活）
- last_seen（最后在线时间）

### health_realtime（实时数据）
- worker_id, device_id
- 所有生理指标
- 安全状态（is_safe, alert_level, alert_message）

### health_history（历史数据）
- 完整 JSON 数据
- 关键指标索引

### alerts（报警记录）
- alert_type, alert_level, alert_message
- is_handled（是否已处理）

### ai_analysis（AI 分析记录）
- 请求数据、提示词、历史数据
- 分析结果（风险等级、建议等）

---

## 🔧 配置和扩展

### 修改服务器端口

```bash
# 修改 server/server.js
const PORT = process.env.PORT || 3000;
```

### 修改 AI 模型

```javascript
// server/ai-analysis.js
const AI_CONFIG = {
  apiKey: 'your-api-key',
  endpoint: 'https://api.deepseek.com/v1/chat/completions',
  model: 'deepseek-chat'  // 或其他模型
};
```

### 自定义安全阈值

```javascript
// server/safety-check.js
const SAFETY_THRESHOLDS = {
  heartRate: { min: 50, max: 120, ... },
  bloodOxygen: { min: 90, ... },
  // 修改阈值
};
```

---

## 🧪 测试步骤

### 1. 后端测试

```bash
# 启动服务器
cd health-monitor-web/server
npm start

# 测试 ping
curl http://localhost:3000/ping

# 测试获取工人列表
curl http://localhost:3000/api/workers

# 测试设备统计
curl http://localhost:3000/api/devices/stats
```

### 2. 手表数据推送测试

**确保手表端 test-server.js 指向新服务器**：
```javascript
// calories/test-server.js 已经兼容
// 直接启动即可
```

### 3. AI 分析测试

```bash
curl -X POST http://localhost:3000/api/ai/analyze/W001
```

### 4. WebSocket 测试

浏览器控制台：
```javascript
const ws = new WebSocket('ws://localhost:3000');
ws.onmessage = (e) => console.log(JSON.parse(e.data));
```

---

## 📂 项目结构

```
health-monitor-web/
├── server/                          # 后端
│   ├── server.js                    # 主服务器（扩展版）
│   ├── database.js                  # 数据库模块
│   ├── database-init.sql            # 数据库初始化
│   ├── safety-check.js              # 安全检测
│   ├── ai-analysis.js               # AI 分析
│   ├── package.json
│   └── health_monitor.db            # SQLite 数据库文件
│
├── frontend/                        # 前端
│   ├── src/
│   │   ├── views/
│   │   │   ├── Dashboard.vue        # 主监控面板
│   │   │   ├── WorkerDetail.vue     # 工人详情
│   │   │   └── AlertCenter.vue      # 报警中心
│   │   ├── components/
│   │   │   ├── WorkerCard.vue       # 工人卡片
│   │   │   ├── AlertBanner.vue      # 报警横幅
│   │   │   └── AIAnalysisPanel.vue  # AI 分析面板
│   │   ├── api/index.js             # API 封装
│   │   ├── store/index.js           # Pinia 状态管理
│   │   ├── App.vue
│   │   └── main.js
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
└── README.md                        # 本文件
```

---

## 🎯 核心特性

### 1. 向后兼容
- ✅ 现有手表端推送代码**完全不需要修改**
- ✅ 原有 `/api/health-data` 接口 100% 兼容
- ✅ 可选添加 `worker_id` 字段
- ✅ 自动通过 `deviceId` 查找工人

### 2. 实时性
- ✅ WebSocket 毫秒级推送
- ✅ 数据库更新立即广播
- ✅ 前端自动刷新

### 3. 智能分析
- ✅ DeepSeek AI 专业分析
- ✅ 包含历史数据趋势
- ✅ 提供具体安全建议和应急措施

### 4. 易于部署
- ✅ SQLite 零配置
- ✅ Node.js 单进程
- ✅ 所有功能开箱即用

---

## ⚡ 性能优化

### 数据库索引

```sql
CREATE INDEX idx_history_worker_time ON health_history(worker_id, timestamp);
```

### WebSocket 连接池

```javascript
// 最多 100 个并发连接
if (wsClients.size > 100) {
  // 清理最早的连接
}
```

### 历史数据限制

```javascript
// 默认最多返回 100 条
const limit = parseInt(params.get('limit')) || 100;
```

---

## 🔐 安全建议

### 1. API 认证（生产环境）

```javascript
// 添加 API Key 验证
if (req.headers['x-api-key'] !== process.env.API_KEY) {
  res.writeHead(401);
  res.end('Unauthorized');
  return;
}
```

### 2. DeepSeek API Key 保护

```bash
# 使用环境变量
export DEEPSEEK_API_KEY=your-api-key

# server/ai-analysis.js
const AI_CONFIG = {
  apiKey: process.env.DEEPSEEK_API_KEY || 'fallback-key',
  // ...
};
```

### 3. 数据加密

```javascript
// 敏感数据加密存储
const crypto = require('crypto');
const encrypted = crypto.createCipher('aes-256-cbc', key)
  .update(data, 'utf8', 'hex');
```

---

## 📈 未来扩展

### 1. 数据导出
- Excel 报表导出
- PDF 分析报告

### 2. 多用户权限
- 管理员、调度员、观察员
- 基于角色的访问控制

### 3. 移动端 App
- React Native / Flutter
- 手机端实时监控

### 4. 大屏展示
- 矿井控制室大屏
- 3D 可视化

---

## 🐛 常见问题

### Q1: 数据库初始化失败？

```bash
# 删除旧数据库，重新初始化
rm server/health_monitor.db
npm run init-db
```

### Q2: WebSocket 连接失败？

```javascript
// 检查服务器是否启动
// 检查防火墙设置
// 使用 ws://localhost:3000 而不是 wss://
```

### Q3: AI 分析返回错误？

```bash
# 检查 API Key 是否正确
# 检查网络连接
# 查看服务器日志
```

### Q4: 前端无法连接后端？

```bash
# 检查 vite.config.js 的 proxy 配置
# 确保后端服务器在 3000 端口运行
# 查看浏览器控制台错误
```

---

## 📝 更新日志

### v1.0.0 (2025-10-08)

**初始发布**
- ✅ 完整的后端 API 系统
- ✅ SQLite 数据库集成
- ✅ WebSocket 实时推送
- ✅ DeepSeek AI 分析
- ✅ 多级安全阈值检测
- ✅ Vue 3 前端框架

---

## 👥 技术支持

**系统架构**：Node.js + SQLite + Vue 3  
**AI 服务商**：DeepSeek  
**实时通信**：WebSocket  



