# ZeppOS 健康监测应用

一个功能完整的 ZeppOS 应用，用于采集人体健康数据和环境数据，并实时上传到服务器。

## 🎉 最新更新

### **v1.2.0 - 2024-01-08 (完整推送实现)** 🚀

🎊 **重大更新：数据推送功能完全实现！**

- ✅ 使用 MessageBuilder 实现真实的手表-手机 BLE 通信
- ✅ 完整的双向数据传输：手表 ↔ 手机 ↔ 服务器
- ✅ 实时推送反馈，用户体验完美
- ✅ 参考 ZeppOS 官方示例实现

📚 **查看详细文档**：
- [📡 MessageBuilder 实现文档](./MESSAGING_IMPLEMENTATION.md)
- [🧪 完整测试指南](./TEST_DATA_PUSH.md)

---

### **v1.1.1 - 2024-01-08 (黑屏修复版)** 🔧

⚠️ **紧急修复：应用黑屏问题**
- ✅ 修复应用启动时黑屏崩溃的问题
- ✅ 移除不兼容的 `BasePage` 依赖
- ✅ 应用现在可以正常启动和使用

⚠️ **功能调整：**
- 数据采集功能正常工作 ✅
- 数据推送暂时改为"标记模式"（数据保存在本地，标记为待上传）⏸️
- 后续将实现 Messaging API 来恢复完整推送功能 🔄

📚 **重要文档**：
- [🔧 黑屏修复说明](./HOTFIX_BLACK_SCREEN.md) - 问题分析和修复详情
- [📋 后续开发计划](./NEXT_STEPS.md) - 下一步功能规划

---

### **v1.1.0 - 2024-01-08** (已回退)

✅ **数据推送功能**（因兼容性问题暂时回退）
- 尝试使用 `BasePage` 实现手表-手机通信
- 发现版本兼容性问题
- 已回退到稳定版本

📚 **参考文档**：
- [📡 数据推送使用指南](./DATA_PUSH_GUIDE.md) - 理论实现指南（待恢复）
- [🧪 数据推送测试清单](./TEST_DATA_PUSH.md) - 测试计划（待实施）

## 📱 功能特点

### 数据采集
- ❤️ **心率监测**：实时获取当前和最近心率
- 🫁 **血氧监测**：实时血氧饱和度测量
- 😰 **压力监测**：压力水平评估
- 🌡️ **体温监测**：体表温度测量
- 👣 **步数统计**：当前步数和目标步数
- ⛰️ **海拔高度**：实时海拔数据
- 🌤️ **气压监测**：大气压力测量

### 核心特性
- 🔄 **后台运行**：息屏后持续采集数据
- ⏰ **定时采集**：默认每 5 分钟自动采集一次
- 📤 **自动上传**：默认每 15 分钟自动上传数据
- 💾 **本地缓存**：最多缓存 100 条数据，确保不丢失
- 📱 **实时显示**：界面实时显示最新采集的数据
- 🎛️ **手动控制**：支持手动开始/停止采集和立即采集

## 🏗️ 架构设计

```
┌──────────────────┐
│   Device App     │  手表端
│   (UI 界面)       │  - 显示采集状态
│                  │  - 控制采集开关
└────────┬─────────┘  - 手动采集
         │
         ↓ 启动后台服务
┌──────────────────┐
│   App Service    │  手表后台
│   (后台服务)      │  - 定时采集传感器数据
│                  │  - 系统定时器（息屏可用）
└────────┬─────────┘  - 本地数据缓存
         │
         ↓ BLE 通信
┌──────────────────┐
│   Side Service   │  手机端
│   (Zepp App)     │  - 接收手表数据
│                  │  - HTTP 上传到服务器
└────────┬─────────┘
         │
         ↓ HTTP POST
┌──────────────────┐
│     Server       │  服务器
│   (Node.js)      │  - 存储健康数据
└──────────────────┘  - SQLite 数据库
```

