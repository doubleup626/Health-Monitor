import { BaseSideService } from "@zeppos/zml/base-side";
import { MessageBuilder } from "../shared/message-side";

// ⚠️ 重要：配置您的数据库服务器地址
// 请将下面的地址改为您实际的服务器地址
// const SERVER_URL = "http://192.168.31.206:3000/api/health-data";
const SERVER_URL = "192.168.31.206:3000/api/health-data";

console.log("🔥🔥🔥 APP-SIDE INDEX.JS 文件已加载 🔥🔥🔥");
console.log("🔥🔥🔥 准备创建 MessageBuilder 实例 🔥🔥🔥");

const messageBuilder = new MessageBuilder();

console.log("🔥🔥🔥 MessageBuilder 实例已创建 🔥🔥🔥");

/**
 * 从 MessageBuilder 请求中上传健康数据
 * @param {Object} params - 请求参数
 * @param {Object} ctx - 消息上下文
 */
async function uploadHealthDataFromMessage(params, ctx) {
  try {
    console.log("🚀 准备上传数据到服务器");
    console.log("📊 数据条数:", params.dataList ? params.dataList.length : 0);
    console.log("🌐 服务器地址:", SERVER_URL);
    
    // 验证数据
    if (!params.dataList || params.dataList.length === 0) {
      console.log("⚠️ 没有数据需要上传");
      ctx.response({
        data: {
          result: {
            success: false,
            error: "没有数据需要上传",
          },
        },
      });
      return;
    }
    
    // 批量上传数据
    console.log("📤 正在发送 POST 请求...");
    const response = await fetch({
      url: SERVER_URL,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "batch",
        count: params.dataList.length,
        data: params.dataList,
        uploadTime: new Date().toISOString(),
      }),
    });

    console.log("📥 收到服务器响应, 状态码:", response.status);
    
    const resBody = typeof response.body === "string" 
      ? JSON.parse(response.body) 
      : response.body;

    console.log("✅ 服务器响应内容:", JSON.stringify(resBody));

    // 发送成功响应回手表
    ctx.response({
      data: {
        result: {
          success: true,
          uploadedCount: params.dataList.length,
          serverResponse: resBody,
        },
      },
    });
    
  } catch (error) {
    console.error("❌ 上传数据失败:", error);
    console.error("错误详情:", error.message, error.stack);
    
    // 发送失败响应回手表
    ctx.response({
      data: {
        result: {
          success: false,
          error: error.message || "网络请求失败",
        },
      },
    });
  }
}

/**
 * 发送健康数据到服务器（原有方法，用于 onRequest）
 * @param {Object} data - 健康数据对象
 * @param {Function} res - 响应回调函数
 */
async function uploadHealthData(data, res) {
  try {
    console.log("🚀 准备上传数据到服务器");
    console.log("📊 数据条数:", data.dataList ? data.dataList.length : 0);
    console.log("🌐 服务器地址:", SERVER_URL);
    
    // 验证数据
    if (!data.dataList || data.dataList.length === 0) {
      console.log("⚠️ 没有数据需要上传");
      res(null, {
        success: false,
        error: "没有数据需要上传",
      });
      return;
    }
    
    // 批量上传数据
    console.log("📤 正在发送 POST 请求...");
    const response = await fetch({
      url: SERVER_URL,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "batch",
        count: data.dataList.length,
        data: data.dataList,
        uploadTime: new Date().toISOString(),
      }),
    });

    console.log("📥 收到服务器响应, 状态码:", response.status);
    
    const resBody = typeof response.body === "string" 
      ? JSON.parse(response.body) 
      : response.body;

    console.log("✅ 服务器响应内容:", JSON.stringify(resBody));

    res(null, {
      success: true,
      result: resBody,
      uploadedCount: data.dataList.length,
    });
  } catch (error) {
    console.error("❌ 上传数据失败:", error);
    console.error("错误详情:", error.message, error.stack);
    res(null, {
      success: false,
      error: error.message || "网络请求失败",
    });
  }
}

/**
 * 测试服务器连接
 * @param {Function} res - 响应回调函数
 */
async function testConnection(res) {
  try {
    console.log("测试服务器连接:", SERVER_URL);
    
    const response = await fetch({
      url: SERVER_URL.replace('/api/health-data', '/api/ping'),
      method: "GET",
    });

    const resBody = typeof response.body === "string" 
      ? JSON.parse(response.body) 
      : response.body;

    console.log("服务器连接测试成功:", resBody);

    res(null, {
      success: true,
      result: resBody,
    });
  } catch (error) {
    console.error("服务器连接测试失败:", error);
    res(null, {
      success: false,
      error: error.message || "连接失败",
    });
  }
}

/**
 * ArrayBuffer 转字符串
 */
function ab2str(buffer) {
  const buf = new Uint8Array(buffer);
  let str = "";
  for (let i = 0; i < buf.length; i++) {
    str += String.fromCharCode(buf[i]);
  }
  return str;
}

/**
 * Side Service 主入口
 */
console.log("🔥🔥🔥 准备调用 AppSideService 🔥🔥🔥");

