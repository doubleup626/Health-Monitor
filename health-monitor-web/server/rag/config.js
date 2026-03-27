/**
 * RAG 配置文件
 */

module.exports = {
  // Qwen Embedding API 配置
  qwen: {
    apiKey: 'sk-90ba9dc30574490e856467768874a133',
    endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings',
    model: 'text-embedding-v3', // Qwen的embedding模型
    dimension: 1024 // Qwen embedding维度
  },
  
  // 文档处理配置
  document: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    supportedTypes: ['pdf', 'doc', 'docx', 'md'],
    chunkSize: 500,        // 分块大小（字符）
    chunkOverlap: 50       // 重叠大小（字符）
  },
  
  // 检索配置
  retrieval: {
    topK: 20,              // 初始检索数量
    rerankTopK: 5,         // Rerank后保留数量
    similarityThreshold: 0.5, // 相似度阈值
    hybridAlpha: 0.7       // 混合检索权重（0.7向量 + 0.3 BM25）
  },
  
  // 存储路径
  paths: {
    dataDir: './rag-data',
    documentsDir: './rag-data/documents',
    chunksDir: './rag-data/chunks',
    vectorsDir: './rag-data/vectors',
    metadataFile: './rag-data/metadata.json'
  }
};
