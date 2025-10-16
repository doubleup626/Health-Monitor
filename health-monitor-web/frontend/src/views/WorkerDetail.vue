<template>
  <div class="worker-detail">
    <!-- 返回按钮 -->
    <el-button 
      :icon="ArrowLeft" 
      @click="$router.back()"
      class="back-btn"
    >
      返回监控面板
    </el-button>

    <!-- 加载状态 -->
    <div v-if="loading" class="loading-container">
      <el-icon class="is-loading" size="50"><Loading /></el-icon>
      <p>正在加载工人数据...</p>
    </div>

    <!-- 工人信息 -->
    <div v-else-if="workerInfo">
      <!-- 基本信息卡片 -->
      <el-card class="info-card tech-border">
        <template #header>
          <div class="card-header">
            <span class="glow">👤 工人信息</span>
            <el-tag 
              :type="realtimeData?.is_active ? 'success' : 'danger'" 
              effect="dark"
              size="large"
            >
              {{ realtimeData?.is_active ? '🟢 在线' : '🔴 离线' }}
            </el-tag>
          </div>
        </template>

        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">姓名:</span>
            <span class="info-value">{{ workerInfo.name }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">工号:</span>
            <span class="info-value">{{ workerInfo.worker_id }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">年龄:</span>
            <span class="info-value">{{ workerInfo.age || '未知' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">性别:</span>
            <span class="info-value">{{ workerInfo.gender || '未知' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">岗位:</span>
            <span class="info-value">{{ workerInfo.position || '未知' }}</span>
          </div>
          <div class="info-item">
            <span class="info-label">班组:</span>
            <span class="info-value">{{ workerInfo.team || '未知' }}</span>
          </div>
        </div>
      </el-card>

      <!-- 实时数据卡片 -->
      <el-card class="realtime-card tech-border" v-if="realtimeData">
        <template #header>
          <div class="card-header">
            <span class="glow">📊 实时健康数据</span>
            <el-button 
              :icon="Refresh" 
              @click="loadRealtimeData"
              :loading="refreshing"
              size="small"
            >
              刷新
            </el-button>
          </div>
        </template>

        <div class="realtime-grid">
          <div class="realtime-item">
            <div class="realtime-icon" style="background: rgba(255, 100, 100, 0.1);">❤️</div>
            <div class="realtime-info">
              <div class="realtime-label">心率</div>
              <div class="realtime-value" style="color: #ff6464;">
                {{ realtimeData.heart_rate_last || 0 }}
                <span class="realtime-unit">bpm</span>
              </div>
              <div class="realtime-extra">静息: {{ realtimeData.heart_rate_resting || 0 }} bpm</div>
            </div>
          </div>

          <div class="realtime-item">
            <div class="realtime-icon" style="background: rgba(100, 150, 255, 0.1);">🫁</div>
            <div class="realtime-info">
              <div class="realtime-label">血氧</div>
              <div class="realtime-value" style="color: #6496ff;">
                {{ realtimeData.blood_oxygen_value || 0 }}
                <span class="realtime-unit">%</span>
              </div>
            </div>
          </div>

          <div class="realtime-item">
            <div class="realtime-icon" style="background: rgba(255, 170, 0, 0.1);">😰</div>
            <div class="realtime-info">
              <div class="realtime-label">压力指数</div>
              <div class="realtime-value" style="color: #ffaa00;">
                {{ realtimeData.stress_value || 0 }}
              </div>
            </div>
          </div>

          <div class="realtime-item">
            <div class="realtime-icon" style="background: rgba(100, 255, 180, 0.1);">🌡️</div>
            <div class="realtime-info">
              <div class="realtime-label">体温</div>
              <div class="realtime-value" style="color: #64ffb4;">
                {{ realtimeData.body_temperature || 0 }}
                <span class="realtime-unit">°C</span>
              </div>
            </div>
          </div>

          <div class="realtime-item">
            <div class="realtime-icon" style="background: rgba(0, 255, 136, 0.1);">👣</div>
            <div class="realtime-info">
              <div class="realtime-label">步数</div>
              <div class="realtime-value" style="color: var(--primary-color);">
                {{ realtimeData.steps || 0 }}
              </div>
            </div>
          </div>

          <div class="realtime-item">
            <div class="realtime-icon" style="background: rgba(255, 100, 255, 0.1);">🔥</div>
            <div class="realtime-info">
              <div class="realtime-label">卡路里</div>
              <div class="realtime-value" style="color: #ff64ff;">
                {{ realtimeData.calories || 0 }}
                <span class="realtime-unit">kcal</span>
              </div>
            </div>
          </div>

          <div class="realtime-item">
            <div class="realtime-icon" style="background: rgba(136, 204, 255, 0.1);">📍</div>
            <div class="realtime-info">
              <div class="realtime-label">深度</div>
              <div class="realtime-value" style="color: var(--secondary-color);">
                {{ Math.abs(realtimeData.altitude || 0) }}
                <span class="realtime-unit">m</span>
              </div>
              <div class="realtime-extra">气压: {{ realtimeData.air_pressure || 0 }} hPa</div>
            </div>
          </div>

          <div class="realtime-item">
            <div class="realtime-icon" style="background: rgba(200, 200, 200, 0.1);">⏰</div>
            <div class="realtime-info">
              <div class="realtime-label">更新时间</div>
              <div class="realtime-value" style="color: #888; font-size: 16px;">
                {{ formatTime(realtimeData.timestamp) }}
              </div>
            </div>
          </div>
        </div>

        <!-- 安全状态横幅 -->
        <el-alert
          v-if="realtimeData.alert_message"
          :type="realtimeData.alert_level === 3 ? 'error' : 'warning'"
          :title="realtimeData.alert_message"
          :closable="false"
          show-icon
          effect="dark"
          class="safety-alert"
        />
      </el-card>

      <!-- 历史数据图表 -->
      <el-card class="history-card tech-border">
        <template #header>
          <div class="card-header">
            <span class="glow">📈 历史数据趋势</span>
            <el-select 
              v-model="historyRange" 
              @change="loadHistoryData"
              size="small"
              style="width: 150px"
            >
              <el-option label="最近1小时" :value="1" />
              <el-option label="最近3小时" :value="3" />
              <el-option label="最近6小时" :value="6" />
              <el-option label="最近12小时" :value="12" />
              <el-option label="最近24小时" :value="24" />
            </el-select>
          </div>
        </template>

        <div v-if="historyData.length > 0">
          <div class="chart-container" id="heartRateChart"></div>
          <div class="chart-container" id="bloodOxygenChart"></div>
          <div class="chart-container" id="stressChart"></div>
        </div>
        <el-empty v-else description="暂无历史数据" />
      </el-card>

      <!-- AI 分析按钮 -->
      <el-card class="ai-card tech-border">
        <el-button 
          type="primary" 
          size="large" 
          :icon="MagicStick"
          @click="performAIAnalysis"
          :loading="aiAnalyzing"
          block
        >
          🤖 请求 AI 安全分析
        </el-button>
      </el-card>
    </div>

    <!-- 无数据 -->
    <el-empty v-else description="未找到工人信息" />
  </div>
</template>

<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Refresh, Loading, MagicStick } from '@element-plus/icons-vue'
import { ElMessage, ElNotification } from 'element-plus'
import * as echarts from 'echarts'

const route = useRoute()
const router = useRouter()

const workerId = ref(route.params.workerId)
const loading = ref(true)
const refreshing = ref(false)
const aiAnalyzing = ref(false)
const workerInfo = ref(null)
const realtimeData = ref(null)
const historyData = ref([])
const historyRange = ref(3)

let heartRateChart = null
let bloodOxygenChart = null
let stressChart = null

async function loadWorkerInfo() {
  try {
    const response = await fetch(`/api/workers/${workerId.value}`)
    if (response.ok) {
      workerInfo.value = await response.json()
    }
  } catch (error) {
    console.error('加载工人信息失败:', error)
  }
}

async function loadRealtimeData() {
  refreshing.value = true
  try {
    const response = await fetch(`/api/realtime/${workerId.value}`)
    if (response.ok) {
      realtimeData.value = await response.json()
    }
  } catch (error) {
    console.error('加载实时数据失败:', error)
  } finally {
    refreshing.value = false
  }
}

async function loadHistoryData() {
  try {
    const endTime = Date.now()
    const startTime = endTime - historyRange.value * 60 * 60 * 1000
    const response = await fetch(`/api/history/${workerId.value}?start=${startTime}&end=${endTime}&limit=100`)
    if (response.ok) {
      const data = await response.json()
      historyData.value = data.reverse() // 时间升序
      renderCharts()
    }
  } catch (error) {
    console.error('加载历史数据失败:', error)
  }
}

function formatTime(timestamp) {
  if (!timestamp) return '-'
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN')
}

function renderCharts() {
  if (historyData.value.length === 0) return

  const times = historyData.value.map(item => {
    const date = new Date(item.timestamp)
    return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
  })

  // 心率图表
  const heartRateElement = document.getElementById('heartRateChart')
  if (heartRateElement) {
    if (!heartRateChart) {
      heartRateChart = echarts.init(heartRateElement, 'dark')
    }
    heartRateChart.setOption({
      title: { text: '心率趋势', textStyle: { color: '#00ff88' } },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: times },
      yAxis: { type: 'value', name: 'bpm' },
      series: [{
        name: '心率',
        type: 'line',
        data: historyData.value.map(item => item.heart_rate || 0),
        smooth: true,
        lineStyle: { color: '#ff6464' },
        itemStyle: { color: '#ff6464' },
        areaStyle: { color: 'rgba(255, 100, 100, 0.1)' }
      }]
    })
  }

  // 血氧图表
  const bloodOxygenElement = document.getElementById('bloodOxygenChart')
  if (bloodOxygenElement) {
    if (!bloodOxygenChart) {
      bloodOxygenChart = echarts.init(bloodOxygenElement, 'dark')
    }
    bloodOxygenChart.setOption({
      title: { text: '血氧趋势', textStyle: { color: '#00ff88' } },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: times },
      yAxis: { type: 'value', name: '%', min: 85, max: 100 },
      series: [{
        name: '血氧',
        type: 'line',
        data: historyData.value.map(item => item.blood_oxygen || 0),
        smooth: true,
        lineStyle: { color: '#6496ff' },
        itemStyle: { color: '#6496ff' },
        areaStyle: { color: 'rgba(100, 150, 255, 0.1)' },
        markLine: {
          data: [
            { yAxis: 90, label: { formatter: '警戒线: 90%' }, lineStyle: { color: '#ffaa00' } }
          ]
        }
      }]
    })
  }

  // 压力图表
  const stressElement = document.getElementById('stressChart')
  if (stressElement) {
    if (!stressChart) {
      stressChart = echarts.init(stressElement, 'dark')
    }
    stressChart.setOption({
      title: { text: '压力指数趋势', textStyle: { color: '#00ff88' } },
      tooltip: { trigger: 'axis' },
      xAxis: { type: 'category', data: times },
      yAxis: { type: 'value', max: 100 },
      series: [{
        name: '压力',
        type: 'line',
        data: historyData.value.map(item => item.stress || 0),
        smooth: true,
        lineStyle: { color: '#ffaa00' },
        itemStyle: { color: '#ffaa00' },
        areaStyle: { color: 'rgba(255, 170, 0, 0.1)' },
        markLine: {
          data: [
            { yAxis: 80, label: { formatter: '警戒线: 80' }, lineStyle: { color: '#ff3366' } }
          ]
        }
      }]
    })
  }
}

async function performAIAnalysis() {
  aiAnalyzing.value = true
  try {
    const startTime = Date.now()
    const response = await fetch(`/api/ai/analyze/${workerId.value}`, { method: 'POST' })
    const result = await response.json()
    const responseTime = Date.now() - startTime

    ElNotification({
      title: '🤖 AI 分析完成',
      dangerouslyUseHTMLString: true,
      message: `
        <p><strong>风险等级:</strong> ${result.risk_level}</p>
        <p><strong>风险分析:</strong> ${result.risk_analysis}</p>
        <p><strong>健康状况:</strong> ${result.health_status}</p>
        ${result.safety_advice ? `<p><strong>安全建议:</strong> ${result.safety_advice}</p>` : ''}
        <p style="color: #888;">响应时间: ${responseTime}ms</p>
      `,
      type: result.risk_level?.includes('危险') ? 'error' : result.risk_level?.includes('风险') ? 'warning' : 'success',
      duration: 0
    })
  } catch (error) {
    ElMessage.error('AI 分析失败，请重试')
  } finally {
    aiAnalyzing.value = false
  }
}

onMounted(async () => {
  loading.value = true
  await Promise.all([
    loadWorkerInfo(),
    loadRealtimeData(),
    loadHistoryData()
  ])
  loading.value = false

  // 监听窗口大小变化，重新渲染图表
  window.addEventListener('resize', () => {
    heartRateChart?.resize()
    bloodOxygenChart?.resize()
    stressChart?.resize()
  })
})

watch(() => route.params.workerId, (newId) => {
  workerId.value = newId
  loadWorkerInfo()
  loadRealtimeData()
  loadHistoryData()
})
</script>

<style scoped>
.worker-detail {
  max-width: 1400px;
  margin: 0 auto;
}

.back-btn {
  margin-bottom: 20px;
}

.loading-container {
  text-align: center;
  padding: 60px 20px;
  color: var(--secondary-color);
}

.info-card,
.realtime-card,
.history-card,
.ai-card {
  margin-bottom: 20px;
  border-radius: 12px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 18px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 10px;
}

.info-label {
  color: var(--text-secondary);
  font-weight: 500;
}

.info-value {
  color: var(--primary-color);
  font-weight: bold;
}

.realtime-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.realtime-item {
  display: flex;
  align-items: center;
  gap: 15px;
  background: rgba(26, 35, 50, 0.5);
  padding: 20px;
  border-radius: 12px;
  border: 1px solid var(--border-primary);
}

.realtime-icon {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.realtime-info {
  flex: 1;
}

.realtime-label {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.realtime-value {
  font-size: 28px;
  font-weight: bold;
  font-variant-numeric: tabular-nums;
}

.realtime-unit {
  font-size: 14px;
  margin-left: 4px;
  color: var(--text-secondary);
}

.realtime-extra {
  font-size: 12px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.safety-alert {
  margin-top: 20px;
}

.chart-container {
  width: 100%;
  height: 300px;
  margin-bottom: 20px;
}
</style>


