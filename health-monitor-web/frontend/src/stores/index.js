import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useHealthStore = defineStore('health', () => {
  // State
  const workers = ref([])
  const realtimeData = ref([])
  const alerts = ref([])
  const deviceStats = ref({ online: 0, offline: 0, total: 0 })
  const wsConnected = ref(false)
  
  // WebSocket instance
  let ws = null
  
  // Computed
  const activeAlerts = computed(() => 
    alerts.value.filter(alert => !alert.is_handled)
  )
  
  const dangerAlerts = computed(() => 
    activeAlerts.value.filter(alert => alert.alert_level === 3)
  )
  
  const onlineWorkers = computed(() => 
    realtimeData.value.filter(worker => worker.is_active)
  )
  
  // Actions
  async function fetchWorkers() {
    try {
      const response = await fetch('/api/workers')
      workers.value = await response.json()
    } catch (error) {
      console.error('获取工人列表失败:', error)
    }
  }
  
  async function fetchRealtimeData() {
    try {
      const response = await fetch('/api/realtime/all')
      realtimeData.value = await response.json()
    } catch (error) {
      console.error('获取实时数据失败:', error)
    }
  }
  
  async function fetchAlerts(params = {}) {
    try {
      const query = new URLSearchParams(params).toString()
      const response = await fetch(`/api/alerts/pending?${query}`)
      alerts.value = await response.json()
    } catch (error) {
      console.error('获取报警列表失败:', error)
    }
  }
  
  async function fetchDeviceStats() {
    try {
      const response = await fetch('/api/devices/stats')
      deviceStats.value = await response.json()
    } catch (error) {
      console.error('获取设备统计失败:', error)
    }
  }
  
  async function performAIAnalysis(workerId) {
    try {
      const response = await fetch(`/api/ai/analyze/${workerId}`, {
        method: 'POST'
      })
      return await response.json()
    } catch (error) {
      console.error('AI分析失败:', error)
      throw error
    }
  }
  
  async function handleAlert(alertId, handledBy, note) {
    try {
      const response = await fetch(`/api/alerts/${alertId}/handle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handled_by: handledBy, handling_note: note })
      })
      await response.json()
      await fetchAlerts()
    } catch (error) {
      console.error('处理报警失败:', error)
      throw error
    }
  }
  
  function connectWebSocket() {
    if (ws) return
    
    ws = new WebSocket('ws://localhost:3000')
    
    ws.onopen = () => {
      wsConnected.value = true
      console.log('✅ WebSocket 连接成功')
    }
    
    ws.onmessage = (event) => {
      const message = JSON.parse(event.data)
      console.log('📨 收到实时更新:', message)
      
      if (message.type === 'realtime_update') {
        fetchRealtimeData()
        fetchDeviceStats()
      } else if (message.type === 'alert') {
        fetchAlerts()
        // 触发通知
        if (Notification.permission === 'granted') {
          new Notification('安全报警', {
            body: `${message.alert.message}`,
            icon: '/favicon.ico'
          })
        }
      }
    }
    
    ws.onerror = (error) => {
      console.error('❌ WebSocket 错误:', error)
      wsConnected.value = false
    }
    
    ws.onclose = () => {
      wsConnected.value = false
      console.log('WebSocket 连接关闭，5秒后重连...')
      setTimeout(() => {
        ws = null
        connectWebSocket()
      }, 5000)
    }
  }
  
  function disconnectWebSocket() {
    if (ws) {
      ws.close()
      ws = null
    }
  }
  
  return {
    // State
    workers,
    realtimeData,
    alerts,
    deviceStats,
    wsConnected,
    
    // Computed
    activeAlerts,
    dangerAlerts,
    onlineWorkers,
    
    // Actions
    fetchWorkers,
    fetchRealtimeData,
    fetchAlerts,
    fetchDeviceStats,
    performAIAnalysis,
    handleAlert,
    connectWebSocket,
    disconnectWebSocket
  }
})


