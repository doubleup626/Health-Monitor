# 🚀 快速启动指南

## 第一次部署（15 分钟）

### Step 1: 安装后端依赖（2 分钟）

```bash
cd d:/Zepp_workspace/health-monitor-web/server
npm install
```

**安装的包**：
- `sqlite3` - SQLite 数据库
- `ws` - WebSocket 服务器

---

### Step 2: 初始化数据库（1 分钟）

```bash
npm run init-db
```

**自动创建**：
- ✅ 6 个数据表
- ✅ 3 个测试工人（张三、李四、王五）
- ✅ 3 个测试设备

**数据库文件**：`health_monitor.db`（SQLite）

---

### Step 3: 启动后端服务器（即时）

```bash
npm start
```

**预期输出**：
```
════════════════════════════════════════════════════════════
🏭 深地矿井健康监测系统已启动！
════════════════════════════════════════════════════════════
📡 HTTP 服务器: http://0.0.0.0:3000
🔌 WebSocket 服务器: ws://0.0.0.0:3000
════════════════════════════════════════════════════════════
⏳ 等待接收手表数据...
```

**浏览器测试**：访问 `http://localhost:3000`

---

### Step 4: 测试手表数据推送（2 分钟）

**方式 1：使用现有手表端**

手表端代码**无需修改**，自动兼容！

```bash
# 在手表上点击"开始采集"
# 观察服务器日志
```

**预期服务器日志**：
```
🎉🎉🎉 收到健康数据！🎉🎉🎉
📅 时间: 2025/10/8 17:30:00
📊 数据类型: batch
📦 数据条数: 1
✅ 工人 W001 数据已保存
```

**方式 2：使用 curl 模拟**

```bash
curl -X POST http://localhost:3000/api/health-data \
  -H "Content-Type: application/json" \
  -d '{
    "type": "batch",
    "count": 1,
    "worker_id": "W001",
    "data": [{
      "timestamp": 1759901899000,
      "deviceId": 10092800,
      "heartRate": {"current": 88, "last": 88, "resting": 55},
      "bloodOxygen": {"value": 95},
      "stress": {"value": 32},
      "step": {"current": 300},
      "barometer": {"airPressure": 1014, "altitude": -100}
    }]
  }'
```

---

### Step 5: 安装前端依赖（3 分钟）

```bash
cd d:/Zepp_workspace/health-monitor-web/frontend
npm install
```

---

### Step 6: 启动前端开发服务器（即时）

```bash
npm run dev
```

**预期输出**：
```
  VITE v5.2.0  ready in 500 ms

  ➜  Local:   http://localhost:8080/
  ➜  Network: use --host to expose
```

**浏览器访问**：`http://localhost:8080`

---

## 🎯 验证部署成功

### 1. 检查后端 API

```bash
# 获取工人列表
curl http://localhost:3000/api/workers

# 获取设备统计
curl http://localhost:3000/api/devices/stats

# 获取实时数据
curl http://localhost:3000/api/realtime/all
```

### 2. 测试 AI 分析

```bash
# 确保已经有工人数据
curl -X POST http://localhost:3000/api/ai/analyze/W001
```

**预期返回**：
```json
{
  "risk_level": "低风险",
  "risk_analysis": "工人当前生理指标正常...",
  "health_status": "健康状况良好...",
  "safety_advice": "继续保持...",
  ...
}
```

### 3. 测试 WebSocket

浏览器控制台：
```javascript
const ws = new WebSocket('ws://localhost:3000');
ws.onopen = () => console.log('✅ WebSocket 连接成功');
ws.onmessage = (e) => console.log('📨 收到消息:', JSON.parse(e.data));
```

---

## 📱 手表端配置

### 如果要添加 worker_id（可选）

**修改 `calories/app-side/index.js`**：

```javascript
// 在 onRequest() 方法中
onRequest(req, res) {
  const params = req.body.params;
  
  // 添加 worker_id（根据设备映射）
  const deviceId = params.dataList[0].deviceId;
  const workerMap = {
    '10092800': 'W001',
    '10092801': 'W002',
    '10092802': 'W003'
  };
  
  const requestData = {
    ...req.body,
    worker_id: workerMap[deviceId]  // 新增
  };
  
  // 发送到服务器
  this.request({
    method: 'POST',
    url: 'http://192.168.31.206:3000/api/health-data',
    body: requestData
  });
}
```

**或者在 Web 端配置映射（推荐）**

数据库已经有设备绑定，服务器会自动查找：
```javascript
// server/server.js 已实现
const device = await deviceDB.getByDeviceId(deviceId);
workerId = device.worker_id;
```

---

## 🎨 前端界面预览

