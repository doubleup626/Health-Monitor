/**
 * 消息传递工具类
 * 用于简化手表和手机之间的通信
 */
import { log as Logger } from "@zos/utils";

const logger = Logger.getLogger("messaging");

/**
 * 消息类型常量
 */
export const MESSAGE_TYPE = {
  HEALTH_DATA: "HEALTH_DATA",
  HEALTH_DATA_BATCH: "HEALTH_DATA_BATCH",
  UPLOAD_SUCCESS: "UPLOAD_SUCCESS",
  UPLOAD_FAILED: "UPLOAD_FAILED",
};

/**
 * 字符串转 ArrayBuffer
 * @param {string} str - 要转换的字符串
 * @returns {ArrayBuffer}
 */
export function str2ab(str) {
  const buffer = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buffer);
  for (let i = 0; i < str.length; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buffer;
}

/**
 * ArrayBuffer 转字符串
 * @param {ArrayBuffer} buffer - 要转换的 ArrayBuffer
 * @returns {string}
 */
export function ab2str(buffer) {
  const buf = new Uint8Array(buffer);
  let str = "";
  for (let i = 0; i < buf.length; i++) {
    str += String.fromCharCode(buf[i]);
  }
  return str;
}

/**
 * 创建消息对象
 * @param {string} type - 消息类型
 * @param {Object} payload - 消息内容
 * @returns {Object}
 */
export function createMessage(type, payload = {}) {
  return {
    type,
    timestamp: Date.now(),
    ...payload,
  };
}

/**
 * 发送消息到手机（使用 messaging API）
 * 注意：这个函数只在手表端使用
 * @param {string} type - 消息类型
 * @param {Object} payload - 消息内容
 * @returns {Promise}
 */
export function sendMessageToPeer(type, payload) {
  return new Promise((resolve, reject) => {
    try {
      // 检查是否支持 messaging API
      if (typeof messaging === "undefined") {
        logger.error("messaging API 不可用");
        reject(new Error("messaging API 不可用"));
        return;
      }

      const message = createMessage(type, payload);
      const messageStr = JSON.stringify(message);
      const messageBuffer = str2ab(messageStr);

      logger.log(`发送消息: ${type}, 大小: ${messageStr.length} 字节`);

      // 发送消息
      messaging.peerSocket.send(messageBuffer);

      // 监听响应（可选）
      const responseHandler = (response) => {
        try {
          const responseStr = ab2str(response);
          const responseData = JSON.parse(responseStr);
          
          logger.log("收到响应:", responseData.type);
          
          // 移除监听器
          messaging.peerSocket.removeListener("message", responseHandler);
          
          resolve(responseData);
        } catch (e) {
          logger.error("解析响应失败:", e);
          reject(e);
        }
      };

      // 设置超时
      const timeout = setTimeout(() => {
        messaging.peerSocket.removeListener("message", responseHandler);
        reject(new Error("消息发送超时"));
      }, 30000); // 30秒超时

      messaging.peerSocket.addListener("message", responseHandler);

    } catch (error) {
      logger.error("发送消息失败:", error);
      reject(error);
    }
  });
}

/**
 * 接收消息处理器（用于 Side Service）
 * @param {ArrayBuffer} payload - 接收到的消息
 * @param {Function} handler - 消息处理函数
 */
export function handleIncomingMessage(payload, handler) {
  try {
    const messageStr = ab2str(payload);
    const message = JSON.parse(messageStr);
    
    logger.log("收到消息:", message.type);
    
    // 调用处理函数
    handler(message);
  } catch (error) {
    logger.error("处理消息失败:", error);
  }
}

/**
 * 发送响应回手表（用于 Side Service）
 * @param {Object} responseData - 响应数据
 */
export function sendResponseToPeer(responseData) {
  try {
    if (typeof messaging === "undefined") {
      console.error("messaging API 不可用");
      return;
    }

    const responseStr = JSON.stringify(responseData);
    const responseBuffer = str2ab(responseStr);
    
    messaging.peerSocket.send(responseBuffer);
    console.log("响应已发送:", responseData.success ? "成功" : "失败");
  } catch (error) {
    console.error("发送响应失败:", error);
  }
}

/**
 * 批量发送健康数据
 * @param {Array} dataList - 健康数据列表
 * @returns {Promise}
 */
export function sendHealthDataBatch(dataList) {
  return sendMessageToPeer(MESSAGE_TYPE.HEALTH_DATA_BATCH, {
    count: dataList.length,
    dataList: dataList,
  });
}

export default {
  MESSAGE_TYPE,
  str2ab,
  ab2str,
  createMessage,
  sendMessageToPeer,
  handleIncomingMessage,
  sendResponseToPeer,
  sendHealthDataBatch,
};

