/**
 * 安全阈值检测模块
 * 深地矿井工人健康监测
 */

// 安全阈值配置
const SAFETY_THRESHOLDS = {
  heartRate: {
    min: 50,          // 最低心率
    max: 120,         // 最高心率
    warning: 110,     // 警告心率
    danger: 140       // 危险心率
  },
  bloodOxygen: {
    min: 90,          // 最低血氧
    warning: 92,      // 警告血氧
    danger: 85        // 危险血氧
  },
  stress: {
    max: 80,          // 最高压力
    warning: 70,      // 警告压力
    danger: 90        // 危险压力
  },
  altitude: {
    warning: -500,    // 警告深度
    danger: -1000     // 危险深度
  },
  bodyTemperature: {
    min: 36.0,        // 最低体温
    max: 37.5,        // 最高正常体温
    warning: 37.8,    // 警告体温
    danger: 38.5      // 危险体温
  }
};

/**
 * 检测健康数据安全性
 * @param {Object} data - 健康数据
 * @returns {Object} - 检测结果
 */
function checkSafety(data) {
  const alerts = [];
  let alertLevel = 0; // 0-安全, 1-正常, 2-警告, 3-危险
  let isSafe = true;
  
  // 1. 心率检测
  if (data.heartRate && data.heartRate.last > 0) {
    const hr = data.heartRate.last;
    
    if (hr > SAFETY_THRESHOLDS.heartRate.danger) {
      alerts.push({
        type: 'heart_rate_danger',
        level: 3,
        message: `⚠️ 心率极高：${hr} bpm（危险！立即停工）`,
        value: hr,
        threshold: SAFETY_THRESHOLDS.heartRate.danger
      });
      alertLevel = 3;
      isSafe = false;
    } else if (hr > SAFETY_THRESHOLDS.heartRate.max) {
      alerts.push({
        type: 'heart_rate_high',
        level: 2,
        message: `⚠️ 心率偏高：${hr} bpm（需要休息）`,
        value: hr,
        threshold: SAFETY_THRESHOLDS.heartRate.max
      });
      alertLevel = Math.max(alertLevel, 2);
      isSafe = false;
    } else if (hr > SAFETY_THRESHOLDS.heartRate.warning) {
      alerts.push({
        type: 'heart_rate_warning',
        level: 1,
        message: `💛 心率略高：${hr} bpm（注意观察）`,
        value: hr,
        threshold: SAFETY_THRESHOLDS.heartRate.warning
      });
      alertLevel = Math.max(alertLevel, 1);
    } else if (hr < SAFETY_THRESHOLDS.heartRate.min) {
      alerts.push({
        type: 'heart_rate_low',
        level: 2,
        message: `⚠️ 心率过低：${hr} bpm（可能异常）`,
        value: hr,
        threshold: SAFETY_THRESHOLDS.heartRate.min
      });
      alertLevel = Math.max(alertLevel, 2);
      isSafe = false;
    }
  }
  
  // 2. 血氧检测
  if (data.bloodOxygen && data.bloodOxygen.value > 0) {
    const spo2 = data.bloodOxygen.value;
    
    if (spo2 < SAFETY_THRESHOLDS.bloodOxygen.danger) {
      alerts.push({
        type: 'blood_oxygen_danger',
        level: 3,
        message: `🚨 血氧极低：${spo2}%（危险！立即撤离）`,
        value: spo2,
        threshold: SAFETY_THRESHOLDS.bloodOxygen.danger
      });
      alertLevel = 3;
      isSafe = false;
    } else if (spo2 < SAFETY_THRESHOLDS.bloodOxygen.min) {
      alerts.push({
        type: 'blood_oxygen_low',
        level: 2,
        message: `⚠️ 血氧偏低：${spo2}%（需要补氧）`,
        value: spo2,
        threshold: SAFETY_THRESHOLDS.bloodOxygen.min
      });
      alertLevel = Math.max(alertLevel, 2);
      isSafe = false;
    } else if (spo2 < SAFETY_THRESHOLDS.bloodOxygen.warning) {
      alerts.push({
        type: 'blood_oxygen_warning',
        level: 1,
        message: `💛 血氧略低：${spo2}%（注意监测）`,
        value: spo2,
        threshold: SAFETY_THRESHOLDS.bloodOxygen.warning
      });
      alertLevel = Math.max(alertLevel, 1);
    }
  }
  
  // 3. 压力检测
  if (data.stress && data.stress.value > 0) {
    const stress = data.stress.value;
    
    if (stress > SAFETY_THRESHOLDS.stress.danger) {
      alerts.push({
        type: 'stress_danger',
        level: 3,
        message: `🚨 压力过大：${stress}（精神高度紧张）`,
        value: stress,
        threshold: SAFETY_THRESHOLDS.stress.danger
      });
      alertLevel = Math.max(alertLevel, 3);
      isSafe = false;
    } else if (stress > SAFETY_THRESHOLDS.stress.max) {
      alerts.push({
        type: 'stress_high',
        level: 2,
        message: `⚠️ 压力较大：${stress}（需要缓解）`,
        value: stress,
        threshold: SAFETY_THRESHOLDS.stress.max
      });
      alertLevel = Math.max(alertLevel, 2);
      isSafe = false;
    } else if (stress > SAFETY_THRESHOLDS.stress.warning) {
      alerts.push({
        type: 'stress_warning',
        level: 1,
        message: `💛 压力偏高：${stress}（注意调节）`,
        value: stress,
        threshold: SAFETY_THRESHOLDS.stress.warning
      });
      alertLevel = Math.max(alertLevel, 1);
    }
  }
  
  // 4. 深度检测（海拔为负表示深度）
  if (data.barometer && data.barometer.altitude < 0) {
    const depth = Math.abs(data.barometer.altitude);
    
    if (data.barometer.altitude < SAFETY_THRESHOLDS.altitude.danger) {
      alerts.push({
        type: 'depth_danger',
        level: 3,
        message: `🚨 深度过大：${depth}米（超限！）`,
        value: depth,
        threshold: Math.abs(SAFETY_THRESHOLDS.altitude.danger)
      });
      alertLevel = Math.max(alertLevel, 3);
      isSafe = false;
    } else if (data.barometer.altitude < SAFETY_THRESHOLDS.altitude.warning) {
      alerts.push({
        type: 'depth_warning',
        level: 2,
        message: `⚠️ 深度较大：${depth}米（接近限制）`,
        value: depth,
        threshold: Math.abs(SAFETY_THRESHOLDS.altitude.warning)
      });
      alertLevel = Math.max(alertLevel, 2);
      isSafe = false;
    }
  }
  
  // 5. 体温检测
  if (data.bodyTemperature && data.bodyTemperature.current > 0) {
    const temp = data.bodyTemperature.current;
    
    if (temp > SAFETY_THRESHOLDS.bodyTemperature.danger) {
      alerts.push({
        type: 'temperature_high',
        level: 3,
        message: `🚨 体温过高：${temp}°C（可能发热）`,
        value: temp,
        threshold: SAFETY_THRESHOLDS.bodyTemperature.danger
      });
      alertLevel = Math.max(alertLevel, 3);
      isSafe = false;
    } else if (temp > SAFETY_THRESHOLDS.bodyTemperature.warning) {
      alerts.push({
        type: 'temperature_warning',
        level: 2,
        message: `⚠️ 体温偏高：${temp}°C（注意观察）`,
        value: temp,
        threshold: SAFETY_THRESHOLDS.bodyTemperature.warning
      });
      alertLevel = Math.max(alertLevel, 2);
      isSafe = false;
    } else if (temp < SAFETY_THRESHOLDS.bodyTemperature.min) {
      alerts.push({
        type: 'temperature_low',
        level: 2,
        message: `⚠️ 体温过低：${temp}°C（可能失温）`,
        value: temp,
        threshold: SAFETY_THRESHOLDS.bodyTemperature.min
      });
      alertLevel = Math.max(alertLevel, 2);
      isSafe = false;
    }
  }
  
  // 组合报警信息
  let alertMessage = '';
  if (alerts.length > 0) {
    alertMessage = alerts.map(a => a.message).join('; ');
  }
  
  return {
    isSafe,
    alertLevel,
    alertMessage,
    alerts,
    thresholds: SAFETY_THRESHOLDS
  };
}

/**
 * 获取安全状态文本
 */
function getSafetyStatusText(alertLevel) {
  const statusMap = {
    0: '安全',
    1: '正常',
    2: '警告',
    3: '危险'
  };
  return statusMap[alertLevel] || '未知';
}

/**
 * 获取安全状态颜色
 */
function getSafetyColor(alertLevel) {
  const colorMap = {
    0: 'success',
    1: 'info',
    2: 'warning',
    3: 'danger'
  };
  return colorMap[alertLevel] || 'info';
}

module.exports = {
  SAFETY_THRESHOLDS,
  checkSafety,
  getSafetyStatusText,
  getSafetyColor
};


