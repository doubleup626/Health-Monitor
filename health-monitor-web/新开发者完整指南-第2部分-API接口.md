# 深地矿井健康监测系统 - 新开发者完整指南（第2部分：API接口详细文档）

**版本**: v2.2.0 + Web v1.0.0  
**更新日期**: 2025-10-08

---

## 📡 API 基础信息

### 服务器地址

**本地开发**:
- HTTP: `http://localhost:3000`
- WebSocket: `ws://localhost:3000`

**局域网访问**:
- HTTP: `http://<电脑IP>:3000`
- WebSocket: `ws://<电脑IP>:3000`

### 通用响应格式

**成功响应**:
```json
{
  "success": true,
  "message": "操作成功",
  "data": { ... }
}
```

**错误响应**:
```json
{
  "success": false,
  "error": "错误信息"
}
```

---

## 🔥 核心API - 数据接收

### POST /api/health-data

**用途**: 接收手表推送的健康数据（核心接口，100%向后兼容）

**请求方式**: POST  
**Content-Type**: application/json  
**来源**: 手表端通过手机Side Service推送

#### 请求体结构

```json
{
  "type": "batch",              // 固定值: "batch"
  "count": 1,                   // 数据条数
  "worker_id": "W001",          // 【可选】工人ID，如果没有则通过deviceId查找
  "data": [                     // 数据数组
    {
      "timestamp": 1759901899000,     // Unix时间戳（毫秒）
      "deviceId": 10092800,           // 设备ID（手表设备号）
      
      // === 心率数据 ===
      "heartRate": {
        "current": 88,                // 当前心率（可能为0，如未开启连续监测）
        "last": 88,                   // 最近一次心率 ⭐ 主要使用这个
        "resting": 55,                // 静息心率
        "dailyMaximum": {             // 今日最高心率（API_LEVEL 3.0+）
          "value": 100,
          "time": 1759901800          // Unix时间戳（秒）
        }
      },
      
      // === 血氧数据 ===
      "bloodOxygen": {
        "value": 95,                  // 血氧值（%）⚠️ 缓存值，需提前手动测量
        "time": 1759901800,           // 测量时间（秒）
        "retCode": 2,                 // 返回码：2=测量成功
        "lastFewHour": [              // 最近几小时数据（API_LEVEL 3.0+）
          {
            "time": 1759901800,
            "spo2": 96
          },
          ...
        ]
      },
      
      // === 压力数据 ===
      "stress": {
        "value": 32,                  // 当前压力值 ⚠️ 缓存值
        "time": 1759901800,           // 测量时间（秒）
        "todayAverage": 28,           // 今日平均（API_LEVEL 3.0+）
        "lastWeekAverage": [...]      // 上周数据（API_LEVEL 3.0+）
      },
      
      // === 体温数据 ===
      "bodyTemperature": {
        "current": 0,                 // 当前体温 ⚠️ Active2不支持，通常为0
        "timeinterval": 0
      },
      
      // === 运动数据 ===
      "step": {
        "current": 300,               // 当前步数 ✅ 实时
        "target": 3000                // 目标步数
      },
      
      "calorie": {
        "current": 300                // 当前卡路里 ✅ 实时
      },
      
      "distance": 1500,               // 距离（米）✅ 实时
      
      // === 环境数据 ===
      "barometer": {
        "airPressure": 1014,          // 气压（hPa）✅ 实时
        "altitude": -100              // 海拔（米）负值=地下 ✅ 实时
      },
      
      // === 睡眠数据 ===
      "sleep": null                   // 工作时段通常为null
    }
  ]
}
```

#### 完整示例请求

