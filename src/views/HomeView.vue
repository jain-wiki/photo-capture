<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { useGeolocation } from '../composables/useGeolocation'

const router = useRouter()
const { getCurrentPosition, formatCoordinates } = useGeolocation()

const videoRef = ref<HTMLVideoElement | null>(null)
const stream = ref<MediaStream | null>(null)
const capturing = ref(false)
const error = ref<string | null>(null)
const cameraReady = ref(false)
const captureMode = ref<'photo' | 'video'>('photo')

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
      error.value = `Camera error: ${err.message}`
    } else {
      error.value = 'Failed to access camera'
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
  error.value = null

  try {
    // Get current geolocation
    const position = await getCurrentPosition()
    const lat = position.coords.latitude
    const lon = position.coords.longitude
    const coordsText = formatCoordinates(lat, lon)
    const timestamp = new Date().toLocaleString()

    let imageBlob: Blob

    // Check if ImageCapture API is available (Android high-quality)
    if ('ImageCapture' in window && stream.value) {
      const track = stream.value.getVideoTracks()[0]
      if (track) {
        captureMode.value = 'photo' // Indicate photo mode is being used
        const imageCapture = new (window as unknown as { ImageCapture: new (track: MediaStreamTrack) => { takePhoto: () => Promise<Blob> } }).ImageCapture(track)
        imageBlob = await imageCapture.takePhoto()
      } else {
        throw new Error('No video track available')
      }
    } else {
      // Fallback: draw video frame to canvas
      captureMode.value = 'video' // Indicate fallback mode
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

    // Stop camera before navigating
    stopCamera()

    // Navigate to preview with the captured data
    // Store data in sessionStorage to pass between routes
    const reader = new FileReader()
    reader.onloadend = () => {
      sessionStorage.setItem('capturedImage', reader.result as string)
      sessionStorage.setItem('capturedCoords', coordsText)
      sessionStorage.setItem('capturedTimestamp', timestamp)
      sessionStorage.setItem('capturedLat', lat.toString())
      sessionStorage.setItem('capturedLon', lon.toString())
      router.push({ name: 'preview' })
    }
    reader.readAsDataURL(imageBlob)
  } catch (err: unknown) {
    if (err instanceof Error) {
      error.value = `Capture error: ${err.message}`
    } else {
      error.value = 'Failed to capture photo'
    }
  } finally {
    capturing.value = false
  }
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
      <h1 class="text-white font-semibold text-lg">Photo Capture</h1>
      <div v-if="cameraReady" class="flex items-center gap-2">
        <span class="w-2 h-2 bg-success rounded-full animate-pulse"></span>
        <span class="text-success text-xs">Live ({{ captureMode }})</span>
      </div>
    </div>

    <!-- Camera Viewfinder -->
    <div class="flex-1 relative flex items-center justify-center overflow-hidden">
      <video ref="videoRef" autoplay playsinline muted class="w-full h-full object-cover"></video>

      <!-- Viewfinder overlay -->
      <div v-if="cameraReady" class="absolute inset-4 border-2 border-white/20 rounded-2xl pointer-events-none"></div>

      <!-- Loading state -->
      <div v-if="!cameraReady && !error" class="absolute inset-0 flex items-center justify-center bg-surface-dark">
        <div class="text-center space-y-3">
          <div class="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p class="text-slate-400 text-sm">Starting camera...</p>
        </div>
      </div>

      <!-- Error state -->
      <div v-if="error" class="absolute inset-0 flex items-center justify-center bg-surface-dark p-6">
        <div class="text-center space-y-4 max-w-sm">
          <span class="text-4xl">⚠️</span>
          <p class="text-danger text-sm">{{ error }}</p>
          <button @click="startCamera"
            class="bg-primary hover:bg-primary-dark text-white text-sm py-2 px-6 rounded-xl transition-colors">
            Retry
          </button>
        </div>
      </div>
    </div>

    <!-- Capture Controls -->
    <div class="bg-surface/80 backdrop-blur-sm px-6 py-6 flex items-center justify-center">
      <button @click="capturePhoto" :disabled="!cameraReady || capturing"
        class="relative w-20 h-20 rounded-full border-4 border-white disabled:border-slate-600 disabled:cursor-not-allowed transition-all duration-200 active:scale-95 group">
        <div
          class="absolute inset-1 rounded-full bg-white group-hover:bg-slate-200 group-active:bg-slate-300 group-disabled:bg-slate-700 transition-colors"
          :class="{ 'animate-pulse': capturing }"></div>
      </button>
    </div>
  </div>
</template>
