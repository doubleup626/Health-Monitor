# 健康监测数据服务器

这是一个简单的 Node.js Express 服务器，用于接收来自 ZeppOS 健康监测应用的数据。

## 功能特点

- ✅ 接收批量健康数据
- ✅ 存储到 SQLite 数据库
- ✅ 提供数据查询接口
- ✅ 统计信息查询
- ✅ CORS 支持（方便测试）

## 快速开始

### 1. 安装依赖

```bash
cd server-example
npm install
```

### 2. 启动服务器

```bash
npm start
```

服务器将在 `http://0.0.0.0:3000` 上运行。

### 3. 配置手表应用

在 `app-side/index.js` 文件中，将 `SERVER_URL` 修改为你的服务器地址：

```javascript
const SERVER_URL = "http://你的电脑IP:3000/api/health-data";
```

**如何获取电脑 IP 地址：**

- Windows: 在命令提示符中运行 `ipconfig`，查找 IPv4 地址
- Mac/Linux: 在终端中运行 `ifconfig` 或 `ip addr`，查找 inet 地址

⚠️ **重要：** 确保你的手机和电脑在同一个 Wi-Fi 网络中！

## API 文档

### 1. 测试连接

```
GET /api/ping
```

**响应示例：**
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": 1234567890000
}
```

### 2. 接收健康数据

```
POST /api/health-data
```

**请求体（批量）：**
```json
{
  "type": "batch",
  "count": 2,
  "dataList": [
    {
      "timestamp": 1234567890000,
      "deviceId": "device123",
      "heartRate": { "current": 75, "last": 72 },
      "bloodOxygen": { "value": 98, "retCode": 2 },
      "stress": { "value": 30 },
      "bodyTemperature": { "current": 36.5 },
      "step": { "current": 5000, "target": 10000 },
      "barometer": { "airPressure": 1013.25, "altitude": 100 }
    }
  ]
}
```

**响应示例：**
```json
{
  "success": true,
  "message": "数据接收成功",
  "received": 2,
  "saved": 2,
  "failed": 0,
  "timestamp": 1234567890000
}
```

### 3. 查询健康记录

```
GET /api/health-data?device_id=xxx&limit=100&offset=0
```

**参数：**
- `device_id`: 设备 ID（可选）
- `limit`: 返回记录数量（默认 100）
- `offset`: 偏移量（默认 0）

### 4. 获取统计信息

```
GET /api/stats
```

**响应示例：**
```json
{
  "success": true,
  "stats": {
    "total_records": 1000,
    "total_devices": 1,
    "first_record_time": 1234567890000,
    "last_record_time": 1234567999999
  }
}
```

## 数据库结构

数据存储在 `health_data.db` SQLite 文件中。

**表结构：health_records**

| 字段 | 类型 | 说明 |
|------|------|------|
| id | INTEGER | 主键（自增） |
| device_id | TEXT | 设备 ID |
| timestamp | INTEGER | 采集时间戳（毫秒） |
| heart_rate_current | INTEGER | 当前心率 (bpm) |
| heart_rate_last | INTEGER | 最近心率 (bpm) |
| blood_oxygen_value | INTEGER | 血氧值 (%) |
| blood_oxygen_retcode | INTEGER | 血氧测量状态码 |
| stress_value | INTEGER | 压力值 |
| body_temp_current | REAL | 体温 (°C) |
| steps_current | INTEGER | 当前步数 |
| steps_target | INTEGER | 目标步数 |
| air_pressure | REAL | 气压 (hPa) |
| altitude | REAL | 海拔 (m) |
| created_at | DATETIME | 记录创建时间 |

## 数据查询示例

### 使用 SQLite 命令行

```bash
sqlite3 health_data.db

# 查看所有记录
SELECT * FROM health_records ORDER BY timestamp DESC LIMIT 10;

# 统计每天的记录数
SELECT DATE(timestamp/1000, 'unixepoch') as date, COUNT(*) as count 
FROM health_records 
GROUP BY date;

# 查询平均心率
SELECT AVG(heart_rate_current) as avg_heart_rate 
FROM health_records 
WHERE heart_rate_current > 0;
```

### 使用 curl 测试

```bash
# 测试连接
curl http://localhost:3000/api/ping

# 发送测试数据
curl -X POST http://localhost:3000/api/health-data \
  -H "Content-Type: application/json" \
  -d '{
    "type": "batch",
    "dataList": [{
      "timestamp": 1234567890000,
      "deviceId": "test-device",
      "heartRate": {"current": 75},
      "step": {"current": 5000}
    }]
  }'

# 查询数据
curl http://localhost:3000/api/health-data?limit=5

# 查询统计
curl http://localhost:3000/api/stats
```

## 开发建议

### 生产环境部署

对于生产环境，建议：

1. **使用更强大的数据库**：将 SQLite 替换为 MySQL、PostgreSQL 等
2. **添加身份验证**：使用 JWT 或 API Key 保护接口
3. **数据验证**：添加请求数据的严格验证
4. **错误处理**：完善错误处理和日志记录
5. **使用 HTTPS**：保护数据传输安全
6. **添加监控**：使用 PM2 等工具监控服务状态

### 扩展功能

可以添加的功能：

- 📊 数据可视化面板（使用 ECharts、Chart.js 等）
- 📧 异常数据告警（邮件、短信通知）
- 📱 移动端/Web 端数据查看界面
- 📈 健康趋势分析
- 💾 数据导出功能（CSV、Excel）
- 🔄 数据同步到云服务

## 故障排查

### 问题：手表无法连接到服务器

1. 检查电脑和手机是否在同一个 Wi-Fi 网络
2. 检查防火墙是否阻止了 3000 端口
3. 在浏览器中访问 `http://你的IP:3000/api/ping` 测试服务器是否可访问
4. 检查 `app-side/index.js` 中的 `SERVER_URL` 配置是否正确

### 问题：数据没有保存

1. 查看服务器控制台的日志输出
2. 检查 `health_data.db` 文件是否有写入权限
3. 使用 SQLite 客户端直接查询数据库

### 问题：端口被占用

如果 3000 端口被占用，可以修改 `server.js` 中的 PORT 变量：

```javascript
const PORT = process.env.PORT || 3001; // 改为其他端口
```

## 许可证

MIT License

