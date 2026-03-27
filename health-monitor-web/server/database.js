/**
 * 数据库连接和操作模块
 * 使用 SQLite
 */

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'health_monitor.db');

// 创建数据库连接
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ 数据库连接失败:', err.message);
  } else {
    console.log('✅ 数据库连接成功:', DB_PATH);
  }
});

/**
 * 初始化数据库（执行 SQL 脚本）
 */
function initDatabase() {
  const sqlPath = path.join(__dirname, 'database-init.sql');
  const ragSqlPath = path.join(__dirname, 'rag-init.sql');
  
  return new Promise((resolve, reject) => {
    // 执行主数据库初始化
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    db.exec(sql, (err) => {
      if (err) {
        console.error('❌ 数据库初始化失败:', err.message);
        reject(err);
        return;
      }
      
      console.log('✅ 主数据库初始化成功');
      
      // 执行RAG数据库初始化
      try {
        const ragSql = fs.readFileSync(ragSqlPath, 'utf8');
        db.exec(ragSql, (err) => {
          if (err) {
            console.error('❌ RAG数据库初始化失败:', err.message);
            reject(err);
          } else {
            console.log('✅ RAG数据库初始化成功');
            resolve();
          }
        });
      } catch (error) {
        console.warn('⚠️ RAG数据库初始化文件不存在，跳过');
        resolve();
      }
    });
  });
}

/**
 * 执行查询（返回所有结果）
 */
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

/**
 * 执行查询（返回单条结果）
 */
function queryOne(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}

/**
 * 执行插入/更新/删除
 */
function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve({
          lastID: this.lastID,
          changes: this.changes
        });
      }
    });
  });
}

/**
 * 事务执行
 */
async function transaction(callback) {
  await run('BEGIN TRANSACTION');
  try {
    await callback();
    await run('COMMIT');
  } catch (err) {
    await run('ROLLBACK');
    throw err;
  }
}

// ============================================
// 数据访问函数
// ============================================

/**
 * 工人管理
 */
