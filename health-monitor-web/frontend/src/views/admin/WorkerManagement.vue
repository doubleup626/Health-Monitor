<template>
  <div class="worker-management">
    <div class="page-header">
      <h1>👷 员工管理</h1>
      <p>管理所有矿井工人信息，支持员工档案管理和设备绑定状态查看</p>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.total }}</div>
          <div class="stat-label">员工总数</div>
        </div>
      </div>
      <div class="stat-card active">
        <div class="stat-icon">✅</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.active }}</div>
          <div class="stat-label">在职员工</div>
        </div>
      </div>
      <div class="stat-card has-device">
        <div class="stat-icon">📱</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.withDevice }}</div>
          <div class="stat-label">已配设备</div>
        </div>
      </div>
      <div class="stat-card no-device">
        <div class="stat-icon">⚠️</div>
        <div class="stat-content">
          <div class="stat-value">{{ stats.noDevice }}</div>
          <div class="stat-label">未配设备</div>
        </div>
      </div>
    </div>

    <!-- 工具栏 -->
    <div class="toolbar">
      <div class="search-bar">
        <el-input
          v-model="searchQuery"
          placeholder="搜索员工姓名、工号、职位、班组..."
          prefix-icon="Search"
          clearable
          @input="handleSearch"
        />
      </div>
      <div class="filter-bar">
        <el-select v-model="filterStatus" placeholder="员工状态" clearable @change="loadWorkers">
          <el-option label="在职" value="active" />
          <el-option label="离职" value="resigned" />
          <el-option label="全部" value="all" />
        </el-select>
        <el-select v-model="filterPosition" placeholder="职位" clearable @change="loadWorkers">
          <el-option
            v-for="pos in positions"
            :key="pos"
            :label="pos"
            :value="pos"
          />
        </el-select>
        <el-button type="primary" @click="showAddDialog">
          <el-icon><Plus /></el-icon>
          添加员工
        </el-button>
        <el-button @click="loadWorkers">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 员工列表表格 -->
    <el-table
      v-loading="loading"
      :data="workers"
      stripe
      style="width: 100%"
      :header-cell-style="{ background: '#1a1a2e', color: '#fff' }"
    >
      <el-table-column prop="worker_id" label="工号" width="120" fixed />
      <el-table-column prop="name" label="姓名" width="120" />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="getStatusTagType(row.status)">
            {{ getStatusText(row.status) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="age" label="年龄" width="80" />
      <el-table-column prop="gender" label="性别" width="80" />
      <el-table-column prop="position" label="职位" width="120" />
      <el-table-column prop="team" label="班组" width="120" />
      <el-table-column label="绑定设备" width="150">
        <template #default="{ row }">
          <span v-if="row.device_id" class="device-tag">
            📱 {{ row.device_id }}
          </span>
          <el-tag v-else type="warning" size="small">未配设备</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="emergency_contact" label="紧急联系人" width="150" show-overflow-tooltip />
      <el-table-column label="入职日期" width="120">
        <template #default="{ row }">
          {{ formatDate(row.hire_date) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row }">
          <el-button size="small" @click="showDetailDialog(row)">
            详情
          </el-button>
          <el-button size="small" @click="showEditDialog(row)">
            编辑
          </el-button>
          <el-button
            v-if="row.status === 'active'"
            size="small"
            type="warning"
            @click="resignWorker(row)"
          >
            离职
          </el-button>
          <el-button
            size="small"
            type="danger"
            @click="deleteWorker(row)"
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
        @current-change="loadWorkers"
        @size-change="loadWorkers"
      />
    </div>

    <!-- 添加员工对话框 -->
    <el-dialog
      v-model="addDialogVisible"
      title="添加新员工"
      width="700px"
    >
      <el-form :model="addForm" label-width="120px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="工号" required>
              <el-input v-model="addForm.worker_id" placeholder="输入员工工号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="姓名" required>
              <el-input v-model="addForm.name" placeholder="输入员工姓名" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="年龄">
              <el-input-number v-model="addForm.age" :min="18" :max="65" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="性别">
              <el-select v-model="addForm.gender" placeholder="选择性别">
                <el-option label="男" value="男" />
                <el-option label="女" value="女" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="职位">
              <el-input v-model="addForm.position" placeholder="例如：采掘工" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="班组">
              <el-input v-model="addForm.team" placeholder="例如：A班" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="入职日期">
          <el-date-picker
            v-model="addForm.hire_date"
            type="date"
            placeholder="选择入职日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="紧急联系人">
          <el-input v-model="addForm.emergency_contact" placeholder="姓名-关系-电话" />
        </el-form-item>
        <el-form-item label="健康备注">
          <el-input v-model="addForm.health_notes" type="textarea" rows="2" />
        </el-form-item>
        <el-form-item label="照片URL">
          <el-input v-model="addForm.photo_url" placeholder="可选，输入照片链接" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="addWorker">确认添加</el-button>
      </template>
    </el-dialog>

    <!-- 编辑员工对话框 -->
    <el-dialog
      v-model="editDialogVisible"
      title="编辑员工信息"
      width="700px"
    >
      <el-form :model="editForm" label-width="120px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="工号">
              <el-input v-model="editForm.worker_id" disabled />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="姓名">
              <el-input v-model="editForm.name" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="年龄">
              <el-input-number v-model="editForm.age" :min="18" :max="65" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="性别">
              <el-select v-model="editForm.gender">
                <el-option label="男" value="男" />
                <el-option label="女" value="女" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="职位">
              <el-input v-model="editForm.position" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="班组">
              <el-input v-model="editForm.team" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="状态">
              <el-select v-model="editForm.status">
                <el-option label="在职" value="active" />
                <el-option label="休假" value="inactive" />
                <el-option label="离职" value="resigned" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="入职日期">
              <el-date-picker
                v-model="editForm.hire_date"
                type="date"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="紧急联系人">
          <el-input v-model="editForm.emergency_contact" />
        </el-form-item>
        <el-form-item label="健康备注">
          <el-input v-model="editForm.health_notes" type="textarea" rows="2" />
        </el-form-item>
        <el-form-item label="照片URL">
          <el-input v-model="editForm.photo_url" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="updateWorker">确认修改</el-button>
      </template>
    </el-dialog>

    <!-- 员工详情对话框 -->
    <el-dialog
      v-model="detailDialogVisible"
      title="员工详细信息"
      width="800px"
    >
      <div v-if="selectedWorker" class="worker-detail">
        <div class="worker-header">
          <img
            v-if="selectedWorker.photo_url"
            :src="selectedWorker.photo_url"
            class="worker-photo"
            alt="员工照片"
          />
          <div class="worker-basic">
            <h2>{{ selectedWorker.name }}</h2>
            <p>工号: {{ selectedWorker.worker_id }}</p>
            <el-tag :type="getStatusTagType(selectedWorker.status)">
              {{ getStatusText(selectedWorker.status) }}
            </el-tag>
          </div>
        </div>

        <el-descriptions :column="2" border style="margin-top: 20px">
          <el-descriptions-item label="年龄">
            {{ selectedWorker.age }}
          </el-descriptions-item>
          <el-descriptions-item label="性别">
            {{ selectedWorker.gender }}
          </el-descriptions-item>
          <el-descriptions-item label="职位">
            {{ selectedWorker.position || '未知' }}
          </el-descriptions-item>
          <el-descriptions-item label="班组">
            {{ selectedWorker.team || '未知' }}
          </el-descriptions-item>
          <el-descriptions-item label="绑定设备">
            {{ selectedWorker.device_id || '未绑定' }}
          </el-descriptions-item>
          <el-descriptions-item label="入职日期">
            {{ formatDate(selectedWorker.hire_date) }}
          </el-descriptions-item>
          <el-descriptions-item label="紧急联系人" :span="2">
            {{ selectedWorker.emergency_contact || '未填写' }}
          </el-descriptions-item>
          <el-descriptions-item label="健康备注" :span="2">
            {{ selectedWorker.health_notes || '无' }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatTime(selectedWorker.created_at) }}
          </el-descriptions-item>
          <el-descriptions-item label="更新时间">
            {{ formatTime(selectedWorker.updated_at) }}
          </el-descriptions-item>
        </el-descriptions>

        <div v-if="selectedWorker.stats" class="worker-stats">
          <h3>📊 数据统计</h3>
          <el-row :gutter="20">
            <el-col :span="8">
              <div class="stat-item">
                <div class="stat-label">总数据条数</div>
                <div class="stat-value">{{ selectedWorker.stats.total_records }}</div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="stat-item">
                <div class="stat-label">最近上传</div>
                <div class="stat-value-small">{{ formatTime(selectedWorker.stats.last_upload) }}</div>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="stat-item">
                <div class="stat-label">健康评分</div>
                <div class="stat-value">{{ selectedWorker.stats.health_score || 'N/A' }}</div>
              </div>
            </el-col>
          </el-row>
        </div>
      </div>
      <template #footer>
        <el-button type="primary" @click="detailDialogVisible = false">关闭</el-button>
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
const workers = ref([]);
const loading = ref(false);
const searchQuery = ref('');
const filterStatus = ref('active'); // 默认显示在职员工
const filterPosition = ref('');
const currentPage = ref(1);
const pageSize = ref(20);
const total = ref(0);

// 对话框
const addDialogVisible = ref(false);
const editDialogVisible = ref(false);
const detailDialogVisible = ref(false);

// 表单
const addForm = ref({
  worker_id: '',
  name: '',
  age: null,
  gender: '',
  position: '',
  team: '',
  hire_date: null,
  emergency_contact: '',
  health_notes: '',
  photo_url: ''
});

const editForm = ref({});
const selectedWorker = ref(null);

// 统计数据
const stats = computed(() => {
  const total = workers.value.length;
  const active = workers.value.filter(w => w.status === 'active').length;
  const withDevice = workers.value.filter(w => w.device_id).length;
  const noDevice = total - withDevice;
  return { total, active, withDevice, noDevice };
});

// 获取所有职位（用于筛选）
const positions = computed(() => {
  const pos = [...new Set(workers.value.map(w => w.position).filter(Boolean))];
  return pos;
});

// 加载员工列表
const loadWorkers = async () => {
  loading.value = true;
  try {
    const params = {
      page: currentPage.value,
      limit: pageSize.value,
      search: searchQuery.value,
      position: filterPosition.value
    };
    
    // 状态筛选逻辑
    if (filterStatus.value === 'all') {
      // 用户选择"全部"，传 include_all=true
      params.include_all = 'true';
    } else if (filterStatus.value) {
      // 用户选择了具体状态（active/resigned/inactive）
      params.status = filterStatus.value;
    }
    // 如果 filterStatus 为空，则使用默认逻辑（只显示在职员工）
    
    const response = await axios.get('http://localhost:3000/api/workers', { params });
    // 新API返回格式: { success: true, data: { workers: [...], total: 3 } }
    const result = response.data.data || response.data;
    workers.value = result.workers || response.data;
    total.value = result.total || workers.value.length;
  } catch (error) {
    ElMessage.error('加载员工列表失败: ' + error.message);
  } finally {
    loading.value = false;
  }
};

// 搜索
const handleSearch = () => {
  currentPage.value = 1;
  loadWorkers();
};

// 添加员工
const showAddDialog = () => {
  addForm.value = {
    worker_id: '',
    name: '',
    age: null,
    gender: '',
    position: '',
    team: '',
    hire_date: null,
    emergency_contact: '',
    health_notes: '',
    photo_url: ''
  };
  addDialogVisible.value = true;
};

const addWorker = async () => {
  if (!addForm.value.worker_id || !addForm.value.name) {
    ElMessage.warning('请输入工号和姓名');
    return;
  }
  
  try {
    const formData = { ...addForm.value };
    // 格式化日期
    if (formData.hire_date) {
      formData.hire_date = new Date(formData.hire_date).toISOString().split('T')[0];
    }
    
    await axios.post('http://localhost:3000/api/workers', formData);
    ElMessage.success('员工添加成功');
    addDialogVisible.value = false;
    loadWorkers();
  } catch (error) {
    ElMessage.error('添加失败: ' + (error.response?.data?.error || error.message));
  }
};

// 编辑员工
const showEditDialog = (worker) => {
  editForm.value = { ...worker };
  // 转换日期格式
  if (editForm.value.hire_date) {
    editForm.value.hire_date = new Date(editForm.value.hire_date);
  }
  editDialogVisible.value = true;
  detailDialogVisible.value = false;
};

const updateWorker = async () => {
  try {
    const formData = { ...editForm.value };
    // 格式化日期
    if (formData.hire_date) {
      formData.hire_date = new Date(formData.hire_date).toISOString().split('T')[0];
    }
    
    await axios.put(
      `http://localhost:3000/api/workers/${editForm.value.worker_id}`,
      formData
    );
    ElMessage.success('员工信息更新成功');
    editDialogVisible.value = false;
    loadWorkers();
  } catch (error) {
    ElMessage.error('更新失败: ' + (error.response?.data?.error || error.message));
  }
};

// 删除员工
// 员工离职（软删除）
const resignWorker = async (worker) => {
  try {
    await ElMessageBox.confirm(
      `确定将员工 ${worker.name} (${worker.worker_id}) 标记为"离职"吗？
      
离职后：
• 不再显示在默认列表中（可通过状态筛选查看）
• 自动解绑设备
• 保留历史健康数据用于统计分析`,
      '确认离职',
      {
        confirmButtonText: '确定离职',
        cancelButtonText: '取消',
        type: 'warning',
        dangerouslyUseHTMLString: false
      }
    );
    
    await axios.put(
      `http://localhost:3000/api/workers/${worker.worker_id}`,
      { status: 'resigned' }
    );
    
    ElMessage.success('员工已标记为离职');
    loadWorkers();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作失败: ' + (error.response?.data?.error || error.message));
    }
  }
};

// 删除员工（真删除）
const deleteWorker = async (worker) => {
  try {
    await ElMessageBox.confirm(
      `⚠️ 确定要永久删除员工 ${worker.name} (${worker.worker_id}) 吗？

此操作无法恢复！

建议：
• 如果员工正常离职，请使用"离职"功能
• 删除仅用于录入错误或测试数据`,
      '确认删除',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'error',
        dangerouslyUseHTMLString: false
      }
    );
    
    await axios.delete(`http://localhost:3000/api/workers/${worker.worker_id}`);
    ElMessage.success('员工已删除');
    loadWorkers();
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败: ' + (error.response?.data?.error || error.message));
    }
  }
};

