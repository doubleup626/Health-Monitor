/**
 * 向量化模块 - 使用 Qwen Embedding API
 */

const config = require('./config');

/**
 * 调用 Qwen Embedding API 生成向量
 * @param {string|string[]} texts - 单个文本或文本数组
 * @returns {Promise<number[]|number[][]>} 向量或向量数组
 */
async function generateEmbeddings(texts) {
  const isArray = Array.isArray(texts);
  const input = isArray ? texts : [texts];
  
  try {
    const response = await fetch(config.qwen.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.qwen.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: config.qwen.model,
        input: input,
        encoding_format: 'float'
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Qwen API 错误: ${response.status} - ${errorText}`);
    }
    
    const result = await response.json();
    
    // 提取向量
    const embeddings = result.data.map(item => item.embedding);
    
    return isArray ? embeddings : embeddings[0];
    
  } catch (error) {
    console.error('❌ 向量化失败:', error.message);
    throw error;
  }
}

/**
 * 批量生成向量（分批处理，避免API限制）
 * @param {string[]} texts - 文本数组
 * @param {number} batchSize - 每批数量
 */
async function generateEmbeddingsBatch(texts, batchSize = 10) {
  const results = [];
  
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    console.log(`📊 向量化进度: ${i + batch.length}/${texts.length}`);
    
    const embeddings = await generateEmbeddings(batch);
    results.push(...embeddings);
    
    // 避免API限流，稍微延迟
    if (i + batchSize < texts.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}

/**
 * 计算余弦相似度
 */
function cosineSimilarity(vec1, vec2) {
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }
  
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

module.exports = {
  generateEmbeddings,
  generateEmbeddingsBatch,
  cosineSimilarity
};
