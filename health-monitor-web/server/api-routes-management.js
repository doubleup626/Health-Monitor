/**
 * 管理API路由 - 设备和员工管理
 * 这些API需要管理员权限
 */

const { deviceDBExtensions, workerDBExtensions } = require('./database-extensions');
const { workerDB, deviceDB, operationLogDB } = require('./database');

/**
 * 简单的权限验证中间件
 * 演示模式：允许所有操作
 * TODO: 生产环境应实现真实的身份验证
 */
function requireAdmin(req) {
  // 演示模式：允许所有操作
  // 生产环境应该检查 JWT token 或 session
  // 例如：
  // const token = req.headers.authorization?.split(' ')[1];
  // if (!token) throw new Error('未登录');
  // const user = verifyToken(token);
  // if (!user.isAdmin) throw new Error('需要管理员权限');
  // return user.username;
  
  return 'admin'; // 演示模式下，所有操作都以 'admin' 身份执行
}

/**
 * 设备管理API处理器
 */
const deviceHandlers = {
  /**
   * GET /api/devices (增强版)
   * 获取设备列表（支持分页、筛选、排序）
   */
  async getAll(req, res) {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const params = url.searchParams;
      
      const options = {
        page: params.get('page'),
        limit: params.get('limit'),
        status: params.get('status'),
        search: params.get('search'),
        sort: params.get('sort'),
        order: params.get('order')
      };
      
      const devices = await deviceDBExtensions.getAllEnhanced(options);
      const total = await deviceDBExtensions.getCount(options);
      
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: true,
        data: {
          devices,
          total,
          page: parseInt(options.page) || 1,
          limit: parseInt(options.limit) || 20,
          total_pages: Math.ceil(total / (parseInt(options.limit) || 20))
        }
      }));
    } catch (error) {
      console.error('获取设备列表失败:', error);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  },
  
  /**
   * POST /api/devices
   * 添加新设备
   */
  async add(req, res, body) {
    try {
      const operator = requireAdmin(req);
      const data = JSON.parse(body);
      
      // 验证必填字段
      if (!data.device_id || !data.device_model) {
        throw new Error('device_id 和 device_model 为必填字段');
      }
      
      const result = await deviceDBExtensions.add(data, operator);
      
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: true,
        message: '设备添加成功',
        data: {
          id: result.lastID,
          device_id: data.device_id
        }
      }));
    } catch (error) {
      console.error('添加设备失败:', error);
      const statusCode = error.message.includes('权限') ? 403 : 400;
      res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  },
  
  /**
   * PUT /api/devices/:deviceId
   * 更新设备信息
   */
  async update(req, res, body, deviceId) {
    try {
      const operator = requireAdmin(req);
      const data = JSON.parse(body);
      
      await deviceDBExtensions.updateDevice(deviceId, data, operator);
      
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: true,
        message: '设备信息更新成功'
      }));
    } catch (error) {
      console.error('更新设备失败:', error);
      const statusCode = error.message.includes('权限') ? 403 : 400;
      res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  },
  
  /**
   * DELETE /api/devices/:deviceId
   * 删除设备
   */
  async delete(req, res, deviceId) {
    try {
      const operator = requireAdmin(req);
      
      await deviceDBExtensions.deleteDevice(deviceId, operator);
      
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: true,
        message: '设备删除成功'
      }));
    } catch (error) {
      console.error('删除设备失败:', error);
      const statusCode = error.message.includes('权限') ? 403 : 400;
      res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  },
  
  /**
   * POST /api/devices/:deviceId/bind
   * 绑定设备到工人
   */
  async bind(req, res, body, deviceId) {
    try {
      const operator = requireAdmin(req);
      const data = JSON.parse(body);
      
      if (!data.worker_id) {
        throw new Error('worker_id 为必填字段');
      }
      
      await deviceDBExtensions.bindDevice(deviceId, data.worker_id, operator);
      
      // 获取绑定后的信息
      const device = await deviceDB.getByDeviceId(deviceId);
      const worker = await workerDB.getById(data.worker_id);
      
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: true,
        message: '设备绑定成功',
        data: {
          device_id: deviceId,
          worker_id: data.worker_id,
          worker_name: worker ? worker.name : null
        }
      }));
    } catch (error) {
      console.error('绑定设备失败:', error);
      const statusCode = error.message.includes('权限') ? 403 : 400;
      res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  },
  
  /**
   * POST /api/devices/:deviceId/unbind
   * 解绑设备
   */
  async unbind(req, res, deviceId) {
    try {
      const operator = requireAdmin(req);
      
      await deviceDBExtensions.unbindDevice(deviceId, operator);
      
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: true,
        message: '设备解绑成功'
      }));
    } catch (error) {
      console.error('解绑设备失败:', error);
      const statusCode = error.message.includes('权限') ? 403 : 400;
      res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  },
  
  /**
   * GET /api/devices/:deviceId/detail
   * 获取设备详细信息
   */
  async getDetail(req, res, deviceId) {
    try {
      const detail = await deviceDBExtensions.getDetail(deviceId);
      
      if (!detail) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: '设备不存在' }));
        return;
      }
      
      // 调试日志
      console.log('📱 设备详情API返回数据:');
      console.log('  完整数据结构:', JSON.stringify(detail, null, 2).substring(0, 500));
      console.log('  设备ID:', detail.device_id);
      console.log('  设备型号:', detail.device_model);
      console.log('  绑定员工:', detail.worker_id || '未绑定');
      console.log('  员工姓名:', detail.worker_name || '未绑定');
      console.log('  创建时间:', detail.created_at);
      
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: true,
        data: detail
      }));
    } catch (error) {
      console.error('获取设备详情失败:', error);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  }
};

