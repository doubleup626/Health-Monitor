<template>
  <div id="app">
    <el-container>
      <!-- 顶部导航栏 -->
      <el-header class="main-header">
        <div class="header-content">
          <div class="logo">
            <span class="logo-text glow">深地矿井健康监测系统</span>
          </div>
          
          <div class="header-info">
            <el-badge :value="activeAlertCount" :hidden="activeAlertCount === 0" class="alert-badge">
              <el-button 
                type="danger" 
                :icon="Bell" 
                circle
                @click="$router.push('/alerts')"
              />
            </el-badge>
            
            <div class="ws-status">
              <el-tag 
                :type="healthStore.wsConnected ? 'success' : 'danger'" 
                effect="dark"
                size="small"
              >
                {{ healthStore.wsConnected ? '🟢 实时连接' : '🔴 连接断开' }}
              </el-tag>
            </div>
            
            <div class="current-time">{{ currentTime }}</div>
          </div>
        </div>
      </el-header>

      <!-- 侧边栏导航 -->
      <el-container>
        <el-aside width="220px" class="main-aside">
          <el-menu
            :default-active="activeMenu"
            class="tech-menu"
            router
          >
            <el-menu-item index="/">
              <el-icon><Monitor /></el-icon>
              <span>主监控面板</span>
            </el-menu-item>
            
            <el-menu-item index="/alerts">
              <el-icon><Bell /></el-icon>
              <span>报警中心</span>
              <el-badge 
                v-if="activeAlertCount > 0" 
                :value="activeAlertCount" 
                class="menu-badge"
              />
            </el-menu-item>
            
            <el-divider style="margin: 10px 0; border-color: #333;" />
            
            <el-sub-menu index="admin">
              <template #title>
                <el-icon><Setting /></el-icon>
                <span>管理中心</span>
              </template>
              <el-menu-item index="/admin/devices">
                <el-icon><Cpu /></el-icon>
                <span>设备管理</span>
              </el-menu-item>
              <el-menu-item index="/admin/workers">
                <el-icon><User /></el-icon>
                <span>员工管理</span>
              </el-menu-item>
              <el-menu-item index="/admin/logs">
                <el-icon><Document /></el-icon>
                <span>操作日志</span>
              </el-menu-item>
            </el-sub-menu>
          </el-menu>
        </el-aside>

        <!-- 主内容区 -->
        <el-main class="main-content">
          <router-view />
        </el-main>
      </el-container>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { Bell, Monitor, Setting, Cpu, User, Document } from '@element-plus/icons-vue'
import { useHealthStore } from './stores'

const route = useRoute()
const healthStore = useHealthStore()

const currentTime = ref('')
const activeMenu = computed(() => route.path)
const activeAlertCount = computed(() => healthStore.activeAlerts.length)

let timeInterval = null

function updateTime() {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  const seconds = String(now.getSeconds()).padStart(2, '0')
  currentTime.value = `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`
}

onMounted(() => {
  updateTime()
  timeInterval = setInterval(updateTime, 1000)
  
  // 连接 WebSocket
  healthStore.connectWebSocket()
  
  // 请求通知权限
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
})

onUnmounted(() => {
  if (timeInterval) {
    clearInterval(timeInterval)
  }
  healthStore.disconnectWebSocket()
})
</script>

<style scoped>
/* 顶部导航栏 - 深色科技风 */
.main-header {
  background: var(--bg-secondary);
  border-bottom: 2px solid var(--border-glow);
  box-shadow: 0 2px 20px rgba(0, 212, 255, 0.3);
  display: flex;
  align-items: center;
  padding: 0 30px;
  height: 70px !important;
  position: relative;
}

.main-header::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--primary-color), transparent);
  animation: scanline 3s linear infinite;
}

@keyframes scanline {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

.header-content {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
}

.logo-text {
  font-size: 24px;
  font-weight: 600;
  color: var(--primary-color);
  text-shadow: 0 0 20px rgba(0, 212, 255, 0.8);
  letter-spacing: 3px;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 25px;
}

.alert-badge {
  margin-right: 10px;
}

.current-time {
  font-size: 16px;
  color: var(--text-secondary);
  font-family: 'Courier New', monospace;
  padding: 8px 16px;
  background: rgba(0, 212, 255, 0.05);
  border: 1px solid var(--border-normal);
  border-radius: 4px;
  box-shadow: inset 0 0 10px rgba(0, 212, 255, 0.1);
}

/* 侧边栏 - 深色科技风 */
.main-aside {
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-glow);
  box-shadow: 2px 0 20px rgba(0, 212, 255, 0.2);
  padding-top: 20px;
  position: relative;
}

.main-aside::before {
  content: '';
  position: absolute;
  top: 0;
  right: 0;
  width: 1px;
  height: 100%;
  background: linear-gradient(180deg, transparent, var(--primary-color), transparent);
}

.tech-menu {
  background: transparent;
  border: none;
}

.tech-menu :deep(.el-menu-item),
.tech-menu :deep(.el-sub-menu__title) {
  color: var(--text-primary);
  transition: all 0.3s ease;
  border-left: 3px solid transparent;
  padding-left: 17px !important;
}

.tech-menu :deep(.el-menu-item):hover,
.tech-menu :deep(.el-sub-menu__title):hover {
  background: rgba(0, 212, 255, 0.1) !important;
  color: var(--primary-color) !important;
  border-left-color: var(--border-normal);
  box-shadow: inset 0 0 20px rgba(0, 212, 255, 0.1);
}

.tech-menu :deep(.el-menu-item.is-active) {
  background: rgba(0, 212, 255, 0.15) !important;
  color: var(--primary-color) !important;
  border-left-color: var(--primary-color);
  box-shadow: 
    inset 0 0 20px rgba(0, 212, 255, 0.2),
    inset 3px 0 10px rgba(0, 212, 255, 0.5);
  text-shadow: 0 0 10px rgba(0, 212, 255, 0.8);
}

.tech-menu :deep(.el-sub-menu.is-active > .el-sub-menu__title) {
  color: var(--primary-color) !important;
}

.tech-menu :deep(.el-sub-menu__icon-arrow) {
  color: var(--text-secondary);
}

.tech-menu :deep(.el-menu) {
  background: transparent;
}

.tech-menu :deep(.el-menu-item) {
  background: transparent;
}

.menu-badge {
  position: absolute;
  right: 20px;
}

/* 主内容区 */
.main-content {
  background: transparent;
  padding: 25px;
  min-height: calc(100vh - 70px);
}

.ws-status {
  display: flex;
  align-items: center;
}

.ws-status :deep(.el-tag) {
  font-weight: 600;
  box-shadow: 0 0 15px rgba(0, 212, 255, 0.3);
}

/* 滚动条美化 */
.main-aside ::-webkit-scrollbar {
  width: 6px;
}

.main-aside ::-webkit-scrollbar-track {
  background: var(--bg-secondary);
}

.main-aside ::-webkit-scrollbar-thumb {
  background: var(--primary-color);
  border-radius: 3px;
}
</style>


