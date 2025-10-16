import { HeartRate } from "@zos/sensor";
import { BloodOxygen } from "@zos/sensor";
import { Stress } from "@zos/sensor";
import { BodyTemperature } from "@zos/sensor";
import { Step } from "@zos/sensor";
import { Barometer } from "@zos/sensor";
import { Time } from "@zos/sensor";
import { Calorie } from "@zos/sensor";
import { Distance } from "@zos/sensor";
import { Sleep } from "@zos/sensor";
import { log as Logger } from "@zos/utils";
import { getDeviceInfo } from "@zos/device";

const logger = Logger.getLogger("sensors");

/**
 * 传感器数据采集器
 * 封装所有传感器的数据读取功能
 */
export class SensorCollector {
  constructor() {
    this.heartRate = null;
    this.bloodOxygen = null;
    this.stress = null;
    this.bodyTemp = null;
    this.step = null;
    this.barometer = null;
    this.time = null;
    this.calorie = null;
    this.distance = null;
    this.sleep = null;
    this.deviceInfo = null;
  }

  /**
   * 初始化所有传感器
   */
  init() {
    try {
      this.heartRate = new HeartRate();
      this.bloodOxygen = new BloodOxygen();
      this.stress = new Stress();
      this.bodyTemp = new BodyTemperature();
      this.step = new Step();
      this.barometer = new Barometer();
      this.time = new Time();
      this.calorie = new Calorie();
      this.distance = new Distance();
      this.sleep = new Sleep();
      this.deviceInfo = getDeviceInfo();
      logger.log("传感器初始化成功");
    } catch (e) {
      logger.error("传感器初始化失败:", e);
    }
  }

  /**
   * 获取当前时间戳（修复时间问题）
   */
  getTimestamp() {
    if (!this.time) return Date.now();
    
    try {
      const year = this.time.getFullYear();
      const month = this.time.getMonth(); // 1-12
      const day = this.time.getDate();
      const hour = this.time.getHours();
      const minute = this.time.getMinutes();
      const second = this.time.getSeconds();
      
      // 注意：月份需要减1，因为 JavaScript Date 的月份是 0-11
      const timestamp = new Date(year, month - 1, day, hour, minute, second).getTime();
      
      logger.log(`时间: ${year}-${month}-${day} ${hour}:${minute}:${second}, 时间戳: ${timestamp}`);
      
      return timestamp;
    } catch (e) {
      logger.error("获取时间戳失败:", e);
      return Date.now();
    }
  }

  /**
   * 采集心率数据（增强版 - 包含更多信息）
   */
  collectHeartRate() {
    try {
      if (!this.heartRate) return null;
      
      const data = {
        current: this.heartRate.getCurrent() || 0,
        last: this.heartRate.getLast() || 0,
      };
      
      // 尝试获取静息心率（API_LEVEL 3.0+）
      try {
        data.resting = this.heartRate.getResting() || 0;
      } catch (e) {
        data.resting = 0;
      }
      
      // 尝试获取日统计数据（API_LEVEL 3.0+）
      try {
        const summary = this.heartRate.getDailySummary();
        if (summary && summary.maximum) {
          data.dailyMaximum = {
            value: summary.maximum.hr_value || 0,
            time: summary.maximum.time || 0,
          };
        }
      } catch (e) {
        // 设备不支持或API版本不够
      }
      
      logger.log(`心率 - 当前: ${data.current}, 最近: ${data.last}, 静息: ${data.resting}`);
      return data;
    } catch (e) {
      logger.error("心率采集失败:", e);
      return null;
    }
  }

