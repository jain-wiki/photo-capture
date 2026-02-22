import { createRouter, createWebHistory } from 'vue-router'
import StartView from '../views/StartView.vue'
import HomeView from '../views/HomeView.vue'
import PreviewView from '../views/PreviewView.vue'
import { useCaptureStore } from '../stores/captureStore'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'start',
      component: StartView,
    },
    {
      path: '/home',
      name: 'home',
      component: HomeView,
      beforeEnter: async (_to, _from, next) => {
        // Check if camera & location permissions are granted before allowing access
        try {
          const camResult = await navigator.permissions.query({ name: 'camera' as PermissionName })
          const locResult = await navigator.permissions.query({ name: 'geolocation' })
          if (camResult.state === 'granted' && locResult.state === 'granted') {
            next()
          } else {
            next({ name: 'start' })
          }
        } catch {
          // Permissions API not available (e.g. Safari) — allow through, component will handle
          next()
        }
      },
    },
    {
      path: '/preview',
      name: 'preview',
      component: PreviewView,
      beforeEnter: (_to, _from, next) => {
        // Only allow access if there is a captured image in the store
        const { hasCapture } = useCaptureStore()
        if (hasCapture()) {
          next()
        } else {
          next({ name: 'home' })
        }
      },
    },
  ],
})

export default router
