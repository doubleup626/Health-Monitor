import { BaseSideService } from "@zeppos/zml/base-side";

// 服务器地址配置
const SERVER_URL = "http://192.168.31.206:3000/api/health-data";

// ⭐ 工人ID配置（根据设备ID映射）
// 每个手表对应一个工人ID，可以在这里配置
const DEVICE_WORKER_MAP = {
  "10092800": "W001",  // 张三的手表
  "10092801": "W002",  // 李四的手表
  "10092802": "W003",  // 王五的手表
  // 添加新手表时，在这里配置：
  // "10092805": "W004",  // 新工人的手表
};

console.log("🔥 Side Service 文件已加载");

async function uploadHealthData(params, res) {
  try {
    console.log("🚀 开始上传数据到服务器");
    console.log("📊 数据条数:", params.dataList ? params.dataList.length : 0);
    console.log("🌐 服务器地址:", SERVER_URL);
    
    if (!params.dataList || params.dataList.length === 0) {
      console.log("⚠️ 没有数据需要上传");
      res(null, {
        result: {
          success: false,
          error: "没有数据",
        },
      });
      return;
    }
    
    // 获取设备ID和对应的工人ID
    const deviceId = params.dataList[0]?.deviceId;
    const workerId = DEVICE_WORKER_MAP[deviceId] || null;
    
    if (workerId) {
      console.log(`📱 设备 ${deviceId} → 工人 ${workerId}`);
    } else {
      console.log(`⚠️ 设备 ${deviceId} 未配置工人ID，将由服务器自动分配`);
    }
    
    console.log("📤 正在发送 POST 请求到服务器...");
    const response = await fetch({
      url: SERVER_URL,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "batch",
        count: params.dataList.length,
        worker_id: workerId,  // ⭐ 添加工人ID
        data: params.dataList,
        uploadTime: new Date().toISOString(),
        source: "side-service",
      }),
    });

    console.log("📥 收到服务器响应, 状态码:", response.status);
    
    const resBody = typeof response.body === "string" 
      ? JSON.parse(response.body) 
      : response.body;

    console.log("✅ 服务器响应:", JSON.stringify(resBody));

    res(null, {
      result: {
        success: true,
        uploadedCount: params.dataList.length,
        serverResponse: resBody,
      },
    });
    
  } catch (error) {
    console.error("❌ 上传数据失败:", error);
    
    res(null, {
      result: {
        success: false,
        error: error.message || "网络请求失败",
      },
    });
  }
}

console.log("🔥 初始化 Side Service");

AppSideService(
  BaseSideService({
    onInit() {
      console.log("🔥🔥🔥 Side Service 初始化完成 🔥🔥🔥");
      console.log("服务器地址:", SERVER_URL);
    },

    onRequest(req, res) {
      console.log("📱 收到手表请求:", req.method);
      console.log("📦 请求参数:", JSON.stringify(req.params));

      if (req.method === "UPLOAD_HEALTH_DATA") {
        console.log("📊 处理健康数据上传");
        uploadHealthData(req.params, res);
      } else {
        console.log("❌ 未知方法:", req.method);
        res(null, {
          result: {
            success: false,
            error: "未知方法",
          },
        });
      }
    },

    onRun() {
      console.log("Side Service 运行中");
    },

    onDestroy() {
      console.log("Side Service 已销毁");
    },
  })
);

console.log("🔥 Side Service 代码执行完成");