```json
{
  "type": "batch",
  "count": 1,
  "worker_id": "W001",
  "data": [{
    "timestamp": 1759901899000,
    "deviceId": 10092800,
    "heartRate": {
      "current": 88,
      "last": 88,
      "resting": 55,
      "dailyMaximum": { "value": 100, "time": 1759901800 }
    },
    "bloodOxygen": {
      "value": 95,
      "time": 1759901800,
      "retCode": 2,
      "lastFewHour": [
        { "time": 1759907322, "spo2": 96 },
        { "time": 1759912261, "spo2": 95 }
      ]
    },
    "stress": {
      "value": 32,
      "time": 1759905960,
      "todayAverage": 28,
      "lastWeekAverage": [30, 32, 28, 35, 29, 31, 30]
    },
    "bodyTemperature": { "current": 0, "timeinterval": 0 },
    "step": { "current": 300, "target": 3000 },
    "calorie": { "current": 300 },
    "distance": 1500,
    "barometer": { "airPressure": 1014, "altitude": -100 },
    "sleep": null
  }]
}
```

#### 响应示例

```json
{
  "success": true,
  "message": "数据接收成功"
}
```

#### 服务器处理流程

```
1. 解析JSON数据
   ↓
2. 提取worker_id（如果没有，通过deviceId查找）
   ↓
3. 安全检测（检查心率、血氧、压力、深度阈值）
   ↓
4. 保存到health_realtime表（更新最新数据）
   ↓
5. 保存到health_history表（追加历史记录）
   ↓
6. 如果超过安全阈值，保存到alerts表
   ↓
7. 更新设备last_seen时间
   ↓
8. WebSocket广播更新给所有前端连接
   ↓
9. 返回成功响应
```

#### 后端日志输出

```
════════════════════════════════════════════════════════════
🎉🎉🎉 收到健康数据！🎉🎉🎉
════════════════════════════════════════════════════════════
📅 时间: 2025/10/8 18:45:30
📊 数据类型: batch
📦 数据条数: 1
👤 工人ID: W001

📋 完整数据:
{完整JSON}
────────────────────────────────────────────────────────────

✅ 工人 W001 数据已保存到数据库
   设备ID: 10092800
   心率: 88 bpm (静息: 55)
   血氧: 95%
   压力: 32
   体温: 0°C
   步数: 300
   深度: -100 m
   气压: 1014 hPa
   ✅ 安全状态: 正常

════════════════════════════════════════════════════════════
✅ 数据处理完成
════════════════════════════════════════════════════════════
```

---

## 👥 工人管理API

### GET /api/workers

**用途**: 获取所有工人列表

**请求**: 无参数

**响应示例**:
```json
[
  {
    "id": 1,
    "worker_id": "W001",
    "name": "张三",
    "age": 35,
    "gender": "男",
    "position": "掘进工",
    "team": "A班",
    "emergency_contact": "13800138001",
    "health_notes": null,
    "created_at": "2025-10-08 09:45:19",
    "updated_at": "2025-10-08 09:45:19"
  },
  ...
]
```

---

### GET /api/workers/:workerId

**用途**: 获取单个工人信息

**请求**: URL参数 `workerId` (例如: W001)

**响应示例**:
```json
{
  "id": 1,
  "worker_id": "W001",
  "name": "张三",
  "age": 35,
  "gender": "男",
  "position": "掘进工",
  "team": "A班",
  "emergency_contact": "13800138001",
  "health_notes": null,
  "created_at": "2025-10-08 09:45:19",
  "updated_at": "2025-10-08 09:45:19"
}
```

---

## 📱 设备管理API

### GET /api/devices

**用途**: 获取所有设备列表

**响应示例**:
```json
[
  {
    "id": 1,
    "device_id": "10092800",
    "worker_id": "W001",
    "worker_name": "张三",
    "device_model": "Active2",
    "firmware_version": "2.2.0",
    "is_active": 1,
    "last_seen": "2025-10-08 18:00:02",
    "battery_level": null,
    "created_at": "2025-10-08 09:45:19",
    "updated_at": "2025-10-08 09:45:19"
  },
  ...
]
```

---

### GET /api/devices/stats

**用途**: 获取设备统计信息

**响应示例**:
```json
{
  "online": 2,      // 在线设备数（最近10分钟有数据）
  "offline": 1,     // 离线设备数
  "total": 3        // 总设备数
}
```