  /**
   * 🔥 实时测量心率（持续测量5秒）
   * 返回 Promise，在回调中获取实时值
   */
  measureHeartRateRealtime(durationMs = 5000) {
    return new Promise((resolve, reject) => {
      try {
        if (!this.heartRate) {
          reject(new Error("心率传感器未初始化"));
          return;
        }
        
        logger.log("🔥 开始心率实时测量...");
        let measured = false;
        
        const callback = () => {
          if (!measured) {
            const current = this.heartRate.getCurrent();
            const last = this.heartRate.getLast();
            logger.log(`✅ 心率实时测量结果 - 当前: ${current}, 最近: ${last}`);
            measured = true;
          }
        };
        
        // 启动持续测量
        this.heartRate.onCurrentChange(callback);
        
        // 等待指定时间后停止
        setTimeout(() => {
          try {
            this.heartRate.offCurrentChange(callback);
            logger.log("🔥 心率实时测量结束");
            
            // 返回测量结果
            resolve({
              current: this.heartRate.getCurrent() || 0,
              last: this.heartRate.getLast() || 0,
              measured: measured,
            });
          } catch (e) {
            logger.error("停止心率测量失败:", e);
            resolve({
              current: this.heartRate.getLast() || 0,
              last: this.heartRate.getLast() || 0,
              measured: false,
            });
          }
        }, durationMs);
        
      } catch (e) {
        logger.error("心率实时测量失败:", e);
        reject(e);
      }
    });
  }

  /**
   * 采集血氧数据（增强版 - 包含最近N小时数据）
   */
  collectBloodOxygen() {
    try {
      if (!this.bloodOxygen) return null;
      
      const current = this.bloodOxygen.getCurrent();
      const data = {
        value: current.value || 0,
        time: current.time || 0,
        retCode: current.retCode || 0,
      };
      
      // 🔥 获取最近几小时的血氧数据（API_LEVEL 3.0+）
      try {
        const lastFewHour = this.bloodOxygen.getLastFewHour(4); // 最近4小时
        if (lastFewHour && lastFewHour.length > 0) {
          data.lastFewHour = lastFewHour;
          logger.log(`血氧 - 最近4小时有 ${lastFewHour.length} 条记录`);
        }
      } catch (e) {
        // 设备不支持
      }
      
      logger.log(`血氧 - 值: ${data.value}, 状态: ${data.retCode}`);
      return data;
    } catch (e) {
      logger.error("血氧采集失败:", e);
      return null;
    }
  }

  /**
   * 🔥 开始血氧测量（异步）
   * 返回 Promise，测量完成后 resolve
   */
  measureBloodOxygenRealtime(timeoutMs = 20000) {
    return new Promise((resolve, reject) => {
      try {
        if (!this.bloodOxygen) {
          reject(new Error("血氧传感器未初始化"));
          return;
        }
        
        logger.log("🔥 开始血氧测量...");
        
        const callback = () => {
          const result = this.bloodOxygen.getCurrent();
          logger.log(`血氧测量中 - 值: ${result.value}, 状态: ${result.retCode}`);
          
          // retCode=2 表示测量成功
          if (result.retCode === 2) {
            logger.log("✅ 血氧测量成功");
            this.bloodOxygen.offChange(callback);
            this.bloodOxygen.stop();
            resolve(result);
          } else if (result.retCode >= 3) {
            // 测量失败
            logger.error("❌ 血氧测量失败, retCode:", result.retCode);
            this.bloodOxygen.offChange(callback);
            this.bloodOxygen.stop();
            reject(new Error(`测量失败: retCode=${result.retCode}`));
          }
        };
        
        // 注册回调
        this.bloodOxygen.onChange(callback);
        
        // 停止之前的测量
        this.bloodOxygen.stop();
        
        // 开始测量
        this.bloodOxygen.start();
        
        // 超时处理
        setTimeout(() => {
          this.bloodOxygen.offChange(callback);
          this.bloodOxygen.stop();
          reject(new Error("血氧测量超时"));
        }, timeoutMs);
        
      } catch (e) {
        logger.error("血氧测量失败:", e);
        reject(e);
      }
    });
  }

  /**
   * 采集压力数据（增强版 - 包含更多统计）
   */
  collectStress() {
    try {
      if (!this.stress) return null;
      
      const current = this.stress.getCurrent();
      const data = {
        value: current.value || 0,
        time: current.time || 0,
      };
      
      // 🔥 获取今天每小时平均压力（API_LEVEL 3.0+）
      try {
        const todayByHour = this.stress.getTodayByHour();
        if (todayByHour && todayByHour.length > 0) {
          // 计算今天的平均压力
          const validValues = todayByHour.filter(v => v > 0);
          if (validValues.length > 0) {
            const avgStress = validValues.reduce((a, b) => a + b, 0) / validValues.length;
            data.todayAverage = Math.round(avgStress);
            logger.log(`压力 - 今日平均: ${data.todayAverage}`);
          }
        }
      } catch (e) {
        // 设备不支持
      }
      
      // 🔥 获取过去7天平均压力（API_LEVEL 3.0+）
      try {
        const lastWeek = this.stress.getLastWeek();
        if (lastWeek && lastWeek.length > 0) {
          data.lastWeekAverage = lastWeek;
          logger.log(`压力 - 过去7天数据条数: ${lastWeek.length}`);
        }
      } catch (e) {
        // 设备不支持
      }
      
      logger.log(`压力 - 值: ${data.value}`);
      return data;
    } catch (e) {
      logger.error("压力采集失败:", e);
      return null;
    }
  }

