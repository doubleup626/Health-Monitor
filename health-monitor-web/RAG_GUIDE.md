# 📚 RAG检索功能使用指南

## 🎯 功能概述

RAG (Retrieval-Augmented Generation) 检索增强生成功能，允许系统从上传的文档中检索相关知识，增强AI分析的准确性和专业性。

### 核心特性

- ✅ 支持PDF、DOC/DOCX、Markdown文档上传
- ✅ 自动文本提取和智能分块
- ✅ 使用Qwen Embedding API进行向量化
- ✅ 混合检索（向量检索 + BM25）
- ✅ Rerank重排序提升准确性
- ✅ 完全本地存储，数据安全
- ✅ 集成到AI健康分析

---

## 🚀 快速开始

### 1. 安装依赖

```bash
cd health-monitor-web/server
npm install
```

新增依赖包：
- `pdf-parse` - PDF文档解析
- `mammoth` - DOC/DOCX文档解析
- `marked` - Markdown解析
- `hnswlib-node` - 向量数据库
- `formidable` - 文件上传处理
- `uuid` - 生成唯一ID

### 2. 初始化数据库

```bash
npm run init-db
```

这会创建RAG相关的数据表：
- `rag_documents` - 文档管理
- `rag_chunks` - 文本块存储
- `rag_queries` - 查询日志

### 3. 配置Qwen API

编辑 `server/rag/config.js`：

```javascript
qwen: {
  apiKey: 'your-qwen-api-key',  // 替换为你的Qwen API Key
  endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings',
  model: 'text-embedding-v3',
  dimension: 1024
}
```

### 4. 启动服务器

```bash
npm start
```

---

## 📡 API接口

### 1. 上传文档

```bash
POST /api/rag/upload
Content-Type: multipart/form-data

# 表单字段：
- file: 文档文件（必需）
- title: 文档标题（可选）
- category: 分类（可选，如：safety, health, emergency）
- tags: 标签（可选，JSON数组）
```

**示例（使用curl）：**

```bash
curl -X POST http://localhost:3000/api/rag/upload \
  -F "file=@深地救援准则.pdf" \
  -F "title=深地救援准则" \
  -F "category=safety" \
  -F "tags=[\"救援\",\"安全\"]"
```

**响应：**

```json
{
  "success": true,
  "doc_id": "uuid-xxx",
  "filename": "深地救援准则.pdf",
  "chunk_count": 25,
  "message": "文档上传并处理成功"
}
```

---

### 2. 获取文档列表

```bash
GET /api/rag/documents?category=safety&limit=10&offset=0
```

**响应：**

```json
{
  "documents": [
    {
      "id": 1,
      "doc_id": "uuid-xxx",
      "filename": "深地救援准则.pdf",
      "file_type": "pdf",
      "title": "深地救援准则",
      "category": "safety",
      "tags": ["救援", "安全"],
      "chunk_count": 25,
      "file_size": 1024000,
      "upload_time": "2024-01-08 10:00:00",
      "status": "active"
    }
  ],
  "stats": {
    "total": 5,
    "byCategory": [
      {"category": "safety", "count": 3},
      {"category": "health", "count": 2}
    ]
  }
}
```

---

### 3. RAG查询

```bash
GET /api/rag/query?q=心率过高如何处理&top_k=20&rerank_top_k=5
```

**参数：**
- `q` - 查询文本（必需）
- `top_k` - 初始检索数量（默认20）
- `rerank_top_k` - Rerank后保留数量（默认5）
- `use_rerank` - 是否使用Rerank（默认true）

**响应：**

```json
{
  "query": "心率过高如何处理",
  "results": [
    {
      "chunk_id": "uuid-xxx_chunk_0",
      "doc_id": "uuid-xxx",
      "text": "当工人心率超过120bpm时，应立即...",
      "metadata": {},
      "finalScore": 0.85,
      "rerankScore": 0.92
    }
  ],
  "context": "[文档1]\n当工人心率超过120bpm时...\n\n---\n\n[文档2]\n...",
  "metadata": {
    "totalResults": 5,
    "useRerank": true,
    "topK": 20,
    "rerankTopK": 5
  },
  "response_time": 1250
}
```

