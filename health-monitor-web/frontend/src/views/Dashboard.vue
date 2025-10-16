<template>
  <div class="dashboard">
    <!-- 顶部统计卡片 -->
    <div class="stats-grid">
      <el-card class="stat-card tech-border hover-lift">
        <div class="stat-content">
          <div class="stat-icon online-icon">
            <el-icon size="40"><CircleCheckFilled /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">在线设备</div>
            <div class="stat-value glow">{{ deviceStats.online }}</div>
          </div>
        </div>
      </el-card>

      <el-card class="stat-card tech-border hover-lift">
        <div class="stat-content">
          <div class="stat-icon offline-icon">
            <el-icon size="40"><CircleCloseFilled /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">离线设备</div>
            <div class="stat-value" style="color: #888">{{ deviceStats.offline }}</div>
          </div>
        </div>
      </el-card>

      <el-card class="stat-card tech-border hover-lift">
        <div class="stat-content">
          <div class="stat-icon total-icon">
            <el-icon size="40"><Odometer /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">设备总数</div>
            <div class="stat-value" style="color: var(--secondary-color)">{{ deviceStats.total }}</div>
          </div>
        </div>
      </el-card>

      <el-card class="stat-card tech-border hover-lift" :class="{ pulse: dangerAlertCount > 0 }">
        <div class="stat-content">
          <div class="stat-icon alert-icon">
            <el-icon size="40"><WarningFilled /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">未处理报警</div>
            <div class="stat-value" style="color: var(--danger-color)">{{ activeAlertCount }}</div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 工人监控面板 -->
    <el-card class="workers-panel tech-border">
      <template #header>
        <div class="panel-header">
          <span class="glow">👨‍🔧 工人实时监控</span>
          <el-button 
            type="primary" 
            :icon="Refresh" 
            @click="refreshData"
            :loading="loading"
            size="small"
          >
            刷新数据
          </el-button>
        </div>
      </template>

      <!-- 加载状态 -->
      <div v-if="loading" class="loading-container">
        <el-icon class="is-loading" size="50"><Loading /></el-icon>
        <p>正在加载数据...</p>
      </div>

      <!-- 工人卡片网格 -->
      <div v-else-if="realtimeData.length > 0" class="workers-grid">
        <div 
          v-for="worker in realtimeData" 
          :key="worker.worker_id"
          class="worker-card tech-border hover-lift"
          :class="getWorkerCardClass(worker)"
          @click="viewWorkerDetail(worker.worker_id)"
        >
          <!-- 工人头部 -->
          <div class="worker-header">
            <div class="worker-basic">
              <div class="worker-name">{{ worker.worker_name || '未知' }}</div>
              <div class="worker-id">{{ worker.worker_id }} · {{ worker.position || '作业员' }}</div>
              <!-- 最新数据更新时间 -->
              <div class="last-update">
                <el-icon style="margin-right: 4px;"><Clock /></el-icon>
                {{ formatUpdateTime(worker.last_update) }}
              </div>
            </div>
            <div class="status-tags">
              <!-- 在线/离线状态 -->
              <el-tag 
                :type="worker.is_active ? 'success' : 'info'" 
                effect="plain"
                size="small"
                class="tech-tag"
              >
                {{ worker.is_active ? '🟢 在线' : '⚫ 离线' }}
              </el-tag>
              <!-- 安全状态 -->
              <el-tag 
                :type="getStatusType(worker)" 
                effect="plain"
                size="large"
                class="tech-tag safety-tag"
              >
                {{ getStatusText(worker) }}
              </el-tag>
            </div>
          </div>

          <!-- 生理指标 -->
          <div class="metrics-grid">
            <div class="metric-item">
              <span class="metric-icon">❤️</span>
              <div class="metric-detail">
                <div class="metric-label">心率</div>
                <div class="metric-value">{{ worker.heart_rate_last || 0 }}</div>
                <div class="metric-unit">bpm</div>
              </div>
            </div>

            <div class="metric-item">
              <span class="metric-icon">🫁</span>
              <div class="metric-detail">
                <div class="metric-label">血氧</div>
                <div class="metric-value">{{ worker.blood_oxygen_value || 0 }}</div>
                <div class="metric-unit">%</div>
              </div>
            </div>

            <div class="metric-item">
              <span class="metric-icon">😰</span>
              <div class="metric-detail">
                <div class="metric-label">压力</div>
                <div class="metric-value">{{ worker.stress_value || 0 }}</div>
                <div class="metric-unit"></div>
              </div>
            </div>

            <div class="metric-item">
              <span class="metric-icon">📍</span>
              <div class="metric-detail">
                <div class="metric-label">深度</div>
                <div class="metric-value">{{ Math.abs(worker.altitude || 0) }}</div>
                <div class="metric-unit">m</div>
              </div>
            </div>
          </div>

          <!-- 报警信息 -->
          <div v-if="worker.alert_message" class="alert-banner">
            <el-icon><WarningFilled /></el-icon>
            <span>{{ worker.alert_message }}</span>
          </div>

          <!-- 操作按钮 -->
          <div class="worker-actions">
            <el-button 
              type="primary" 
              size="small" 
              @click.stop="viewWorkerDetail(worker.worker_id)"
            >
              详情
            </el-button>
            <el-button 
              type="info" 
              size="small" 
              @click.stop="showAIDialog(worker)"
              :loading="aiLoading[worker.worker_id]"
            >
              AI分析
            </el-button>
          </div>
        </div>
      </div>

      <!-- 无数据 -->
      <el-empty v-else description="暂无工人数据" />
    </el-card>

    <!-- AI 分析对话框 -->
    <el-dialog
      v-model="aiDialogVisible"
      title="🤖 AI 安全分析"
      width="700px"
      :close-on-click-modal="false"
    >
      <div v-if="aiAnalysisLoading" class="ai-loading">
        <el-icon class="is-loading" size="50"><Loading /></el-icon>
        <p>DeepSeek AI 分析中，请稍候...</p>
      </div>

      <div v-else-if="aiAnalysisResult" class="ai-result">
        <div class="ai-worker-info">
          <h3>{{ aiAnalysisResult.worker_name }} ({{ aiAnalysisResult.worker_id }})</h3>
        </div>

        <el-alert 
          :type="getRiskAlertType(aiAnalysisResult.risk_level)" 
          :title="`风险等级: ${aiAnalysisResult.risk_level}`"
          :closable="false"
          effect="dark"
        />

        <div class="ai-section">
          <h4>🔍 风险分析</h4>
          <p>{{ aiAnalysisResult.risk_analysis }}</p>
        </div>

        <div class="ai-section">
          <h4>💊 健康状况</h4>
          <p>{{ aiAnalysisResult.health_status }}</p>
        </div>

        <div v-if="aiAnalysisResult.safety_advice" class="ai-section">
          <h4>💡 安全建议</h4>
          <p>{{ aiAnalysisResult.safety_advice }}</p>
        </div>

        <div v-if="aiAnalysisResult.emergency_measures" class="ai-section warning">
          <h4>🚨 应急措施</h4>
          <p>{{ aiAnalysisResult.emergency_measures }}</p>
        </div>

        <div v-if="aiAnalysisResult.rescue_guidance" class="ai-section danger">
          <h4>🏥 救援指导</h4>
          <p>{{ aiAnalysisResult.rescue_guidance }}</p>
        </div>

        <div class="ai-meta">
          <span>分析时间: {{ new Date().toLocaleString() }}</span>
          <span>响应时间: {{ aiAnalysisResult.response_time }}ms</span>
        </div>
      </div>

      <template #footer>
        <el-button @click="aiDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { 
  CircleCheckFilled, 
  CircleCloseFilled, 
  Odometer,
  WarningFilled,
  Refresh,
  Loading,
  Clock
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useHealthStore } from '../stores'

