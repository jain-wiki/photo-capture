<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGeolocation } from '../composables/useGeolocation'
import { useCaptureStore } from '../stores/captureStore'

const router = useRouter()
const { getCurrentPosition, formatCoordinates } = useGeolocation()
const { storeCapture } = useCaptureStore()

const videoRef = ref<HTMLVideoElement | null>(null)
const stream = ref<MediaStream | null>(null)
const capturing = ref(false)
const error = ref<string | null>(null)
const cameraReady = ref(false)
const showFlash = ref(false)
const captureHint = ref(true)
const statusMessage = ref('')

async function startCamera() {
  try {
    error.value = null
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'environment',
        width: { ideal: 3840 },
        height: { ideal: 2160 },
      },
      audio: false,
    })
    stream.value = mediaStream
    if (videoRef.value) {
      videoRef.value.srcObject = mediaStream
      videoRef.value.onloadedmetadata = () => {
        cameraReady.value = true
      }
    }
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.name === 'NotAllowedError') {
        error.value = 'Camera access was blocked. Please allow camera access in your browser settings and try again.'
      } else if (err.name === 'NotFoundError') {
        error.value = 'No camera found on this device. Please connect a camera and try again.'
      } else if (err.name === 'NotReadableError') {
        error.value = 'Camera is in use by another app. Close the other app and try again.'
      } else {
        error.value = 'Could not start the camera. Please make sure no other app is using it, then tap Retry.'
      }
    } else {
      error.value = 'Could not start the camera. Please try again.'
    }
  }
}

function stopCamera() {
  if (stream.value) {
    stream.value.getTracks().forEach((t) => t.stop())
    stream.value = null
  }
  cameraReady.value = false
}

async function capturePhoto() {
  if (capturing.value) return
  capturing.value = true
  captureHint.value = false
  error.value = null
  statusMessage.value = 'Getting your location…'

  try {
    // Get current geolocation
    const position = await getCurrentPosition()
    const lat = position.coords.latitude
    const lon = position.coords.longitude
    const coordsText = formatCoordinates(lat, lon)
    const timestamp = new Date().toLocaleString()

    statusMessage.value = 'Capturing photo…'

    let imageBlob: Blob

    // Check if ImageCapture API is available (Android high-quality)
    if ('ImageCapture' in window && stream.value) {
      const track = stream.value.getVideoTracks()[0]
      if (track) {
        const imageCapture = new (window as unknown as { ImageCapture: new (track: MediaStreamTrack) => { takePhoto: () => Promise<Blob> } }).ImageCapture(track)
        imageBlob = await imageCapture.takePhoto()
      } else {
        throw new Error('No video track available')
      }
    } else {
      // Fallback: draw video frame to canvas
      if (!videoRef.value) throw new Error('Video element not available')
      const video = videoRef.value
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Could not get canvas context')
      ctx.drawImage(video, 0, 0)
      imageBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob)
            else reject(new Error('Failed to create image blob'))
          },
          'image/jpeg',
          0.95
        )
      })
    }

    // Shutter flash effect
    showFlash.value = true
    setTimeout(() => { showFlash.value = false }, 200)

    statusMessage.value = 'Saving…'

    // Stop camera before navigating
    stopCamera()

    // Store data in the shared blob store (avoids sessionStorage size limits)
    storeCapture(imageBlob, coordsText, timestamp, lat, lon)
    router.push({ name: 'preview' })
  } catch (err: unknown) {
    statusMessage.value = ''
    if (err instanceof Error) {
      if (err.message.includes('timeout') || err.message.includes('Timeout')) {
        error.value = 'Could not get your location in time. Make sure location/GPS is turned on, then try again.'
      } else if (err.message.includes('denied') || err.message.includes('PERMISSION_DENIED')) {
        error.value = 'Location access was blocked. Please enable location in your browser settings.'
      } else {
        error.value = 'Something went wrong while capturing. Please try again.'
      }
    } else {
      error.value = 'Something went wrong. Please try again.'
    }
  } finally {
    capturing.value = false
    statusMessage.value = ''
  }
}

function goToStart() {
  stopCamera()
  router.push({ name: 'start' })
}

onMounted(() => {
  startCamera()
})

onUnmounted(() => {
  stopCamera()
})
</script>

<template>
  <div class="min-h-full flex flex-col bg-black">
    <!-- Header -->
    <div class="bg-surface/80 backdrop-blur-sm px-4 py-3 flex items-center justify-between z-10">
      <button @click="goToStart" class="text-primary hover:text-primary-dark text-sm font-medium transition-colors"
        aria-label="Back to setup">
        ← Setup
      </button>
      <h1 class="text-white font-semibold text-lg">Photo Capture</h1>
      <div v-if="cameraReady" class="flex items-center gap-1.5">
        <span class="w-2 h-2 bg-success rounded-full animate-pulse"></span>
        <span class="text-success text-xs">Live</span>
      </div>
      <div v-else class="w-12"></div>
    </div>

    <!-- Camera Viewfinder -->
    <div class="flex-1 relative flex items-center justify-center overflow-hidden">
      <video ref="videoRef" autoplay playsinline muted class="w-full h-full object-cover"
        aria-label="Camera viewfinder"></video>

      <!-- Viewfinder overlay -->
      <div v-if="cameraReady" class="absolute inset-4 border-2 border-white/20 rounded-2xl pointer-events-none"></div>

      <!-- Shutter flash effect -->
      <div v-if="showFlash" class="absolute inset-0 bg-white z-20 pointer-events-none animate-shutter-flash"></div>

      <!-- Status message overlay (getting location, etc.) -->
      <div v-if="statusMessage && capturing"
        class="absolute bottom-20 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-sm text-white text-sm px-4 py-2 rounded-full z-10">
        {{ statusMessage }}
      </div>

      <!-- Loading state -->
      <div v-if="!cameraReady && !error" class="absolute inset-0 flex items-center justify-center bg-surface-dark">
        <div class="text-center space-y-3">
          <div class="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p class="text-slate-400 text-sm">Starting camera…</p>
        </div>
      </div>

      <!-- Error state -->
      <div v-if="error" class="absolute inset-0 flex items-center justify-center bg-surface-dark p-6">
        <div class="text-center space-y-4 max-w-sm">
          <span class="text-4xl">⚠️</span>
          <p class="text-slate-300 text-sm leading-relaxed">{{ error }}</p>
          <button @click="startCamera"
            class="bg-primary hover:bg-primary-dark text-white text-sm font-medium py-2.5 px-6 rounded-xl transition-colors">
            Retry
          </button>
        </div>
      </div>
    </div>

    <!-- Capture Controls -->
    <div class="bg-surface/80 backdrop-blur-sm px-6 py-5 flex flex-col items-center gap-2">
      <button @click="capturePhoto" :disabled="!cameraReady || capturing" aria-label="Take photo"
        class="relative w-20 h-20 rounded-full border-4 border-white disabled:border-slate-600 disabled:cursor-not-allowed transition-all duration-200 active:scale-95 group">
        <div
          class="absolute inset-1 rounded-full bg-white group-hover:bg-slate-200 group-active:bg-slate-300 group-disabled:bg-slate-700 transition-colors"
          :class="{ 'animate-pulse': capturing }"></div>
      </button>
      <p v-if="captureHint && cameraReady && !error" class="text-slate-400 text-xs animate-fade-in">
        Tap the button to take a photo
      </p>
    </div>
  </div>
</template>
