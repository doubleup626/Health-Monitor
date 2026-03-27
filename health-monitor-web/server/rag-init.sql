-- RAG 模块数据库表

-- 文档管理表
CREATE TABLE IF NOT EXISTS rag_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  doc_id TEXT UNIQUE NOT NULL,
  filename TEXT NOT NULL,
  file_type TEXT NOT NULL,
  title TEXT,
  category TEXT DEFAULT 'general',
  tags TEXT,
  chunk_count INTEGER DEFAULT 0,
  file_size INTEGER,
  upload_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT DEFAULT 'active'
);

-- 文本块表
CREATE TABLE IF NOT EXISTS rag_chunks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  chunk_id TEXT UNIQUE NOT NULL,
  doc_id TEXT NOT NULL,
  chunk_index INTEGER,
  text TEXT NOT NULL,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (doc_id) REFERENCES rag_documents(doc_id)
);

-- 查询日志表
CREATE TABLE IF NOT EXISTS rag_queries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query TEXT NOT NULL,
  results_count INTEGER,
  top_chunks TEXT,
  response_time INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_rag_chunks_doc_id ON rag_chunks(doc_id);
CREATE INDEX IF NOT EXISTS idx_rag_documents_category ON rag_documents(category);
CREATE INDEX IF NOT EXISTS idx_rag_documents_status ON rag_documents(status);
