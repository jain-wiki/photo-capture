import { ref, onMounted } from 'vue'

export type PermissionState = 'prompt' | 'granted' | 'denied' | 'unknown'

export function usePermissions() {
  const cameraPermission = ref<PermissionState>('unknown')
  const locationPermission = ref<PermissionState>('unknown')
  const bothGranted = ref(false)

  async function checkCameraPermission(): Promise<PermissionState> {
    try {
      // Safari doesn't support permissions.query for camera
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName })
      cameraPermission.value = result.state as PermissionState
      result.onchange = () => {
        cameraPermission.value = result.state as PermissionState
        updateBothGranted()
      }
      return result.state as PermissionState
    } catch {
      // Fallback: if permissions API not supported, we'll try getUserMedia later
      cameraPermission.value = 'unknown'
      return 'unknown'
    }
  }

  async function checkLocationPermission(): Promise<PermissionState> {
    try {
      const result = await navigator.permissions.query({ name: 'geolocation' })
      locationPermission.value = result.state as PermissionState
      result.onchange = () => {
        locationPermission.value = result.state as PermissionState
        updateBothGranted()
      }
      return result.state as PermissionState
    } catch {
      locationPermission.value = 'unknown'
      return 'unknown'
    }
  }

  async function requestCameraPermission(): Promise<PermissionState> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      })
      // Stop the stream immediately — we just needed the permission
      stream.getTracks().forEach((t) => t.stop())
      cameraPermission.value = 'granted'
      updateBothGranted()
      return 'granted'
    } catch (err: unknown) {
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          cameraPermission.value = 'denied'
          return 'denied'
        }
      }
      cameraPermission.value = 'denied'
      return 'denied'
    }
  }

  async function requestLocationPermission(): Promise<PermissionState> {
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => {
          locationPermission.value = 'granted'
          updateBothGranted()
          resolve('granted')
        },
        (error) => {
          if (error.code === error.PERMISSION_DENIED) {
            locationPermission.value = 'denied'
            resolve('denied')
          } else {
            // Position unavailable or timeout — permission itself may be granted
            locationPermission.value = 'granted'
            updateBothGranted()
            resolve('granted')
          }
        },
        { enableHighAccuracy: true, timeout: 10000 }
      )
    })
  }

  function updateBothGranted() {
    bothGranted.value =
      cameraPermission.value === 'granted' && locationPermission.value === 'granted'
  }

  async function checkAllPermissions() {
    await Promise.all([checkCameraPermission(), checkLocationPermission()])
    updateBothGranted()
  }

  onMounted(() => {
    checkAllPermissions()
  })

  return {
    cameraPermission,
    locationPermission,
    bothGranted,
    checkAllPermissions,
    requestCameraPermission,
    requestLocationPermission,
  }
}
