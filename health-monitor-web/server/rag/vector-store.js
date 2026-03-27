/**
 * 向量数据库模块 - 使用纯JavaScript实现（不依赖hnswlib）
 */

const fs = require('fs').promises;
const path = require('path');
const config = require('./config');

// 余弦相似度计算
function cosineSimilarity(vec1, vec2) {
  let dotProduct = 0;
  let norm1 = 0;
  let norm2 = 0;
  
  for (let i = 0; i < vec1.length; i++) {
    dotProduct += vec1[i] * vec2[i];
    norm1 += vec1[i] * vec1[i];
    norm2 += vec2[i] * vec2[i];
  }
  
  if (norm1 === 0 || norm2 === 0) return 0;
  return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
}

class VectorStore {
  constructor() {
    this.chunks = []; // 存储文本块信息和向量
    this.initialized = false;
  }
  
  /**
   * 初始化向量索引
   */
  async initialize() {
    if (this.initialized) return;
    
    const metadataPath = path.join(config.paths.vectorsDir, 'chunks.json');
    
    // 确保目录存在
    await fs.mkdir(config.paths.vectorsDir, { recursive: true });
    
    try {
      // 尝试加载现有数据
      const metadataExists = await fs.access(metadataPath).then(() => true).catch(() => false);
      
      if (metadataExists) {
        console.log('📂 加载现有向量数据...');
        const chunksData = await fs.readFile(metadataPath, 'utf-8');
        this.chunks = JSON.parse(chunksData);
        console.log(`✅ 向量数据加载成功: ${this.chunks.length} 个文本块`);
      } else {
        console.log('🆕 创建新的向量存储...');
        this.chunks = [];
        console.log('✅ 向量存储创建成功');
      }
      
      this.initialized = true;
    } catch (error) {
      console.error('❌ 向量存储初始化失败:', error);
      throw error;
    }
  }
  
  /**
   * 添加文档向量
   */
  async addDocumentVectors(docId, chunks, vectors) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    console.log(`📥 添加文档向量: ${docId}, ${chunks.length} 个块`);
    
    for (let i = 0; i < chunks.length; i++) {
      const chunkId = `${docId}_chunk_${i}`;
      const chunkData = {
        chunk_id: chunkId,
        doc_id: docId,
        index: i,
        text: chunks[i].text,
        metadata: chunks[i].metadata || {},
        vector: vectors[i] // 直接存储向量
      };
      
      // 添加到chunks
      this.chunks.push(chunkData);
    }
    
    // 保存
    await this.save();
    
    console.log(`✅ 文档向量添加完成: ${chunks.length} 个块`);
  }
  
  /**
   * 搜索相似向量（暴力搜索）
   */
  async search(queryVector, topK = 20) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    if (this.chunks.length === 0) {
      return [];
    }
    
    try {
      // 计算所有向量的相似度
      const results = this.chunks.map(chunk => {
        const similarity = cosineSimilarity(queryVector, chunk.vector);
        return {
          chunk_id: chunk.chunk_id,
          doc_id: chunk.doc_id,
          text: chunk.text,
          metadata: chunk.metadata,
          score: similarity,
          distance: 1 - similarity
        };
      });
      
      // 排序并返回Top-K
      return results
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.min(topK, results.length));
        
    } catch (error) {
      console.error('❌ 向量搜索失败:', error);
      return [];
    }
  }
  
  /**
   * 删除文档的所有向量
   */
  async deleteDocument(docId) {
    if (!this.initialized) {
      await this.initialize();
    }
    
    // 过滤掉该文档的chunks
    const remainingChunks = this.chunks.filter(c => c.doc_id !== docId);
    const deletedCount = this.chunks.length - remainingChunks.length;
    
    if (deletedCount > 0) {
      console.log(`🗑️ 删除文档 ${docId} 的 ${deletedCount} 个向量块`);
      this.chunks = remainingChunks;
      await this.save();
    }
    
    return deletedCount;
  }
  
  /**
   * 保存数据
   */
  async save() {
    const metadataPath = path.join(config.paths.vectorsDir, 'chunks.json');
    await fs.writeFile(metadataPath, JSON.stringify(this.chunks, null, 2));
  }
  
  /**
   * 获取统计信息
   */
  getStats() {
    return {
      totalChunks: this.chunks.length,
      dimension: config.qwen.dimension,
      initialized: this.initialized
    };
  }
}

// 单例模式
const vectorStore = new VectorStore();

module.exports = vectorStore;
