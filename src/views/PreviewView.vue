<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCaptureStore } from '../stores/captureStore'

const router = useRouter()
const { capturedObjectUrl, capturedCoords, capturedTimestamp, clearCapture, hasCapture } = useCaptureStore()

const watermarkedImageUrl = ref<string | null>(null)
const watermarkedBlob = ref<Blob | null>(null)
const coords = ref('')
const timestamp = ref('')
const processing = ref(true)
const canShare = ref(false)
const showSuccess = ref(false)

onMounted(async () => {
  if (!hasCapture() || !capturedObjectUrl.value) {
    router.replace({ name: 'home' })
    return
  }

  coords.value = capturedCoords.value
  timestamp.value = capturedTimestamp.value
  canShare.value = !!navigator.share

  await applyWatermark(capturedObjectUrl.value, coords.value, timestamp.value)
  processing.value = false

  // Show success animation briefly
  showSuccess.value = true
  setTimeout(() => { showSuccess.value = false }, 1500)
})

async function applyWatermark(
  imageSrc: string,
  coordsText: string,
  timestampText: string
) {
  return new Promise<void>((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      // Draw the original image
      ctx.drawImage(img, 0, 0)

      // Calculate watermark dimensions relative to image size
      const fontSize = Math.max(14, Math.floor(img.width / 40))
      const padding = Math.floor(fontSize * 0.8)
      const lineHeight = fontSize * 1.4
      const barHeight = lineHeight * 2 + padding * 2

      // Draw semi-transparent background bar at the bottom
      ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
      ctx.fillRect(0, img.height - barHeight, img.width, barHeight)

      // Draw a subtle top border for the bar
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'
      ctx.fillRect(0, img.height - barHeight, img.width, 1)

      // Set text style — use text prefixes instead of emoji for cross-platform consistency
      ctx.font = `${fontSize}px 'Inter', system-ui, -apple-system, sans-serif`
      ctx.textBaseline = 'top'

      // Draw location label + coordinates
      const yStart = img.height - barHeight + padding
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
      ctx.fillText(`Location: ${coordsText}`, padding, yStart)

      // Draw timestamp
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
      ctx.fillText(`Time: ${timestampText}`, padding, yStart + lineHeight)

      // Convert to Blob at 95% quality
      canvas.toBlob((blob) => {
        if (blob) {
          watermarkedBlob.value = blob
          watermarkedImageUrl.value = URL.createObjectURL(blob)
        }
        resolve()
      }, 'image/jpeg', 0.95)
    }
    img.src = imageSrc
  })
}

function getDownloadFilename(): string {
  const now = new Date()
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const month = months[now.getMonth()]
  const day = now.getDate()
  const year = now.getFullYear()
  const hours = now.getHours()
  const minutes = now.getMinutes().toString().padStart(2, '0')
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const hour12 = hours % 12 || 12
  return `Photo_${month}${day}_${year}_${hour12}-${minutes}${ampm}.jpg`
}

function downloadImage() {
  if (!watermarkedImageUrl.value) return

  const link = document.createElement('a')
  link.href = watermarkedImageUrl.value
  link.download = getDownloadFilename()
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

async function shareImage() {
  if (!watermarkedBlob.value || !navigator.share) {
    // Fall back to download
    downloadImage()
    return
  }

  const file = new File([watermarkedBlob.value], getDownloadFilename(), { type: 'image/jpeg' })

  try {
    await navigator.share({
      title: 'Photo Capture',
      text: `Location: ${coords.value}\nTime: ${timestamp.value}`,
      files: [file],
    })
  } catch (err: unknown) {
    // User cancelled share dialog — ignore AbortError
    if (err instanceof DOMException && err.name === 'AbortError') return
    // Otherwise fall back to download
    downloadImage()
  }
}

function captureAnother() {
  // Clean up watermarked object URL
  if (watermarkedImageUrl.value) {
    URL.revokeObjectURL(watermarkedImageUrl.value)
  }
  clearCapture()
  router.push({ name: 'home' })
}
</script>

<template>
  <div class="min-h-full flex flex-col bg-surface-dark">
    <!-- Header -->
    <div class="bg-surface/80 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
      <button @click="captureAnother"
        class="text-primary hover:text-primary-dark text-sm font-medium transition-colors">
        ← Retake
      </button>
      <h1 class="text-white font-semibold text-lg">Preview</h1>
      <div class="w-12"></div>
    </div>

    <!-- Image Preview -->
    <div class="flex-1 flex items-center justify-center p-4 overflow-auto">
      <!-- Processing state -->
      <div v-if="processing" class="text-center space-y-3">
        <div class="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
        <p class="text-slate-400 text-sm">Applying watermark…</p>
      </div>

      <!-- Success flash -->
      <div v-if="showSuccess && !processing"
        class="absolute top-20 left-1/2 -translate-x-1/2 bg-success/90 text-white text-sm font-medium px-4 py-2 rounded-full z-20 animate-fade-in">
        ✓ Photo is ready!
      </div>

      <!-- Watermarked Image -->
      <img v-if="!processing && watermarkedImageUrl" :src="watermarkedImageUrl"
        alt="Your photo with location and time stamped on it"
        class="max-w-full max-h-[calc(100vh-200px)] rounded-xl shadow-2xl object-contain" />
    </div>

    <!-- Confirmation message instead of raw data -->
    <div v-if="!processing" class="px-6 py-2">
      <p class="text-slate-400 text-xs text-center">
        Your location and time have been stamped on the photo.
      </p>
    </div>

    <!-- Action Buttons -->
    <div v-if="!processing" class="px-6 pb-6 pt-2 space-y-3">
      <!-- Primary: Share (or Download if share unavailable) -->
      <button v-if="canShare" @click="shareImage"
        class="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3.5 px-6 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2">
        <span class="text-lg">📤</span>
        Share Photo
      </button>
      <button @click="downloadImage"
        class="w-full font-semibold py-3.5 px-6 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2"
        :class="canShare
          ? 'bg-surface-light hover:bg-surface text-white'
          : 'bg-primary hover:bg-primary-dark text-white'">
        <span class="text-lg">💾</span>
        Download Photo
      </button>
      <button @click="captureAnother"
        class="w-full bg-surface-light hover:bg-surface text-white font-medium py-3 px-6 rounded-xl transition-colors duration-200">
        Take Another Photo
      </button>
    </div>
  </div>
</template>