const router = useRouter()
const healthStore = useHealthStore()

const loading = ref(false)
const aiDialogVisible = ref(false)
const aiAnalysisLoading = ref(false)
const aiAnalysisResult = ref(null)
const aiLoading = ref({})

let refreshInterval = null

const deviceStats = computed(() => healthStore.deviceStats)
const realtimeData = computed(() => healthStore.realtimeData)
const activeAlertCount = computed(() => healthStore.activeAlerts.length)
const dangerAlertCount = computed(() => healthStore.dangerAlerts.length)

function getWorkerCardClass(worker) {
  if (worker.alert_level === 3) return 'danger'
  if (worker.alert_level === 2) return 'warning'
  return 'safe'
}

function getStatusType(worker) {
  if (worker.alert_level === 3) return 'danger'
  if (worker.alert_level === 2) return 'warning'
  return 'success'
}

function getStatusText(worker) {
  if (!worker.is_active) return '⚫ 离线'
  if (worker.alert_level === 3) return '🔴 危险'
  if (worker.alert_level === 2) return '🟡 警告'
  return '🟢 安全'
}

function formatUpdateTime(timestamp) {
  if (!timestamp) return '无数据'
  
  const now = new Date()
  const updateTime = new Date(timestamp)
  const diffMs = now - updateTime
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  
  if (diffSeconds < 10) return '刚刚'
  if (diffSeconds < 60) return `${diffSeconds}秒前`
  if (diffMinutes < 60) return `${diffMinutes}分钟前`
  if (diffHours < 24) return `${diffHours}小时前`
  
  // 超过24小时显示具体时间
  const month = String(updateTime.getMonth() + 1).padStart(2, '0')
  const day = String(updateTime.getDate()).padStart(2, '0')
  const hours = String(updateTime.getHours()).padStart(2, '0')
  const minutes = String(updateTime.getMinutes()).padStart(2, '0')
  return `${month}-${day} ${hours}:${minutes}`
}