## 🚀 快速开始

### 前置要求

- **开发工具**：Zeus CLI（ZeppOS 开发工具）
- **Node.js**：v14+ （用于服务器）
- **设备**：支持 API_LEVEL 4.0+ 的 ZeppOS 设备（如 Active 2）

### 1. 克隆或下载项目

```bash
# 项目位于 calories 目录
cd calories
```

### 2. 安装依赖

```bash
npm install
```

### 3. 配置服务器

#### 启动本地服务器（测试用）

```bash
cd server-example
npm install
npm start
```

服务器将在 `http://0.0.0.0:3000` 启动。

#### 配置服务器地址

编辑 `app-side/index.js`，修改服务器地址：

```javascript
// 将此地址改为你的服务器地址
const SERVER_URL = "http://你的电脑IP:3000/api/health-data";
```

**如何获取电脑 IP：**
- Windows: 运行 `ipconfig`
- Mac/Linux: 运行 `ifconfig` 或 `ip addr`

⚠️ **重要**：确保手机和电脑在同一个 Wi-Fi 网络！

### 4. 编译和运行

```bash
# 返回项目根目录
cd ..

# 构建项目
zeus dev

# 或者使用真机调试
zeus preview
```

## 📖 使用说明

### 基本操作

1. **启动应用**：在手表上打开"健康监测"应用

2. **开始采集**：
   - 点击"开始采集"按钮
   - 首次使用需要授予后台服务权限
   - 授权后，服务将自动启动

3. **查看数据**：
   - 界面显示最新采集的数据
   - 包括心率、血氧、压力等所有指标

4. **停止采集**：
   - 点击"停止采集"按钮
   - 服务停止，停止自动采集

5. **手动采集**：
   - 点击"手动采集一次"按钮
   - 立即采集一次数据并显示

### 后台运行

应用启动后台服务后，即使息屏或切换到其他应用，数据采集仍会继续：

- ⏰ 每 5 分钟自动采集一次传感器数据
- 📤 每 15 分钟自动上传数据到服务器
- 💾 数据先缓存在本地，上传成功后清空

### 数据上传

数据通过以下路径上传：

1. **App Service** 通过 BLE 发送数据到 **Side Service**
2. **Side Service** 通过 HTTP 上传到你的服务器
3. 服务器保存数据到 SQLite 数据库

## 🔧 配置选项

### 修改采集间隔

编辑 `app-service/data-collector.js`：

```javascript
// 采集间隔（毫秒）
const COLLECT_INTERVAL = 5 * 60 * 1000; // 5分钟

// 上传间隔（毫秒）
const UPLOAD_INTERVAL = 15 * 60 * 1000; // 15分钟
```

### 修改数据缓存上限

编辑 `app-service/data-collector.js`：

```javascript
// 限制存储数量（最多保存100条）
if (dataList.length > 100) {
  dataList.shift();
}
```

## 📁 项目结构

```
calories/
├── app.js                      # 应用入口
├── app.json                    # 应用配置
├── package.json                # 依赖配置
├── README.md                   # 项目文档
│
├── app-service/                # 后台服务
│   └── data-collector.js       # 数据采集服务
│
├── app-side/                   # 手机端服务
│   └── index.js                # Side Service 入口
│
├── page/                       # 页面
│   ├── gt/
│   │   ├── index.js            # 主页面
│   │   ├── index.r.layout.js   # 圆形屏幕布局
│   │   └── index.s.layout.js   # 方形屏幕布局
│   └── i18n/                   # 国际化
│       ├── zh-CN.po            # 中文
│       └── en-US.po            # 英文
│
├── utils/                      # 工具类
│   ├── sensors.js              # 传感器采集器
│   ├── storage.js              # 本地存储
│   └── constants.js            # 常量定义
│
└── server-example/             # 服务器示例
    ├── server.js               # Express 服务器
    ├── package.json            # 服务器依赖
    └── README.md               # 服务器文档
```

