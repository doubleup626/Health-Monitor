# 🚀 RAG功能快速开始（5分钟）

## 📋 前提条件

- ✅ Node.js 已安装
- ✅ health-monitor-web 服务器已部署
- ✅ Qwen API Key（用于向量化）

---

## 🔧 步骤1：安装依赖（2分钟）

```bash
cd health-monitor-web/server
npm install
```

新增的依赖包：
```
pdf-parse      - PDF文档解析
mammoth        - DOC/DOCX文档解析  
marked         - Markdown解析
hnswlib-node   - 向量数据库
formidable     - 文件上传
uuid           - 生成唯一ID
```

---

## ⚙️ 步骤2：配置API Key（1分钟）

编辑 `server/rag/config.js`：

```javascript
qwen: {
  apiKey: 'your-qwen-api-key',  // 👈 替换这里
  endpoint: 'https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings',
  model: 'text-embedding-v3',
  dimension: 1024
}
```

**获取Qwen API Key：**
1. 访问 https://dashscope.aliyun.com/
2. 注册/登录阿里云账号
3. 开通DashScope服务
4. 创建API Key

---

## 🗄️ 步骤3：初始化数据库（30秒）

```bash
npm run init-db
```

**预期输出：**
```
✅ 主数据库初始化成功
✅ RAG数据库初始化成功
Database initialized
```

---

## 🧪 步骤4：测试RAG功能（1分钟）

```bash
node test-rag.js
```

**预期输出：**
```
🧪 开始RAG功能测试

1️⃣ 测试数据库初始化...
✅ 数据库初始化成功

2️⃣ 测试Qwen Embedding API...
✅ 向量化成功: 维度=1024
   示例向量: [0.1234, -0.5678, ...]

3️⃣ 测试文本分块...
✅ 文本分块成功: 3 个块

4️⃣ 测试BM25检索...
✅ BM25检索成功: 2 个结果

🎉 所有测试通过！
```

---

## 🚀 步骤5：启动服务器（即时）

```bash
npm start
```

**预期输出：**
```
════════════════════════════════════════════════════════════
🏭 深地矿井健康监测系统已启动！
════════════════════════════════════════════════════════════
📡 HTTP 服务器: http://0.0.0.0:3000
🔌 WebSocket 服务器: ws://0.0.0.0:3000
════════════════════════════════════════════════════════════
```

---

## 📤 步骤6：上传测试文档（1分钟）

### 方式1：使用curl

```bash
# 创建测试文档
echo "# 深地救援准则

## 心率异常处理
当工人心率超过120bpm时，应立即停止作业，通知调度室，准备撤离。

## 血氧不足处理
血氧饱和度低于90%时，需要立即补充氧气，并安排医疗检查。

## 压力过大处理
压力指数超过80时，建议工人休息，避免继续高强度作业。
" > test-doc.md

# 上传文档
curl -X POST http://localhost:3000/api/rag/upload \
  -F "file=@test-doc.md" \
  -F "title=深地救援准则" \
  -F "category=safety"
```

### 方式2：使用Postman

1. 打开Postman
2. 创建POST请求：`http://localhost:3000/api/rag/upload`
3. Body选择 `form-data`
4. 添加字段：
   - `file`: 选择文件
   - `title`: 文档标题
   - `category`: safety
5. 点击Send

**预期响应：**
```json
{
  "success": true,
  "doc_id": "uuid-xxx",
  "filename": "test-doc.md",
  "chunk_count": 3,
  "message": "文档上传并处理成功"
}
```

---

## 🔍 步骤7：测试RAG查询（30秒）

```bash
# 查询心率异常处理
curl "http://localhost:3000/api/rag/query?q=心率过高如何处理"
```

**预期响应：**
```json
{
  "query": "心率过高如何处理",
  "results": [
    {
      "chunk_id": "uuid-xxx_chunk_0",
      "text": "当工人心率超过120bpm时，应立即停止作业...",
      "finalScore": 0.85
    }
  ],
  "context": "[文档1]\n当工人心率超过120bpm时...",
  "metadata": {
    "totalResults": 1,
    "useRerank": true
  },
  "response_time": 1250
}
```

---

## 🤖 步骤8：测试RAG增强的AI分析（30秒）

```bash
# 普通AI分析
curl -X POST http://localhost:3000/api/ai/analyze/W001

# RAG增强的AI分析
curl -X POST "http://localhost:3000/api/ai/analyze/W001?use_rag=true"
```

**对比效果：**

**普通AI分析：**
- 基于通用医学知识
- 建议较为宽泛

**RAG增强分析：**
- 结合上传的专业文档
- 建议更具体、更符合企业规范
- 引用具体的安全准则

---

## ✅ 验证清单

- [ ] 依赖安装成功
- [ ] API Key配置正确
- [ ] 数据库初始化成功
- [ ] 测试脚本通过
- [ ] 服务器启动正常
- [ ] 文档上传成功
- [ ] RAG查询返回结果
- [ ] AI分析集成RAG

---

## 🎯 下一步

### 1. 上传更多文档

```bash
# 上传PDF
curl -X POST http://localhost:3000/api/rag/upload \
  -F "file=@深地救援准则.pdf" \
  -F "category=safety"

# 上传Word文档
curl -X POST http://localhost:3000/api/rag/upload \
  -F "file=@员工健康手册.docx" \
  -F "category=health"
```

### 2. 查看文档列表

```bash
curl http://localhost:3000/api/rag/documents
```

### 3. 查看统计信息

```bash
curl http://localhost:3000/api/rag/stats
```

### 4. 查看查询历史

```bash
curl http://localhost:3000/api/rag/history
```

---

## 🐛 常见问题

### Q1: 向量化失败

**错误：** `Qwen API 错误: 401`

**解决：**
```bash
# 检查API Key是否正确
# 编辑 server/rag/config.js
# 确保apiKey字段填写正确
```

### Q2: 文档上传失败

**错误：** `不支持的文件类型`

**解决：**
```bash
# 支持的类型：pdf, doc, docx, md
# 检查文件扩展名是否正确
```

### Q3: 检索无结果

**原因：** 向量索引为空

**解决：**
```bash
# 先上传文档
curl -X POST http://localhost:3000/api/rag/upload \
  -F "file=@your-doc.pdf"

# 再进行查询
curl "http://localhost:3000/api/rag/query?q=your-query"
```

### Q4: 依赖安装失败

**错误：** `hnswlib-node` 编译失败

**解决：**
```bash
# Windows需要安装构建工具
npm install --global windows-build-tools

# 或使用预编译版本
npm install hnswlib-node --force
```

---

## 📚 完整文档

详细使用指南请查看：[RAG_GUIDE.md](./RAG_GUIDE.md)

---

## 💡 提示

1. **首次使用**：建议先上传2-3个测试文档，熟悉流程
2. **文档质量**：上传格式规范、内容清晰的文档效果最好
3. **查询技巧**：使用具体的查询词，避免过于宽泛
4. **性能优化**：大量文档时，建议按类别分批上传

---

**完成时间：** 约5分钟  
**难度：** ⭐⭐☆☆☆  
**版本：** 2.0.0

🎉 恭喜！RAG功能已成功部署！