function getRiskAlertType(riskLevel) {
  if (riskLevel?.includes('危险')) return 'error'
  if (riskLevel?.includes('风险')) return 'warning'
  return 'success'
}

async function refreshData(silent = false) {
  // 静默刷新时不显示loading，避免卡片闪烁
  if (!silent) {
    loading.value = true
  }
  
  try {
    await Promise.all([
      healthStore.fetchDeviceStats(),
      healthStore.fetchRealtimeData(),
      healthStore.fetchAlerts()
    ])
    // 只在手动刷新时显示成功提示
    if (!silent) {
      ElMessage.success('数据刷新成功')
    }
  } catch (error) {
    // 静默刷新失败时不显示错误，避免干扰用户
    if (!silent) {
      ElMessage.error('数据刷新失败')
    } else {
      console.error('后台数据刷新失败:', error)
    }
  } finally {
    if (!silent) {
      loading.value = false
    }
  }
}

function viewWorkerDetail(workerId) {
  router.push(`/worker/${workerId}`)
}

async function showAIDialog(worker) {
  aiDialogVisible.value = true
  aiAnalysisLoading.value = true
  aiAnalysisResult.value = null
  aiLoading.value[worker.worker_id] = true

  try {
    const startTime = Date.now()
    const result = await healthStore.performAIAnalysis(worker.worker_id)
    result.response_time = Date.now() - startTime
    result.worker_name = worker.worker_name
    result.worker_id = worker.worker_id
    aiAnalysisResult.value = result
  } catch (error) {
    ElMessage.error('AI分析失败，请重试')
    aiDialogVisible.value = false
  } finally {
    aiAnalysisLoading.value = false
    aiLoading.value[worker.worker_id] = false
  }
}

onMounted(async () => {
  // 首次加载显示loading
  await refreshData(false)
  
  // 每 5 秒自动静默刷新（不显示loading和提示）
  refreshInterval = setInterval(() => refreshData(true), 5000)
})

onUnmounted(() => {
  if (refreshInterval) {
    clearInterval(refreshInterval)
  }
})
</script>

