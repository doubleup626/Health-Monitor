-- 深地矿井工人健康监测系统 - 数据库初始化脚本
-- 数据库：SQLite

-- ============================================
-- 1. 工人信息表
-- ============================================
CREATE TABLE IF NOT EXISTS workers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  worker_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  age INTEGER,
  gender VARCHAR(10),
  position VARCHAR(100),
  team VARCHAR(100),
  emergency_contact VARCHAR(200),
  health_notes TEXT,
  photo_url TEXT,                                -- 新增：照片URL
  status VARCHAR(20) DEFAULT 'active',           -- 新增：员工状态 (active/inactive/resigned)
  hire_date DATE,                                -- 新增：入职日期
  created_at DATETIME DEFAULT (datetime('now', 'localtime')),
  updated_at DATETIME DEFAULT (datetime('now', 'localtime'))
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_workers_status ON workers(status);
CREATE INDEX IF NOT EXISTS idx_workers_position ON workers(position);
CREATE INDEX IF NOT EXISTS idx_workers_team ON workers(team);

-- ============================================
-- 2. 设备信息表
-- ============================================
CREATE TABLE IF NOT EXISTS devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id VARCHAR(50) UNIQUE NOT NULL,
  worker_id VARCHAR(50),
  device_model VARCHAR(100),
  firmware_version VARCHAR(50),
  is_active BOOLEAN DEFAULT 1,
  last_seen DATETIME,
  notes TEXT,                                    -- 新增：设备备注
  bound_at DATETIME,                             -- 新增：绑定时间
  status VARCHAR(20) DEFAULT 'active',           -- 新增：设备状态 (active/inactive/maintenance)
  created_at DATETIME DEFAULT (datetime('now', 'localtime')),
  updated_at DATETIME DEFAULT (datetime('now', 'localtime')),
  FOREIGN KEY (worker_id) REFERENCES workers(worker_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_devices_worker ON devices(worker_id);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);

-- ============================================
-- 3. 实时健康数据表
-- ============================================
CREATE TABLE IF NOT EXISTS health_realtime (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  worker_id VARCHAR(50) NOT NULL,
  device_id VARCHAR(50) NOT NULL,
  
  -- 生理数据
  heart_rate_current INTEGER,
  heart_rate_last INTEGER,
  heart_rate_resting INTEGER,
  heart_rate_daily_max INTEGER,
  blood_oxygen_value INTEGER,
  blood_oxygen_time BIGINT,
  stress_value INTEGER,
  stress_time BIGINT,
  stress_today_avg INTEGER,
  body_temperature REAL,
  
  -- 活动数据
  steps INTEGER,
  calories INTEGER,
  distance REAL,
  
  -- 环境数据
  air_pressure INTEGER,
  altitude INTEGER,
  
  -- 状态标记
  is_safe BOOLEAN DEFAULT 1,
  alert_level INTEGER DEFAULT 0,
  alert_message TEXT,
  
  -- 时间戳
  timestamp BIGINT NOT NULL,
  received_at DATETIME DEFAULT (datetime('now', 'localtime')),
  
  FOREIGN KEY (worker_id) REFERENCES workers(worker_id),
  FOREIGN KEY (device_id) REFERENCES devices(device_id)
);

-- ============================================
-- 4. 历史健康数据表
-- ============================================
CREATE TABLE IF NOT EXISTS health_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  worker_id VARCHAR(50) NOT NULL,
  device_id VARCHAR(50) NOT NULL,
  
  -- 完整的健康数据（JSON格式）
  data_json TEXT NOT NULL,
  
  -- 关键指标（便于查询）
  heart_rate INTEGER,
  blood_oxygen INTEGER,
  stress INTEGER,
  
  -- 时间戳
  timestamp BIGINT NOT NULL,
  received_at DATETIME DEFAULT (datetime('now', 'localtime')),
  
  FOREIGN KEY (worker_id) REFERENCES workers(worker_id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_history_worker_time ON health_history(worker_id, timestamp);

-- ============================================
-- 5. 报警记录表
-- ============================================
CREATE TABLE IF NOT EXISTS alerts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  worker_id VARCHAR(50) NOT NULL,
  device_id VARCHAR(50) NOT NULL,
  
  alert_type VARCHAR(50) NOT NULL,
  alert_level INTEGER NOT NULL,
  alert_message TEXT NOT NULL,
  trigger_data TEXT,
  
  is_handled BOOLEAN DEFAULT 0,
  handled_by VARCHAR(100),
  handled_at DATETIME,
  handling_note TEXT,
  
  created_at DATETIME DEFAULT (datetime('now', 'localtime')),
  
  FOREIGN KEY (worker_id) REFERENCES workers(worker_id)
);

-- ============================================
-- 6. AI 分析记录表
-- ============================================
CREATE TABLE IF NOT EXISTS ai_analysis (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  worker_id VARCHAR(50) NOT NULL,
  
  -- 分析请求
  request_data TEXT NOT NULL,
  prompt TEXT NOT NULL,
  history_data TEXT,
  
  -- 分析结果
  risk_level VARCHAR(20),
  risk_analysis TEXT,
  health_status TEXT,
  safety_advice TEXT,
  emergency_measures TEXT,
  rescue_guidance TEXT,
  
  -- AI 模型信息
  model_name VARCHAR(100),
  response_time INTEGER,
  
  created_at DATETIME DEFAULT (datetime('now', 'localtime')),
  
  FOREIGN KEY (worker_id) REFERENCES workers(worker_id)
);

-- ============================================
-- 7. 操作日志表 (新增)
-- ============================================
CREATE TABLE IF NOT EXISTS operation_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  operation_type VARCHAR(50) NOT NULL,  -- add_device/edit_device/delete_device/bind_device/unbind_device/add_worker/edit_worker/delete_worker
  operator VARCHAR(100) NOT NULL,       -- 操作人（管理员账号）
  target_type VARCHAR(20) NOT NULL,     -- device/worker
  target_id VARCHAR(50) NOT NULL,       -- 目标ID（设备ID或工人ID）
  description TEXT NOT NULL,            -- 操作描述
  details TEXT,                         -- 详细信息（JSON）
  ip_address VARCHAR(50),               -- 操作IP地址
  created_at DATETIME DEFAULT (datetime('now', 'localtime'))
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_logs_type ON operation_logs(operation_type);
CREATE INDEX IF NOT EXISTS idx_logs_time ON operation_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_logs_target ON operation_logs(target_type, target_id);

-- ============================================
-- 8. 插入测试数据
-- ============================================

-- 工人信息
INSERT OR IGNORE INTO workers (worker_id, name, age, gender, position, team, emergency_contact) VALUES
('W001', '张三', 35, '男', '掘进工', 'A班', '13800138001'),
('W002', '李四', 28, '男', '支护工', 'A班', '13800138002'),
('W003', '王五', 42, '男', '通风工', 'B班', '13800138003');

-- 设备信息
INSERT OR IGNORE INTO devices (device_id, worker_id, device_model, is_active) VALUES
('10092800', 'W001', 'Amazfit Active 2', 1),
('10092801', 'W002', 'Amazfit Active 2', 1),
('10092802', 'W003', 'Amazfit Active 2', 1);

-- 提示信息
SELECT '✅ 数据库初始化完成！' as message;
SELECT '📊 已创建 7 个数据表' as info;
SELECT '👷 已添加 3 个测试工人' as info;
SELECT '⌚ 已添加 3 个测试设备' as info;
SELECT '🔧 已添加新字段：devices(notes, bound_at, status), workers(photo_url, status, hire_date)' as info;
SELECT '📝 已创建 operation_logs 表用于操作审计' as info;


