/**
 * RAG 查询主逻辑
 */

const { generateEmbeddings } = require('./embeddings');
const vectorStore = require('./vector-store');
const BM25 = require('./bm25');
const { rerank } = require('./reranker');
const config = require('./config');

// BM25索引（全局单例）
let bm25Index = null;

/**
 * 初始化BM25索引
 */
async function initializeBM25() {
  if (bm25Index) return;
  
  console.log('📊 初始化BM25索引...');
  
  // 从向量存储获取所有文档
  await vectorStore.initialize();
  const chunks = vectorStore.chunks;
  
  if (chunks.length > 0) {
    const documents = chunks.map(chunk => ({
      id: chunk.chunk_id,
      text: chunk.text,
      metadata: chunk.metadata,
      doc_id: chunk.doc_id
    }));
    
    bm25Index = new BM25(documents);
    console.log(`✅ BM25索引初始化完成: ${documents.length} 个文档`);
  } else {
    bm25Index = new BM25([]);
    console.log('⚠️ BM25索引为空');
  }
}

/**
 * 混合检索（向量 + BM25）
 */
async function hybridSearch(query, topK = 20) {
  // 确保索引已初始化
  await vectorStore.initialize();
  await initializeBM25();
  
  console.log(`🔍 混合检索: "${query}"`);
  
  // 1. 向量检索
  const queryVector = await generateEmbeddings(query);
  const vectorResults = await vectorStore.search(queryVector, topK);
  
  console.log(`  📊 向量检索: ${vectorResults.length} 个结果`);
  
  // 2. BM25检索
  const bm25Results = bm25Index.search(query, topK);
  
  console.log(`  📊 BM25检索: ${bm25Results.length} 个结果`);
  
  // 3. 合并结果（使用加权分数）
  const alpha = config.retrieval.hybridAlpha; // 向量权重
  const beta = 1 - alpha; // BM25权重
  
  const mergedMap = new Map();
  
  // 添加向量检索结果
  for (const result of vectorResults) {
    mergedMap.set(result.chunk_id, {
      ...result,
      finalScore: result.score * alpha
    });
  }
  
  // 合并BM25结果
  for (const result of bm25Results) {
    if (mergedMap.has(result.id)) {
      // 已存在，累加分数
      const existing = mergedMap.get(result.id);
      existing.finalScore += result.score * beta;
    } else {
      // 新结果
      mergedMap.set(result.id, {
        chunk_id: result.id,
        doc_id: result.doc_id,
        text: result.text,
        metadata: result.metadata,
        finalScore: result.score * beta
      });
    }
  }
  
  // 排序并返回
  const merged = Array.from(mergedMap.values())
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, topK);
  
  console.log(`  ✅ 合并结果: ${merged.length} 个`);
  
  return merged;
}

/**
 * RAG查询（完整流程）
 */
async function query(queryText, options = {}) {
  const topK = options.topK || config.retrieval.topK;
  const rerankTopK = options.rerankTopK || config.retrieval.rerankTopK;
  const useRerank = options.useRerank !== false; // 默认使用rerank
  
  console.log(`\n🤖 RAG查询: "${queryText}"`);
  console.log(`   参数: topK=${topK}, rerankTopK=${rerankTopK}, useRerank=${useRerank}`);
  
  try {
    // 1. 混合检索
    const candidates = await hybridSearch(queryText, topK);
    
    if (candidates.length === 0) {
      console.log('⚠️ 未找到相关文档');
      return {
        query: queryText,
        results: [],
        context: '',
        metadata: {
          totalResults: 0,
          useRerank: false
        }
      };
    }
    
    // 2. Rerank（可选）
    let finalResults = candidates;
    if (useRerank && candidates.length > rerankTopK) {
      finalResults = await rerank(queryText, candidates, rerankTopK);
    } else {
      finalResults = candidates.slice(0, rerankTopK);
    }
    
    // 3. 构建上下文
    const context = finalResults
      .map((r, idx) => `[文档${idx + 1}]\n${r.text}`)
      .join('\n\n---\n\n');
    
    console.log(`✅ RAG查询完成: ${finalResults.length} 个结果`);
    
    return {
      query: queryText,
      results: finalResults,
      context: context,
      metadata: {
        totalResults: finalResults.length,
        useRerank: useRerank,
        topK: topK,
        rerankTopK: rerankTopK
      }
    };
    
  } catch (error) {
    console.error('❌ RAG查询失败:', error);
    throw error;
  }
}

/**
 * 添加文档到索引
 */
async function addDocumentToIndex(docId, chunks) {
  // 添加到BM25索引
  if (bm25Index) {
    const documents = chunks.map((chunk, idx) => ({
      id: `${docId}_chunk_${idx}`,
      text: chunk.text,
      metadata: chunk.metadata || {},
      doc_id: docId
    }));
    bm25Index.addDocuments(documents);
  }
}

/**
 * 从索引删除文档
 */
async function removeDocumentFromIndex(docId) {
  // 从BM25索引删除
  if (bm25Index) {
    bm25Index.removeDocument(docId);
  }
  
  // 从向量存储删除
  await vectorStore.deleteDocument(docId);
}

module.exports = {
  query,
  hybridSearch,
  initializeBM25,
  addDocumentToIndex,
  removeDocumentFromIndex
};
