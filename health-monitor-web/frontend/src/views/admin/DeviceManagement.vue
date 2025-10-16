<template>
  <div class="device-management">
    <div class="page-header">
      <h1>🔧 设备管理</h1>
      <p>管理所有矿井监测设备，支持设备添加、绑定、配置和维护</p>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-icon">📱</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">设备总数</div>
        </div>
      </div>
      <div class="stat-card active">
        <div class="stat-icon">✅</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.active }}</div>
          <div class="stat-label">在线设备</div>
        </div>
      </div>
      <div class="stat-card inactive">
        <div class="stat-icon">⚠️</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.inactive }}</div>
          <div class="stat-label">离线设备</div>
        </div>
      </div>
      <div class="stat-card unbound">
        <div class="stat-icon">🔓</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.unbound }}</div>
          <div class="stat-label">未绑定</div>
        </div>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="search-bar">
        <el-input
          v-model="searchQuery"
          placeholder="搜索设备ID、型号、绑定员工..."
          prefix-icon="Search"
          clearable
          @input="handleSearch"
        />
      </div>
      <div class="filter-bar">
        <el-select v-model="filterStatus" placeholder="设备状态" clearable @change="loadDevices">
          <el-option label="全部" value="" />
          <el-option label="在线" value="active" />
          <el-option label="离线" value="inactive" />
          <el-option label="维护中" value="maintenance" />
        </el-select>
        <el-select v-model="filterBound" placeholder="绑定状态" clearable @change="loadDevices">
          <el-option label="全部" value="" />
          <el-option label="已绑定" value="bound" />
          <el-option label="未绑定" value="unbound" />
        </el-select>
        <el-button type="primary" @click="showAddDialog">
          <el-icon><Plus /></el-icon>
          添加设备
        </el-button>
        <el-button @click="loadDevices">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 设备列表表格 -->
    <el-table
      v-loading="loading"
      :data="devices"
      stripe
      style="width: 100%"
      :header-cell-style="{ background: '#1a1a2e', color: '#fff' }"
    >
      <el-table-column prop="device_id" label="设备ID" width="150" fixed />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="getStatusType(row.is_active)">
            {{ row.is_active ? '在线' : '离线' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="device_model" label="设备型号" width="150" />
      <el-table-column label="绑定员工" width="150">
        <template #default="{ row }">
          <span v-if="row.worker_id" class="worker-tag">
            👷 {{ row.worker_id }}
          </span>
          <el-tag v-else type="info" size="small">未绑定</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="firmware_version" label="固件版本" width="120" />
      <el-table-column label="最后在线" width="180">
        <template #default="{ row }">
          {{ formatTime(row.last_seen) }}
        </template>
      </el-table-column>
      <el-table-column prop="notes" label="备注" min-width="150" show-overflow-tooltip />
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="showDetailDialog(row)">
            详情
          </el-button>
          <el-button
            size="small"
            type="primary"
            @click="showBindDialog(row)"
            :disabled="!!row.worker_id"
          >
            {{ row.worker_id ? '已绑定' : '绑定' }}
          </el-button>
          <el-button
            size="small"
            type="warning"
            @click="unbindDevice(row)"
            :disabled="!row.worker_id"
          >
            解绑
          </el-button>
          <el-button size="small" @click="showEditDialog(row)">
            编辑
          </el-button>
          <el-button
            size="small"
            type="danger"
            @click="deleteDevice(row)"
          >
            删除
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
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        @current-change="loadDevices"
        @size-change="loadDevices"
      />
    </div>

    <!-- 添加设备对话框 -->
    <el-dialog
      v-model="addDialogVisible"
      title="添加新设备"
      width="600px"
    >
      <el-form :model="addForm" label-width="120px">
        <el-form-item label="设备ID" required>
          <el-input v-model="addForm.device_id" placeholder="输入设备唯一ID" />
        </el-form-item>
        <el-form-item label="设备型号">
          <el-input v-model="addForm.device_model" placeholder="例如：GT-R Series" />
        </el-form-item>
        <el-form-item label="固件版本">
          <el-input v-model="addForm.firmware_version" placeholder="例如：3.0.1" />
        </el-form-item>
        <el-form-item label="绑定员工">
          <el-select v-model="addForm.worker_id" placeholder="选择员工（可选）" clearable filterable>
            <el-option
              v-for="worker in workers"
              :key="worker.worker_id"
              :label="`${worker.name} (${worker.worker_id})`"
              :value="worker.worker_id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="addForm.notes" type="textarea" rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="addDevice">确认添加</el-button>
      </template>
    </el-dialog>

    <!-- 编辑设备对话框 -->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑设备信息"
      width="600px"
    >
      <el-form :model="editForm" label-width="120px">
        <el-form-item label="设备ID">
          <el-input v-model="editForm.device_id" disabled />
        </el-form-item>
        <el-form-item label="设备型号">
          <el-input v-model="editForm.device_model" />
        </el-form-item>
        <el-form-item label="固件版本">
          <el-input v-model="editForm.firmware_version" />
        </el-form-item>
        <el-form-item label="设备状态">
          <el-select v-model="editForm.status">
            <el-option label="正常" value="active" />
            <el-option label="离线" value="inactive" />
            <el-option label="维护中" value="maintenance" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="editForm.notes" type="textarea" rows="3" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="updateDevice">确认修改</el-button>
      </template>
    </el-dialog>

    <!-- 绑定设备对话框 -->
    <el-dialog
      v-model="bindDialogVisible"
      title="绑定设备到员工"
      width="500px"
    >
      <el-form label-width="120px">
        <el-form-item label="设备ID">
          <el-input v-model="bindForm.device_id" disabled />
        </el-form-item>
        <el-form-item label="选择员工" required>
          <el-select v-model="bindForm.worker_id" placeholder="请选择员工" filterable>
            <el-option
              v-for="worker in workers"
              :key="worker.worker_id"
              :label="`${worker.name} (${worker.worker_id}) - ${worker.position || '未知职位'}`"
              :value="worker.worker_id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="bindDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="bindDevice">确认绑定</el-button>
      </template>
    </el-dialog>

    <!-- 设备详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="设备详细信息"
      width="700px"
    >
      <div v-if="selectedDevice" class="device-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="设备ID">
            {{ selectedDevice.device_id }}
          </el-descriptions-item>
          <el-descriptions-item label="设备状态">
            <el-tag :type="getStatusType(selectedDevice.is_active)">
              {{ selectedDevice.is_active ? '在线' : '离线' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="设备型号">
            {{ selectedDevice.device_model || '未知' }}
          </el-descriptions-item>
          <el-descriptions-item label="固件版本">
            {{ selectedDevice.firmware_version || '未知' }}
          </el-descriptions-item>
          <el-descriptions-item label="绑定员工">
            {{ selectedDevice.worker_id || '未绑定' }}
          </el-descriptions-item>
          <el-descriptions-item label="绑定时间">
            {{ formatTime(selectedDevice.bound_at) }}
          </el-descriptions-item>
          <el-descriptions-item label="最后在线">
            {{ formatTime(selectedDevice.last_seen) }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatTime(selectedDevice.created_at) }}
          </el-descriptions-item>
          <el-descriptions-item label="备注" :span="2">
            {{ selectedDevice.notes || '无' }}
          </el-descriptions-item>
        </el-descriptions>
        
        <div v-if="selectedDevice.stats" class="device-stats">
          <h3>📊 数据统计</h3>
          <el-row :gutter="20">
            <el-col :span="8">
              <div class="stat-item">
                <div class="stat-label">总数据条数</div>
                <div class="stat-value">{{ selectedDevice.stats.total_records }}</div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="stat-item">
                <div class="stat-label">最近上传</div>
                <div class="stat-value">{{ formatTime(selectedDevice.stats.last_upload) }}</div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="stat-item">
                <div class="stat-label">健康指数</div>
                <div class="stat-value">{{ selectedDevice.stats.health_score || 'N/A' }}</div>
              </div>
            </el-col>
          </el-row>
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
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Refresh, Search } from '@element-plus/icons-vue';
import axios from 'axios';

// 数据
const devices = ref([]);
const workers = ref([]);
const loading = ref(false);
const searchQuery = ref('');
const filterStatus = ref('');
const filterBound = ref('');
const currentPage = ref(1);
const pageSize = ref(20);
const total = ref(0);

// 对话框
const addDialogVisible = ref(false);
const editDialogVisible = ref(false);
const bindDialogVisible = ref(false);
const detailDialogVisible = ref(false);

// 表单
const addForm = ref({
  device_id: '',
  device_model: '',
  firmware_version: '',
  worker_id: '',
  notes: ''
});

const editForm = ref({});
const bindForm = ref({
  device_id: '',
  worker_id: ''
});
const selectedDevice = ref(null);

// 统计数据
const stats = computed(() => {
  const total = devices.value.length;
  const active = devices.value.filter(d => d.is_active).length;
  const inactive = total - active;
  const unbound = devices.value.filter(d => !d.worker_id).length;
  return { total, active, inactive, unbound };
});

// 加载设备列表
const loadDevices = async () => {
  loading.value = true;
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      search: searchQuery.value,
      status: filterStatus.value,
      bound: filterBound.value
    };
    
    const response = await axios.get('http://localhost:3000/api/devices', { params });
    // 新API返回格式: { success: true, data: { devices: [...], total: 3 } }
    const result = response.data.data || response.data;
    devices.value = result.devices || response.data;
    total.value = result.total || devices.value.length;
  } catch (error) {
    ElMessage.error('加载设备列表失败: ' + error.message);
  } finally {
    loading.value = false;
  }
};