---

## 📊 实时数据API

### GET /api/realtime/all

**用途**: 获取所有工人的最新实时数据

**响应示例**:
```json
[
  {
    "id": 1,
    "worker_id": "W001",
    "worker_name": "张三",
    "device_id": "10092800",
    "device_model": "Active2",
    "is_active": 1,
    "last_seen": "2025-10-08 18:00:02",
    
    // 心率数据
    "heart_rate_current": 88,
    "heart_rate_last": 88,
    "heart_rate_resting": 55,
    "heart_rate_daily_max": 100,
    
    // 血氧数据
    "blood_oxygen_value": 95,
    "blood_oxygen_time": 1759901800,
    
    // 压力数据
    "stress_value": 32,
    "stress_time": 1759905960,
    "stress_today_avg": 28,
    
    // 其他数据
    "body_temperature": 0,
    "steps": 300,
    "calories": 300,
    "distance": 1500,
    "air_pressure": 1014,
    "altitude": -100,
    
    // 安全状态
    "is_safe": 1,              // 1=安全, 0=异常
    "alert_level": 0,          // 0=无, 1=低, 2=中, 3=高
    "alert_message": null,
    
    "timestamp": 1759901899000,
    "created_at": "2025-10-08 18:00:02",
    "updated_at": "2025-10-08 18:00:02"
  },
  ...
]
```

---

### GET /api/realtime/:workerId

**用途**: 获取单个工人的最新实时数据

**请求**: URL参数 `workerId` (例如: W001)

**响应**: 同上，但只返回一个对象（不是数组）

---

## 📈 历史数据API

### GET /api/history/:workerId

**用途**: 获取工人的历史数据记录

**请求参数**:
- `start`: 起始时间戳（毫秒）【可选】
- `end`: 结束时间戳（毫秒）【可选】
- `limit`: 返回条数，默认100【可选】

**示例请求**:
```
GET /api/history/W001?start=1759900000000&end=1759910000000&limit=50
```

**响应示例**:
```json
[
  {
    "id": 1,
    "worker_id": "W001",
    "device_id": "10092800",
    "data_json": "{完整的原始数据JSON}",
    "heart_rate": 88,
    "blood_oxygen": 95,
    "stress": 32,
    "timestamp": 1759901899000,
    "created_at": "2025-10-08 18:00:02"
  },
  ...
]
```

---

## 🚨 报警管理API

### GET /api/alerts/pending

**用途**: 获取所有未处理报警

**响应示例**:
```json
[
  {
    "id": 1,
    "worker_id": "W001",
    "worker_name": "张三",
    "device_id": "10092800",
    "alert_type": "heart_rate_high",
    "alert_level": 3,              // 1=低风险, 2=警告, 3=危险
    "alert_message": "心率过高：145 bpm（危险！）",
    "trigger_data": "{触发报警时的完整数据JSON}",
    "is_handled": 0,
    "handled_by": null,
    "handling_note": null,
    "handled_at": null,
    "created_at": "2025-10-08 18:05:30"
  },
  ...
]
```

---

### GET /api/alerts

**用途**: 获取所有报警（带筛选）

**请求参数**:
- `worker_id`: 按工人筛选【可选】
- `level`: 按级别筛选（1/2/3）【可选】
- `handled`: true/false 按处理状态筛选【可选】

**示例请求**:
```
GET /api/alerts?worker_id=W001&level=3&handled=false
```

---

### POST /api/alerts/:alertId/handle

**用途**: 标记报警为已处理

**请求体**:
```json
{
  "handled_by": "调度员张三",
  "handling_note": "已通知工人休息，心率恢复正常"
}
```

**响应**:
```json
{
  "status": "success",
  "message": "Alert handled successfully"
}
```

---

## 🤖 AI分析API

### POST /api/ai/analyze/:workerId

**用途**: 请求DeepSeek AI对工人进行安全分析

**请求**: URL参数 `workerId` (例如: W001)

