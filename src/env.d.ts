/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

// Extend Window for ImageCapture API
interface ImageCapture {
  new(track: MediaStreamTrack): ImageCapture
  takePhoto(photoSettings?: PhotoSettings): Promise<Blob>
  grabFrame(): Promise<ImageBitmap>
  readonly track: MediaStreamTrack
}

interface PhotoSettings {
  fillLightMode?: string
  imageHeight?: number
  imageWidth?: number
}

interface Window {
  ImageCapture: typeof ImageCapture
}

// Extend HTMLElementTagNameMap for <geolocation> element
interface HTMLGeolocationElement extends HTMLElement {
  position?: GeolocationPosition
  error?: GeolocationPositionError
  autolocate?: boolean
  accuracymode?: string
  watch?: boolean
}

declare global {
  interface HTMLElementTagNameMap {
    geolocation: HTMLGeolocationElement
  }
  interface Window {
    ImageCapture: {
      new(track: MediaStreamTrack): ImageCapture
    }
  }
}
