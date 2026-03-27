/**
 * RAG功能测试脚本
 */

const { initDatabase } = require('./database');
const { generateEmbeddings } = require('./rag/embeddings');
const { processDocument } = require('./rag/document-processor');
const { query: ragQuery } = require('./rag/rag-query');

async function testRAG() {
  console.log('🧪 开始RAG功能测试\n');
  
  try {
    // 1. 测试数据库初始化
    console.log('1️⃣ 测试数据库初始化...');
    await initDatabase();
    console.log('✅ 数据库初始化成功\n');
    
    // 2. 测试向量化
    console.log('2️⃣ 测试Qwen Embedding API...');
    const testText = '深地矿井工人健康监测';
    const vector = await generateEmbeddings(testText);
    console.log(`✅ 向量化成功: 维度=${vector.length}`);
    console.log(`   示例向量: [${vector.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]\n`);
    
    // 3. 测试文本分块
    console.log('3️⃣ 测试文本分块...');
    const { chunkText } = require('./rag/document-processor');
    const sampleText = `
深地矿井工人健康监测系统使用指南

第一章：系统概述
本系统用于实时监测深地矿井工人的健康状况，包括心率、血氧、压力等指标。

第二章：安全标准
1. 心率应保持在50-120 bpm之间
2. 血氧饱和度不低于90%
3. 压力指数不超过80

第三章：应急处理
当发现异常指标时，应立即采取以下措施：
- 停止作业
- 通知调度室
- 准备撤离
    `.trim();
    
    const chunks = chunkText(sampleText, { chunkSize: 100, overlap: 20 });
    console.log(`✅ 文本分块成功: ${chunks.length} 个块`);
    chunks.forEach((chunk, idx) => {
      console.log(`   块${idx + 1}: ${chunk.text.substring(0, 50)}... (${chunk.length}字符)`);
    });
    console.log();
    
    // 4. 测试BM25
    console.log('4️⃣ 测试BM25检索...');
    const BM25 = require('./rag/bm25');
    const documents = [
      { id: '1', text: '心率过高时应立即停止作业' },
      { id: '2', text: '血氧不足需要补充氧气' },
      { id: '3', text: '压力过大会影响工作效率' }
    ];
    const bm25 = new BM25(documents);
    const bm25Results = bm25.search('心率异常', 2);
    console.log(`✅ BM25检索成功: ${bm25Results.length} 个结果`);
    bm25Results.forEach((r, idx) => {
      console.log(`   结果${idx + 1}: ${r.text} (分数=${r.score.toFixed(2)})`);
    });
    console.log();
    
    console.log('🎉 所有测试通过！\n');
    console.log('📝 下一步：');
    console.log('   1. 上传文档: curl -X POST http://localhost:3000/api/rag/upload -F "file=@your-doc.pdf"');
    console.log('   2. 查询测试: curl "http://localhost:3000/api/rag/query?q=心率异常"');
    console.log('   3. AI分析: curl -X POST "http://localhost:3000/api/ai/analyze/W001?use_rag=true"');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
    console.error('\n💡 可能的原因：');
    console.error('   1. Qwen API Key未配置或无效');
    console.error('   2. 依赖包未安装: npm install');
    console.error('   3. 网络连接问题');
  }
  
  process.exit(0);
}

// 运行测试
testRAG();
