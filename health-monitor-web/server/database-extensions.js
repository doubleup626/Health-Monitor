/**
 * 数据库扩展方法 - 设备和员工管理
 * 这些方法扩展了原有的 database.js
 */

const { query, queryOne, run, transaction, operationLogDB } = require('./database');

/**
 * 设备管理扩展方法
 */
const deviceDBExtensions = {
  /**
   * 获取所有设备（增强版）- 支持分页、筛选、排序
   */
  async getAllEnhanced(options = {}) {
    let sql = `
      SELECT 
        d.*,
        w.name as worker_name,
        w.position as worker_position,
        w.team as worker_team,
        CASE 
          WHEN d.last_seen > datetime('now', 'localtime', '-2 minutes') THEN 1
          ELSE 0
        END as is_online
      FROM devices d
      LEFT JOIN workers w ON d.worker_id = w.worker_id
      WHERE 1=1
    `;
    const params = [];
    
    // 筛选条件
    if (options.status) {
      if (options.status === 'bound') {
        sql += ' AND d.worker_id IS NOT NULL';
      } else if (options.status === 'unbound') {
        sql += ' AND d.worker_id IS NULL';
      } else if (options.status === 'online') {
        sql += ` AND d.last_seen > datetime('now', 'localtime', '-2 minutes')`;
      } else if (options.status === 'offline') {
        sql += ` AND (d.last_seen IS NULL OR d.last_seen <= datetime('now', 'localtime', '-2 minutes'))`;
      }
    }
    
    if (options.search) {
      sql += ' AND (d.device_id LIKE ? OR w.name LIKE ?)';
      params.push(`%${options.search}%`, `%${options.search}%`);
    }
    
    // 排序
    const sortField = options.sort || 'created_at';
    const sortOrder = options.order === 'asc' ? 'ASC' : 'DESC';
    sql += ` ORDER BY d.${sortField} ${sortOrder}`;
    
    // 分页
    const page = parseInt(options.page) || 1;
    const limit = parseInt(options.limit) || 20;
    const offset = (page - 1) * limit;
    
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    return await query(sql, params);
  },
  
  /**
   * 获取设备总数
   */
  async getCount(options = {}) {
    let sql = 'SELECT COUNT(*) as total FROM devices d WHERE 1=1';
    const params = [];
    
    if (options.status === 'bound') {
      sql += ' AND d.worker_id IS NOT NULL';
    } else if (options.status === 'unbound') {
      sql += ' AND d.worker_id IS NULL';
    }
    
    if (options.search) {
      sql += ' AND device_id LIKE ?';
      params.push(`%${options.search}%`);
    }
    
    const result = await queryOne(sql, params);
    return result.total;
  },
  
  /**
   * 添加新设备
   */
  async add(data, operator = 'admin') {
    // 检查设备ID是否已存在
    const existing = await queryOne('SELECT * FROM devices WHERE device_id = ?', [data.device_id]);
    if (existing) {
      throw new Error('设备ID已存在');
    }
    
    // 添加设备
    const sql = `
      INSERT INTO devices (
        device_id, device_model, firmware_version, worker_id, notes, status
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;
    const result = await run(sql, [
      data.device_id,
      data.device_model,
      data.firmware_version || null,
      data.worker_id || null,
      data.notes || null,
      'active'
    ]);
    
    // 记录操作日志
    await operationLogDB.log({
      operation_type: 'add_device',
      operator,
      target_type: 'device',
      target_id: data.device_id,
      description: `添加设备：${data.device_id} (${data.device_model})`,
      details: data
    });
    
    return result;
  },
  
  /**
   * 更新设备信息
   */
  async updateDevice(deviceId, data, operator = 'admin') {
    // 检查设备是否存在
    const device = await queryOne('SELECT * FROM devices WHERE device_id = ?', [deviceId]);
    if (!device) {
      throw new Error('设备不存在');
    }
    
    const sql = `
      UPDATE devices SET
        device_model = ?,
        firmware_version = ?,
        notes = ?,
        status = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE device_id = ?
    `;
    const result = await run(sql, [
      data.device_model || device.device_model,
      data.firmware_version || device.firmware_version,
      data.notes !== undefined ? data.notes : device.notes,
      data.status || device.status,
      deviceId
    ]);
    
    // 记录操作日志
    await operationLogDB.log({
      operation_type: 'edit_device',
      operator,
      target_type: 'device',
      target_id: deviceId,
      description: `更新设备信息：${deviceId}`,
      details: { old: device, new: data }
    });
    
    return result;
  },
  
  /**
   * 删除设备（真删除）
   */
  async deleteDevice(deviceId, operator = 'admin') {
    // 检查设备是否存在
    const device = await queryOne('SELECT * FROM devices WHERE device_id = ?', [deviceId]);
    if (!device) {
      throw new Error('设备不存在');
    }
    
    // 自动解绑（如果已绑定）
    if (device.worker_id) {
      console.log(`🔓 自动解绑设备 ${deviceId} 与员工 ${device.worker_id} 的绑定`);
      // worker_id 字段会因为删除设备而自动清除
    }
    
    // 真正删除（从数据库永久删除）
    const result = await run('DELETE FROM devices WHERE device_id = ?', [deviceId]);
    
    // 记录操作日志
    await operationLogDB.log({
      operation_type: 'delete_device',
      operator,
      target_type: 'device',
      target_id: deviceId,
      description: `删除设备：${deviceId}`,
      details: device
    });
    
    return result;
  },
  
  /**
   * 绑定设备到工人
   */
  async bindDevice(deviceId, workerId, operator = 'admin') {
    // 检查设备是否存在
    const device = await queryOne('SELECT * FROM devices WHERE device_id = ?', [deviceId]);
    if (!device) {
      throw new Error('设备不存在');
    }
    
    // 检查工人是否存在
    const worker = await queryOne('SELECT * FROM workers WHERE worker_id = ?', [workerId]);
    if (!worker) {
      throw new Error('工人不存在');
    }
    
    // 检查设备是否已绑定其他工人
    if (device.worker_id && device.worker_id !== workerId) {
      throw new Error(`设备已绑定到工人 ${device.worker_id}，请先解绑`);
    }
    
    // 检查工人是否已绑定其他设备
    const workerDevice = await queryOne(
      'SELECT * FROM devices WHERE worker_id = ? AND device_id != ?',
      [workerId, deviceId]
    );
    if (workerDevice) {
      throw new Error(`工人已绑定设备 ${workerDevice.device_id}，一个工人只能绑定一个设备`);
    }
    
    // 绑定设备
    const result = await run(
      'UPDATE devices SET worker_id = ?, bound_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE device_id = ?',
      [workerId, deviceId]
    );
    
    // 记录操作日志
    await operationLogDB.log({
      operation_type: 'bind_device',
      operator,
      target_type: 'device',
      target_id: deviceId,
      description: `将设备 ${deviceId} 绑定到工人 ${workerId} (${worker.name})`,
      details: { device_id: deviceId, worker_id: workerId, worker_name: worker.name }
    });
    
    return result;
  },
  
  /**
   * 解绑设备
   */
  async unbindDevice(deviceId, operator = 'admin') {
    // 检查设备是否存在
    const device = await queryOne('SELECT * FROM devices WHERE device_id = ?', [deviceId]);
    if (!device) {
      throw new Error('设备不存在');
    }
    
    if (!device.worker_id) {
      throw new Error('设备未绑定任何工人');
    }
    
    const oldWorkerId = device.worker_id;
    const worker = await queryOne('SELECT * FROM workers WHERE worker_id = ?', [oldWorkerId]);
    
    // 解绑设备
    const result = await run(
      'UPDATE devices SET worker_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE device_id = ?',
      [deviceId]
    );
    
    // 记录操作日志
    await operationLogDB.log({
      operation_type: 'unbind_device',
      operator,
      target_type: 'device',
      target_id: deviceId,
      description: `将设备 ${deviceId} 从工人 ${oldWorkerId} (${worker ? worker.name : '未知'}) 解绑`,
      details: { device_id: deviceId, worker_id: oldWorkerId }
    });
    
    return result;
  },
  
  /**
   * 获取设备详细信息（包含统计）
   */
  async getDetail(deviceId) {
    // 设备基本信息
    const device = await queryOne(`
      SELECT 
        d.*,
        w.name as worker_name,
        w.worker_id,
        w.position as worker_position,
        w.team as worker_team,
        CASE 
          WHEN d.last_seen > datetime('now', 'localtime', '-2 minutes') THEN 1
          ELSE 0
        END as is_online
      FROM devices d
      LEFT JOIN workers w ON d.worker_id = w.worker_id
      WHERE d.device_id = ?
    `, [deviceId]);
    
    if (!device) {
      return null;
    }
    
    // 设备统计信息
    const stats = {
      total_records: 0,
      last_upload: null,
      health_score: null
    };
    
    if (device.worker_id) {
      // 总数据量
      const totalCount = await queryOne(
        'SELECT COUNT(*) as count FROM health_history WHERE device_id = ?',
        [deviceId]
      );
      stats.total_records = totalCount.count;
      
      // 最近上传时间（从 health_history 或 health_realtime）
      const lastUpload = await queryOne(`
        SELECT MAX(received_at) as last_time FROM health_history WHERE device_id = ?
      `, [deviceId]);
      stats.last_upload = lastUpload?.last_time || device.last_seen;
      
      // 计算健康指数（基于最近的数据）
      const recentData = await queryOne(`
        SELECT heart_rate_last, blood_oxygen_value, stress_value, alert_level
        FROM health_realtime
        WHERE worker_id = ?
      `, [device.worker_id]);
      
      if (recentData) {
        // 简单的健康指数计算：100分制
        let score = 100;
        
        // 心率异常扣分（正常范围 60-100）
        const heartRate = recentData.heart_rate_last || 0;
        if (heartRate > 0) {
          if (heartRate < 50 || heartRate > 110) score -= 30;
          else if (heartRate < 60 || heartRate > 100) score -= 15;
        }
        
        // 血氧异常扣分（正常 >= 95）
        const oxygen = recentData.blood_oxygen_value || 0;
        if (oxygen > 0) {
          if (oxygen < 90) score -= 30;
          else if (oxygen < 95) score -= 15;
        }
        
        // 压力值扣分（正常 <= 50）
        const stress = recentData.stress_value || 0;
        if (stress > 70) score -= 20;
        else if (stress > 50) score -= 10;
        
        // 报警级别扣分
        const alertLevel = recentData.alert_level || 0;
        if (alertLevel === 3) score -= 40;
        else if (alertLevel === 2) score -= 20;
        
        stats.health_score = Math.max(0, Math.min(100, score));
      } else {
        stats.health_score = null;  // 无数据时为 null
      }
    }
    
    // 返回扁平化结构（合并 device 对象和 stats）
    return {
      ...device,
      stats
    };
  }
};

/**
 * 员工管理扩展方法
 */
const workerDBExtensions = {
  /**
   * 获取所有员工（增强版）- 支持分页、筛选、排序
   */
  async getAllEnhanced(options = {}) {
    let sql = `
      SELECT 
        w.*,
        d.device_id,
        d.device_model,
        CASE 
          WHEN d.last_seen > datetime('now', 'localtime', '-2 minutes') THEN 1
          ELSE 0
        END as device_online
      FROM workers w
      LEFT JOIN devices d ON w.worker_id = d.worker_id
      WHERE 1=1
    `;
    const params = [];
    
    // 默认只查询在职员工（除非明确指定status或include_all）
    if (options.status) {
      // 用户明确指定了状态（可能是 'active' 或 'resigned'）
      sql += ' AND w.status = ?';
      params.push(options.status);
    } else if (options.include_all !== 'true') {
      // 默认只显示在职员工
      sql += ' AND w.status = ?';
      params.push('active');
    }
    // 如果 include_all='true'，则不添加状态筛选，显示所有员工
    
    // 筛选条件
    if (options.position) {
      sql += ' AND w.position = ?';
      params.push(options.position);
    }
    
    if (options.team) {
      sql += ' AND w.team = ?';
      params.push(options.team);
    }
    
    if (options.search) {
      sql += ' AND (w.worker_id LIKE ? OR w.name LIKE ?)';
      params.push(`%${options.search}%`, `%${options.search}%`);
    }
    
    // 排序
    const sortField = options.sort || 'created_at';
    const sortOrder = options.order === 'asc' ? 'ASC' : 'DESC';
    sql += ` ORDER BY w.${sortField} ${sortOrder}`;
    
    // 分页
    const page = parseInt(options.page) || 1;
    const limit = parseInt(options.limit) || 20;
    const offset = (page - 1) * limit;
    
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    return await query(sql, params);
  },
  
  /**
   * 获取员工总数
   */
  async getCount(options = {}) {
    let sql = 'SELECT COUNT(*) as total FROM workers WHERE 1=1';
    const params = [];
    
    // 默认只计数在职员工（除非明确指定status或include_all）
    if (options.status) {
      sql += ' AND status = ?';
      params.push(options.status);
    } else if (options.include_all !== 'true') {
      sql += ' AND status = ?';
      params.push('active');
    }
    
    if (options.position) {
      sql += ' AND position = ?';
      params.push(options.position);
    }
    
    if (options.team) {
      sql += ' AND team = ?';
      params.push(options.team);
    }
    
    if (options.search) {
      sql += ' AND (worker_id LIKE ? OR name LIKE ?)';
      params.push(`%${options.search}%`, `%${options.search}%`);
    }
    
    const result = await queryOne(sql, params);
    return result.total;
  },
  
  /**
   * 添加新员工
   */
  async add(data, operator = 'admin') {
    // 检查工号是否已被在职员工使用
    const existing = await queryOne(
      "SELECT * FROM workers WHERE worker_id = ? AND status = 'active'", 
      [data.worker_id]
    );
    if (existing) {
      throw new Error('工号已被在职员工使用');
    }
    
    // 检查是否有离职员工使用了该工号
    const resigned = await queryOne(
      "SELECT * FROM workers WHERE worker_id = ? AND status = 'resigned'", 
      [data.worker_id]
    );
    if (resigned) {
      // 删除离职员工的记录，允许重用工号
      await run('DELETE FROM workers WHERE worker_id = ?', [data.worker_id]);
      console.log(`🔄 删除离职员工 ${data.worker_id} 的记录，允许重用工号`);
    }
    
    // 验证年龄
    if (data.age && (data.age < 18 || data.age > 65)) {
      throw new Error('年龄必须在18-65之间');
    }
    
    // 添加员工
    const sql = `
      INSERT INTO workers (
        worker_id, name, age, gender, position, team,
        emergency_contact, health_notes, photo_url, status, hire_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await run(sql, [
      data.worker_id,
      data.name,
      data.age || null,
      data.gender || null,
      data.position || null,
      data.team || null,
      data.emergency_contact || null,
      data.health_notes || null,
      data.photo_url || null,
      'active',
      data.hire_date || null
    ]);
    
    // 记录操作日志
    await operationLogDB.log({
      operation_type: 'add_worker',
      operator,
      target_type: 'worker',
      target_id: data.worker_id,
      description: `添加员工：${data.worker_id} - ${data.name}`,
      details: data
    });
    
    return result;
  },
  
  /**
   * 更新员工信息
   */
  async updateWorker(workerId, data, operator = 'admin') {
    // 检查员工是否存在
    const worker = await queryOne('SELECT * FROM workers WHERE worker_id = ?', [workerId]);
    if (!worker) {
      throw new Error('员工不存在');
    }
    
    // 验证年龄
    if (data.age !== undefined && (data.age < 18 || data.age > 65)) {
      throw new Error('年龄必须在18-65之间');
    }
    
    const sql = `
      UPDATE workers SET
        name = ?,
        age = ?,
        gender = ?,
        position = ?,
        team = ?,
        emergency_contact = ?,
        health_notes = ?,
        photo_url = ?,
        status = ?,
        hire_date = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE worker_id = ?
    `;
    const result = await run(sql, [
      data.name || worker.name,
      data.age !== undefined ? data.age : worker.age,
      data.gender || worker.gender,
      data.position || worker.position,
      data.team || worker.team,
      data.emergency_contact || worker.emergency_contact,
      data.health_notes !== undefined ? data.health_notes : worker.health_notes,
      data.photo_url !== undefined ? data.photo_url : worker.photo_url,
      data.status || worker.status,
      data.hire_date !== undefined ? data.hire_date : worker.hire_date,
      workerId
    ]);
    
    // 记录操作日志
    await operationLogDB.log({
      operation_type: 'edit_worker',
      operator,
      target_type: 'worker',
      target_id: workerId,
      description: `更新员工信息：${workerId} - ${worker.name}`,
      details: { old: worker, new: data }
    });
    
    return result;
  },
  
  /**
   * 删除员工（真删除）
   */
  async deleteWorker(workerId, operator = 'admin') {
    // 检查员工是否存在
    const worker = await queryOne('SELECT * FROM workers WHERE worker_id = ?', [workerId]);
    if (!worker) {
      throw new Error('员工不存在');
    }
    
    // 自动解绑所有设备
    await run('UPDATE devices SET worker_id = NULL, bound_at = NULL WHERE worker_id = ?', [workerId]);
    
    // 检查是否有历史数据
    const hasHistory = await queryOne(
      'SELECT COUNT(*) as count FROM health_history WHERE worker_id = ?',
      [workerId]
    );
    
    if (hasHistory.count > 0) {
      // 有历史数据，建议改为离职而不是删除
      console.warn(`⚠️ 员工 ${workerId} 有 ${hasHistory.count} 条历史数据，建议改为"离职"状态而不是删除`);
    }
    
    // 真正删除（从数据库永久删除）
    const result = await run('DELETE FROM workers WHERE worker_id = ?', [workerId]);
    
    // 记录操作日志
    await operationLogDB.log({
      operation_type: 'delete_worker',
      operator,
      target_type: 'worker',
      target_id: workerId,
      description: `删除员工：${workerId} - ${worker.name}`,
      details: worker
    });
    
    return result;
  },
  
  /**
   * 获取员工详细信息（包含统计）
   */
  async getDetail(workerId) {
    // 员工基本信息
    const worker = await queryOne(`
      SELECT 
        w.*,
        d.device_id,
        d.device_model,
        CASE 
          WHEN d.last_seen > datetime('now', 'localtime', '-2 minutes') THEN 1
          ELSE 0
        END as device_online,
        d.last_seen as device_last_seen
      FROM workers w
      LEFT JOIN devices d ON w.worker_id = d.worker_id
      WHERE w.worker_id = ?
    `, [workerId]);
    
    if (!worker) {
      return null;
    }
    
    // 员工统计信息
    const stats = {
      total_work_days: 0,
      total_alerts: 0,
      avg_heart_rate: null,
      avg_blood_oxygen: null,
      last_work_date: null
    };
    
    // 总工作天数（有数据的天数）
    const workDays = await queryOne(`
      SELECT COUNT(DISTINCT DATE(received_at)) as days
      FROM health_history
      WHERE worker_id = ?
    `, [workerId]);
    stats.total_work_days = workDays.days;
    
    // 总报警数
    const alertCount = await queryOne(
      'SELECT COUNT(*) as count FROM alerts WHERE worker_id = ?',
      [workerId]
    );
    stats.total_alerts = alertCount.count;
    
    // 平均心率
    const avgHeartRate = await queryOne(
      'SELECT AVG(heart_rate) as avg FROM health_history WHERE worker_id = ? AND heart_rate > 0',
      [workerId]
    );
    stats.avg_heart_rate = avgHeartRate.avg ? Math.round(avgHeartRate.avg) : null;
    
    // 平均血氧
    const avgBloodOxygen = await queryOne(
      'SELECT AVG(blood_oxygen) as avg FROM health_history WHERE worker_id = ? AND blood_oxygen > 0',
      [workerId]
    );
    stats.avg_blood_oxygen = avgBloodOxygen.avg ? Math.round(avgBloodOxygen.avg) : null;
    
    // 最后工作日期
    const lastWork = await queryOne(
      'SELECT MAX(DATE(received_at)) as last_date FROM health_history WHERE worker_id = ?',
      [workerId]
    );
    stats.last_work_date = lastWork.last_date;
    
    // 返回扁平化结构（合并 worker 对象和 stats）
    return {
      ...worker,
      stats
    };
  }
};

module.exports = {
  deviceDBExtensions,
  workerDBExtensions
};

