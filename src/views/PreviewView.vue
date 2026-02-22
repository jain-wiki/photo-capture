<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const watermarkedImageUrl = ref<string | null>(null)
const originalImageUrl = ref<string | null>(null)
const coords = ref('')
const timestamp = ref('')
const processing = ref(true)

onMounted(async () => {
  const imageSrc = sessionStorage.getItem('capturedImage')
  const coordsText = sessionStorage.getItem('capturedCoords')
  const timestampText = sessionStorage.getItem('capturedTimestamp')

  if (!imageSrc || !coordsText || !timestampText) {
    router.replace({ name: 'home' })
    return
  }

  originalImageUrl.value = imageSrc
  coords.value = coordsText
  timestamp.value = timestampText

  await applyWatermark(imageSrc, coordsText, timestampText)
  processing.value = false
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

      // Set text style
      ctx.font = `${fontSize}px 'Inter', system-ui, -apple-system, sans-serif`
      ctx.textBaseline = 'top'

      // Draw location icon + coordinates
      const yStart = img.height - barHeight + padding
      ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
      ctx.fillText(`📍 ${coordsText}`, padding, yStart)

      // Draw timestamp
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
      ctx.fillText(`🕐 ${timestampText}`, padding, yStart + lineHeight)

      // Convert to JPEG at 95% quality
      watermarkedImageUrl.value = canvas.toDataURL('image/jpeg', 0.95)
      resolve()
    }
    img.src = imageSrc
  })
}

function downloadImage() {
  if (!watermarkedImageUrl.value) return

  const link = document.createElement('a')
  link.href = watermarkedImageUrl.value
  const dateStr = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, 19)
  link.download = `photo-capture-${dateStr}.jpg`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

function captureAnother() {
  // Clear stored data
  sessionStorage.removeItem('capturedImage')
  sessionStorage.removeItem('capturedCoords')
  sessionStorage.removeItem('capturedTimestamp')
  sessionStorage.removeItem('capturedLat')
  sessionStorage.removeItem('capturedLon')
  router.push({ name: 'home' })
}
</script>

<template>
  <div class="min-h-full flex flex-col bg-surface-dark">
    <!-- Header -->
    <div class="bg-surface/80 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
      <button @click="captureAnother"
        class="text-primary hover:text-primary-dark text-sm font-medium transition-colors">
        ← Back
      </button>
      <h1 class="text-white font-semibold text-lg">Preview</h1>
      <div class="w-12"></div>
    </div>

    <!-- Image Preview -->
    <div class="flex-1 flex items-center justify-center p-4 overflow-auto">
      <!-- Processing state -->
      <div v-if="processing" class="text-center space-y-3">
        <div class="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
        <p class="text-slate-400 text-sm">Applying watermark...</p>
      </div>

      <!-- Watermarked Image -->
      <img v-else-if="watermarkedImageUrl" :src="watermarkedImageUrl" alt="Captured photo with watermark"
        class="max-w-full max-h-[calc(100vh-200px)] rounded-xl shadow-2xl object-contain" />
    </div>

    <!-- Watermark Info -->
    <div v-if="!processing" class="px-6 py-3">
      <div class="bg-surface rounded-xl p-3 space-y-1">
        <p class="text-slate-400 text-xs">
          <span class="text-slate-500">Location:</span> {{ coords }}
        </p>
        <p class="text-slate-400 text-xs">
          <span class="text-slate-500">Timestamp:</span> {{ timestamp }}
        </p>
      </div>
    </div>

    <!-- Action Buttons -->
    <div v-if="!processing" class="px-6 pb-6 pt-2 space-y-3">
      <button @click="downloadImage"
        class="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3.5 px-6 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2">
        <span class="text-lg">💾</span>
        Download Photo
      </button>
      <button @click="captureAnother"
        class="w-full bg-surface-light hover:bg-surface text-white font-medium py-3 px-6 rounded-xl transition-colors duration-200">
        Capture Another Photo
      </button>
    </div>
  </div>
</template>
