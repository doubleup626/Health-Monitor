/**
 * RAG API 路由处理
 */

const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const formidable = require('formidable');

const { processDocument } = require('./rag/document-processor');
const { generateEmbeddingsBatch } = require('./rag/embeddings');
const vectorStore = require('./rag/vector-store');
const { query: ragQuery, addDocumentToIndex, removeDocumentFromIndex } = require('./rag/rag-query');
const { ragDocumentDB, ragChunkDB, ragQueryDB } = require('./rag-database');
const config = require('./rag/config');

/**
 * 上传文档
 * POST /api/rag/upload
 */
async function handleUpload(req, res) {
  console.log('\n📤 收到文档上传请求');
  
  try {
    // 确保目录存在
    await fs.mkdir(config.paths.documentsDir, { recursive: true });
    
    // 解析表单数据
    const form = formidable({
      uploadDir: config.paths.documentsDir,
      keepExtensions: true,
      maxFileSize: config.document.maxFileSize
    });
    
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error('❌ 文件上传失败:', err);
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '文件上传失败: ' + err.message }));
        return;
      }
      
      try {
        const file = files.file[0];
        const filename = file.originalFilename;
        const fileType = path.extname(filename).slice(1).toLowerCase();
        
        // 检查文件类型
        if (!config.document.supportedTypes.includes(fileType)) {
          await fs.unlink(file.filepath);
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ 
            error: `不支持的文件类型: ${fileType}。支持: ${config.document.supportedTypes.join(', ')}` 
          }));
          return;
        }
        
        console.log(`📄 处理文件: ${filename} (${fileType})`);
        
        // 生成文档ID
        const docId = uuidv4();
        
        // 解析元数据
        const metadata = {
          title: fields.title?.[0] || filename,
          category: fields.category?.[0] || 'general',
          tags: fields.tags?.[0] ? JSON.parse(fields.tags[0]) : []
        };
        
        // 1. 处理文档（提取文本、分块）
        const processed = await processDocument(file.filepath, metadata);
        
        // 2. 生成向量
        console.log('🔢 生成向量...');
        const texts = processed.chunks.map(c => c.text);
        const vectors = await generateEmbeddingsBatch(texts);
        
        // 3. 保存到向量数据库
        console.log('💾 保存向量...');
        await vectorStore.addDocumentVectors(docId, processed.chunks, vectors);
        
        // 4. 添加到BM25索引
        await addDocumentToIndex(docId, processed.chunks);
        
        // 5. 保存到数据库
        await ragDocumentDB.create({
          doc_id: docId,
          filename: filename,
          file_type: fileType,
          title: metadata.title,
          category: metadata.category,
          tags: metadata.tags,
          chunk_count: processed.chunks.length,
          file_size: file.size
        });
        
        // 6. 保存文本块
        const chunks = processed.chunks.map((chunk, idx) => ({
          chunk_id: `${docId}_chunk_${idx}`,
          doc_id: docId,
          chunk_index: idx,
          text: chunk.text,
          metadata: chunk.metadata || {}
        }));
        await ragChunkDB.createBatch(chunks);
        
        console.log(`✅ 文档上传成功: ${docId}`);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          doc_id: docId,
          filename: filename,
          chunk_count: processed.chunks.length,
          message: '文档上传并处理成功'
        }));
        
      } catch (error) {
        console.error('❌ 文档处理失败:', error);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: '文档处理失败: ' + error.message }));
      }
    });
    
  } catch (error) {
    console.error('❌ 上传处理失败:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

/**
 * 获取文档列表
 * GET /api/rag/documents
 */
async function handleGetDocuments(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const params = url.searchParams;
    
    const options = {
      category: params.get('category'),
      limit: parseInt(params.get('limit')) || 50,
      offset: parseInt(params.get('offset')) || 0
    };
    
    const documents = await ragDocumentDB.getAll(options);
    const stats = await ragDocumentDB.getStats();
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      documents: documents,
      stats: stats,
      pagination: {
        limit: options.limit,
        offset: options.offset
      }
    }));
    
  } catch (error) {
    console.error('❌ 获取文档列表失败:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

/**
 * 删除文档
 * DELETE /api/rag/documents/:docId
 */
async function handleDeleteDocument(req, res, docId) {
  try {
    console.log(`🗑️ 删除文档: ${docId}`);
    
    // 1. 从向量存储删除
    await removeDocumentFromIndex(docId);
    
    // 2. 从数据库删除文本块
    await ragChunkDB.deleteByDocId(docId);
    
    // 3. 软删除文档记录
    await ragDocumentDB.delete(docId);
    
    console.log(`✅ 文档删除成功: ${docId}`);
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      success: true,
      message: '文档删除成功'
    }));
    
  } catch (error) {
    console.error('❌ 删除文档失败:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

/**
 * RAG查询
 * GET /api/rag/query?q=xxx
 */
async function handleQuery(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const params = url.searchParams;
    
    const queryText = params.get('q');
    if (!queryText) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '缺少查询参数 q' }));
      return;
    }
    
    const options = {
      topK: parseInt(params.get('top_k')) || undefined,
      rerankTopK: parseInt(params.get('rerank_top_k')) || undefined,
      useRerank: params.get('use_rerank') !== 'false'
    };
    
    console.log(`\n🔍 RAG查询: "${queryText}"`);
    const startTime = Date.now();
    
    // 执行查询
    const result = await ragQuery(queryText, options);
    const responseTime = Date.now() - startTime;
    
    // 记录查询日志
    await ragQueryDB.log({
      query: queryText,
      results_count: result.results.length,
      top_chunks: result.results.map(r => r.chunk_id),
      response_time: responseTime
    });
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ...result,
      response_time: responseTime
    }));
    
  } catch (error) {
    console.error('❌ RAG查询失败:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

/**
 * 获取查询历史
 * GET /api/rag/history
 */
async function handleGetHistory(req, res) {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const params = url.searchParams;
    const limit = parseInt(params.get('limit')) || 20;
    
    const history = await ragQueryDB.getHistory(limit);
    const stats = await ragQueryDB.getStats();
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      history: history,
      stats: stats
    }));
    
  } catch (error) {
    console.error('❌ 获取查询历史失败:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

/**
 * 获取RAG统计信息
 * GET /api/rag/stats
 */
async function handleGetStats(req, res) {
  try {
    const docStats = await ragDocumentDB.getStats();
    const queryStats = await ragQueryDB.getStats();
    const vectorStats = vectorStore.getStats();
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      documents: docStats,
      queries: queryStats,
      vectors: vectorStats
    }));
    
  } catch (error) {
    console.error('❌ 获取统计信息失败:', error);
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: error.message }));
  }
}

module.exports = {
  handleUpload,
  handleGetDocuments,
  handleDeleteDocument,
  handleQuery,
  handleGetHistory,
  handleGetStats
};