// 查看详情
const showDetailDialog = async (worker) => {
  try {
    console.log('🔍 请求员工详情:', worker.worker_id);
    const response = await axios.get(
      `http://localhost:3000/api/workers/${worker.worker_id}/detail`
    );
    console.log('📥 收到响应:', response.data);
    
    // 正确解析API返回格式
    selectedWorker.value = response.data.data || response.data;
    console.log('📊 设置详情数据:', selectedWorker.value);
    
    detailDialogVisible.value = true;
  } catch (error) {
    console.error('❌ 获取详情失败:', error);
    ElMessage.error('获取详情失败: ' + error.message);
  }
};

// 工具函数
const getStatusTagType = (status) => {
  const map = {
    active: 'success',
    inactive: 'warning',
    resigned: 'info'
  };
  return map[status] || 'info';
};

const getStatusText = (status) => {
  const map = {
    active: '在职',
    inactive: '休假',
    resigned: '离职'
  };
  return map[status] || '未知';
};

const formatDate = (date) => {
  if (!date) return '未知';
  return new Date(date).toLocaleDateString('zh-CN');
};

const formatTime = (time) => {
  if (!time) return '未知';
  return new Date(time).toLocaleString('zh-CN');
};

// 初始化
onMounted(() => {
  loadWorkers();
});
</script>

<style scoped>
.worker-management {
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

.stat-card.has-device {
  border-color: #6bcf7f;
}

.stat-card.no-device {
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

.device-tag {
  color: #00d4ff;
  font-weight: bold;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.worker-detail {
  padding: 10px;
}

.worker-header {
  display: flex;
  gap: 20px;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  border-radius: 10px;
}

.worker-photo {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #00d4ff;
}

.worker-basic h2 {
  color: #00d4ff;
  margin-bottom: 10px;
}

.worker-basic p {
  color: #888;
  margin-bottom: 10px;
}

.worker-stats {
  margin-top: 20px;
  padding: 20px;
  background: #1a1a2e;
  border-radius: 8px;
}

.worker-stats h3 {
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

.stat-item .stat-value-small {
  font-size: 12px;
  color: #00d4ff;
}
</style>