### 主监控面板

```
┌─────────────────────────────────────────────────────────┐
│  🏭 深地矿井健康监测系统                                │
├─────────────────────────────────────────────────────────┤
│  [在线: 3] [离线: 0] [报警: 0] [分析: 0]                │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐          │
│  │ 张三 W001 │  │ 李四 W002 │  │ 王五 W003 │          │
│  │ ━━━━━━━━━ │  │ ━━━━━━━━━ │  │ ━━━━━━━━━ │          │
│  │ ❤️ 88 bpm │  │ ❤️ 92 bpm │  │ ❤️ 85 bpm │          │
│  │ 🫁 95%    │  │ 🫁 96%    │  │ 🫁 94%    │          │
│  │ 😰 32     │  │ 😰 28     │  │ 😰 45     │          │
│  │ 📍-100m   │  │ 📍-150m   │  │ 📍-200m   │          │
│  │           │  │           │  │           │          │
│  │ [详情]    │  │ [详情]    │  │ [详情]    │          │
│  │ [AI分析]  │  │ [AI分析]  │  │ [AI分析]  │          │
│  └───────────┘  └───────────┘  └───────────┘          │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 科技工业风格

- 🎨 **深色背景**：`#0a0e1a`
- ✨ **荧光绿强调**：`#00ff88`（发光效果）
- ⚠️ **危险红色**：`#ff3366`
- 🔲 **玻璃态卡片**：`backdrop-filter: blur(10px)`
- 🌐 **网格背景**：`20px x 20px`

---

## 📊 数据流程

```
手表 → BLE → 手机 → POST /api/health-data
                            ↓
                     1. 保存到数据库
                     2. 安全阈值检测
                     3. 触发报警（如需要）
                     4. WebSocket 广播
                            ↓
                     前端自动更新
                     （毫秒级延迟）
```

---

## 🤖 AI 分析流程

```
点击"AI分析"按钮
      ↓
POST /api/ai/analyze/:workerId
      ↓
1. 获取工人信息
2. 获取实时数据
3. 获取最近1小时历史数据
4. 构建完整提示词（包含历史趋势）
5. 调用 DeepSeek API
6. 解析 JSON 结果
7. 保存分析记录
8. 返回给前端
      ↓
显示分析结果（风险等级、建议、应急措施）
```

---

## ⚠️ 常见问题速查

### 端口已被占用

```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# 或修改端口
# server/server.js
const PORT = 3001;  # 改为其他端口
```

### 数据库锁定

```bash
# 关闭所有连接
# 删除数据库
rm server/health_monitor.db

# 重新初始化
npm run init-db
```

### AI API 调用失败

```bash
# 检查 API Key
# server/ai-analysis.js
const AI_CONFIG = {
  apiKey: 'sk-886bedda24214b5190ba5add0ba4029e',  # 确认正确
  ...
};

# 测试网络
curl https://api.deepseek.com/v1/chat/completions \
  -H "Authorization: Bearer sk-886bedda24214b5190ba5add0ba4029e"
```

### WebSocket 不推送

```bash
# 检查服务器是否启动
# 检查浏览器控制台错误
# 确认使用 ws:// 而不是 wss://
```

---

## 🎯 下一步

### 1. 定制安全阈值

```javascript
// server/safety-check.js
const SAFETY_THRESHOLDS = {
  heartRate: { max: 120, danger: 140 },
  bloodOxygen: { min: 90, danger: 85 },
  // 根据实际情况调整
};
```

### 2. 添加更多工人

```bash
curl -X POST http://localhost:3000/api/workers \
  -H "Content-Type: application/json" \
  -d '{
    "worker_id": "W004",
    "name": "赵六",
    "age": 30,
    "position": "采煤工",
    "team": "B班"
  }'
```

### 3. 绑定设备

```sql
-- 直接修改数据库
UPDATE devices SET worker_id = 'W001' WHERE device_id = '10092800';
```

### 4. 查看实时数据

```
浏览器访问: http://localhost:8080
→ 主监控面板
→ 查看所有工人实时数据
→ 点击"AI分析"查看详细分析
```

---

## ✅ 部署检查清单

- [ ] 后端依赖已安装
- [ ] 数据库已初始化
- [ ] 后端服务器运行正常（端口 3000）
- [ ] 手表数据可以正常推送
- [ ] WebSocket 连接正常
- [ ] 前端依赖已安装
- [ ] 前端开发服务器运行正常（端口 8080）
- [ ] API 接口测试通过
- [ ] AI 分析功能正常

---

**完成以上步骤后，系统即可投入使用！** 🎉

**技术支持**：查看 `README.md` 获取详细文档