## 🔐 权限说明

应用需要以下权限：

| 权限代码 | 用途 | 必需 |
|---------|------|------|
| `data:user.hd.heart_rate` | 读取心率数据 | ✅ |
| `data:user.hd.spo2` | 读取血氧数据 | ✅ |
| `data:user.hd.stress` | 读取压力数据 | ✅ |
| `data:user.hd.body_temp` | 读取体温数据 | ✅ |
| `data:user.hd.step` | 读取步数数据 | ✅ |
| `device:os.barometer` | 读取气压和海拔 | ✅ |
| `device:os.bg_service` | 后台服务运行 | ✅ |
| `device:os.local_storage` | 本地数据存储 | ✅ |
| `data:os.device.info` | 读取设备信息 | ✅ |

所有权限在应用安装时会请求用户授权。

## 🐛 故障排查

### 问题 1: 服务启动失败

**可能原因：**
- 未授予后台服务权限
- 设备 API 版本不兼容

**解决方法：**
1. 检查设备是否支持 API_LEVEL 4.0
2. 重新安装应用，确保授予所有权限
3. 查看日志输出：`zeus dev` 时会显示详细日志

### 问题 2: 数据无法上传

**可能原因：**
- 服务器地址配置错误
- 手机和服务器不在同一网络
- 防火墙阻止连接

**解决方法：**
1. 检查 `app-side/index.js` 中的 `SERVER_URL` 配置
2. 确保手机和服务器在同一 Wi-Fi
3. 在浏览器访问 `http://服务器IP:3000/api/ping` 测试
4. 关闭防火墙或开放 3000 端口

### 问题 3: 传感器数据为 0

**可能原因：**
- 传感器未就绪
- 设备未佩戴
- 传感器不支持

**解决方法：**
1. 确保手表正确佩戴在手腕上
2. 等待传感器初始化（约 1-2 分钟）
3. 检查设备型号是否支持所有传感器
4. 查看日志中的传感器错误信息

### 问题 4: 息屏后停止采集

**可能原因：**
- 后台服务权限未授予
- 系统限制（低电量模式等）

**解决方法：**
1. 重新启动应用并授予后台权限
2. 关闭省电模式或低电量模式
3. 在设置中允许应用后台运行

## 📊 数据格式

### 采集的数据结构

```json
{
  "timestamp": 1234567890000,
  "deviceId": "device123",
  "heartRate": {
    "current": 75,
    "last": 72
  },
  "bloodOxygen": {
    "value": 98,
    "retCode": 2,
    "time": 1234567890000
  },
  "stress": {
    "value": 30,
    "time": 1234567890000
  },
  "bodyTemperature": {
    "current": 36.5,
    "timeinterval": 0
  },
  "step": {
    "current": 5000,
    "target": 10000
  },
  "barometer": {
    "airPressure": 1013.25,
    "altitude": 100.5
  }
}
```

## 🔄 版本历史

### v1.0.0 (当前版本)

- ✅ 实现基本的传感器数据采集
- ✅ 后台服务支持（息屏可用）
- ✅ 系统定时器实现
- ✅ BLE 通信
- ✅ HTTP 数据上传
- ✅ 本地数据缓存
- ✅ 中英文界面

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 📚 参考资源

- [ZeppOS 官方文档](https://docs.zepp.com/)
- [ZeppOS API 参考](https://docs.zepp.com/zh-cn/docs/reference/)
- [ZeppOS 示例项目](https://github.com/zepp-health/zeppos-samples)
- [ZML 通信库](https://github.com/zepp-health/zml)

## 💡 技术支持

如有问题，请：
1. 查看本文档的故障排查部分
2. 查看 [ZeppOS 官方文档](https://docs.zepp.com/)
3. 提交 Issue 到项目仓库

---

**开发环境：** ZeppOS 4.0+  
**测试设备：** Active 2 (Round)  
**最后更新：** 2024

