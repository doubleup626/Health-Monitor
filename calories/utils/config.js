/**
 * 应用配置文件
 * 可以根据需要修改这里的配置
 */

// 数据采集配置
export const COLLECT_CONFIG = {
  // 采集间隔（毫秒）
  // 建议值：1-30 分钟
  interval: 1 * 60 * 1000, // 1分钟
  
  // 是否在息屏时继续采集
  collectWhenScreenOff: true,
  
  // 采集失败重试次数
  maxRetries: 3,
};

// 数据上传配置
export const UPLOAD_CONFIG = {
  // 上传间隔（毫秒）
  // 建议值：1-60 分钟
  interval: 1 * 60 * 1000, // 1分钟
  
  // 批量上传的最大数据条数
  maxBatchSize: 50,
  
  // 上传失败重试次数
  maxRetries: 3,
  
  // 上传超时时间（毫秒）
  timeout: 30000, // 30秒
};

// 数据存储配置
export const STORAGE_CONFIG = {
  // 本地最大缓存数据条数
  maxCacheSize: 100,
  
  // 数据文件名
  dataFileName: "health_data.txt",
  
  // 应用配置文件名
  appConfigFileName: "app_data.txt",
};

// 服务器配置
export const SERVER_CONFIG = {
  // 服务器地址（需要在 app-side/index.js 中配置）
  // 这里只是说明，实际配置在 Side Service
  url: "http://YOUR_SERVER_IP:3000/api/health-data",
  
  // API 密钥（如果服务器需要）
  apiKey: "",
};

// 传感器配置
export const SENSOR_CONFIG = {
  // 启用的传感器列表
  enabled: {
    heartRate: true,
    bloodOxygen: true,
    stress: true,
    bodyTemperature: true,
    step: true,
    barometer: true,
  },
  
  // 传感器采集超时时间（毫秒）
  timeout: 5000, // 5秒
};

// UI 配置
export const UI_CONFIG = {
  // 是否显示详细日志
  showDetailedLogs: false,
  
  // 数据刷新间隔（毫秒）
  dataRefreshInterval: 1000, // 1秒
  
  // Toast 显示时长（毫秒）
  toastDuration: 2000, // 2秒
};

// 调试配置
export const DEBUG_CONFIG = {
  // 是否启用调试模式
  enabled: false,
  
  // 是否模拟传感器数据
  mockSensorData: false,
  
  // 是否跳过上传
  skipUpload: false,
};

/**
 * 获取完整配置
 */
export function getConfig() {
  return {
    collect: COLLECT_CONFIG,
    upload: UPLOAD_CONFIG,
    storage: STORAGE_CONFIG,
    server: SERVER_CONFIG,
    sensor: SENSOR_CONFIG,
    ui: UI_CONFIG,
    debug: DEBUG_CONFIG,
  };
}

/**
 * 验证配置是否有效
 */
export function validateConfig() {
  const errors = [];
  
  if (COLLECT_CONFIG.interval < 60000) {
    errors.push("采集间隔不能小于 1 分钟");
  }
  
  if (UPLOAD_CONFIG.interval < COLLECT_CONFIG.interval) {
    errors.push("上传间隔应大于等于采集间隔");
  }
  
  if (STORAGE_CONFIG.maxCacheSize < 10) {
    errors.push("缓存大小不能小于 10 条");
  }
  
  return {
    valid: errors.length === 0,
    errors: errors,
  };
}

export default {
  COLLECT_CONFIG,
  UPLOAD_CONFIG,
  STORAGE_CONFIG,
  SERVER_CONFIG,
  SENSOR_CONFIG,
  UI_CONFIG,
  DEBUG_CONFIG,
  getConfig,
  validateConfig,
};