// 加载员工列表
const loadWorkers = async () => {
  try {
    // 只加载在职且未绑定设备的员工
    const response = await axios.get('http://localhost:3000/api/workers', {
      params: {
        status: 'active',  // 只显示在职员工
        page: 1,
        limit: 1000  // 获取所有在职员工
      }
    });
    // 正确解析API返回格式
    const result = response.data.data || response.data;
    const allWorkers = result.workers || response.data || [];
    
    // 筛选出未绑定设备的员工
    workers.value = allWorkers.filter(w => !w.device_id);
    
    console.log('📋 加载可绑定员工列表:', workers.value.length, '个未绑定员工');
  } catch (error) {
    console.error('加载员工列表失败:', error);
    ElMessage.error('加载员工列表失败: ' + error.message);
  }
};

// 搜索
const handleSearch = () => {
  currentPage.value = 1;
  loadDevices();
};

// 添加设备
const showAddDialog = () => {
  addForm.value = {
    device_id: '',
    device_model: '',
    firmware_version: '',
    worker_id: '',
    notes: ''
  };
  addDialogVisible.value = true;
};

const addDevice = async () => {
  if (!addForm.value.device_id) {
    ElMessage.warning('请输入设备ID');
    return;
  }
  
  try {
    await axios.post('http://localhost:3000/api/devices', addForm.value);
    ElMessage.success('设备添加成功');
    addDialogVisible.value = false;
    loadDevices();
  } catch (error) {
    ElMessage.error('添加失败: ' + (error.response?.data?.error || error.message));
  }
};

