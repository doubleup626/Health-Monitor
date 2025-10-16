import * as hmUI from "@zos/ui";
import { getText } from "@zos/i18n";
import { log as Logger, px } from "@zos/utils";
import * as appService from "@zos/app-service";
import { queryPermission, requestPermission } from "@zos/app";
import { SensorCollector } from "../../utils/sensors";
import LocalStorage from "../../utils/storage";
import { BasePage } from "@zeppos/zml/base-page";
import { getDeviceInfo } from "@zos/device";

const logger = Logger.getLogger("health-monitor");
const serviceFile = "app-service/data-collector";

// 颜色定义
const COLOR_WHITE = 0xffffff;
const COLOR_GREEN = 0x00ff00;
const COLOR_RED = 0xff0000;
const COLOR_GRAY = 0x808080;
const COLOR_BLUE = 0x00bfff;

  
Page(
  BasePage({
    state: {
      running: false,
      statusText: null,
      startButton: null,
      stopButton: null,
      dataText: null,
      deviceInfoText: null, // 新增：设备信息文本
      sensorCollector: null,
      localStorage: null,
      deviceId: null, // 新增：设备ID
    },

    build() {
      const vm = this;
  
      // 获取设备ID（使用 deviceSource）
      try {
        const deviceInfo = getDeviceInfo();
        vm.state.deviceId = deviceInfo.deviceSource || "未知设备";
        logger.log("📱 设备信息:", JSON.stringify(deviceInfo));
        logger.log("📱 设备ID (deviceSource):", vm.state.deviceId);
      } catch (e) {
        logger.error("获取设备ID失败:", e);
        vm.state.deviceId = "获取失败";
      }
      
      // 初始化存储
      vm.state.localStorage = new LocalStorage("health_data.txt");
      
      // 检查服务是否正在运行
      let services = appService.getAllAppServices();
      vm.state.running = services.includes(serviceFile);
      logger.log("服务运行状态:", vm.state.running);

      // 标题
      hmUI.createWidget(hmUI.widget.TEXT, {
        x: px(0),
        y: px(50),
        w: px(480),
        h: px(50),
        color: COLOR_WHITE,
        text_size: px(32),
        align_h: hmUI.align.CENTER_H,
        align_v: hmUI.align.CENTER_V,
        text: getText("title"),
      });
      
      // 设备信息显示（新增）
      vm.state.deviceInfoText = hmUI.createWidget(hmUI.widget.TEXT, {
        x: px(20),
        y: px(105),
        w: px(440),
        h: px(60),
        color: COLOR_BLUE,
        text_size: px(16),
        align_h: hmUI.align.CENTER_H,
        align_v: hmUI.align.CENTER_V,
        text: `📱 设备: ${vm.state.deviceId}\n🔄 正在检查绑定状态...`,
        line_space: px(2),
      });

      // 状态文本
      vm.state.statusText = hmUI.createWidget(hmUI.widget.TEXT, {
        x: px(40),
        y: px(170),
        w: px(400),
        h: px(70),
        color: vm.state.running ? COLOR_GREEN : COLOR_GRAY,
        text_size: px(24),
        align_h: hmUI.align.CENTER_H,
        align_v: hmUI.align.CENTER_V,
        text: vm.state.running ? getText("status_running") : getText("status_stopped"),
      });

      // 数据显示区域（增加高度，使用滚动视图）
      vm.state.dataText = hmUI.createWidget(hmUI.widget.TEXT, {
        x: px(40),
        y: px(250),
        w: px(400),
        h: px(260),  // 调整高度
        color: COLOR_WHITE,
        text_size: px(18),  // 稍微缩小字体以显示更多内容
        align_h: hmUI.align.LEFT,
        align_v: hmUI.align.TOP,
        text: getText("data_info"),
        line_space: px(2),  // 行间距
      });

      // 更新数据显示
      vm.updateDataDisplay();

      // 开始采集按钮
      vm.state.startButton = hmUI.createWidget(hmUI.widget.BUTTON, {
        x: px(80),
        y: px(540),
        w: px(320),
        h: px(70),
        radius: px(35),
        normal_color: COLOR_GREEN,
        press_color: 0x00cc00,
        text: getText("start_collect"),
        text_size: px(24),
        click_func: () => {
          vm.startService();
        },
      });

      // 停止采集按钮
      vm.state.stopButton = hmUI.createWidget(hmUI.widget.BUTTON, {
        x: px(80),
        y: px(625),
        w: px(320),
        h: px(70),
        radius: px(35),
        normal_color: COLOR_RED,
        press_color: 0xcc0000,
        text: getText("stop_collect"),
        text_size: px(24),
        click_func: () => {
          vm.stopService();
        },
      });

      // 手动采集按钮
      hmUI.createWidget(hmUI.widget.BUTTON, {
        x: px(80),
        y: px(710),
        w: px(320),
        h: px(70),
        radius: px(35),
        normal_color: COLOR_BLUE,
        press_color: 0x0099cc,
        text: getText("manual_collect"),
        text_size: px(24),
        click_func: () => {
          vm.manualCollect();
        },
      });

      // 更新按钮状态
      vm.updateButtonState();
    },

    /**
     * 更新数据显示（增强版）
     */
    updateDataDisplay() {
      const vm = this;
      try {
        const data = vm.state.localStorage.get();
        const dataList = data.dataList || [];
        
        let displayText = getText("data_count") + ": " + dataList.length + "\n";
        
        if (dataList.length > 0) {
          const lastData = dataList[dataList.length - 1];
          const date = new Date(lastData.timestamp);
          
          displayText += getText("last_collect_time") + ":\n";
          displayText += date.toLocaleString("zh-CN") + "\n";
          
          // 人体数据
          if (lastData.heartRate && lastData.heartRate.current > 0) {
            displayText += "❤ 心率: " + lastData.heartRate.current + " bpm\n";
          }
          if (lastData.bloodOxygen && lastData.bloodOxygen.value > 0) {
            displayText += "🫁 血氧: " + lastData.bloodOxygen.value + "%\n";
          }
          if (lastData.stress && lastData.stress.value > 0) {
            displayText += "😰 压力: " + lastData.stress.value + "\n";
          }
          if (lastData.bodyTemperature && lastData.bodyTemperature.current > 0) {
            displayText += "🌡 体温: " + lastData.bodyTemperature.current + "°C\n";
          }
          if (lastData.step && lastData.step.current >= 0) {
            displayText += "👣 步数: " + lastData.step.current + "/" + lastData.step.target + "\n";
          }
          if (lastData.calorie && lastData.calorie.current >= 0) {
            displayText += "🔥 卡路里: " + lastData.calorie.current + " kcal\n";
          }
          if (lastData.distance && lastData.distance.current >= 0) {
            displayText += "📏 距离: " + (lastData.distance.current / 1000).toFixed(2) + " km\n";
          }
          
          // 环境数据
          if (lastData.barometer) {
            if (lastData.barometer.altitude) {
              displayText += "⛰ 海拔: " + lastData.barometer.altitude.toFixed(1) + " m\n";
            }
            if (lastData.barometer.airPressure) {
              displayText += "🌤 气压: " + lastData.barometer.airPressure.toFixed(1) + " hPa\n";
            }
          }
          
          // 睡眠数据（如果有）
          if (lastData.sleep && lastData.sleep.totalTime > 0) {
            const hours = Math.floor(lastData.sleep.totalTime / 60);
            const minutes = lastData.sleep.totalTime % 60;
            displayText += "😴 睡眠: " + hours + "h" + minutes + "m\n";
          }
        }
        
        vm.state.dataText.setProperty(hmUI.prop.TEXT, displayText);
      } catch (e) {
        logger.error("更新数据显示失败:", e);
      }
    },

    /**
     * 更新按钮状态
     */
    updateButtonState() {
      const vm = this;
      // 根据运行状态启用/禁用按钮
      // ZeppOS 没有直接的禁用按钮方法，可以通过改变颜色或文本提示用户
    },

    /**
     * 请求权限
     */
    requestPermission(callback) {
      const permissions = ["device:os.bg_service"];
      
      const [result] = queryPermission({ permissions });
      
      if (result === 0) {
        // 需要请求权限
        requestPermission({
          permissions,
          callback([result]) {
            if (result === 2) {
              // 权限已授予
              callback(true);
            } else {
              hmUI.showToast({ text: getText("permission_denied") });
              callback(false);
            }
          },
        });
      } else if (result === 2) {
        // 权限已授予
        callback(true);
      } else {
        hmUI.showToast({ text: getText("permission_denied") });
        callback(false);
      }
    },

    /**
     * 启动后台服务
     */
    startService() {
      const vm = this;
      logger.log("启动数据采集服务");
      
      vm.requestPermission((granted) => {
        if (!granted) {
          logger.log("用户拒绝授权");
          return;
        }
        
        try {
          const result = appService.start({
            url: serviceFile,
            param: "action=start",
            complete_func: (info) => {
              logger.log("🔔 启动服务回调:", JSON.stringify(info));
              
              // 延迟检查服务状态（给服务一些启动时间）
              setTimeout(() => {
                let services = appService.getAllAppServices();
                vm.state.running = services.includes(serviceFile);
                
                logger.log("📊 服务列表:", services);
                logger.log("🎯 服务运行状态:", vm.state.running);
                
                if (vm.state.running) {
                  vm.state.statusText.setProperty(hmUI.prop.TEXT, getText("status_running"));
                  vm.state.statusText.setProperty(hmUI.prop.COLOR, COLOR_GREEN);
                  
                  // 提示信息
                  if (info && info.result) {
                    const toastText = "👷 工人模式已启动\n每5分钟自动采集并上传\n无需手动操作";
                    hmUI.showToast({ text: toastText });
                  } else {
                    hmUI.showToast({ text: "⚠️ 服务已启动\n(模拟器定时器受限)" });
                  }
                  
                  vm.updateButtonState();
                  
                  // 刷新数据显示
                  setTimeout(() => {
                    vm.updateDataDisplay();
                  }, 500);
                } else {
                  logger.error("❌ 服务启动验证失败");
                  hmUI.showToast({ text: "❌ 服务启动失败" });
                }
              }, 500); // 延迟500ms再检查
            },
          });
          
          if (!result) {
            logger.error("appService.start 返回 false");
          }
        } catch (e) {
          logger.error("启动服务异常:", e);
          hmUI.showToast({ text: "启动失败: " + (e.message || "未知错误") });
        }
      });
    },

    /**
     * 停止后台服务
     */
    stopService() {
      const vm = this;
      logger.log("停止数据采集服务");
      
      appService.stop({
        url: serviceFile,
        param: "action=stop",
        complete_func: (info) => {
          logger.log("停止服务结果:", JSON.stringify(info));
          
          if (info.result) {
            vm.state.running = false;
            vm.state.statusText.setProperty(hmUI.prop.TEXT, getText("status_stopped"));
            vm.state.statusText.setProperty(hmUI.prop.COLOR, COLOR_GRAY);
            hmUI.showToast({ text: getText("service_stopped") });
            vm.updateButtonState();
          } else {
            hmUI.showToast({ text: getText("service_stop_failed") });
          }
        },
      });
    },

    /**
     * 手动采集数据
     */
    manualCollect() {
      const vm = this;
      logger.log("手动采集数据");
      
      try {
        if (!vm.state.sensorCollector) {
          vm.state.sensorCollector = new SensorCollector();
          vm.state.sensorCollector.init();
        }
        
        const data = vm.state.sensorCollector.collectAllData();
        
        // 保存数据
        const historyData = vm.state.localStorage.get();
        const dataList = historyData.dataList || [];
        dataList.push(data);
        
        if (dataList.length > 100) {
          dataList.shift();
        }
        
        vm.state.localStorage.set({
          dataList: dataList,
          lastCollectTime: data.timestamp,
        });
        
        hmUI.showToast({ text: getText("manual_collect_success") });
        vm.updateDataDisplay();
        
        // 🔥 新增：立即推送数据到手机
        logger.log("开始推送数据到手机...");
        vm.uploadDataToPhone();
      } catch (e) {
        logger.error("手动采集失败:", e);
        hmUI.showToast({ text: getText("manual_collect_failed") });
      }
    },

    /**
     * 上传数据到手机（通过 BLE 发送到 Side Service）
     */
    uploadDataToPhone() {
      const vm = this;
      
      try {
        const historyData = vm.state.localStorage.get();
        const dataList = historyData.dataList || [];
        
        if (dataList.length === 0) {
          logger.log("没有数据需要上传");
          hmUI.showToast({ text: "⚠️ 没有数据" });
          return;
        }
        
        logger.log(`准备推送 ${dataList.length} 条数据到手机`);
        hmUI.showToast({ text: "📤 正在推送..." });
        
        logger.log("调用 this.request() 发送数据...");
        
        this.request({
          method: "UPLOAD_HEALTH_DATA",
          params: {
            dataList: dataList,
            count: dataList.length,
          },
        })
          .then((data) => {
            logger.log("✅ 收到 Side Service 响应:", JSON.stringify(data));
            
            if (data && data.result && data.result.success) {
              hmUI.showToast({ text: "✅ 数据已推送！" });
              
              vm.state.localStorage.set({
                dataList: dataList,
                needUpload: false,
                lastUploadTime: Date.now(),
              });
              
              logger.log("数据上传成功");
            } else {
              logger.error("❌ 推送失败:", JSON.stringify(data));
              hmUI.showToast({ text: "❌ 推送失败" });
            }
          })
          .catch((error) => {
            logger.error("❌ 请求失败:", error);
            logger.error("错误详情:", JSON.stringify(error));
            hmUI.showToast({ text: "❌ 通信失败" });
            
            vm.state.localStorage.set({
              dataList: dataList,
              needUpload: true,
              lastMarkTime: Date.now(),
            });
          });
        
      } catch (e) {
        logger.error("❌ 上传数据异常:", e);
        logger.error("异常堆栈:", e.stack);
        hmUI.showToast({ text: "❌ 上传失败" });
      }
    },

    onReady() {
      logger.log("Page onReady");
    },

    onShow() {
      logger.log("Page onShow");
      // 刷新数据显示
      this.updateDataDisplay();
    },

    onHide() {
      logger.log("Page onHide");
    },

    onDestroy() {
      logger.log("Page onDestroy");
      if (this.state.sensorCollector) {
        this.state.sensorCollector.destroy();
      }
    },
  })
);