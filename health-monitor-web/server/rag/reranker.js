/**
 * Rerank 模块 - 使用简单的相关性评分
 * 注意：这里使用简化的rerank算法，如需更好效果可以调用Qwen的rerank API
 */

const { generateEmbeddings, cosineSimilarity } = require('./embeddings');

/**
 * 基于向量相似度的Rerank
 */
async function rerankBySimilarity(query, candidates, topK = 5) {
  if (candidates.length === 0) return [];
  
  console.log(`🔄 Rerank: ${candidates.length} 个候选 → Top ${topK}`);
  
  try {
    // 生成查询向量
    const queryVector = await generateEmbeddings(query);
    
    // 生成候选文本向量
    const candidateTexts = candidates.map(c => c.text);
    const candidateVectors = await generateEmbeddings(candidateTexts);
    
    // 计算相似度并重新排序
    const scored = candidates.map((candidate, idx) => ({
      ...candidate,
      rerankScore: cosineSimilarity(queryVector, candidateVectors[idx])
    }));
    
    // 排序并返回Top-K
    const reranked = scored
      .sort((a, b) => b.rerankScore - a.rerankScore)
      .slice(0, topK);
    
    console.log(`✅ Rerank完成: Top ${reranked.length}`);
    
    return reranked;
    
  } catch (error) {
    console.error('❌ Rerank失败:', error.message);
    // 降级：直接返回原始排序的Top-K
    return candidates.slice(0, topK);
  }
}

/**
 * 基于关键词匹配的简单Rerank（备用方案）
 */
function rerankByKeywords(query, candidates, topK = 5) {
  // 提取查询关键词
  const queryKeywords = query
    .replace(/[，。！？；：、""''（）《》【】\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 0);
  
  // 计算关键词匹配分数
  const scored = candidates.map(candidate => {
    let matchCount = 0;
    const text = candidate.text.toLowerCase();
    
    for (const keyword of queryKeywords) {
      const kw = keyword.toLowerCase();
      const matches = (text.match(new RegExp(kw, 'g')) || []).length;
      matchCount += matches;
    }
    
    return {
      ...candidate,
      rerankScore: matchCount
    };
  });
  
  // 排序并返回Top-K
  return scored
    .sort((a, b) => b.rerankScore - a.rerankScore)
    .slice(0, topK);
}

/**
 * 混合Rerank（结合多种策略）
 */
async function rerank(query, candidates, topK = 5, method = 'similarity') {
  if (candidates.length === 0) return [];
  if (candidates.length <= topK) return candidates;
  
  switch (method) {
    case 'similarity':
      return await rerankBySimilarity(query, candidates, topK);
    
    case 'keywords':
      return rerankByKeywords(query, candidates, topK);
    
    default:
      // 默认使用相似度
      return await rerankBySimilarity(query, candidates, topK);
  }
}

module.exports = {
  rerank,
  rerankBySimilarity,
  rerankByKeywords
};