const workerDB = {
  // 获取所有工人
  async getAll() {
    return await query('SELECT * FROM workers ORDER BY created_at DESC');
  },
  
  // 根据 ID 获取工人
  async getById(workerId) {
    return await queryOne('SELECT * FROM workers WHERE worker_id = ?', [workerId]);
  },
  
  // 创建工人
  async create(data) {
    const sql = `
      INSERT INTO workers (worker_id, name, age, gender, position, team, emergency_contact, health_notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    return await run(sql, [
      data.worker_id,
      data.name,
      data.age,
      data.gender,
      data.position,
      data.team,
      data.emergency_contact,
      data.health_notes
    ]);
  },
  
  // 更新工人
  async update(workerId, data) {
    const sql = `
      UPDATE workers 
      SET name = ?, age = ?, gender = ?, position = ?, team = ?, 
          emergency_contact = ?, health_notes = ?, updated_at = CURRENT_TIMESTAMP
      WHERE worker_id = ?
    `;
    return await run(sql, [
      data.name,
      data.age,
      data.gender,
      data.position,
      data.team,
      data.emergency_contact,
      data.health_notes,
      workerId
    ]);
  }
};

/**
 * 设备管理
 */
const deviceDB = {
  // 获取所有设备
  async getAll() {
    return await query(`
      SELECT d.*, w.name as worker_name 
      FROM devices d 
      LEFT JOIN workers w ON d.worker_id = w.worker_id
      ORDER BY d.created_at DESC
    `);
  },
  
  // 根据设备 ID 获取设备
  async getByDeviceId(deviceId) {
    return await queryOne('SELECT * FROM devices WHERE device_id = ?', [deviceId]);
  },
  
  // 绑定设备到工人
  async bindWorker(deviceId, workerId) {
    return await run(
      'UPDATE devices SET worker_id = ?, updated_at = CURRENT_TIMESTAMP WHERE device_id = ?',
      [workerId, deviceId]
    );
  },
  
  // 更新设备最后在线时间（使用本地时间）
  async updateLastSeen(deviceId) {
    return await run(
      "UPDATE devices SET last_seen = datetime('now', 'localtime'), is_active = 1 WHERE device_id = ?",
      [deviceId]
    );
  },
  
  // 获取设备统计（优化：2分钟无数据则判断为离线，使用本地时间）
  async getStats() {
    const online = await queryOne(`
      SELECT COUNT(*) as count FROM devices 
      WHERE is_active = 1 AND last_seen > datetime('now', 'localtime', '-2 minutes')
    `);
    const offline = await queryOne(`
      SELECT COUNT(*) as count FROM devices 
      WHERE is_active = 0 OR last_seen <= datetime('now', 'localtime', '-2 minutes')
    `);
    const total = await queryOne('SELECT COUNT(*) as count FROM devices');
    
    return {
      online: online.count,
      offline: offline.count,
      total: total.count
    };
  }
};

/**
 * 实时数据管理
 */
const realtimeDB = {
  // 获取所有实时数据（包含在线状态判断：2分钟无数据即离线，使用本地时间）
  async getAll() {
    return await query(`
      SELECT 
        r.*,
        w.name as worker_name,
        w.position,
        w.team,
        d.last_seen,
        CASE 
          WHEN d.last_seen > datetime('now', 'localtime', '-2 minutes') THEN 1
          ELSE 0
        END as is_active,
        r.received_at as last_update
      FROM health_realtime r
      LEFT JOIN workers w ON r.worker_id = w.worker_id
      LEFT JOIN devices d ON r.device_id = d.device_id
      ORDER BY r.received_at DESC
    `);
  },
  
  // 获取单个工人的实时数据（包含在线状态判断：2分钟无数据即离线，使用本地时间）
  async getByWorkerId(workerId) {
    return await queryOne(`
      SELECT 
        r.*,
        w.name as worker_name,
        w.position,
        w.team,
        d.last_seen,
        CASE 
          WHEN d.last_seen > datetime('now', 'localtime', '-2 minutes') THEN 1
          ELSE 0
        END as is_active,
        r.received_at as last_update
      FROM health_realtime r
      LEFT JOIN workers w ON r.worker_id = w.worker_id
      LEFT JOIN devices d ON r.device_id = d.device_id
      WHERE r.worker_id = ?
      ORDER BY r.received_at DESC
      LIMIT 1
    `, [workerId]);
  },
  
  // 更新或插入实时数据
  async upsert(data) {
    // 先检查是否存在
    const existing = await queryOne(
      'SELECT id FROM health_realtime WHERE worker_id = ?',
      [data.worker_id]
    );
    
    if (existing) {
      // 更新
      const sql = `
        UPDATE health_realtime SET
          device_id = ?, heart_rate_current = ?, heart_rate_last = ?,
          heart_rate_resting = ?, heart_rate_daily_max = ?,
          blood_oxygen_value = ?, blood_oxygen_time = ?,
          stress_value = ?, stress_time = ?, stress_today_avg = ?,
          body_temperature = ?, steps = ?, calories = ?, distance = ?,
          air_pressure = ?, altitude = ?,
          is_safe = ?, alert_level = ?, alert_message = ?,
          timestamp = ?, received_at = datetime('now', 'localtime')
        WHERE worker_id = ?
      `;
      return await run(sql, [
        data.device_id, data.heart_rate_current, data.heart_rate_last,
        data.heart_rate_resting, data.heart_rate_daily_max,
        data.blood_oxygen_value, data.blood_oxygen_time,
        data.stress_value, data.stress_time, data.stress_today_avg,
        data.body_temperature, data.steps, data.calories, data.distance,
        data.air_pressure, data.altitude,
        data.is_safe, data.alert_level, data.alert_message,
        data.timestamp, data.worker_id
      ]);
    } else {
      // 插入
      const sql = `
        INSERT INTO health_realtime (
          worker_id, device_id, heart_rate_current, heart_rate_last,
          heart_rate_resting, heart_rate_daily_max,
          blood_oxygen_value, blood_oxygen_time,
          stress_value, stress_time, stress_today_avg,
          body_temperature, steps, calories, distance,
          air_pressure, altitude,
          is_safe, alert_level, alert_message, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      return await run(sql, [
        data.worker_id, data.device_id, data.heart_rate_current, data.heart_rate_last,
        data.heart_rate_resting, data.heart_rate_daily_max,
        data.blood_oxygen_value, data.blood_oxygen_time,
        data.stress_value, data.stress_time, data.stress_today_avg,
        data.body_temperature, data.steps, data.calories, data.distance,
        data.air_pressure, data.altitude,
        data.is_safe, data.alert_level, data.alert_message, data.timestamp
      ]);
    }
  }
};

/**
 * 历史数据管理
 */