---

### 4. RAG增强的AI分析

```bash
POST /api/ai/analyze/W001?use_rag=true
```

**参数：**
- `use_rag=true` - 启用RAG检索

系统会自动：
1. 根据工人健康数据构建查询
2. 检索相关知识文档
3. 将知识作为上下文添加到AI提示词
4. 返回增强后的分析结果

---

### 5. 删除文档

```bash
DELETE /api/rag/documents/:docId
```

**示例：**

```bash
curl -X DELETE http://localhost:3000/api/rag/documents/uuid-xxx
```

---

### 6. 查询历史

```bash
GET /api/rag/history?limit=20
```

**响应：**

```json
{
  "history": [
    {
      "id": 1,
      "query": "心率过高如何处理",
      "results_count": 5,
      "top_chunks": ["chunk_id_1", "chunk_id_2"],
      "response_time": 1250,
      "created_at": "2024-01-08 10:00:00"
    }
  ],
  "stats": {
    "totalQueries": 100,
    "avgResponseTime": 1200
  }
}
```

---

### 7. RAG统计信息

```bash
GET /api/rag/stats
```

**响应：**

```json
{
  "documents": {
    "total": 5,
    "byCategory": [
      {"category": "safety", "count": 3}
    ]
  },
  "queries": {
    "totalQueries": 100,
    "avgResponseTime": 1200
  },
  "vectors": {
    "totalChunks": 125,
    "dimension": 1024,
    "initialized": true
  }
}
```

---

## 🔧 配置说明

### 文档处理配置

编辑 `server/rag/config.js`：

```javascript
document: {
  maxFileSize: 10 * 1024 * 1024,  // 最大文件10MB
  supportedTypes: ['pdf', 'doc', 'docx', 'md'],
  chunkSize: 500,        // 分块大小（字符）
  chunkOverlap: 50       // 重叠大小（字符）
}
```

### 检索配置

```javascript
retrieval: {
  topK: 20,              // 初始检索数量
  rerankTopK: 5,         // Rerank后保留数量
  similarityThreshold: 0.5,  // 相似度阈值
  hybridAlpha: 0.7       // 混合检索权重（0.7向量 + 0.3 BM25）
}
```

---

## 📊 工作流程

### 文档上传流程

```
上传文档 → 文本提取 → 智能分块 → 向量化 → 存储
    ↓          ↓          ↓         ↓        ↓
  PDF/DOC   提取文本   500字/块   Qwen API  向量DB
                                            + SQLite
```

### RAG查询流程

```
用户查询 → 向量化 → 混合检索 → Rerank → 返回结果
    ↓         ↓         ↓         ↓        ↓
  "心率异常"  Qwen API  向量+BM25  Top-5   文本块
```

### AI分析增强流程

```
工人数据 → 构建查询 → RAG检索 → 构建Prompt → DeepSeek → 分析结果
    ↓         ↓          ↓          ↓          ↓         ↓
  心率88   "心率异常"  相关知识   增强上下文   AI分析   专业建议
```

---

## 🎯 使用场景

### 1. 上传安全规范文档

```bash
# 上传深地救援准则
curl -X POST http://localhost:3000/api/rag/upload \
  -F "file=@深地救援准则.pdf" \
  -F "category=safety"

# 上传员工健康手册
curl -X POST http://localhost:3000/api/rag/upload \
  -F "file=@员工健康手册.docx" \
  -F "category=health"
```

### 2. 独立查询知识库

```bash
# 查询救援流程
curl "http://localhost:3000/api/rag/query?q=深地救援流程"

# 查询健康标准
curl "http://localhost:3000/api/rag/query?q=矿工健康标准"
```

