/**
 * BM25 算法实现 - 用于稀疏检索
 */

/**
 * 简单的中文分词（基于字符）
 */
function tokenize(text) {
  // 移除标点符号和空白
  const cleaned = text.replace(/[，。！？；：、""''（）《》【】\s]/g, ' ');
  
  // 分词：中文按字符，英文按单词
  const tokens = [];
  const words = cleaned.split(/\s+/);
  
  for (const word of words) {
    if (word.length === 0) continue;
    
    // 中文字符
    if (/[\u4e00-\u9fa5]/.test(word)) {
      // 按字符分割
      tokens.push(...word.split(''));
    } else {
      // 英文单词
      tokens.push(word.toLowerCase());
    }
  }
  
  return tokens;
}

/**
 * 计算词频
 */
function termFrequency(tokens) {
  const tf = {};
  for (const token of tokens) {
    tf[token] = (tf[token] || 0) + 1;
  }
  return tf;
}

/**
 * BM25 检索器
 */
class BM25 {
  constructor(documents = []) {
    this.documents = documents; // [{id, text, metadata}]
    this.docTokens = [];
    this.docFreq = {}; // 文档频率
    this.avgDocLength = 0;
    this.k1 = 1.5; // BM25 参数
    this.b = 0.75; // BM25 参数
    
    if (documents.length > 0) {
      this.buildIndex();
    }
  }
  
  /**
   * 构建索引
   */
  buildIndex() {
    console.log(`📊 构建BM25索引: ${this.documents.length} 个文档`);
    
    // 分词
    this.docTokens = this.documents.map(doc => tokenize(doc.text));
    
    // 计算平均文档长度
    const totalLength = this.docTokens.reduce((sum, tokens) => sum + tokens.length, 0);
    this.avgDocLength = totalLength / this.docTokens.length;
    
    // 计算文档频率
    this.docFreq = {};
    for (const tokens of this.docTokens) {
      const uniqueTokens = new Set(tokens);
      for (const token of uniqueTokens) {
        this.docFreq[token] = (this.docFreq[token] || 0) + 1;
      }
    }
    
    console.log(`✅ BM25索引构建完成`);
  }
  
  /**
   * 计算IDF
   */
  idf(token) {
    const df = this.docFreq[token] || 0;
    const N = this.documents.length;
    return Math.log((N - df + 0.5) / (df + 0.5) + 1);
  }
  
  /**
   * 计算BM25分数
   */
  score(queryTokens, docIndex) {
    const docTokens = this.docTokens[docIndex];
    const docLength = docTokens.length;
    const tf = termFrequency(docTokens);
    
    let score = 0;
    for (const token of queryTokens) {
      const termFreq = tf[token] || 0;
      const idfScore = this.idf(token);
      
      const numerator = termFreq * (this.k1 + 1);
      const denominator = termFreq + this.k1 * (1 - this.b + this.b * (docLength / this.avgDocLength));
      
      score += idfScore * (numerator / denominator);
    }
    
    return score;
  }
  
  /**
   * 搜索
   */
  search(query, topK = 20) {
    if (this.documents.length === 0) {
      return [];
    }
    
    const queryTokens = tokenize(query);
    
    // 计算所有文档的分数
    const scores = this.documents.map((doc, idx) => ({
      ...doc,
      score: this.score(queryTokens, idx)
    }));
    
    // 排序并返回Top-K
    return scores
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
      .filter(item => item.score > 0);
  }
  
  /**
   * 添加文档
   */
  addDocuments(newDocs) {
    this.documents.push(...newDocs);
    this.buildIndex();
  }
  
  /**
   * 删除文档
   */
  removeDocument(docId) {
    this.documents = this.documents.filter(doc => doc.id !== docId);
    if (this.documents.length > 0) {
      this.buildIndex();
    }
  }
}

module.exports = BM25;
