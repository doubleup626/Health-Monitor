/**
 * 深地矿井工人健康监测系统 - 主服务器
 * 扩展自 test-server.js，保持 100% 向后兼容
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');

// 导入数据库模块
const {
  initDatabase,
  run,
  workerDB,
  deviceDB,
  realtimeDB,
  historyDB,
  alertDB,
  aiDB,
  operationLogDB
} = require('./database');

// 导入安全检测模块
const { checkSafety } = require('./safety-check');

// 导入 AI 分析模块
const { performAnalysis } = require('./ai-analysis');

// 导入管理API路由 (新增)
const {
  deviceHandlers,
  workerHandlers,
  operationLogHandlers
} = require('./api-routes-management');

// 导入 RAG 路由 (新增)
const {
  handleUpload,
  handleGetDocuments,
  handleDeleteDocument,
  handleQuery,
  handleGetHistory,
  handleGetStats
} = require('./rag-routes');

const PORT = process.env.PORT || 3000;
const HOSTNAME = '0.0.0.0';

// 存储 WebSocket 客户端
const wsClients = new Set();

// 创建 HTTP 服务器
const server = http.createServer(async (req, res) => {
  // 设置 CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  const url = req.url;
  const method = req.method;
  
  // ============================================
  // 原有接口（保持兼容）
  // ============================================
  
  // 根路径
  if (url === '/' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>深地矿井健康监测系统</title>
        <meta charset="utf-8">
        <style>
          body { 
            font-family: Arial, sans-serif; 
            max-width: 800px; 
            margin: 50px auto; 
            padding: 20px;
            background: #0a0e1a;
            color: #00ff88;
          }
          h1 { color: #00ff88; text-shadow: 0 0 10px #00ff88; }
          .status { 
            padding: 15px; 
            background: #1a2332; 
            border-left: 4px solid #00ff88; 
            margin: 20px 0;
          }
          button {
            background: #00ff88;
            color: #0a0e1a;
            border: none;
            padding: 10px 20px;
            cursor: pointer;
            font-size: 16px;
            border-radius: 4px;
          }
          button:hover { background: #00cc77; }
          .endpoints {
            background: #1a2332;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
          }
          .endpoints li { margin: 8px 0; color: #88ccff; }
        </style>
      </head>
      <body>
        <h1>🏭 深地矿井健康监测系统</h1>
        <div class="status">
          ✅ 服务器运行正常<br>
          📡 端口: ${PORT}<br>
          🕐 时间: ${new Date().toLocaleString('zh-CN')}
        </div>
        
        <h2>📍 API 接口</h2>
        <div class="endpoints">
          <ul>
            <li>POST /api/health-data - 接收手表数据（原有接口）</li>
            <li>GET /api/workers - 获取工人列表</li>
            <li>GET /api/devices/stats - 设备统计</li>
            <li>GET /api/realtime/all - 所有实时数据</li>
            <li>POST /api/ai/analyze/:workerId - AI分析</li>
          </ul>
        </div>
        
        <button onclick="testConnection()">测试连接</button>
        <div id="result"></div>
        
        <script>
          function testConnection() {
            fetch('/ping')
              .then(r => r.text())
              .then(data => {
                document.getElementById('result').innerHTML = 
                  '<div class="status">✅ ' + data + '</div>';
              });
          }
        </script>
      </body>
      </html>
    `);
    return;
  }
  
  // Ping 测试
  if (url === '/ping' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('服务器运行正常');
    return;
  }
  
  // ✅ 原有数据接收接口（100% 兼容）
  if (url === '/api/health-data' && method === 'POST') {
    let body = '';
    
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        
        console.log('\n════════════════════════════════════════════════════════════');
        console.log('🎉🎉🎉 收到健康数据！🎉🎉🎉');
        console.log('════════════════════════════════════════════════════════════');
        console.log(`📅 时间: ${new Date().toLocaleString('zh-CN')}`);
        console.log(`📊 数据类型: ${data.type}`);
        console.log(`📦 数据条数: ${data.count}`);
        console.log(`👤 工人ID: ${data.worker_id || '未指定'}`);
        console.log('\n📋 完整数据:');
        console.log(JSON.stringify(data, null, 2));
        console.log('────────────────────────────────────────────────────────────');
        
        // 处理每条数据
        for (const item of data.data) {
          // 1. 获取设备ID
          const deviceId = String(item.deviceId);
          
          // 2. 查找设备关联的工人ID
          let workerId = data.worker_id; // 优先使用手表传来的 worker_id
          
          if (!workerId) {
            const device = await deviceDB.getByDeviceId(deviceId);
            if (device && device.worker_id) {
              workerId = device.worker_id;
            } else {
              // 如果设备未绑定，使用设备ID作为临时工人ID
              workerId = `TEMP_${deviceId}`;
              console.log(`⚠️ 设备 ${deviceId} 未绑定工人，使用临时ID: ${workerId}`);
            }
          }
          
          // 3. 安全检测
          const safetyResult = checkSafety(item);
          
          // 4. 准备实时数据
          const realtimeData = {
            worker_id: workerId,
            device_id: deviceId,
            heart_rate_current: item.heartRate?.current || 0,
            heart_rate_last: item.heartRate?.last || 0,
            heart_rate_resting: item.heartRate?.resting || 0,
            heart_rate_daily_max: item.heartRate?.dailyMaximum?.value || 0,
            blood_oxygen_value: item.bloodOxygen?.value || 0,
            blood_oxygen_time: item.bloodOxygen?.time || 0,
            stress_value: item.stress?.value || 0,
            stress_time: item.stress?.time || 0,
            stress_today_avg: item.stress?.todayAverage || 0,
            body_temperature: item.bodyTemperature?.current || 0,
            steps: item.step?.current || 0,
            calories: item.calorie?.current || 0,
            distance: item.distance || 0,
            air_pressure: item.barometer?.airPressure || 0,
            altitude: item.barometer?.altitude || 0,
            is_safe: safetyResult.isSafe,
            alert_level: safetyResult.alertLevel,
            alert_message: safetyResult.alertMessage,
            timestamp: item.timestamp
          };
          
          // 5. 保存到实时数据表
          await realtimeDB.upsert(realtimeData);
          
          // 6. 保存到历史数据表
          await historyDB.add({
            worker_id: workerId,
            device_id: deviceId,
            full_data: item,
            heart_rate: item.heartRate?.last || 0,
            blood_oxygen: item.bloodOxygen?.value || 0,
            stress: item.stress?.value || 0,
            timestamp: item.timestamp
          });
          
          // 7. 更新设备最后在线时间
          await deviceDB.updateLastSeen(deviceId);
          
          // 8. 如果有报警，保存报警记录
          if (safetyResult.alerts && safetyResult.alerts.length > 0) {
            for (const alert of safetyResult.alerts) {
              await alertDB.create({
                worker_id: workerId,
                device_id: deviceId,
                alert_type: alert.type,
                alert_level: alert.level,
                alert_message: alert.message,
                trigger_data: JSON.stringify(alert)
              });
            }
          }
          
          // 9. WebSocket 广播更新
          broadcastUpdate({
            type: 'realtime_update',
            worker_id: workerId,
            device_id: deviceId,
            data: realtimeData,
            safety: safetyResult
          });
          
          console.log(`\n✅ 工人 ${workerId} 数据已保存到数据库`);
          console.log(`   设备ID: ${deviceId}`);
          console.log(`   心率: ${item.heartRate?.last || 0} bpm (静息: ${item.heartRate?.resting || 0})`);
          console.log(`   血氧: ${item.bloodOxygen?.value || 0}%`);
          console.log(`   压力: ${item.stress?.value || 0}`);
          console.log(`   体温: ${item.bodyTemperature?.current || 0}°C`);
          console.log(`   步数: ${item.step?.current || 0}`);
          console.log(`   深度: ${item.barometer?.altitude || 0} m`);
          console.log(`   气压: ${item.barometer?.airPressure || 0} hPa`);
          
          if (safetyResult.alertLevel > 0) {
            console.log(`   ⚠️  安全状态: ${safetyResult.alertMessage || '异常'}`);
            console.log(`   报警级别: ${safetyResult.alertLevel} (${safetyResult.alertLevel === 3 ? '危险' : safetyResult.alertLevel === 2 ? '警告' : '低风险'})`);
          } else {
            console.log(`   ✅ 安全状态: 正常`);
          }
        }
        
        console.log('\n════════════════════════════════════════════════════════════');
        console.log('✅ 数据处理完成');
        console.log('════════════════════════════════════════════════════════════\n');
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: '数据接收成功' }));
        
      } catch (error) {
        console.error('❌ 处理数据失败:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: error.message }));
      }
    });
    return;
  }
  
  // ============================================
  // 新增 Web API 接口
  // ============================================
  
  // ============================================
  // 员工管理API（需要管理员权限）
  // ============================================
  
  // GET /api/workers/:workerId/detail（获取员工详情）
  if (url.match(/^\/api\/workers\/[^\/]+\/detail$/) && method === 'GET') {
    const workerId = url.split('/')[3];
    await workerHandlers.getDetail(req, res, workerId);
    return;
  }
  
  // DELETE /api/workers/:workerId（删除员工）
  if (url.match(/^\/api\/workers\/[^\/]+$/) && method === 'DELETE') {
    const workerId = url.split('/')[3];
    await workerHandlers.delete(req, res, workerId);
    return;
  }
  
  // PUT /api/workers/:workerId（更新员工）
  if (url.match(/^\/api\/workers\/[^\/]+$/) && method === 'PUT') {
    const workerId = url.split('/')[3];
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      await workerHandlers.update(req, res, body, workerId);
    });
    return;
  }
  
  // GET /api/workers/:workerId（获取单个员工 - 保持兼容）
  if (url.match(/^\/api\/workers\/[^\/]+$/) && method === 'GET') {
    try {
      const workerId = url.split('/')[3];
      const worker = await workerDB.getById(workerId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(worker));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }
  
  // POST /api/workers（添加新员工）
  if (url === '/api/workers' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      await workerHandlers.add(req, res, body);
    });
    return;
  }
  
  // GET /api/workers（获取员工列表 - 增强版）
  if (url.startsWith('/api/workers') && method === 'GET' && !url.match(/\/api\/workers\/[^\/]+/)) {
    await workerHandlers.getAll(req, res);
    return;
  }
  
  // ============================================
  // 操作日志API
  // ============================================
  
  // GET /api/logs/operations（获取操作日志）
  if (url.startsWith('/api/logs/operations') && method === 'GET') {
    await operationLogHandlers.getAll(req, res);
    return;
  }
  
  // ============================================
  // 设备管理API（需要管理员权限）
  // ============================================
  
  // GET /api/devices/:deviceId/detail（获取设备详情）
  if (url.match(/^\/api\/devices\/[^\/]+\/detail$/) && method === 'GET') {
    const deviceId = url.split('/')[3];
    await deviceHandlers.getDetail(req, res, deviceId);
    return;
  }
  
  // POST /api/devices/:deviceId/bind（绑定设备）
  if (url.match(/^\/api\/devices\/[^\/]+\/bind$/) && method === 'POST') {
    const deviceId = url.split('/')[3];
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      await deviceHandlers.bind(req, res, body, deviceId);
    });
    return;
  }
  
  // POST /api/devices/:deviceId/unbind（解绑设备）
  if (url.match(/^\/api\/devices\/[^\/]+\/unbind$/) && method === 'POST') {
    const deviceId = url.split('/')[3];
    await deviceHandlers.unbind(req, res, deviceId);
    return;
  }
  
  // DELETE /api/devices/:deviceId（删除设备）
  if (url.match(/^\/api\/devices\/[^\/]+$/) && method === 'DELETE') {
    const deviceId = url.split('/')[3];
    await deviceHandlers.delete(req, res, deviceId);
    return;
  }
  
  // PUT /api/devices/:deviceId（更新设备）
  if (url.match(/^\/api\/devices\/[^\/]+$/) && method === 'PUT') {
    const deviceId = url.split('/')[3];
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      await deviceHandlers.update(req, res, body, deviceId);
    });
    return;
  }
  
  // 设备统计（保持原有）
  if (url === '/api/devices/stats' && method === 'GET') {
    try {
      const stats = await deviceDB.getStats();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(stats));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }
  
  // POST /api/devices（添加新设备）
  if (url === '/api/devices' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      await deviceHandlers.add(req, res, body);
    });
    return;
  }
  
  // GET /api/devices（获取设备列表 - 增强版）
  if (url.startsWith('/api/devices') && method === 'GET') {
    await deviceHandlers.getAll(req, res);
    return;
  }
  
  // 绑定设备到工人
  if (url === '/api/devices/bind' && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const data = JSON.parse(body);
        const { device_id, worker_id } = data;
        
        if (!device_id || !worker_id) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: '缺少 device_id 或 worker_id' }));
          return;
        }
        
        // 检查设备是否存在
        const device = await deviceDB.getByDeviceId(device_id);
        
        if (device) {
          // 设备已存在，更新绑定
          await deviceDB.bindWorker(device_id, worker_id);
          console.log(`✅ 设备 ${device_id} 已重新绑定到工人 ${worker_id}`);
        } else {
          // 设备不存在，创建新设备
          await run(
            'INSERT INTO devices (device_id, worker_id, device_model, is_active) VALUES (?, ?, ?, ?)',
            [device_id, worker_id, 'Unknown', 1]
          );
          console.log(`✅ 新设备 ${device_id} 已创建并绑定到工人 ${worker_id}`);
        }
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          success: true, 
          message: `设备 ${device_id} 已绑定到工人 ${worker_id}` 
        }));
      } catch (error) {
        console.error('❌ 设备绑定失败:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }
  
  // 实时数据 - 所有工人
  if (url === '/api/realtime/all' && method === 'GET') {
    try {
      const data = await realtimeDB.getAll();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }
  
  // 实时数据 - 单个工人
  if (url.startsWith('/api/realtime/') && method === 'GET') {
    try {
      const workerId = url.split('/')[3];
      const data = await realtimeDB.getByWorkerId(workerId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }
  
  // 历史数据
  if (url.startsWith('/api/history/') && method === 'GET') {
    try {
      const parts = url.split('?');
      const workerId = parts[0].split('/')[3];
      
      // 解析查询参数
      const params = new URLSearchParams(parts[1] || '');
      const options = {
        start: params.get('start'),
        end: params.get('end'),
        limit: parseInt(params.get('limit')) || 100
      };
      
      const data = await historyDB.getByWorkerId(workerId, options);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }
  
  // 未处理报警
  if (url === '/api/alerts/pending' && method === 'GET') {
    try {
      const alerts = await alertDB.getPending();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(alerts));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }
  
  // 所有报警
  if (url.startsWith('/api/alerts') && method === 'GET') {
    try {
      const params = new URLSearchParams(url.split('?')[1] || '');
      const options = {
        worker_id: params.get('worker_id'),
        level: params.get('level')
      };
      const alerts = await alertDB.getAll(options);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(alerts));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }
  
  // 处理报警
  if (url.match(/^\/api\/alerts\/\d+\/handle$/) && method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const alertId = url.split('/')[3];
        const data = JSON.parse(body);
        await alertDB.handle(alertId, data);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
    return;
  }
  
  // ============================================
  // RAG API 接口 (新增)
  // ============================================
  
  // 上传文档
  if (url === '/api/rag/upload' && method === 'POST') {
    await handleUpload(req, res);
    return;
  }
  
  // 获取文档列表
  if (url.startsWith('/api/rag/documents') && method === 'GET' && !url.match(/\/api\/rag\/documents\/[^\/]+$/)) {
    await handleGetDocuments(req, res);
    return;
  }
  
  // 删除文档
  if (url.match(/^\/api\/rag\/documents\/[^\/]+$/) && method === 'DELETE') {
    const docId = url.split('/')[4];
    await handleDeleteDocument(req, res, docId);
    return;
  }
  
  // RAG查询
  if (url.startsWith('/api/rag/query') && method === 'GET') {
    await handleQuery(req, res);
    return;
  }
  
  // 查询历史
  if (url === '/api/rag/history' && method === 'GET') {
    await handleGetHistory(req, res);
    return;
  }
  
  // RAG统计
  if (url === '/api/rag/stats' && method === 'GET') {
    await handleGetStats(req, res);
    return;
  }
  
  // ============================================
  // AI 分析 API
  // ============================================
  
  // AI 分析
  if (url.match(/^\/api\/ai\/analyze\/\w+/) && method === 'POST') {
    try {
      const workerId = url.split('/')[4];
      
      // 检查是否使用RAG
      const urlObj = new URL(url, `http://${req.headers.host}`);
      const useRAG = urlObj.searchParams.get('use_rag') === 'true';
      
      console.log(`🤖 开始 AI 分析 - 工人: ${workerId}${useRAG ? ' (使用RAG)' : ''}`);
      
      // 获取工人信息
      const worker = await workerDB.getById(workerId);
      if (!worker) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '工人不存在' }));
        return;
      }
      
      // 获取实时数据
      const realtime = await realtimeDB.getByWorkerId(workerId);
      if (!realtime) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '无实时数据' }));
        return;
      }
      
      // 获取最近1小时历史数据
      const history = await historyDB.getRecentByWorkerId(workerId, 60);
      
      // 安全检测
      const safetyCheck = checkSafety({
        heartRate: { last: realtime.heart_rate_last },
        bloodOxygen: { value: realtime.blood_oxygen_value },
        stress: { value: realtime.stress_value },
        barometer: { altitude: realtime.altitude },
        bodyTemperature: { current: realtime.body_temperature }
      });
      
      // 执行 AI 分析（支持RAG）
      const analysis = await performAnalysis(worker, realtime, history, safetyCheck, useRAG);
      
      // 保存分析结果
      await aiDB.save(analysis);
      
      // 返回结果
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(analysis));
      
      console.log(`✅ AI 分析完成 - 风险等级: ${analysis.risk_level}`);
      
    } catch (error) {
      console.error('❌ AI 分析失败:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }
  
  // AI 分析历史
  if (url.match(/^\/api\/ai\/history\/\w+$/) && method === 'GET') {
    try {
      const workerId = url.split('/')[4];
      const history = await aiDB.getByWorkerId(workerId);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(history));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }
  
  // 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('404 Not Found');
});

// ============================================
// WebSocket 服务器
// ============================================

const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('🔌 WebSocket 客户端连接');
  wsClients.add(ws);
  
  ws.on('close', () => {
    console.log('🔌 WebSocket 客户端断开');
    wsClients.delete(ws);
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket 错误:', error);
  });
});

/**
 * 广播更新到所有 WebSocket 客户端
 */
function broadcastUpdate(data) {
  const message = JSON.stringify(data);
  
  wsClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// ============================================
// 启动服务器
// ============================================

async function start() {
  try {
    // 初始化数据库
    await initDatabase();
    
    // 启动 HTTP 服务器
    server.listen(PORT, HOSTNAME, () => {
      console.log('\n════════════════════════════════════════════════════════════');
      console.log('🏭 深地矿井健康监测系统已启动！');
      console.log('════════════════════════════════════════════════════════════');
      console.log(`📡 HTTP 服务器: http://${HOSTNAME}:${PORT}`);
      console.log(`🔌 WebSocket 服务器: ws://${HOSTNAME}:${PORT}`);
      console.log('════════════════════════════════════════════════════════════');
      console.log('⏳ 等待接收手表数据...\n');
    });
    
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

// 启动服务器
start();

// 优雅关闭
process.on('SIGINT', () => {
  console.log('\n🛑 正在关闭服务器...');
  server.close(() => {
    console.log('✅ 服务器已关闭');
    process.exit(0);
  });
});

