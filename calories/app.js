import { BaseApp } from "@zeppos/zml/base-app";
import { log as Logger } from "@zos/utils";
import LocalStorage from "./utils/storage";

const logger = Logger.getLogger("health-monitor-app");
const fileName = "app_data.txt";

App(
  BaseApp({
    globalData: {
      localStorage: null,
      collectInterval: 1 * 60 * 1000, // 1分钟
      uploadInterval: 1 * 60 * 1000, // 1分钟
    },
    
    onCreate() {
      logger.log("应用创建");
      try {
        this.globalData.localStorage = new LocalStorage(fileName);
        const data = this.globalData.localStorage.get();
        
        // 加载用户配置
        if (data.collectInterval) {
          this.globalData.collectInterval = data.collectInterval;
        }
        if (data.uploadInterval) {
          this.globalData.uploadInterval = data.uploadInterval;
        }
        
        logger.log("应用配置加载完成");
      } catch (e) {
        logger.error("应用创建失败:", e);
      }
    },

    onDestroy() {
      logger.log("应用销毁");
      try {
        if (this.globalData.localStorage) {
          this.globalData.localStorage.set({
            collectInterval: this.globalData.collectInterval,
            uploadInterval: this.globalData.uploadInterval,
            lastDestroy: Date.now(),
          });
        }
      } catch (e) {
        logger.error("应用销毁失败:", e);
      }
    },
  })
);
