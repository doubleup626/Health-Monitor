/**
 * RAG 数据库模块
 */

const { query, queryOne, run } = require('./database');

/**
 * RAG 文档管理
 */
const ragDocumentDB = {
  // 创建文档记录
  async create(data) {
    const sql = `
      INSERT INTO rag_documents (
        doc_id, filename, file_type, title, category, tags, 
        chunk_count, file_size
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    return await run(sql, [
      data.doc_id,
      data.filename,
      data.file_type,
      data.title || data.filename,
      data.category || 'general',
      JSON.stringify(data.tags || []),
      data.chunk_count || 0,
      data.file_size || 0
    ]);
  },
  
  // 获取所有文档
  async getAll(options = {}) {
    let sql = 'SELECT * FROM rag_documents WHERE status = ?';
    const params = ['active'];
    
    if (options.category) {
      sql += ' AND category = ?';
      params.push(options.category);
    }
    
    sql += ' ORDER BY upload_time DESC';
    
    if (options.limit) {
      sql += ' LIMIT ? OFFSET ?';
      params.push(options.limit, options.offset || 0);
    }
    
    const docs = await query(sql, params);
    
    // 解析tags
    return docs.map(doc => ({
      ...doc,
      tags: JSON.parse(doc.tags || '[]')
    }));
  },
  
  // 根据ID获取文档
  async getById(docId) {
    const doc = await queryOne(
      'SELECT * FROM rag_documents WHERE doc_id = ? AND status = ?',
      [docId, 'active']
    );
    
    if (doc) {
      doc.tags = JSON.parse(doc.tags || '[]');
    }
    
    return doc;
  },
  
  // 更新文档
  async update(docId, data) {
    const sql = `
      UPDATE rag_documents 
      SET title = ?, category = ?, tags = ?
      WHERE doc_id = ?
    `;
    return await run(sql, [
      data.title,
      data.category,
      JSON.stringify(data.tags || []),
      docId
    ]);
  },
  
  // 删除文档（软删除）
  async delete(docId) {
    return await run(
      'UPDATE rag_documents SET status = ? WHERE doc_id = ?',
      ['deleted', docId]
    );
  },
  
  // 获取统计信息
  async getStats() {
    const total = await queryOne(
      'SELECT COUNT(*) as count FROM rag_documents WHERE status = ?',
      ['active']
    );
    
    const byCategory = await query(`
      SELECT category, COUNT(*) as count 
      FROM rag_documents 
      WHERE status = ? 
      GROUP BY category
    `, ['active']);
    
    return {
      total: total.count,
      byCategory: byCategory
    };
  }
};

/**
 * RAG 文本块管理
 */
const ragChunkDB = {
  // 批量创建文本块
  async createBatch(chunks) {
    const sql = `
      INSERT INTO rag_chunks (chunk_id, doc_id, chunk_index, text, metadata)
      VALUES (?, ?, ?, ?, ?)
    `;
    
    for (const chunk of chunks) {
      await run(sql, [
        chunk.chunk_id,
        chunk.doc_id,
        chunk.chunk_index,
        chunk.text,
        JSON.stringify(chunk.metadata || {})
      ]);
    }
  },
  
  // 获取文档的所有文本块
  async getByDocId(docId) {
    const chunks = await query(
      'SELECT * FROM rag_chunks WHERE doc_id = ? ORDER BY chunk_index',
      [docId]
    );
    
    return chunks.map(chunk => ({
      ...chunk,
      metadata: JSON.parse(chunk.metadata || '{}')
    }));
  },
  
  // 删除文档的所有文本块
  async deleteByDocId(docId) {
    return await run('DELETE FROM rag_chunks WHERE doc_id = ?', [docId]);
  }
};

/**
 * RAG 查询日志
 */
const ragQueryDB = {
  // 记录查询
  async log(data) {
    const sql = `
      INSERT INTO rag_queries (query, results_count, top_chunks, response_time)
      VALUES (?, ?, ?, ?)
    `;
    return await run(sql, [
      data.query,
      data.results_count || 0,
      JSON.stringify(data.top_chunks || []),
      data.response_time || 0
    ]);
  },
  
  // 获取查询历史
  async getHistory(limit = 20) {
    const queries = await query(
      'SELECT * FROM rag_queries ORDER BY created_at DESC LIMIT ?',
      [limit]
    );
    
    return queries.map(q => ({
      ...q,
      top_chunks: JSON.parse(q.top_chunks || '[]')
    }));
  },
  
  // 获取统计信息
  async getStats() {
    const total = await queryOne('SELECT COUNT(*) as count FROM rag_queries');
    const avgTime = await queryOne('SELECT AVG(response_time) as avg FROM rag_queries');
    
    return {
      totalQueries: total.count,
      avgResponseTime: Math.round(avgTime.avg || 0)
    };
  }
};

module.exports = {
  ragDocumentDB,
  ragChunkDB,
  ragQueryDB
};