  /**
   * 采集体温数据
   */
  collectBodyTemperature() {
    try {
      if (!this.bodyTemp) return null;
      const result = this.bodyTemp.getCurrent();
      logger.log(`体温 - 值: ${result.current}`);
      return {
        current: result.current || 0,
        timeinterval: result.timeinterval || 0,
      };
    } catch (e) {
      logger.error("体温采集失败:", e);
      return null;
    }
  }

  /**
   * 采集步数数据
   */
  collectStep() {
    try {
      if (!this.step) return null;
      const current = this.step.getCurrent();
      const target = this.step.getTarget();
      logger.log(`步数 - 当前: ${current}, 目标: ${target}`);
      return {
        current: current || 0,
        target: target || 0,
      };
    } catch (e) {
      logger.error("步数采集失败:", e);
      return null;
    }
  }

  /**
   * 采集气压和海拔数据
   */
  collectBarometer() {
    try {
      if (!this.barometer) return null;
      const airPressure = this.barometer.getAirPressure();
      const altitude = this.barometer.getAltitude();
      logger.log(`气压计 - 气压: ${airPressure} hPa, 海拔: ${altitude} m`);
      return {
        airPressure: airPressure || 0,
        altitude: altitude || 0,
      };
    } catch (e) {
      logger.error("气压计采集失败:", e);
      return null;
    }
  }

  /**
   * 采集卡路里数据
   */
  collectCalorie() {
    try {
      if (!this.calorie) return null;
      const current = this.calorie.getCurrent();
      logger.log(`卡路里 - 当前: ${current}`);
      return {
        current: current || 0,
      };
    } catch (e) {
      logger.error("卡路里采集失败:", e);
      return null;
    }
  }

  /**
   * 采集距离数据
   */
  collectDistance() {
    try {
      if (!this.distance) return null;
      const current = this.distance.getCurrent();
      const target = this.distance.getTarget();
      logger.log(`距离 - 当前: ${current} m, 目标: ${target} m`);
      return {
        current: current || 0,
        target: target || 0,
      };
    } catch (e) {
      logger.error("距离采集失败:", e);
      return null;
    }
  }

  /**
   * 采集睡眠数据
   */
  collectSleep() {
    try {
      if (!this.sleep) return null;
      const totalTime = this.sleep.getTotalTime();
      const deepTime = this.sleep.getDeepTime();
      logger.log(`睡眠 - 总时长: ${totalTime} min, 深睡: ${deepTime} min`);
      return {
        totalTime: totalTime || 0,
        deepTime: deepTime || 0,
      };
    } catch (e) {
      logger.error("睡眠采集失败:", e);
      return null;
    }
  }

  /**
   * 采集所有传感器数据
   * @returns {Object} 包含所有传感器数据的对象
   */
  collectAllData() {
    const timestamp = this.getTimestamp();
    
    const data = {
      timestamp: timestamp,
      deviceId: this.deviceInfo?.deviceSource || "unknown",
      heartRate: this.collectHeartRate(),
      bloodOxygen: this.collectBloodOxygen(),
      stress: this.collectStress(),
      bodyTemperature: this.collectBodyTemperature(),
      step: this.collectStep(),
      barometer: this.collectBarometer(),
      calorie: this.collectCalorie(),
      distance: this.collectDistance(),
      sleep: this.collectSleep(),
    };

    logger.log("数据采集完成:", JSON.stringify(data));
    return data;
  }

  /**
   * 销毁传感器实例
   */
  destroy() {
    this.heartRate = null;
    this.bloodOxygen = null;
    this.stress = null;
    this.bodyTemp = null;
    this.step = null;
    this.barometer = null;
    this.time = null;
    logger.log("传感器已销毁");
  }
}

