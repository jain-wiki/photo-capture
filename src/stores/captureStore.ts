import { ref } from 'vue'

// Module-level reactive store for captured image data
// Avoids sessionStorage size limits with large data URLs
const capturedBlob = ref<Blob | null>(null)
const capturedObjectUrl = ref<string | null>(null)
const capturedCoords = ref<string>('')
const capturedTimestamp = ref<string>('')
const capturedLat = ref<number | null>(null)
const capturedLon = ref<number | null>(null)

export function useCaptureStore() {
  function storeCapture(
    blob: Blob,
    coords: string,
    timestamp: string,
    lat: number,
    lon: number,
  ) {
    // Revoke previous object URL if any
    if (capturedObjectUrl.value) {
      URL.revokeObjectURL(capturedObjectUrl.value)
    }
    capturedBlob.value = blob
    capturedObjectUrl.value = URL.createObjectURL(blob)
    capturedCoords.value = coords
    capturedTimestamp.value = timestamp
    capturedLat.value = lat
    capturedLon.value = lon
  }

  function clearCapture() {
    if (capturedObjectUrl.value) {
      URL.revokeObjectURL(capturedObjectUrl.value)
    }
    capturedBlob.value = null
    capturedObjectUrl.value = null
    capturedCoords.value = ''
    capturedTimestamp.value = ''
    capturedLat.value = null
    capturedLon.value = null
  }

  function hasCapture(): boolean {
    return capturedBlob.value !== null
  }

  return {
    capturedBlob,
    capturedObjectUrl,
    capturedCoords,
    capturedTimestamp,
    capturedLat,
    capturedLon,
    storeCapture,
    clearCapture,
    hasCapture,
  }
}