/**
 * 员工管理API处理器
 */
const workerHandlers = {
  /**
   * GET /api/workers (增强版)
   * 获取员工列表（支持分页、筛选、排序）
   */
  async getAll(req, res) {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const params = url.searchParams;
      
      const options = {
        page: params.get('page'),
        limit: params.get('limit'),
        position: params.get('position'),
        team: params.get('team'),
        status: params.get('status'),
        search: params.get('search'),
        sort: params.get('sort'),
        order: params.get('order')
      };
      
      const workers = await workerDBExtensions.getAllEnhanced(options);
      const total = await workerDBExtensions.getCount(options);
      
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: true,
        data: {
          workers,
          total,
          page: parseInt(options.page) || 1,
          limit: parseInt(options.limit) || 20,
          total_pages: Math.ceil(total / (parseInt(options.limit) || 20))
        }
      }));
    } catch (error) {
      console.error('获取员工列表失败:', error);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  },
  
  /**
   * POST /api/workers
   * 添加新员工
   */
  async add(req, res, body) {
    try {
      const operator = requireAdmin(req);
      const data = JSON.parse(body);
      
      // 验证必填字段
      if (!data.worker_id || !data.name) {
        throw new Error('worker_id 和 name 为必填字段');
      }
      
      const result = await workerDBExtensions.add(data, operator);
      
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: true,
        message: '员工添加成功',
        data: {
          id: result.lastID,
          worker_id: data.worker_id,
          name: data.name
        }
      }));
    } catch (error) {
      console.error('添加员工失败:', error);
      const statusCode = error.message.includes('权限') ? 403 : 400;
      res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  },
  
  /**
   * PUT /api/workers/:workerId
   * 更新员工信息
   */
  async update(req, res, body, workerId) {
    try {
      const operator = requireAdmin(req);
      const data = JSON.parse(body);
      
      await workerDBExtensions.updateWorker(workerId, data, operator);
      
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: true,
        message: '员工信息更新成功'
      }));
    } catch (error) {
      console.error('更新员工失败:', error);
      const statusCode = error.message.includes('权限') ? 403 : 400;
      res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  },
  
  /**
   * DELETE /api/workers/:workerId
   * 删除员工
   */
  async delete(req, res, workerId) {
    try {
      const operator = requireAdmin(req);
      
      await workerDBExtensions.deleteWorker(workerId, operator);
      
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: true,
        message: '员工删除成功'
      }));
    } catch (error) {
      console.error('删除员工失败:', error);
      const statusCode = error.message.includes('权限') ? 403 : 400;
      res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  },
  
  /**
   * GET /api/workers/:workerId/detail
   * 获取员工详细信息
   */
  async getDetail(req, res, workerId) {
    try {
      const detail = await workerDBExtensions.getDetail(workerId);
      
      if (!detail) {
        res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ success: false, error: '员工不存在' }));
        return;
      }
      
      // 调试日志
      console.log('📊 员工详情API返回数据:');
      console.log('  完整数据结构:', JSON.stringify(detail, null, 2).substring(0, 500));
      console.log('  工号:', detail.worker_id);
      console.log('  姓名:', detail.name);
      console.log('  年龄:', detail.age);
      console.log('  职位:', detail.position);
      console.log('  班组:', detail.team);
      console.log('  设备:', detail.device_id || '未绑定');
      console.log('  创建时间:', detail.created_at);
      
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: true,
        data: detail
      }));
    } catch (error) {
      console.error('获取员工详情失败:', error);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  }
};

/**
 * 操作日志API处理器
 */
const operationLogHandlers = {
  /**
   * GET /api/logs/operations
   * 获取操作日志
   */
  async getAll(req, res) {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`);
      const params = url.searchParams;
      
      const options = {
        page: params.get('page'),
        limit: params.get('limit'),
        type: params.get('type'),
        target_type: params.get('target_type'),
        start_date: params.get('start_date'),
        end_date: params.get('end_date')
      };
      
      const logs = await operationLogDB.getAll(options);
      const total = await operationLogDB.getCount(options);
      
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({
        success: true,
        data: {
          logs,
          total,
          page: parseInt(options.page) || 1,
          limit: parseInt(options.limit) || 50
        }
      }));
    } catch (error) {
      console.error('获取操作日志失败:', error);
      res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
  }
};

module.exports = {
  deviceHandlers,
  workerHandlers,
  operationLogHandlers
};

