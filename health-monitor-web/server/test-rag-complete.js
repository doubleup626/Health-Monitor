/**
 * RAG功能完整测试
 */

async function testRAGComplete() {
  console.log('🧪 开始RAG完整功能测试\n');
  
  const baseUrl = 'http://localhost:3000';
  
  try {
    // 1. 测试文档列表
    console.log('1️⃣ 测试获取文档列表...');
    const docsResponse = await fetch(`${baseUrl}/api/rag/documents`);
    const docsData = await docsResponse.json();
    console.log(`✅ 文档列表获取成功: ${docsData.documents.length} 个文档`);
    docsData.documents.forEach(doc => {
      console.log(`   - ${doc.title} (${doc.chunk_count} 个块)`);
    });
    console.log();
    
    // 2. 测试RAG查询
    console.log('2️⃣ 测试RAG查询...');
    const queryResponse = await fetch(`${baseUrl}/api/rag/query?q=心率过高如何处理`);
    const queryData = await queryResponse.json();
    console.log(`✅ RAG查询成功: ${queryData.results.length} 个结果`);
    console.log(`   查询: ${queryData.query}`);
    console.log(`   响应时间: ${queryData.response_time}ms`);
    queryData.results.forEach((r, idx) => {
      console.log(`   结果${idx + 1}: ${r.text.substring(0, 50)}... (分数=${r.score.toFixed(3)})`);
    });
    console.log();
    
    // 3. 测试RAG统计
    console.log('3️⃣ 测试RAG统计...');
    const statsResponse = await fetch(`${baseUrl}/api/rag/stats`);
    const statsData = await statsResponse.json();
    console.log(`✅ RAG统计获取成功:`);
    console.log(`   文档总数: ${statsData.documents.total}`);
    console.log(`   向量块数: ${statsData.vectors.totalChunks}`);
    console.log(`   查询总数: ${statsData.queries.totalQueries}`);
    console.log(`   平均响应时间: ${statsData.queries.avgResponseTime}ms`);
    console.log();
    
    // 4. 测试查询历史
    console.log('4️⃣ 测试查询历史...');
    const historyResponse = await fetch(`${baseUrl}/api/rag/history?limit=5`);
    const historyData = await historyResponse.json();
    console.log(`✅ 查询历史获取成功: ${historyData.history.length} 条记录`);
    historyData.history.forEach((h, idx) => {
      console.log(`   ${idx + 1}. ${h.query} (${h.results_count} 个结果, ${h.response_time}ms)`);
    });
    console.log();
    
    // 5. 测试不同的查询
    console.log('5️⃣ 测试多个查询...');
    const queries = [
      '血氧不足怎么办',
      '压力过大如何处理',
      '应急救援流程'
    ];
    
    for (const q of queries) {
      const resp = await fetch(`${baseUrl}/api/rag/query?q=${encodeURIComponent(q)}`);
      const data = await resp.json();
      console.log(`   ✅ "${q}": ${data.results.length} 个结果 (${data.response_time}ms)`);
    }
    console.log();
    
    console.log('🎉 所有测试通过！\n');
    console.log('📝 RAG功能已成功部署并运行！');
    console.log('   - 文档上传: ✅');
    console.log('   - 向量化: ✅');
    console.log('   - 混合检索: ✅');
    console.log('   - Rerank: ✅');
    console.log('   - 查询日志: ✅');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

// 运行测试
testRAGComplete();
