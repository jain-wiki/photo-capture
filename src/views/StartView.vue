<script setup lang="ts">
import { watch, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { usePermissions } from '../composables/usePermissions'

const router = useRouter()
const {
  cameraPermission,
  locationPermission,
  bothGranted,
  requestCameraPermission,
  requestLocationPermission,
  checkAllPermissions,
} = usePermissions()

const requesting = ref(false)
const supportsGeolocationElement = ref(false)
const locationGrantedViaElement = ref(false)

onMounted(async () => {
  // Check if the browser supports the <geolocation> HTML element
  supportsGeolocationElement.value = 'HTMLGeolocationElement' in window
  await checkAllPermissions()
})

// Auto-redirect once both permissions are granted
watch(bothGranted, (granted) => {
  if (granted) {
    router.replace({ name: 'home' })
  }
})

async function handleGrantPermissions() {
  requesting.value = true

  // Request camera permission
  if (cameraPermission.value !== 'granted') {
    await requestCameraPermission()
  }

  // Request location permission (fallback for non-<geolocation> element browsers)
  if (locationPermission.value !== 'granted' && !supportsGeolocationElement.value) {
    await requestLocationPermission()
  }

  // Re-check in case permissions changed
  await checkAllPermissions()
  requesting.value = false
}

function handleGeolocationEvent(event: Event) {
  const el = event.target as HTMLElement & { position?: GeolocationPosition; error?: GeolocationPositionError }
  if (el.position) {
    locationPermission.value = 'granted'
    locationGrantedViaElement.value = true
    // Re-check all permissions to potentially trigger redirect
    checkAllPermissions()
  } else if (el.error) {
    locationPermission.value = 'denied'
  }
}

function getStatusIcon(state: string): string {
  switch (state) {
    case 'granted': return '✅'
    case 'denied': return '❌'
    case 'prompt': return '⏳'
    default: return '❓'
  }
}

function getStatusText(state: string): string {
  switch (state) {
    case 'granted': return 'Granted'
    case 'denied': return 'Denied'
    case 'prompt': return 'Not yet requested'
    default: return 'Unknown'
  }
}
</script>

<template>
  <div class="min-h-full flex flex-col items-center justify-center p-6">
    <div class="max-w-md w-full space-y-8">
      <!-- App Logo / Title -->
      <div class="text-center">
        <div class="text-6xl mb-4">📸</div>
        <h1 class="text-3xl font-bold text-white">Photo Capture</h1>
        <p class="mt-2 text-slate-400 text-sm">
          Capture photos with geo-location and timestamp watermarks
        </p>
      </div>

      <!-- What the app does -->
      <div class="bg-surface rounded-2xl p-6 space-y-4">
        <h2 class="text-lg font-semibold text-white">How it works</h2>
        <ul class="space-y-3 text-slate-300 text-sm">
          <li class="flex items-start gap-3">
            <span class="text-primary text-lg mt-0.5">📷</span>
            <span>Take a photo using your device camera</span>
          </li>
          <li class="flex items-start gap-3">
            <span class="text-primary text-lg mt-0.5">📍</span>
            <span>Your location coordinates are automatically watermarked on the photo</span>
          </li>
          <li class="flex items-start gap-3">
            <span class="text-primary text-lg mt-0.5">🕐</span>
            <span>A timestamp is added to the watermark</span>
          </li>
          <li class="flex items-start gap-3">
            <span class="text-primary text-lg mt-0.5">💾</span>
            <span>Download the watermarked photo as a high-quality JPEG</span>
          </li>
        </ul>
      </div>

      <!-- Permissions Required -->
      <div class="bg-surface rounded-2xl p-6 space-y-4">
        <h2 class="text-lg font-semibold text-white">Permissions Required</h2>
        <p class="text-slate-400 text-sm">
          This app needs access to your camera and location to function. Your data stays on your device.
        </p>

        <!-- Permission Status -->
        <div class="space-y-3">
          <div class="flex items-center justify-between bg-surface-dark rounded-xl px-4 py-3">
            <div class="flex items-center gap-3">
              <span class="text-xl">📷</span>
              <span class="text-sm text-slate-300">Camera</span>
            </div>
            <span class="text-sm">
              {{ getStatusIcon(cameraPermission) }} {{ getStatusText(cameraPermission) }}
            </span>
          </div>
          <div class="flex items-center justify-between bg-surface-dark rounded-xl px-4 py-3">
            <div class="flex items-center gap-3">
              <span class="text-xl">📍</span>
              <span class="text-sm text-slate-300">Location</span>
            </div>
            <span class="text-sm">
              {{ getStatusIcon(locationPermission) }} {{ getStatusText(locationPermission) }}
            </span>
          </div>
        </div>

        <!-- Grant Permissions Button -->
        <div class="space-y-3" v-if="!bothGranted">
          <button @click="handleGrantPermissions" :disabled="requesting"
            class="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-200 text-sm">
            {{ requesting ? 'Requesting...' : 'Grant Permissions' }}
          </button>

          <!-- Geolocation Element for supported browsers -->
          <div v-if="supportsGeolocationElement && locationPermission !== 'granted'"
            class="flex flex-col items-center gap-2">
            <p class="text-slate-500 text-xs">Or use the browser location button:</p>
            <geolocation @location="handleGeolocationEvent" accuracymode="precise">
            </geolocation>
          </div>
        </div>

        <!-- Denied State Instructions -->
        <div v-if="cameraPermission === 'denied' || locationPermission === 'denied'"
          class="bg-danger/10 border border-danger/30 rounded-xl p-4 space-y-2">
          <h3 class="text-danger font-semibold text-sm">Permission Denied</h3>
          <p class="text-slate-300 text-xs leading-relaxed">
            One or more permissions were denied. To grant them manually:
          </p>
          <ul class="text-slate-400 text-xs space-y-1 list-disc list-inside">
            <li><strong>Chrome (Android):</strong> Tap the lock icon 🔒 in the address bar → Site Settings → Allow
              Camera / Location</li>
            <li><strong>Safari (iOS):</strong> Go to Settings → Safari → Camera / Location → Allow</li>
            <li><strong>Chrome (Desktop):</strong> Click the lock icon 🔒 in the address bar → Toggle permissions on
            </li>
          </ul>
          <button @click="checkAllPermissions"
            class="mt-2 w-full bg-surface-light hover:bg-surface text-white text-sm py-2 px-4 rounded-lg transition-colors">
            Re-check Permissions
          </button>
        </div>
      </div>

      <!-- Already granted — redirect -->
      <div v-if="bothGranted" class="text-center">
        <p class="text-success text-sm font-medium">All permissions granted! Redirecting...</p>
      </div>
    </div>
  </div>
</template>
