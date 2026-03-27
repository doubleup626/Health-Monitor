/**
 * AI 分析模块
 * 使用 DeepSeek API 进行健康数据分析
 */

const AI_CONFIG = {
  apiKey: 'sk-886bedda24214b5190ba5add0ba4029e',
  endpoint: 'https://api.deepseek.com/v1/chat/completions',
  model: 'deepseek-chat'
};

/**
 * AI 提示词模板（包含历史数据）
 */
const AI_PROMPT_TEMPLATE = `# 深地矿井工人安全分析

你是一名专业的矿井安全专家和医疗专家，请对以下工人的健康数据进行全面分析。

## 工人信息
- 姓名：{worker_name}
- 工号：{worker_id}
- 年龄：{age}岁
- 性别：{gender}
- 岗位：{position}
- 班组：{team}
- 当前时间：{current_time}

## 当前生理数据（最新）
- 心率：{heart_rate_last} bpm（静息心率：{heart_rate_resting} bpm）
- 血氧饱和度：{blood_oxygen}%
- 压力指数：{stress}（今日平均：{stress_avg}）
- 体温：{temperature}°C
- 步数：{steps}

## 环境数据
- 气压：{air_pressure} hPa
- 海拔（深度）：{altitude} 米
- 工作深度：{work_depth} 米

## 最近 1 小时历史数据趋势
{history_data}

## 异常指标（如有）
{alerts}

## 分析任务

请从以下角度进行专业分析：

### 1. 风险评估
- 综合评估工人当前的身体状况和环境风险
- 判断风险等级：**低风险** / **中风险** / **高风险** / **紧急危险**
- 说明风险的主要来源

### 2. 健康状况分析
- 分析心率、血氧、压力等指标是否正常
- 结合历史趋势，判断是否存在恶化倾向
- 是否存在突发健康问题的征兆
- 是否适合继续深地作业

### 3. 安全建议（针对工人）
- 工人应该采取的即时行动
- 是否需要停止作业、休息或撤离
- 注意事项和预防措施

### 4. 应急措施（如存在中高风险）
- 详细的应急处理步骤
- 自救和互救方法
- 紧急联系和求救方式

### 5. 救援指导（如紧急危险）
- 给救援人员的专业建议
- 可能的健康风险和救援注意事项
- 救援优先级和处理顺序

## 返回格式

请严格按照以下 JSON 格式返回分析结果（不要包含其他文字）：

\`\`\`json
{
  "risk_level": "低风险|中风险|高风险|紧急危险",
  "risk_analysis": "综合风险分析（200字以内）",
  "health_status": "健康状况描述（150字以内）",
  "safety_advice": "安全建议（150字以内）",
  "emergency_measures": "应急措施（如有风险，200字以内）",
  "rescue_guidance": "救援指导（如紧急危险，200字以内）"
}
\`\`\`
`;

/**
 * 格式化历史数据为文本
 */
function formatHistoryData(historyRecords) {
  if (!historyRecords || historyRecords.length === 0) {
    return '暂无历史数据';
  }
  
  const lines = [];
  lines.push('| 时间 | 心率 | 血氧 | 压力 | 步数 |');
  lines.push('|------|------|------|------|------|');
  
  historyRecords.forEach(record => {
    try {
      const data = JSON.parse(record.data_json);
      const time = new Date(record.timestamp).toLocaleTimeString('zh-CN');
      const hr = data.heartRate?.last || '-';
      const spo2 = data.bloodOxygen?.value || '-';
      const stress = data.stress?.value || '-';
      const steps = data.step?.current || '-';
      
      lines.push(`| ${time} | ${hr} | ${spo2} | ${stress} | ${steps} |`);
    } catch (e) {
      // 忽略解析错误
    }
  });
  
  return lines.join('\n');
}

/**
 * 格式化报警信息
 */
function formatAlerts(alerts) {
  if (!alerts || alerts.length === 0) {
    return '暂无异常';
  }
  
  return alerts.map(a => `- ${a.message}`).join('\n');
}

/**
 * 构建完整提示词
 */
function buildPrompt(workerData, realtimeData, historyData, alerts) {
  const prompt = AI_PROMPT_TEMPLATE
    .replace('{worker_name}', workerData.name || '未知')
    .replace('{worker_id}', workerData.worker_id || '未知')
    .replace('{age}', workerData.age || '未知')
    .replace('{gender}', workerData.gender || '未知')
    .replace('{position}', workerData.position || '未知')
    .replace('{team}', workerData.team || '未知')
    .replace('{current_time}', new Date().toLocaleString('zh-CN'))
    .replace('{heart_rate_last}', realtimeData.heart_rate_last || 0)
    .replace('{heart_rate_resting}', realtimeData.heart_rate_resting || 0)
    .replace('{blood_oxygen}', realtimeData.blood_oxygen_value || 0)
    .replace('{stress}', realtimeData.stress_value || 0)
    .replace('{stress_avg}', realtimeData.stress_today_avg || 0)
    .replace('{temperature}', realtimeData.body_temperature || 0)
    .replace('{steps}', realtimeData.steps || 0)
    .replace('{air_pressure}', realtimeData.air_pressure || 0)
    .replace('{altitude}', realtimeData.altitude || 0)
    .replace('{work_depth}', Math.abs(realtimeData.altitude || 0))
    .replace('{history_data}', formatHistoryData(historyData))
    .replace('{alerts}', formatAlerts(alerts));
  
  return prompt;
}

