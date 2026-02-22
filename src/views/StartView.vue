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

onMounted(async () => {
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

  // Request location permission
  if (locationPermission.value !== 'granted') {
    await requestLocationPermission()
  }

  // Re-check in case permissions changed
  await checkAllPermissions()
  requesting.value = false
}

function getStatusIcon(state: string): string {
  switch (state) {
    case 'granted': return '✅'
    case 'denied': return '🚫'
    case 'prompt': return '👆'
    default: return '⏳'
  }
}

function getStatusText(state: string): string {
  switch (state) {
    case 'granted': return 'Ready'
    case 'denied': return 'Blocked'
    case 'prompt': return 'Needs your OK'
    default: return 'Checking…'
  }
}

function getStatusColor(state: string): string {
  switch (state) {
    case 'granted': return 'text-success'
    case 'denied': return 'text-danger'
    case 'prompt': return 'text-warning'
    default: return 'text-slate-400'
  }
}
</script>

<template>
  <div class="min-h-full flex flex-col items-center justify-center p-6">
    <div class="max-w-md w-full space-y-6">
      <!-- App Logo / Title -->
      <div class="text-center">
        <div class="text-6xl mb-4">📸</div>
        <h1 class="text-3xl font-bold text-white">Photo Capture</h1>
        <p class="mt-2 text-slate-300 text-sm leading-relaxed">
          Take a photo and we'll stamp your location &amp; time on it — ready to download or share.
        </p>
      </div>

      <!-- Step indicator -->
      <div class="flex items-center justify-center gap-2 text-xs">
        <div class="flex items-center gap-1.5 bg-primary/20 text-primary px-3 py-1.5 rounded-full font-semibold">
          <span>1</span>
          <span>Allow Access</span>
        </div>
        <div class="w-4 h-px bg-slate-600"></div>
        <div class="flex items-center gap-1.5 bg-surface text-slate-500 px-3 py-1.5 rounded-full">
          <span>2</span>
          <span>Take Photo</span>
        </div>
        <div class="w-4 h-px bg-slate-600"></div>
        <div class="flex items-center gap-1.5 bg-surface text-slate-500 px-3 py-1.5 rounded-full">
          <span>3</span>
          <span>Download</span>
        </div>
      </div>

      <!-- How it works — simplified -->
      <div class="bg-surface rounded-2xl p-5 space-y-3">
        <h2 class="text-base font-semibold text-white">How it works</h2>
        <div class="flex items-start gap-3 text-slate-300 text-sm">
          <div class="flex gap-2 text-lg shrink-0 mt-0.5">📷 📍 🕐</div>
          <p class="leading-relaxed">
            Take a photo with your camera. Your GPS location and the current date &amp; time are
            automatically stamped onto the image. Then save or share it.
          </p>
        </div>
      </div>

      <!-- Quick Setup (was "Permissions Required") -->
      <div class="bg-surface rounded-2xl p-5 space-y-4">
        <h2 class="text-base font-semibold text-white">Quick Setup</h2>
        <p class="text-slate-400 text-sm">
          We need access to your camera and location. Nothing leaves your device.
        </p>

        <!-- Permission Status -->
        <div class="space-y-2">
          <div class="flex items-center justify-between bg-surface-dark rounded-xl px-4 py-3">
            <div class="flex items-center gap-3">
              <span class="text-xl">📷</span>
              <span class="text-sm text-slate-300">Camera</span>
            </div>
            <span class="text-sm font-medium" :class="getStatusColor(cameraPermission)">
              {{ getStatusIcon(cameraPermission) }} {{ getStatusText(cameraPermission) }}
            </span>
          </div>
          <div class="flex items-center justify-between bg-surface-dark rounded-xl px-4 py-3">
            <div class="flex items-center gap-3">
              <span class="text-xl">📍</span>
              <span class="text-sm text-slate-300">Location</span>
            </div>
            <span class="text-sm font-medium" :class="getStatusColor(locationPermission)">
              {{ getStatusIcon(locationPermission) }} {{ getStatusText(locationPermission) }}
            </span>
          </div>
        </div>

        <!-- Allow Access Button -->
        <div v-if="!bothGranted">
          <button @click="handleGrantPermissions" :disabled="requesting"
            class="w-full bg-primary hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-xl transition-all duration-200 text-base shadow-lg shadow-primary/25"
            :class="{ 'animate-subtle-pulse': !requesting }">
            {{ requesting ? 'Please wait…' : 'Allow Camera & Location' }}
          </button>
        </div>

        <!-- Denied State Instructions — simplified -->
        <div v-if="cameraPermission === 'denied' || locationPermission === 'denied'"
          class="bg-danger/10 border border-danger/30 rounded-xl p-4 space-y-3">
          <h3 class="text-danger font-semibold text-sm">Access Was Blocked</h3>
          <p class="text-slate-300 text-sm leading-relaxed">
            It looks like access was blocked. Tap the 🔒 lock or settings icon in your browser's
            address bar, turn on <strong>Camera</strong> and <strong>Location</strong>, then tap
            the button below.
          </p>
          <button @click="checkAllPermissions"
            class="w-full bg-surface-light hover:bg-surface text-white text-sm font-medium py-2.5 px-4 rounded-lg transition-colors">
            Try Again
          </button>
        </div>
      </div>

      <!-- Already granted — redirect -->
      <div v-if="bothGranted" class="text-center">
        <p class="text-success text-sm font-medium">All set! Opening camera…</p>
      </div>
    </div>
  </div>
</template>
