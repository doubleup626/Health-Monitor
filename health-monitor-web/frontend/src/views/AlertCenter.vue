<template>
  <div class="alert-center">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2 class="glow">🚨 报警中心</h2>
      <div class="header-actions">
        <el-button 
          :icon="Refresh" 
          @click="loadAlerts"
          :loading="loading"
        >
          刷新
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="alert-stats">
      <el-card class="stat-card tech-border">
        <div class="stat-content">
          <div class="stat-icon danger-icon">
            <el-icon size="30"><WarningFilled /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">危险报警</div>
            <div class="stat-value" style="color: var(--danger-color);">{{ dangerAlerts.length }}</div>
          </div>
        </div>
      </el-card>

      <el-card class="stat-card tech-border">
        <div class="stat-content">
          <div class="stat-icon warning-icon">
            <el-icon size="30"><Warning /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">警告报警</div>
            <div class="stat-value" style="color: var(--warning-color);">{{ warningAlerts.length }}</div>
          </div>
        </div>
      </el-card>

      <el-card class="stat-card tech-border">
        <div class="stat-content">
          <div class="stat-icon pending-icon">
            <el-icon size="30"><Clock /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">待处理</div>
            <div class="stat-value" style="color: var(--primary-color);">{{ pendingAlerts.length }}</div>
          </div>
        </div>
      </el-card>

      <el-card class="stat-card tech-border">
        <div class="stat-content">
          <div class="stat-icon handled-icon">
            <el-icon size="30"><CircleCheckFilled /></el-icon>
          </div>
          <div class="stat-info">
            <div class="stat-label">已处理</div>
            <div class="stat-value" style="color: #888;">{{ handledAlerts.length }}</div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 筛选器 -->
    <el-card class="filter-card tech-border">
      <el-form :inline="true" :model="filters">
        <el-form-item label="报警级别">
          <el-select v-model="filters.level" placeholder="全部" clearable @change="filterAlerts">
            <el-option label="全部" :value="null" />
            <el-option label="危险 (3级)" :value="3" />
            <el-option label="警告 (2级)" :value="2" />
            <el-option label="低风险 (1级)" :value="1" />
          </el-select>
        </el-form-item>

        <el-form-item label="处理状态">
          <el-select v-model="filters.handled" placeholder="全部" clearable @change="filterAlerts">
            <el-option label="全部" :value="null" />
            <el-option label="待处理" :value="false" />
            <el-option label="已处理" :value="true" />
          </el-select>
        </el-form-item>

        <el-form-item label="工人">
          <el-select v-model="filters.workerId" placeholder="全部" clearable @change="filterAlerts">
            <el-option label="全部" :value="null" />
            <el-option 
              v-for="worker in workers" 
              :key="worker.worker_id"
              :label="`${worker.name} (${worker.worker_id})`"
              :value="worker.worker_id"
            />
          </el-select>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 报警列表 -->
    <el-card class="alerts-card tech-border">
      <el-table 
        :data="filteredAlerts" 
        style="width: 100%"
        :default-sort="{ prop: 'created_at', order: 'descending' }"
      >
        <el-table-column prop="id" label="报警ID" width="80" />
        
        <el-table-column prop="alert_level" label="级别" width="100">
          <template #default="{ row }">
            <el-tag 
              :type="getAlertLevelType(row.alert_level)" 
              effect="dark"
            >
              {{ getAlertLevelText(row.alert_level) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="worker_name" label="工人" width="120">
          <template #default="{ row }">
            <el-button 
              link 
              type="primary"
              @click="viewWorker(row.worker_id)"
            >
              {{ row.worker_name }}
            </el-button>
          </template>
        </el-table-column>

        <el-table-column prop="alert_type" label="报警类型" width="150" />
        
        <el-table-column prop="alert_message" label="报警信息" min-width="250" show-overflow-tooltip />
        
        <el-table-column prop="created_at" label="报警时间" width="180">
          <template #default="{ row }">
            {{ formatTime(row.created_at) }}
          </template>
        </el-table-column>

        <el-table-column prop="is_handled" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.is_handled ? 'success' : 'warning'" effect="plain">
              {{ row.is_handled ? '已处理' : '待处理' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button 
              size="small" 
              @click="viewAlertDetail(row)"
            >
              详情
            </el-button>
            <el-button 
              v-if="!row.is_handled"
              size="small" 
              type="primary"
              @click="handleAlert(row)"
            >
              处理
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 报警详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="📋 报警详情"
      width="700px"
    >
      <div v-if="selectedAlert" class="alert-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="报警ID">{{ selectedAlert.id }}</el-descriptions-item>
          <el-descriptions-item label="报警级别">
            <el-tag :type="getAlertLevelType(selectedAlert.alert_level)" effect="dark">
              {{ getAlertLevelText(selectedAlert.alert_level) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="工人">{{ selectedAlert.worker_name }}</el-descriptions-item>
          <el-descriptions-item label="工号">{{ selectedAlert.worker_id }}</el-descriptions-item>
          <el-descriptions-item label="设备ID">{{ selectedAlert.device_id }}</el-descriptions-item>
          <el-descriptions-item label="报警类型">{{ selectedAlert.alert_type }}</el-descriptions-item>
          <el-descriptions-item label="报警时间" :span="2">
            {{ formatTime(selectedAlert.created_at) }}
          </el-descriptions-item>
          <el-descriptions-item label="报警信息" :span="2">
            <el-alert 
              :type="selectedAlert.alert_level === 3 ? 'error' : 'warning'"
              :title="selectedAlert.alert_message"
              :closable="false"
            />
          </el-descriptions-item>
          <el-descriptions-item label="触发数据" :span="2">
            <pre class="trigger-data">{{ JSON.stringify(JSON.parse(selectedAlert.trigger_data || '{}'), null, 2) }}</pre>
          </el-descriptions-item>
          <el-descriptions-item v-if="selectedAlert.is_handled" label="处理人">
            {{ selectedAlert.handled_by || '未知' }}
          </el-descriptions-item>
          <el-descriptions-item v-if="selectedAlert.is_handled" label="处理时间">
            {{ formatTime(selectedAlert.handled_at) }}
          </el-descriptions-item>
          <el-descriptions-item v-if="selectedAlert.is_handled" label="处理说明" :span="2">
            {{ selectedAlert.handling_note || '无' }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-dialog>

    <!-- 处理报警对话框 -->
    <el-dialog
      v-model="handleDialogVisible"
      title="✅ 处理报警"
      width="500px"
    >
      <el-form :model="handleForm" label-width="100px">
        <el-form-item label="处理人">
          <el-input v-model="handleForm.handledBy" placeholder="请输入处理人姓名" />
        </el-form-item>
        <el-form-item label="处理说明">
          <el-input 
            v-model="handleForm.handlingNote" 
            type="textarea" 
            :rows="4"
            placeholder="请输入处理说明和采取的措施"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="handleDialogVisible = false">取消</el-button>
        <el-button 
          type="primary" 
          @click="submitHandle"
          :loading="submitting"
        >
          确认处理
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { 
  WarningFilled, 
  Warning, 
  Clock, 
  CircleCheckFilled,
  Refresh 
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useHealthStore } from '../stores'

const router = useRouter()
const healthStore = useHealthStore()

const loading = ref(false)
const detailDialogVisible = ref(false)
const handleDialogVisible = ref(false)
const submitting = ref(false)
const selectedAlert = ref(null)
const alerts = ref([])
const workers = ref([])
const filters = ref({
  level: null,
  handled: null,
  workerId: null
})

const handleForm = ref({
  handledBy: '',
  handlingNote: ''
})

const filteredAlerts = computed(() => {
  let result = alerts.value

  if (filters.value.level !== null) {
    result = result.filter(alert => alert.alert_level === filters.value.level)
  }

  if (filters.value.handled !== null) {
    result = result.filter(alert => alert.is_handled === (filters.value.handled ? 1 : 0))
  }

  if (filters.value.workerId) {
    result = result.filter(alert => alert.worker_id === filters.value.workerId)
  }

  return result
})

const dangerAlerts = computed(() => 
  alerts.value.filter(alert => alert.alert_level === 3 && !alert.is_handled)
)

const warningAlerts = computed(() => 
  alerts.value.filter(alert => alert.alert_level === 2 && !alert.is_handled)
)

const pendingAlerts = computed(() => 
  alerts.value.filter(alert => !alert.is_handled)
)

const handledAlerts = computed(() => 
  alerts.value.filter(alert => alert.is_handled)
)

function getAlertLevelType(level) {
  if (level === 3) return 'danger'
  if (level === 2) return 'warning'
  return 'info'
}

function getAlertLevelText(level) {
  if (level === 3) return '🔴 危险'
  if (level === 2) return '🟡 警告'
  return '🟢 低风险'
}

function formatTime(time) {
  if (!time) return '-'
  return new Date(time).toLocaleString('zh-CN')
}

async function loadAlerts() {
  loading.value = true
  try {
    const response = await fetch('/api/alerts')
    alerts.value = await response.json()
  } catch (error) {
    ElMessage.error('加载报警列表失败')
  } finally {
    loading.value = false
  }
}

async function loadWorkers() {
  try {
    const response = await fetch('/api/workers')
    workers.value = await response.json()
  } catch (error) {
    console.error('加载工人列表失败:', error)
  }
}

function filterAlerts() {
  // Filter is reactive, so nothing needed here
}

function viewAlertDetail(alert) {
  selectedAlert.value = alert
  detailDialogVisible.value = true
}

function viewWorker(workerId) {
  router.push(`/worker/${workerId}`)
}

function handleAlert(alert) {
  selectedAlert.value = alert
  handleForm.value = {
    handledBy: '',
    handlingNote: ''
  }
  handleDialogVisible.value = true
}

async function submitHandle() {
  if (!handleForm.value.handledBy) {
    ElMessage.warning('请输入处理人姓名')
    return
  }

  if (!handleForm.value.handlingNote) {
    ElMessage.warning('请输入处理说明')
    return
  }

  submitting.value = true
  try {
    await healthStore.handleAlert(
      selectedAlert.value.id,
      handleForm.value.handledBy,
      handleForm.value.handlingNote
    )
    ElMessage.success('报警处理成功')
    handleDialogVisible.value = false
    await loadAlerts()
  } catch (error) {
    ElMessage.error('处理报警失败')
  } finally {
    submitting.value = false
  }
}

onMounted(async () => {
  await Promise.all([
    loadAlerts(),
    loadWorkers()
  ])
})
</script>

<style scoped>
.alert-center {
  max-width: 1800px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.page-header h2 {
  font-size: 28px;
  color: var(--primary-color);
  margin: 0;
}

.alert-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
}

.stat-card {
  border-radius: 12px;
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

.danger-icon {
  background: rgba(255, 51, 102, 0.1);
  color: var(--danger-color);
}

.warning-icon {
  background: rgba(255, 170, 0, 0.1);
  color: var(--warning-color);
}

.pending-icon {
  background: rgba(0, 255, 136, 0.1);
  color: var(--primary-color);
}

.handled-icon {
  background: rgba(128, 128, 128, 0.1);
  color: #888;
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

.filter-card,
.alerts-card {
  margin-bottom: 20px;
  border-radius: 12px;
}

.trigger-data {
  background: rgba(26, 35, 50, 0.5);
  padding: 15px;
  border-radius: 8px;
  color: var(--primary-color);
  font-size: 12px;
  overflow-x: auto;
}

.alert-detail :deep(.el-descriptions__label) {
  color: var(--text-secondary);
  background: rgba(26, 35, 50, 0.5);
}

.alert-detail :deep(.el-descriptions__content) {
  color: var(--text-primary);
  background: rgba(26, 35, 50, 0.3);
}
</style>


