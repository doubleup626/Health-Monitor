/**
 * 健康监测数据接收服务器示例
 * 这是一个简单的 Node.js Express 服务器，用于接收来自手表的健康数据
 * 
 * 安装依赖: npm install express body-parser sqlite3
 * 运行: node server.js
 */

const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// 允许跨域（用于测试）
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// 初始化 SQLite 数据库
const db = new sqlite3.Database(path.join(__dirname, 'health_data.db'), (err) => {
  if (err) {
    console.error('数据库打开失败:', err.message);
  } else {
    console.log('数据库连接成功');
    initDatabase();
  }
});

/**
 * 初始化数据库表
 */
function initDatabase() {
  const createTableSQL = `
    CREATE TABLE IF NOT EXISTS health_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      device_id TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      heart_rate_current INTEGER,
      heart_rate_last INTEGER,
      blood_oxygen_value INTEGER,
      blood_oxygen_retcode INTEGER,
      stress_value INTEGER,
      body_temp_current REAL,
      steps_current INTEGER,
      steps_target INTEGER,
      air_pressure REAL,
      altitude REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;
  
  db.run(createTableSQL, (err) => {
    if (err) {
      console.error('创建表失败:', err.message);
    } else {
      console.log('数据库表准备就绪');
    }
  });
}

/**
 * 保存单条健康记录
 */
function saveHealthRecord(data) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO health_records (
        device_id, timestamp,
        heart_rate_current, heart_rate_last,
        blood_oxygen_value, blood_oxygen_retcode,
        stress_value,
        body_temp_current,
        steps_current, steps_target,
        air_pressure, altitude
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      data.deviceId || 'unknown',
      data.timestamp || Date.now(),
      data.heartRate?.current || null,
      data.heartRate?.last || null,
      data.bloodOxygen?.value || null,
      data.bloodOxygen?.retCode || null,
      data.stress?.value || null,
      data.bodyTemperature?.current || null,
      data.step?.current || null,
      data.step?.target || null,
      data.barometer?.airPressure || null,
      data.barometer?.altitude || null,
    ];
    
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({ id: this.lastID, rowsAffected: this.changes });
      }
    });
  });
}

/**
 * API: 测试服务器连接
 */
app.get('/api/ping', (req, res) => {
  console.log('[PING] 收到连接测试请求');
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: Date.now(),
  });
});

/**
 * API: 接收健康数据
 */
app.post('/api/health-data', async (req, res) => {
  console.log('[POST] 收到健康数据');
  console.log('请求体:', JSON.stringify(req.body, null, 2));
  
  try {
    const { type, data, dataList, count } = req.body;
    
    if (type === 'batch' && Array.isArray(dataList)) {
      // 批量数据
      console.log(`开始保存 ${dataList.length} 条数据`);
      
      let successCount = 0;
      let failCount = 0;
      
      for (const item of dataList) {
        try {
          await saveHealthRecord(item);
          successCount++;
        } catch (err) {
          console.error('保存数据失败:', err.message);
          failCount++;
        }
      }
      
      console.log(`数据保存完成: 成功 ${successCount} 条, 失败 ${failCount} 条`);
      
      res.json({
        success: true,
        message: '数据接收成功',
        received: dataList.length,
        saved: successCount,
        failed: failCount,
        timestamp: Date.now(),
      });
    } else if (data) {
      // 单条数据
      console.log('保存单条数据');
      const result = await saveHealthRecord(data);
      
      res.json({
        success: true,
        message: '数据保存成功',
        recordId: result.id,
        timestamp: Date.now(),
      });
    } else {
      res.status(400).json({
        success: false,
        message: '无效的数据格式',
      });
    }
  } catch (error) {
    console.error('处理请求失败:', error);
    res.status(500).json({
      success: false,
      message: '服务器错误: ' + error.message,
    });
  }
});

/**
 * API: 查询健康记录
 */
app.get('/api/health-data', (req, res) => {
  const { device_id, limit = 100, offset = 0 } = req.query;
  
  let sql = 'SELECT * FROM health_records';
  const params = [];
  
  if (device_id) {
    sql += ' WHERE device_id = ?';
    params.push(device_id);
  }
  
  sql += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));
  
  db.all(sql, params, (err, rows) => {
    if (err) {
      console.error('查询失败:', err.message);
      res.status(500).json({
        success: false,
        message: '查询失败',
      });
    } else {
      res.json({
        success: true,
        data: rows,
        count: rows.length,
      });
    }
  });
});

/**
 * API: 获取统计信息
 */
app.get('/api/stats', (req, res) => {
  const sql = `
    SELECT 
      COUNT(*) as total_records,
      COUNT(DISTINCT device_id) as total_devices,
      MIN(timestamp) as first_record_time,
      MAX(timestamp) as last_record_time
    FROM health_records
  `;
  
  db.get(sql, [], (err, row) => {
    if (err) {
      console.error('统计查询失败:', err.message);
      res.status(500).json({
        success: false,
        message: '统计查询失败',
      });
    } else {
      res.json({
        success: true,
        stats: row,
      });
    }
  });
});

/**
 * 启动服务器
 */
app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(50));
  console.log(`健康监测数据服务器已启动`);
  console.log(`监听地址: http://0.0.0.0:${PORT}`);
  console.log(`API 端点:`);
  console.log(`  - GET  /api/ping         : 测试连接`);
  console.log(`  - POST /api/health-data  : 接收健康数据`);
  console.log(`  - GET  /api/health-data  : 查询健康记录`);
  console.log(`  - GET  /api/stats        : 获取统计信息`);
  console.log('='.repeat(50));
  
  // 获取本机 IP 地址
  const os = require('os');
  const networkInterfaces = os.networkInterfaces();
  console.log('\n本机 IP 地址:');
  Object.keys(networkInterfaces).forEach((interfaceName) => {
    networkInterfaces[interfaceName].forEach((iface) => {
      if (iface.family === 'IPv4' && !iface.internal) {
        console.log(`  ${interfaceName}: http://${iface.address}:${PORT}`);
      }
    });
  });
  console.log('\n请在 app-side/index.js 中配置正确的服务器地址');
  console.log('='.repeat(50));
});

/**
 * 优雅关闭
 */
process.on('SIGINT', () => {
  console.log('\n正在关闭服务器...');
  db.close((err) => {
    if (err) {
      console.error('关闭数据库失败:', err.message);
    } else {
      console.log('数据库已关闭');
    }
    process.exit(0);
  });
});