**处理流程**:
1. 获取工人基本信息
2. 获取最新实时数据
3. 获取最近1小时历史数据
4. 构建包含所有上下文的提示词
5. 调用DeepSeek API
6. 解析返回的JSON
7. 保存分析结果到数据库
8. 返回分析结果

**响应示例**:
```json
{
  "risk_level": "中风险",
  "risk_analysis": "工人当前心率偏高（145 bpm），显著高于静息心率（55 bpm）和正常范围（50-120 bpm）。血氧饱和度正常（95%），但压力指数较高（68）。综合判断，工人当前处于高强度作业状态，存在疲劳风险。",
  "health_status": "心血管系统负荷较大，建议适当休息。压力水平偏高，需要关注心理状态。",
  "safety_advice": "建议立即停止高强度作业，就地休息10-15分钟。多喝水，深呼吸放松。如果心率5分钟内未下降到正常范围，应撤离作业面。",
  "emergency_measures": "如出现胸闷、头晕、呼吸困难等症状，立即停止作业并呼叫支援。准备氧气设备备用。",
  "rescue_guidance": "救援人员应携带便携式心电监护仪和氧气瓶。优先检查生命体征，评估是否需要紧急撤离。注意保持通讯畅通。"
}
```

**AI提示词包含的信息**:
- 工人姓名、工号、年龄、岗位
- 当前所有生理指标
- 最近1小时数据趋势
- 已触发的报警信息
- 环境数据（深度、气压）

---

### GET /api/ai/history/:workerId

**用途**: 获取工人的AI分析历史

**响应示例**:
```json
[
  {
    "id": 1,
    "worker_id": "W001",
    "request_data": "{请求时的实时数据JSON}",
    "prompt": "完整的AI提示词",
    "risk_level": "中风险",
    "risk_analysis": "...",
    "health_status": "...",
    "safety_advice": "...",
    "emergency_measures": "...",
    "rescue_guidance": "...",
    "model_name": "deepseek-chat",
    "created_at": "2025-10-08 18:10:00"
  },
  ...
]
```

---

## 🔌 WebSocket实时推送

### 连接地址

```
ws://localhost:3000
```

### 消息格式

**实时数据更新**:
```json
{
  "type": "realtime_update",
  "worker_id": "W001",
  "device_id": "10092800",
  "data": {
    // 完整的实时数据对象
  },
  "safety": {
    "alerts": [],
    "alertLevel": 0
  }
}
```

**报警推送**:
```json
{
  "type": "alert",
  "workerId": "W001",
  "deviceId": "10092800",
  "alert": {
    "type": "heart_rate_high",
    "level": 3,
    "message": "心率过高：145 bpm（危险！）"
  }
}
```

### 前端连接示例

```javascript
const ws = new WebSocket('ws://localhost:3000');

ws.onopen = () => {
  console.log('✅ WebSocket连接成功');
};

ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('📨 收到消息:', message);
  
  if (message.type === 'realtime_update') {
    // 更新前端数据
    updateWorkerData(message.worker_id, message.data);
  } else if (message.type === 'alert') {
    // 显示报警通知
    showAlertNotification(message.alert);
  }
};

ws.onerror = (error) => {
  console.error('❌ WebSocket错误:', error);
};

ws.onclose = () => {
  console.log('WebSocket连接关闭，5秒后重连...');
  setTimeout(() => connectWebSocket(), 5000);
};
```

---

## 📋 API测试

### 使用curl测试

```powershell
# 1. Ping测试
curl http://localhost:3000/ping

# 2. 获取工人列表
curl http://localhost:3000/api/workers

# 3. 获取设备统计
curl http://localhost:3000/api/devices/stats

# 4. 获取实时数据
curl http://localhost:3000/api/realtime/all

# 5. 模拟数据推送
curl -X POST http://localhost:3000/api/health-data `
  -H "Content-Type: application/json" `
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

# 6. AI分析测试
curl -X POST http://localhost:3000/api/ai/analyze/W001
```