AppSideService(
  BaseSideService({
    onInit() {
      console.log("🔥🔥🔥🔥🔥 ONINIT 被调用了！🔥🔥🔥🔥🔥");
      console.log("=== Side Service 初始化开始 ===");
      console.log("服务器地址:", SERVER_URL);
      console.log("MessageBuilder 类型:", typeof MessageBuilder);
      console.log("messageBuilder 实例:", typeof messageBuilder);
      
      // 初始化 MessageBuilder
      try {
        console.log("开始初始化 MessageBuilder 监听...");
        
        messageBuilder.listen(() => {
          console.log("✅✅✅ MessageBuilder 监听已启动并连接成功 ✅✅✅");
        });
        
        console.log("设置 request 事件监听器...");
        
        // 监听来自手表的请求
        messageBuilder.on("request", (ctx) => {
          console.log("📱📱📱 收到手表请求！📱📱📱");
          console.log("请求上下文:", ctx);
          console.log("请求 payload:", ctx.request.payload);
          
          try {
            const payload = messageBuilder.buf2Json(ctx.request.payload);
            console.log("📦 解析后的 payload:", JSON.stringify(payload));
            console.log("📋 请求方法:", payload.method);
            
            if (payload.method === "UPLOAD_HEALTH_DATA") {
              console.log("📊 处理健康数据上传请求");
              console.log("📦 数据条数:", payload.params?.count || 0);
              
              // 调用上传函数
              uploadHealthDataFromMessage(payload.params, ctx);
            } else {
              console.log("❌ 未知的请求方法:", payload.method);
              ctx.response({
                data: {
                  success: false,
                  error: "未知的请求方法",
                },
              });
            }
          } catch (parseError) {
            console.error("❌ 解析请求失败:", parseError);
            ctx.response({
              data: {
                success: false,
                error: "解析请求失败: " + parseError.message,
              },
            });
          }
        });
        
        console.log("✅ MessageBuilder 事件监听器设置完成");
        
        // 监听错误事件
        messageBuilder.on("error", (error) => {
          console.error("❌ MessageBuilder 错误:", error);
        });
        
      } catch (e) {
        console.error("❌ MessageBuilder 初始化失败:", e);
        console.error("错误堆栈:", e.stack);
      }
      
      console.log("=== Side Service 初始化完成 ===");
    },

    onRun() {
      console.log("Side Service 运行中");
    },

    onDestroy() {
      console.log("Side Service 已销毁");
    },

    onRequest(req, res) {
      console.log("📱 收到 Device App 请求:", req.method);
      console.log("📦 请求参数:", JSON.stringify(req.params));

      switch (req.method) {
        case "UPLOAD_HEALTH_DATA":
          // 接收并上传健康数据
          console.log("✅ 处理健康数据上传请求");
          uploadHealthData(req.params, res);
          break;
          
        case "TEST_CONNECTION":
          // 测试服务器连接
          console.log("🔍 测试服务器连接");
          testConnection(res);
          break;
          
        default:
          console.log("❌ 未知的请求方法:", req.method);
          res(null, {
            success: false,
            error: "未知的请求方法",
          });
      }
    },
  })
);

// 监听来自 Device App 的 BLE 消息
// 注意：这里使用原生的 messaging API 来接收 BLE 数据
if (typeof messaging !== "undefined") {
  messaging.peerSocket.addListener("message", async (payload) => {
    try {
      console.log("收到 BLE 消息");
      
      // 解析消息
      const jsonStr = ab2str(payload);
      const data = JSON.parse(jsonStr);
      
      console.log("消息类型:", data.type);
      
      // 处理健康数据批量上传
      if (data.type === "HEALTH_DATA_BATCH") {
        console.log("收到健康数据批量上传请求");
        
        // 自动上传到服务器
        try {
          const response = await fetch({
            url: SERVER_URL,
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              type: "batch",
              count: data.count || 0,
              data: data.dataList || [],
            }),
          });

          const resBody = typeof response.body === "string" 
            ? JSON.parse(response.body) 
            : response.body;

          console.log("数据上传成功:", resBody);
          
          // 发送成功响应回手表
          const responseStr = JSON.stringify({
            success: true,
            message: "数据上传成功",
          });
          const responseBuffer = new ArrayBuffer(responseStr.length);
          const bufView = new Uint8Array(responseBuffer);
          for (let i = 0; i < responseStr.length; i++) {
            bufView[i] = responseStr.charCodeAt(i);
          }
          messaging.peerSocket.send(responseBuffer);
          
        } catch (error) {
          console.error("数据上传失败:", error);
          
          // 发送失败响应回手表
          const errorStr = JSON.stringify({
            success: false,
            message: "数据上传失败: " + error.message,
          });
          const errorBuffer = new ArrayBuffer(errorStr.length);
          const bufView = new Uint8Array(errorBuffer);
          for (let i = 0; i < errorStr.length; i++) {
            bufView[i] = errorStr.charCodeAt(i);
          }
          messaging.peerSocket.send(errorBuffer);
        }
      }
    } catch (error) {
      console.error("处理 BLE 消息失败:", error);
    }
  });
}