// 编辑设备
const showEditDialog = (device) => {
  editForm.value = { ...device };
  editDialogVisible.value = true;
};

const updateDevice = async () => {
  try {
    await axios.put(
      `http://localhost:3000/api/devices/${editForm.value.device_id}`,
      editForm.value
    );
    ElMessage.success('设备更新成功');
    editDialogVisible.value = false;
    loadDevices();
  } catch (error) {
    ElMessage.error('更新失败: ' + (error.response?.data?.error || error.message));
  }
};

// 删除设备
const deleteDevice = async (device) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除设备 ${device.device_id} 吗？此操作不可恢复。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    await axios.delete(`http://localhost:3000/api/devices/${device.device_id}`);
    ElMessage.success('设备已删除');
    loadDevices();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败: ' + (error.response?.data?.error || error.message));
    }
  }
};

// 绑定设备
const showBindDialog = async (device) => {
  bindForm.value = {
    device_id: device.device_id,
    worker_id: ''
  };
  // 打开对话框前先加载最新的员工列表
  await loadWorkers();
  bindDialogVisible.value = true;
};

const bindDevice = async () => {
  if (!bindForm.value.worker_id) {
    ElMessage.warning('请选择员工');
    return;
  }
  
  try {
    await axios.post(
      `http://localhost:3000/api/devices/${bindForm.value.device_id}/bind`,
      { worker_id: bindForm.value.worker_id }
    );
    ElMessage.success('绑定成功');
    bindDialogVisible.value = false;
    loadDevices();
  } catch (error) {
    ElMessage.error('绑定失败: ' + (error.response?.data?.error || error.message));
  }
};

// 解绑设备
const unbindDevice = async (device) => {
  try {
    await ElMessageBox.confirm(
      `确定要解绑设备 ${device.device_id} 与员工 ${device.worker_id} 的绑定吗？`,
      '确认解绑',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    );
    
    await axios.post(`http://localhost:3000/api/devices/${device.device_id}/unbind`);
    ElMessage.success('解绑成功');
    loadDevices();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('解绑失败: ' + (error.response?.data?.error || error.message));
    }
  }
};

// 查看详情
const showDetailDialog = async (device) => {
  try {
    console.log('🔍 请求设备详情:', device.device_id);
    const response = await axios.get(
      `http://localhost:3000/api/devices/${device.device_id}/detail`
    );
    console.log('📥 收到响应:', response.data);
    
    // 正确解析API返回格式
    selectedDevice.value = response.data.data || response.data;
    console.log('📱 设置详情数据:', selectedDevice.value);
    
    detailDialogVisible.value = true;
  } catch (error) {
    console.error('❌ 获取设备详情失败:', error);
    ElMessage.error('获取详情失败: ' + error.message);
  }
};

// 工具函数
const getStatusType = (isActive) => {
  return isActive ? 'success' : 'danger';
};

const formatTime = (time) => {
  if (!time) return '未知';
  return new Date(time).toLocaleString('zh-CN');
};

// 初始化
onMounted(() => {
  loadDevices();
  loadWorkers();
});
</script>

<style scoped>
.device-management {
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

.stat-card.active {
  border-color: #00d4ff;
}

.stat-card.inactive {
  border-color: #ff6b6b;
}

.stat-card.unbound {
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

.worker-tag {
  color: #00d4ff;
  font-weight: bold;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.device-detail {
  padding: 10px;
}

.device-stats {
  margin-top: 20px;
  padding: 20px;
  background: #1a1a2e;
  border-radius: 8px;
}

.device-stats h3 {
  color: #00d4ff;
  margin-bottom: 15px;
}

.stat-item {
  text-align: center;
  padding: 15px;
  background: #0f0f1e;
  border-radius: 8px;
}

.stat-item .stat-label {
  font-size: 12px;
  color: #888;
  margin-bottom: 8px;
}

.stat-item .stat-value {
  font-size: 18px;
  color: #00d4ff;
  font-weight: bold;
}
</style>