const historyDB = {
  // 添加历史记录
  async add(data) {
    const sql = `
      INSERT INTO health_history (
        worker_id, device_id, data_json, heart_rate, blood_oxygen, stress, timestamp
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    return await run(sql, [
      data.worker_id,
      data.device_id,
      JSON.stringify(data.full_data),
      data.heart_rate,
      data.blood_oxygen,
      data.stress,
      data.timestamp
    ]);
  },
  
  // 获取工人历史数据
  async getByWorkerId(workerId, options = {}) {
    const { start, end, limit = 100 } = options;
    let sql = 'SELECT * FROM health_history WHERE worker_id = ?';
    const params = [workerId];
    
    if (start) {
      sql += ' AND timestamp >= ?';
      params.push(start);
    }
    if (end) {
      sql += ' AND timestamp <= ?';
      params.push(end);
    }
    
    sql += ' ORDER BY timestamp DESC LIMIT ?';
    params.push(limit);
    
    return await query(sql, params);
  },
  
  // 获取最近 N 分钟的历史数据
  async getRecentByWorkerId(workerId, minutes = 60) {
    const sql = `
      SELECT * FROM health_history 
      WHERE worker_id = ? AND timestamp >= ?
      ORDER BY timestamp DESC
    `;
    const startTime = Date.now() - minutes * 60 * 1000;
    return await query(sql, [workerId, startTime]);
  }
};

/**
 * 报警管理
 */
const alertDB = {
  // 创建报警
  async create(data) {
    const sql = `
      INSERT INTO alerts (
        worker_id, device_id, alert_type, alert_level, alert_message, trigger_data
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;
    return await run(sql, [
      data.worker_id,
      data.device_id,
      data.alert_type,
      data.alert_level,
      data.alert_message,
      data.trigger_data
    ]);
  },
  
  // 获取未处理报警
  async getPending() {
    return await query(`
      SELECT a.*, w.name as worker_name, w.position
      FROM alerts a
      LEFT JOIN workers w ON a.worker_id = w.worker_id
      WHERE a.is_handled = 0
      ORDER BY a.alert_level DESC, a.created_at DESC
    `);
  },
  
  // 获取所有报警
  async getAll(options = {}) {
    let sql = `
      SELECT a.*, w.name as worker_name
      FROM alerts a
      LEFT JOIN workers w ON a.worker_id = w.worker_id
      WHERE 1=1
    `;
    const params = [];
    
    if (options.worker_id) {
      sql += ' AND a.worker_id = ?';
      params.push(options.worker_id);
    }
    if (options.level) {
      sql += ' AND a.alert_level = ?';
      params.push(options.level);
    }
    
    sql += ' ORDER BY a.created_at DESC LIMIT 100';
    
    return await query(sql, params);
  },
  
  // 处理报警
  async handle(alertId, data) {
    const sql = `
      UPDATE alerts SET
        is_handled = 1,
        handled_by = ?,
        handled_at = CURRENT_TIMESTAMP,
        handling_note = ?
      WHERE id = ?
    `;
    return await run(sql, [data.handled_by, data.handling_note, alertId]);
  }
};

/**
 * AI 分析管理
 */
const aiDB = {
  // 保存分析结果
  async save(data) {
    const sql = `
      INSERT INTO ai_analysis (
        worker_id, request_data, prompt, history_data,
        risk_level, risk_analysis, health_status,
        safety_advice, emergency_measures, rescue_guidance,
        model_name, response_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    return await run(sql, [
      data.worker_id,
      data.request_data,
      data.prompt,
      data.history_data,
      data.risk_level,
      data.risk_analysis,
      data.health_status,
      data.safety_advice,
      data.emergency_measures,
      data.rescue_guidance,
      data.model_name,
      data.response_time
    ]);
  },
  
  // 获取工人的分析历史
  async getByWorkerId(workerId, limit = 10) {
    return await query(
      'SELECT * FROM ai_analysis WHERE worker_id = ? ORDER BY created_at DESC LIMIT ?',
      [workerId, limit]
    );
  }
};

/**
 * 操作日志管理 (新增)
 */
const operationLogDB = {
  // 记录操作日志
  async log(data) {
    const sql = `
      INSERT INTO operation_logs (
        operation_type, operator, target_type, target_id,
        description, details, ip_address
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    return await run(sql, [
      data.operation_type,
      data.operator || 'admin',
      data.target_type,
      data.target_id,
      data.description,
      data.details ? JSON.stringify(data.details) : null,
      data.ip_address || null
    ]);
  },
  
  // 获取操作日志（分页）
  async getAll(options = {}) {
    let sql = `
      SELECT * FROM operation_logs WHERE 1=1
    `;
    const params = [];
    
    if (options.type) {
      sql += ' AND operation_type = ?';
      params.push(options.type);
    }
    if (options.target_type) {
      sql += ' AND target_type = ?';
      params.push(options.target_type);
    }
    if (options.start_date) {
      sql += ' AND created_at >= ?';
      params.push(options.start_date);
    }
    if (options.end_date) {
      sql += ' AND created_at <= ?';
      params.push(options.end_date);
    }
    
    sql += ' ORDER BY created_at DESC';
    
    const page = parseInt(options.page) || 1;
    const limit = parseInt(options.limit) || 50;
    const offset = (page - 1) * limit;
    
    sql += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    return await query(sql, params);
  },
  
  // 获取总数
  async getCount(options = {}) {
    let sql = `SELECT COUNT(*) as total FROM operation_logs WHERE 1=1`;
    const params = [];
    
    if (options.type) {
      sql += ' AND operation_type = ?';
      params.push(options.type);
    }
    if (options.target_type) {
      sql += ' AND target_type = ?';
      params.push(options.target_type);
    }
    
    const result = await queryOne(sql, params);
    return result.total;
  }
};

module.exports = {
  db,
  initDatabase,
  query,
  queryOne,
  run,
  transaction,
  workerDB,
  deviceDB,
  realtimeDB,
  historyDB,
  alertDB,
  aiDB,
  operationLogDB
};