/**
 * 调用 DeepSeek API 进行分析
 */
async function callDeepSeekAPI(prompt) {
  const startTime = Date.now();
  
  try {
    const response = await fetch(AI_CONFIG.endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${AI_CONFIG.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: AI_CONFIG.model,
        messages: [
          {
            role: 'system',
            content: '你是一名专业的矿井安全专家和医疗专家，擅长分析深地工人的健康数据，提供安全建议和应急指导。'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2000
      })
    });
    
    if (!response.ok) {
      throw new Error(`DeepSeek API 错误: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json();
    const responseTime = Date.now() - startTime;
    
    // 提取 JSON 结果
    let content = result.choices[0].message.content;
    
    // 尝试提取 JSON（可能被 ```json 包裹）
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      content = jsonMatch[1];
    }
    
    const analysis = JSON.parse(content);
    
    return {
      ...analysis,
      response_time: responseTime,
      model_name: AI_CONFIG.model
    };
    
  } catch (error) {
    console.error('❌ DeepSeek API 调用失败:', error);
    
    // 返回降级结果
    return {
      risk_level: '未知',
      risk_analysis: `AI 分析失败: ${error.message}`,
      health_status: '无法获取分析结果',
      safety_advice: '请人工审核数据',
      emergency_measures: '',
      rescue_guidance: '',
      response_time: Date.now() - startTime,
      model_name: AI_CONFIG.model,
      error: error.message
    };
  }
}

/**
 * 执行 AI 分析
 */
async function performAnalysis(workerData, realtimeData, historyData, safetyCheck, useRAG = false) {
  console.log(`🤖 开始 AI 分析 - 工人: ${workerData.name} (${workerData.worker_id})`);
  
  let ragContext = '';
  
  // 如果启用RAG，检索相关知识
  if (useRAG) {
    try {
      const { query: ragQuery } = require('./rag/rag-query');
      
      // 构建RAG查询
      const queryText = buildRAGQuery(workerData, realtimeData, safetyCheck);
      console.log(`🔍 RAG查询: "${queryText}"`);
      
      // 执行RAG检索
      const ragResult = await ragQuery(queryText, { rerankTopK: 3 });
      
      if (ragResult.results.length > 0) {
        ragContext = '\n\n## 参考知识库\n\n' + ragResult.context;
        console.log(`✅ RAG检索成功: ${ragResult.results.length} 个相关文档`);
      } else {
        console.log('⚠️ RAG未找到相关文档');
      }
    } catch (error) {
      console.error('❌ RAG检索失败:', error.message);
      // RAG失败不影响主流程
    }
  }
  
  // 1. 构建提示词（包含RAG上下文）
  const prompt = buildPrompt(
    workerData,
    realtimeData,
    historyData,
    safetyCheck.alerts
  ) + ragContext;
  
  // 2. 调用 DeepSeek API
  const analysis = await callDeepSeekAPI(prompt);
  
  // 3. 返回完整结果
  return {
    worker_id: workerData.worker_id,
    worker_name: workerData.name,
    request_data: JSON.stringify(realtimeData),
    prompt: prompt,
    history_data: JSON.stringify(historyData),
    use_rag: useRAG,
    ...analysis
  };
}

/**
 * 构建RAG查询文本
 */
function buildRAGQuery(workerData, realtimeData, safetyCheck) {
  const queries = [];
  
  // 根据异常指标构建查询
  if (safetyCheck.alerts && safetyCheck.alerts.length > 0) {
    for (const alert of safetyCheck.alerts) {
      if (alert.type === 'heart_rate') {
        queries.push('心率异常处理');
      } else if (alert.type === 'blood_oxygen') {
        queries.push('血氧不足应急措施');
      } else if (alert.type === 'stress') {
        queries.push('压力过大处理方法');
      } else if (alert.type === 'depth') {
        queries.push('深地作业安全规范');
      }
    }
  }
  
  // 默认查询
  if (queries.length === 0) {
    queries.push('深地矿井工人健康监测');
  }
  
  return queries.join(' ');
}

module.exports = {
  performAnalysis,
  buildPrompt,
  buildRAGQuery,
  AI_CONFIG
};


