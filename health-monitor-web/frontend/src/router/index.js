import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Dashboard',
      component: () => import('../views/Dashboard.vue'),
      meta: { title: '主监控面板' }
    },
    {
      path: '/worker/:workerId',
      name: 'WorkerDetail',
      component: () => import('../views/WorkerDetail.vue'),
      meta: { title: '工人详情' }
    },
    {
      path: '/alerts',
      name: 'AlertCenter',
      component: () => import('../views/AlertCenter.vue'),
      meta: { title: '报警中心' }
    },
    // 管理中心路由
    {
      path: '/admin/devices',
      name: 'DeviceManagement',
      component: () => import('../views/admin/DeviceManagement.vue'),
      meta: { 
        title: '设备管理',
        requiresAuth: true,
        isAdmin: true
      }
    },
    {
      path: '/admin/workers',
      name: 'WorkerManagement',
      component: () => import('../views/admin/WorkerManagement.vue'),
      meta: { 
        title: '员工管理',
        requiresAuth: true,
        isAdmin: true
      }
    },
    {
      path: '/admin/logs',
      name: 'OperationLogs',
      component: () => import('../views/admin/OperationLogs.vue'),
      meta: { 
        title: '操作日志',
        requiresAuth: true,
        isAdmin: true
      }
    }
  ]
})

// 简化版权限控制
router.beforeEach((to, from, next) => {
  document.title = `${to.meta.title || '深地矿井'} - 健康监测系统`
  
  // 检查是否需要管理员权限
  if (to.meta.isAdmin) {
    // 简化版：直接允许访问（生产环境应实现真实的身份验证）
    // TODO: 在生产环境中，这里应该检查用户的登录状态和管理员权限
    // 示例：
    // const isAdmin = localStorage.getItem('isAdmin') === 'true'
    // if (!isAdmin) {
    //   ElMessage.warning('您没有访问权限')
    //   next('/')
    //   return
    // }
    console.log('🔐 访问管理中心页面:', to.path)
  }
  
  next()
})

export default router


