# 部署指南

本指南将帮助你将健康监测应用部署到生产环境。

## 📦 部署架构

```
┌────────────────┐
│   ZeppOS 手表   │  采集数据
└───────┬────────┘
        │ BLE
        ↓
┌────────────────┐
│   手机 Zepp    │  中转数据
└───────┬────────┘
        │ HTTP/HTTPS
        ↓
┌────────────────┐
│  云服务器/VPS  │  存储数据
│   (公网 IP)    │
└────────────────┘
```

## 🌐 服务器部署选项

### 选项 1: 云服务器（推荐）

适合场景：需要从任何地方访问数据

**推荐平台：**
- 阿里云 ECS
- 腾讯云 CVM
- AWS EC2
- DigitalOcean Droplets

**最低配置：**
- CPU: 1核
- 内存: 1GB
- 硬盘: 20GB
- 带宽: 1Mbps

### 选项 2: 本地服务器

适合场景：仅在家庭/办公室网络内使用

**要求：**
- 一台常开的电脑或 NAS
- 局域网内固定 IP
- 可选：动态域名服务 (DDNS)

### 选项 3: Serverless

适合场景：低频使用，按需付费

**推荐平台：**
- AWS Lambda + API Gateway
- 腾讯云 SCF
- 阿里云函数计算

## 🚀 云服务器部署步骤

### 第 1 步：购买并配置服务器

1. **购买云服务器**
   - 选择离你最近的区域
   - 选择 Ubuntu 20.04 LTS 或 CentOS 7+

2. **配置安全组**
   - 开放端口：22 (SSH), 3000 (应用), 443 (HTTPS)
   - 限制 SSH 访问来源 IP（推荐）

3. **连接到服务器**
   ```bash
   ssh root@你的服务器IP
   ```

### 第 2 步：安装 Node.js

```bash
# 安装 Node.js 16.x
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node --version
npm --version
```

### 第 3 步：上传应用代码

**方法 1：使用 Git（推荐）**

```bash
# 在服务器上克隆代码
cd /opt
git clone 你的代码仓库地址
cd 项目名/calories/server-example
```

**方法 2：使用 SCP**

```bash
# 在本地执行
cd calories
scp -r server-example root@服务器IP:/opt/
```

### 第 4 步：安装依赖

```bash
cd /opt/server-example
npm install --production
```

### 第 5 步：配置环境变量

创建 `.env` 文件：

```bash
nano .env
```

添加配置：

```env
PORT=3000
NODE_ENV=production
DATABASE_PATH=/opt/server-example/data/health_data.db
```

修改 `server.js` 支持环境变量：

```javascript
require('dotenv').config();

const PORT = process.env.PORT || 3000;
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'health_data.db');
```

### 第 6 步：安装 PM2（进程守护）

```bash
# 安装 PM2
sudo npm install -g pm2

# 启动应用
pm2 start server.js --name health-monitor

# 设置开机自启
pm2 startup
pm2 save

# 查看状态
pm2 status
pm2 logs health-monitor
```

### 第 7 步：配置 Nginx 反向代理

```bash
# 安装 Nginx
sudo apt-get install -y nginx

# 创建配置文件
sudo nano /etc/nginx/sites-available/health-monitor
```

添加配置：

```nginx
server {
    listen 80;
    server_name 你的域名.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/health-monitor /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 第 8 步：配置 SSL 证书（HTTPS）

```bash
# 安装 Certbot
sudo apt-get install -y certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d 你的域名.com

# 自动续期
sudo certbot renew --dry-run
```

### 第 9 步：配置防火墙

```bash
# UFW 防火墙
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 第 10 步：更新应用配置

修改 `calories/app-side/index.js`：

```javascript
// 改为你的域名或服务器公网IP
const SERVER_URL = "https://你的域名.com/api/health-data";
// 或
const SERVER_URL = "http://你的服务器IP:3000/api/health-data";
```

## 🗄️ 数据库升级

### 从 SQLite 迁移到 MySQL

1. **安装 MySQL**

```bash
sudo apt-get install -y mysql-server
```

2. **创建数据库**

```sql
CREATE DATABASE health_monitor;
CREATE USER 'healthapp'@'localhost' IDENTIFIED BY '强密码';
GRANT ALL PRIVILEGES ON health_monitor.* TO 'healthapp'@'localhost';
FLUSH PRIVILEGES;
```

3. **修改 server.js**

```bash
npm install mysql2
```