### 3. AI分析时使用RAG

```bash
# 普通AI分析
curl -X POST http://localhost:3000/api/ai/analyze/W001

# RAG增强的AI分析
curl -X POST "http://localhost:3000/api/ai/analyze/W001?use_rag=true"
```

---

## 🔍 技术细节

### 向量化

- **模型**：Qwen text-embedding-v3
- **维度**：1024
- **API**：阿里云DashScope

### 向量数据库

- **引擎**：hnswlib-node
- **算法**：HNSW (Hierarchical Navigable Small World)
- **存储**：本地文件系统

### 混合检索

- **向量检索**：余弦相似度
- **BM25检索**：基于词频的传统检索
- **权重**：70% 向量 + 30% BM25

### Rerank

- **方法**：基于Qwen Embedding的相似度重排序
- **目的**：提升Top-K结果的准确性

---

## ⚠️ 注意事项

### 1. API Key配置

确保配置了有效的Qwen API Key，否则向量化会失败。

### 2. 文件大小限制

默认最大10MB，可在配置中调整。

### 3. 首次启动

首次启动时会创建向量索引目录，需要一定时间。

### 4. 内存占用

向量索引会占用内存，建议至少2GB可用内存。

### 5. 文档质量

上传的文档应格式规范、文本清晰，以获得最佳效果。

---

## 🐛 故障排查

### 问题1：文档上传失败

**可能原因：**
- 文件类型不支持
- 文件过大
- 解析库未安装

**解决方法：**
```bash
# 检查依赖
npm install pdf-parse mammoth marked

# 检查文件类型
# 支持：pdf, doc, docx, md
```

### 问题2：向量化失败

**可能原因：**
- Qwen API Key无效
- 网络连接问题
- API限流

**解决方法：**
```bash
# 检查API Key
# 编辑 server/rag/config.js

# 测试API连接
curl -X POST https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings \
  -H "Authorization: Bearer your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"model":"text-embedding-v3","input":["测试"]}'
```

### 问题3：检索无结果

**可能原因：**
- 向量索引为空
- 查询文本与文档不相关
- 相似度阈值过高

**解决方法：**
```bash
# 检查文档数量
curl http://localhost:3000/api/rag/stats

# 降低相似度阈值
# 编辑 server/rag/config.js
# similarityThreshold: 0.3
```

---

## 📈 性能优化

### 1. 批量上传

使用脚本批量上传多个文档：

```javascript
const files = ['doc1.pdf', 'doc2.pdf', 'doc3.pdf'];

for (const file of files) {
  await uploadDocument(file);
  await sleep(1000); // 避免API限流
}
```

### 2. 缓存查询结果

对于常见查询，可以缓存结果：

```javascript
const cache = new Map();

function cachedQuery(query) {
  if (cache.has(query)) {
    return cache.get(query);
  }
  const result = await ragQuery(query);
  cache.set(query, result);
  return result;
}
```

### 3. 定期清理

定期清理过期的查询日志：

```sql
DELETE FROM rag_queries 
WHERE created_at < datetime('now', '-30 days');
```

---

## 🎓 最佳实践

### 1. 文档组织

- 按类别上传（safety, health, emergency）
- 使用有意义的标题和标签
- 定期更新过时文档

### 2. 查询优化

- 使用具体的查询词
- 避免过于宽泛的查询
- 结合业务场景构建查询

### 3. RAG集成

- 在关键场景启用RAG
- 监控RAG效果
- 根据反馈调整配置

---

## 📚 参考资源

- [Qwen Embedding API文档](https://help.aliyun.com/zh/dashscope/)
- [hnswlib-node GitHub](https://github.com/yoshoku/hnswlib-node)
- [BM25算法介绍](https://en.wikipedia.org/wiki/Okapi_BM25)

---

**版本：** 2.0.0  
**最后更新：** 2024-01-08
