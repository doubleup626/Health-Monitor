import { log as Logger } from "@zos/utils";
import * as appServiceMgr from "@zos/app-service";
import { SensorCollector } from "../utils/sensors";
import { Time } from "@zos/sensor";
import LocalStorage from "../utils/storage";
import { BasePage } from "@zeppos/zml/base-page";

const logger = Logger.getLogger("data-collector.service");
const moduleName = "Data Collector Service";

// 采集间隔（分钟）- 默认每1分钟采集一次
const COLLECT_INTERVAL_MINUTES = 1;

// Time 传感器实例
const timeSensor = new Time();

/**
 * App Service 定义
 * 使用 BasePage 以支持 this.request() BLE 通信
 */
AppService(
  BasePage({
    state: {
      sensorCollector: null,
      localStorage: null,
      isRunning: false,
      lastCollectMinute: -1, // 记录上次采集的分钟数，避免重复触发
    },

    onInit(params) {
      const launch_mode = params?.split("=")[1] || "unknown";
      logger.log(`${moduleName} onInit(launch_mode=${launch_mode})`);
      
      try {
        // 初始化本地存储
        this.state.localStorage = new LocalStorage("health_data.txt");
        logger.log("本地存储初始化成功");
        
        // 初始化传感器采集器
        this.state.sensorCollector = new SensorCollector();
        this.state.sensorCollector.init();
        logger.log("传感器采集器初始化成功");
        
        this.state.isRunning = true;
        
        // ✅ 核心：设置每分钟触发检查（借鉴 sleepagent）
        timeSensor.onPerMinute(() => {
          if (!this.state.isRunning) {
            return;
          }
          
          const currentMinute = timeSensor.getMinutes();
          
          // 避免同一分钟重复触发
          if (currentMinute === this.state.lastCollectMinute) {
            return;
          }
          
          // 检查是否是5的倍数分钟
          if (currentMinute % COLLECT_INTERVAL_MINUTES === 0) {
            logger.log(`⏰ 定时采集触发（第 ${currentMinute} 分钟）`);
            this.state.lastCollectMinute = currentMinute;
            this.collectAndPush();
          }
        });
        
        logger.log(`✅ 定时器已设置：每 ${COLLECT_INTERVAL_MINUTES} 分钟自动采集`);
        
        // 📊 立即执行一次采集和推送
        logger.log("📊 执行首次数据采集");
        this.collectAndPush();
        
        logger.log(`${moduleName} 启动成功`);
      } catch (e) {
        logger.error(`${moduleName} 初始化失败:`, e);
        throw e;
      }
    },

    /**
     * 采集数据并自动推送（简化版本，不做实时测量）
     */
    collectAndPush() {
      try {
        logger.log("🔍 开始采集传感器数据");
        
        // 1. 采集所有传感器数据（读取缓存值）
        const data = this.state.sensorCollector.collectAllData();
        
        // 2. 保存到本地
        const historyData = this.state.localStorage.get();
        const dataList = historyData.dataList || [];
        dataList.push(data);
        
        // 限制存储数量（最多保存100条）
        if (dataList.length > 100) {
          dataList.shift();
        }
        
        this.state.localStorage.set({
          dataList: dataList,
          lastCollectTime: data.timestamp,
        });
        
        logger.log(`✅ 数据采集并存储成功，当前共 ${dataList.length} 条数据`);
        
        // 3. 🔥 自动推送到手机（通过 BLE）
        logger.log("📤 开始自动推送数据到手机");
        
        this.request({
          method: "UPLOAD_HEALTH_DATA",
          params: {
            dataList: [data], // 每次只推送最新的一条
            count: 1,
            type: "auto", // 标记为自动采集
            timestamp: Date.now(),
          },
        })
        .then((result) => {
          logger.log("✅ 自动推送成功:", JSON.stringify(result));
          
          // 更新上传时间
          this.state.localStorage.set({
            dataList: dataList,
            lastUploadTime: Date.now(),
            needUpload: false,
          });
        })
        .catch((error) => {
          logger.error("❌ 自动推送失败:", error);
          logger.error("错误详情:", JSON.stringify(error));
          
          // 标记为需要上传（以便后续重试）
          this.state.localStorage.set({
            dataList: dataList,
            needUpload: true,
            lastMarkTime: Date.now(),
          });
        });
        
      } catch (e) {
        logger.error("❌ doCollectAndPush 失败:", e);
        logger.error("异常堆栈:", e.stack);
      }
    },

    onDestroy() {
      logger.log(`${moduleName} onDestroy`);
      
      try {
        this.state.isRunning = false;
        
        // 销毁传感器
        if (this.state.sensorCollector) {
          try {
            this.state.sensorCollector.destroy();
            this.state.sensorCollector = null;
            logger.log("✅ 传感器已销毁");
          } catch (sensorError) {
            logger.error("❌ 销毁传感器失败:", sensorError);
          }
        }
        
        logger.log(`${moduleName} 已销毁`);
      } catch (e) {
        logger.error(`${moduleName} 销毁失败:`, e);
      }
    },
  })
);