<style scoped>
.dashboard {
  max-width: 1800px;
  margin: 0 auto;
}

/* 统计卡片 */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  border-radius: 12px;
  overflow: hidden;
}

.stat-content {
  display: flex;
  align-items: center;
  gap: 20px;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.online-icon {
  background: rgba(0, 255, 136, 0.1);
  color: var(--primary-color);
}

.offline-icon {
  background: rgba(128, 128, 128, 0.1);
  color: #888;
}

.total-icon {
  background: rgba(136, 204, 255, 0.1);
  color: var(--secondary-color);
}

.alert-icon {
  background: rgba(255, 51, 102, 0.1);
  color: var(--danger-color);
}

.stat-info {
  flex: 1;
}

.stat-label {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 8px;
}

.stat-value {
  font-size: 36px;
  font-weight: bold;
  font-variant-numeric: tabular-nums;
}

/* 工人面板 */
.workers-panel {
  border-radius: 12px;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 20px;
}

.loading-container {
  text-align: center;
  padding: 60px 20px;
  color: var(--secondary-color);
}

/* 工人卡片网格 */
.workers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 20px;
}

.worker-card {
  background: var(--bg-card);
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s;
  border-left: 4px solid;
}

.worker-card.safe {
  border-left-color: var(--primary-color);
}

.worker-card.warning {
  border-left-color: var(--warning-color);
  background: rgba(255, 170, 0, 0.05);
}

.worker-card.danger {
  border-left-color: var(--danger-color);
  background: rgba(255, 51, 102, 0.05);
  animation: pulse 1.5s infinite;
}

.worker-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
}

.worker-basic {
  flex: 1;
}

.worker-name {
  font-size: 20px;
  font-weight: bold;
  color: var(--primary-color);
  margin-bottom: 4px;
}

.worker-id {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 6px;
}

.last-update {
  font-size: 12px;
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
}

.status-tags {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-end;
}

/* 指标网格 */
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 15px;
  margin: 20px 0;
}

.metric-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(26, 35, 50, 0.5);
  padding: 12px;
  border-radius: 8px;
}

.metric-icon {
  font-size: 24px;
}

.metric-detail {
  flex: 1;
}

.metric-label {
  font-size: 12px;
  color: var(--text-secondary);
  margin-bottom: 4px;
}

.metric-value {
  font-size: 20px;
  font-weight: bold;
  color: var(--primary-color);
  font-variant-numeric: tabular-nums;
}

.metric-unit {
  font-size: 12px;
  color: var(--text-secondary);
  margin-left: 4px;
}

/* 报警横幅 */
.alert-banner {
  background: rgba(255, 51, 102, 0.1);
  border: 1px solid var(--danger-color);
  border-radius: 8px;
  padding: 12px;
  margin: 15px 0;
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--danger-color);
}

/* 操作按钮 */
.worker-actions {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

.worker-actions .el-button {
  flex: 1;
}

/* AI 对话框 */
.ai-loading {
  text-align: center;
  padding: 40px;
  color: var(--secondary-color);
}

.ai-result {
  color: var(--text-primary);
}

.ai-worker-info h3 {
  color: var(--primary-color);
  margin-bottom: 20px;
}

.ai-section {
  margin: 20px 0;
  padding: 15px;
  background: rgba(26, 35, 50, 0.5);
  border-radius: 8px;
  border-left: 3px solid var(--primary-color);
}

.ai-section.warning {
  border-left-color: var(--warning-color);
  background: rgba(255, 170, 0, 0.05);
}

.ai-section.danger {
  border-left-color: var(--danger-color);
  background: rgba(255, 51, 102, 0.05);
}

.ai-section h4 {
  color: var(--secondary-color);
  margin-bottom: 10px;
}

.ai-section p {
  line-height: 1.8;
  color: var(--text-primary);
}

.ai-meta {
  display: flex;
  justify-content: space-between;
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid var(--border-primary);
  font-size: 12px;
  color: var(--text-secondary);
}
</style>


