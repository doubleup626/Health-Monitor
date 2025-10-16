<template>
  <div class="operation-logs">
    <div class="page-header">
      <h1>📋 操作日志</h1>
      <p>查看系统所有操作记录，包括设备管理、员工管理等操作历史</p>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-icon">📝</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">总日志数</div>
        </div>
      </div>
      <div class="stat-card device">
        <div class="stat-icon">🔧</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.device }}</div>
          <div class="stat-label">设备操作</div>
        </div>
      </div>
      <div class="stat-card worker">
        <div class="stat-icon">👷</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.worker }}</div>
          <div class="stat-label">员工操作</div>
        </div>
      </div>
      <div class="stat-card today">
        <div class="stat-icon">📅</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.today }}</div>
          <div class="stat-label">今日操作</div>
        </div>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="search-bar">
        <el-input
          v-model="searchQuery"
          placeholder="搜索操作人、目标ID、描述..."
          prefix-icon="Search"
          clearable
          @input="handleSearch"
        />
      </div>
      <div class="filter-bar">
        <el-select v-model="filterType" placeholder="操作类型" clearable @change="loadLogs">
          <el-option label="全部" value="" />
          <el-option label="添加设备" value="add_device" />
          <el-option label="编辑设备" value="edit_device" />
          <el-option label="删除设备" value="delete_device" />
          <el-option label="绑定设备" value="bind_device" />
          <el-option label="解绑设备" value="unbind_device" />
          <el-option label="添加员工" value="add_worker" />
          <el-option label="编辑员工" value="edit_worker" />
          <el-option label="删除员工" value="delete_worker" />
        </el-select>
        <el-select v-model="filterTargetType" placeholder="目标类型" clearable @change="loadLogs">
          <el-option label="全部" value="" />
          <el-option label="设备" value="device" />
          <el-option label="员工" value="worker" />
        </el-select>
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="-"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          value-format="YYYY-MM-DD"
          @change="loadLogs"
        />
        <el-button @click="loadLogs">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
        <el-button @click="exportLogs">
          <el-icon><Download /></el-icon>
          导出
        </el-button>
      </div>
    </div>

    <!-- 日志列表表格 -->
    <el-table
      v-loading="loading"
      :data="logs"
      stripe
      style="width: 100%"
      :header-cell-style="{ background: '#1a1a2e', color: '#fff' }"
      :row-class-name="getRowClassName"
    >
      <el-table-column type="index" label="#" width="60" />
      <el-table-column label="时间" width="180">
        <template #default="{ row }">
          {{ formatTime(row.created_at) }}
        </template>
      </el-table-column>
      <el-table-column label="操作类型" width="120">
        <template #default="{ row }">
          <el-tag :type="getOperationTypeTag(row.operation_type)">
            {{ getOperationTypeText(row.operation_type) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="operator" label="操作人" width="120" />
      <el-table-column label="目标类型" width="100">
        <template #default="{ row }">
          <el-tag :type="row.target_type === 'device' ? 'primary' : 'success'" size="small">
            {{ row.target_type === 'device' ? '设备' : '员工' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="target_id" label="目标ID" width="150" />
      <el-table-column prop="description" label="操作描述" min-width="250" show-overflow-tooltip />
      <el-table-column prop="ip_address" label="IP地址" width="140" />
      <el-table-column label="操作" width="100">
        <template #default="{ row }">
          <el-button size="small" @click="showDetailDialog(row)">
            详情
          </el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="pagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :total="total"
        :page-sizes="[20, 50, 100, 200]"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="loadLogs"
        @size-change="loadLogs"
      />
    </div>

    <!-- 日志详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="操作日志详情"
      width="700px"
    >
      <div v-if="selectedLog" class="log-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="日志ID">
            {{ selectedLog.id }}
          </el-descriptions-item>
          <el-descriptions-item label="操作时间">
            {{ formatTime(selectedLog.created_at) }}
          </el-descriptions-item>
          <el-descriptions-item label="操作类型">
            <el-tag :type="getOperationTypeTag(selectedLog.operation_type)">
              {{ getOperationTypeText(selectedLog.operation_type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="操作人">
            {{ selectedLog.operator }}
          </el-descriptions-item>
          <el-descriptions-item label="目标类型">
            <el-tag :type="selectedLog.target_type === 'device' ? 'primary' : 'success'">
              {{ selectedLog.target_type === 'device' ? '设备' : '员工' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="目标ID">
            {{ selectedLog.target_id }}
          </el-descriptions-item>
          <el-descriptions-item label="IP地址">
            {{ selectedLog.ip_address || '未记录' }}
          </el-descriptions-item>
          <el-descriptions-item label="描述" :span="2">
            {{ selectedLog.description }}
          </el-descriptions-item>
        </el-descriptions>

        <div v-if="selectedLog.details" class="log-details-section">
          <h3>📦 详细信息</h3>
          <pre class="details-json">{{ formatDetails(selectedLog.details) }}</pre>
        </div>
      </div>
      <template #footer>
        <el-button @click="detailDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import { ElMessage } from 'element-plus';
import { Refresh, Search, Download } from '@element-plus/icons-vue';
import axios from 'axios';

// 数据
const logs = ref([]);
const loading = ref(false);
const searchQuery = ref('');
const filterType = ref('');
const filterTargetType = ref('');
const dateRange = ref([]);
const currentPage = ref(1);
const pageSize = ref(50);
const total = ref(0);

// 对话框
const detailDialogVisible = ref(false);
const selectedLog = ref(null);

// 统计数据
const stats = computed(() => {
  const total = logs.value.length;
  const device = logs.value.filter(l => l.target_type === 'device').length;
  const worker = logs.value.filter(l => l.target_type === 'worker').length;
  const today = logs.value.filter(l => {
    const logDate = new Date(l.created_at).toDateString();
    const todayDate = new Date().toDateString();
    return logDate === todayDate;
  }).length;
  return { total, device, worker, today };
});

// 加载日志列表
const loadLogs = async () => {
  loading.value = true;
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      search: searchQuery.value,
      type: filterType.value,
      target_type: filterTargetType.value
    };
    
    if (dateRange.value && dateRange.value.length === 2) {
      params.start_date = dateRange.value[0];
      params.end_date = dateRange.value[1];
    }
    
    const response = await axios.get('http://localhost:3000/api/logs/operations', { params });
    // 新API返回格式: { success: true, data: { logs: [...], total: 3 } }
    const result = response.data.data || response.data;
    logs.value = result.logs || response.data;
    total.value = result.total || logs.value.length;
  } catch (error) {
    ElMessage.error('加载操作日志失败: ' + error.message);
  } finally {
    loading.value = false;
  }
};

// 搜索
const handleSearch = () => {
  currentPage.value = 1;
  loadLogs();
};

// 查看详情
const showDetailDialog = (log) => {
  selectedLog.value = log;
  detailDialogVisible.value = true;
};

// 导出日志
const exportLogs = () => {
  try {
    // 转换为CSV格式
    const headers = ['ID', '时间', '操作类型', '操作人', '目标类型', '目标ID', '描述', 'IP地址'];
    const csvContent = [
      headers.join(','),
      ...logs.value.map(log => [
        log.id,
        formatTime(log.created_at),
        getOperationTypeText(log.operation_type),
        log.operator,
        log.target_type === 'device' ? '设备' : '员工',
        log.target_id,
        `"${log.description}"`,
        log.ip_address || ''
      ].join(','))
    ].join('\n');

    // 下载文件
    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `operation_logs_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    ElMessage.success('日志导出成功');
  } catch (error) {
    ElMessage.error('导出失败: ' + error.message);
  }
};

// 工具函数
const getOperationTypeTag = (type) => {
  const typeMap = {
    add_device: 'success',
    edit_device: 'primary',
    delete_device: 'danger',
    bind_device: 'success',
    unbind_device: 'warning',
    add_worker: 'success',
    edit_worker: 'primary',
    delete_worker: 'danger'
  };
  return typeMap[type] || 'info';
};

const getOperationTypeText = (type) => {
  const typeMap = {
    add_device: '添加设备',
    edit_device: '编辑设备',
    delete_device: '删除设备',
    bind_device: '绑定设备',
    unbind_device: '解绑设备',
    add_worker: '添加员工',
    edit_worker: '编辑员工',
    delete_worker: '删除员工'
  };
  return typeMap[type] || type;
};

const getRowClassName = ({ row }) => {
  if (row.operation_type.includes('delete')) {
    return 'danger-row';
  } else if (row.operation_type.includes('add')) {
    return 'success-row';
  }
  return '';
};

const formatTime = (time) => {
  if (!time) return '未知';
  return new Date(time).toLocaleString('zh-CN');
};

const formatDetails = (details) => {
  if (!details) return '无详细信息';
  try {
    const obj = typeof details === 'string' ? JSON.parse(details) : details;
    return JSON.stringify(obj, null, 2);
  } catch {
    return details;
  }
};

// 初始化
onMounted(() => {
  loadLogs();
});
</script>

<style scoped>
.operation-logs {
  padding: 20px;
}

.page-header {
  margin-bottom: 30px;
}

.page-header h1 {
  font-size: 28px;
  color: #00d4ff;
  margin-bottom: 10px;
}

.page-header p {
  color: #888;
  font-size: 14px;
}

.stats-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.stat-card {
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border: 1px solid #333;
  border-radius: 10px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 15px;
  transition: transform 0.2s;
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 20px rgba(0, 212, 255, 0.3);
}

.stat-card.device {
  border-color: #00d4ff;
}

.stat-card.worker {
  border-color: #6bcf7f;
}

.stat-card.today {
  border-color: #ffd93d;
}

.stat-icon {
  font-size: 36px;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 28px;
  font-weight: bold;
  color: #00d4ff;
}

.stat-label {
  font-size: 14px;
  color: #888;
  margin-top: 5px;
}

.toolbar {
  margin-bottom: 20px;
}

.search-bar {
  margin-bottom: 15px;
}

.filter-bar {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.log-detail {
  padding: 10px;
}

.log-details-section {
  margin-top: 20px;
  padding: 15px;
  background: #1a1a2e;
  border-radius: 8px;
}

.log-details-section h3 {
  color: #00d4ff;
  margin-bottom: 15px;
}

.details-json {
  background: #0f0f1e;
  padding: 15px;
  border-radius: 5px;
  overflow-x: auto;
  color: #6bcf7f;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  white-space: pre-wrap;
  word-break: break-word;
}

/* 表格行样式 */
:deep(.success-row) {
  background-color: rgba(107, 207, 127, 0.05) !important;
}

:deep(.danger-row) {
  background-color: rgba(255, 107, 107, 0.05) !important;
}
</style>