```javascript
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'healthapp',
  password: '强密码',
  database: 'health_monitor',
  waitForConnections: true,
  connectionLimit: 10,
});

// 修改保存函数
async function saveHealthRecord(data) {
  const sql = `INSERT INTO health_records (...) VALUES (...)`;
  const [result] = await pool.execute(sql, params);
  return result;
}
```

## 📊 数据备份策略

### 自动备份脚本

创建 `backup.sh`：

```bash
#!/bin/bash

BACKUP_DIR="/opt/backups"
DB_PATH="/opt/server-example/health_data.db"
DATE=$(date +%Y%m%d_%H%M%S)

# 创建备份目录
mkdir -p $BACKUP_DIR

# 备份数据库
cp $DB_PATH "$BACKUP_DIR/health_data_$DATE.db"

# 压缩备份
gzip "$BACKUP_DIR/health_data_$DATE.db"

# 删除 30 天前的备份
find $BACKUP_DIR -name "*.db.gz" -mtime +30 -delete

echo "备份完成: health_data_$DATE.db.gz"
```

设置定时任务：

```bash
chmod +x backup.sh

# 编辑 crontab
crontab -e

# 每天凌晨 2 点备份
0 2 * * * /opt/server-example/backup.sh >> /var/log/health-backup.log 2>&1
```

## 🔒 安全加固

### 1. 添加 API 认证

修改 `server.js`：

```javascript
const API_KEY = process.env.API_KEY || '请设置强密码';

// 添加认证中间件
app.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (req.path === '/api/ping') {
    return next();
  }
  
  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  
  next();
});
```

修改 `app-side/index.js`：

```javascript
const API_KEY = "你的API密钥";

const response = await fetch({
  url: SERVER_URL,
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-API-Key": API_KEY,
  },
  body: JSON.stringify(data),
});
```

### 2. 限制请求频率

```bash
npm install express-rate-limit
```

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: 100, // 限制 100 个请求
});

app.use('/api/', limiter);
```

### 3. 添加请求日志

```bash
npm install morgan
```

```javascript
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

const accessLogStream = fs.createWriteStream(
  path.join(__dirname, 'access.log'),
  { flags: 'a' }
);

app.use(morgan('combined', { stream: accessLogStream }));
```

## 📈 监控和告警

### 使用 PM2 Plus

```bash
# 安装 PM2 Plus
pm2 install pm2-server-monit

# 查看监控
pm2 monit
```

### 配置告警

创建 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [{
    name: 'health-monitor',
    script: './server.js',
    instances: 2,
    exec_mode: 'cluster',
    max_memory_restart: '500M',
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
  }]
};
```

启动：

```bash
pm2 start ecosystem.config.js
```

## 🔄 CI/CD 自动部署

### 使用 GitHub Actions

创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to Server

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    
    - name: Deploy to Server
      uses: appleboy/ssh-action@master
      with:
        host: ${{ secrets.SERVER_HOST }}
        username: ${{ secrets.SERVER_USER }}
        key: ${{ secrets.SSH_PRIVATE_KEY }}
        script: |
          cd /opt/server-example
          git pull
          npm install --production
          pm2 restart health-monitor
```

## 📱 移动端配置

### 配置应用使用生产服务器

1. 修改 `app-side/index.js`
2. 重新编译应用
3. 发布到应用商店或内部分发

### 提示用户配置服务器

可以在应用中添加设置页面，让用户自定义服务器地址。

## ✅ 部署检查清单

- [ ] 服务器已购买并配置
- [ ] Node.js 已安装
- [ ] 应用代码已上传
- [ ] 依赖已安装
- [ ] PM2 已配置并启动
- [ ] Nginx 反向代理已配置
- [ ] SSL 证书已配置（如使用域名）
- [ ] 防火墙已配置
- [ ] 应用配置已更新为生产地址
- [ ] 备份脚本已设置
- [ ] API 认证已启用
- [ ] 监控已配置
- [ ] 测试数据上传成功

## 🐛 故障排查

### 服务器无法访问

```bash
# 检查服务状态
pm2 status
pm2 logs health-monitor

# 检查端口
netstat -tulpn | grep 3000

# 检查防火墙
sudo ufw status
```

### 数据库错误

```bash
# 检查数据库文件权限
ls -la health_data.db

# 修复权限
chmod 644 health_data.db
```

### Nginx 错误

```bash
# 查看错误日志
sudo tail -f /var/log/nginx/error.log

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
```

## 📞 技术支持

需要帮助？
- 查看服务器日志：`pm2 logs`
- 查看 Nginx 日志：`/var/log/nginx/`
- 查看系统日志：`journalctl -xe`

---

**祝部署顺利！** 🚀

