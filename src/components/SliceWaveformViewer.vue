<template>
  <div class="slice-waveform-viewer">
    <div v-if="slice && source" class="waveform-wrapper" @mouseenter="hovered = true" @mouseleave="hovered = false">
      <canvas ref="canvasRef"></canvas>
      <div
        class="playhead-handle"
        :style="playheadStyle"
        @mousedown.stop.prevent="startPlayheadDrag($event)"
        @touchstart.stop.prevent="startPlayheadDragTouch($event)"
      ></div>
    </div>
    <div v-else class="empty-state text-center py-4">
      <p>No slice selected</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, nextTick, computed } from 'vue'
import type { Slice, Source } from '../types/models'
import { getSourceArrayBuffer } from '@/services/platformAudio'
import { loadAudioBuffer } from '@/services/audio'
import { generateWaveformData } from '@/utils/helpers'

interface Props {
  slice: Slice | null
  source: Source | null
  currentTime: number
  isPlaying: boolean
  waveformMode?: 'line' | 'bars'
  width?: number
  height?: number
  active?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  waveformMode: 'line',
  width: 800,
  height: 100,
  active: false,
})
const canvasRef = ref<HTMLCanvasElement | null>(null)
const localWaveform = ref<Float32Array | null>(null)
function computeWaveformNaive(buffer: AudioBuffer, width: number): Float32Array {
  const channel = buffer.getChannelData(0)
  const len = channel.length
  const out = new Float32Array(Math.max(1, width))
  const windowSize = Math.max(1, Math.floor(len / out.length))
  for (let i = 0; i < out.length; i++) {
    const start = i * windowSize
    const end = Math.min(len, start + windowSize)
    let sum = 0
    for (let j = start; j < end; j++) sum += channel[j]
    out[i] = sum / (end - start || 1)
  }
  return out
}

const emit = defineEmits<{
  'toggle-waveform-mode': []
  'seek': [number]
  'scrub-start': []
  'scrub-end': []
}>()
const hovered = ref(false)
const scrubTime = ref<number | null>(null)
let rafId: number | null = null

const waveformMode = ref<'line' | 'bars'>('line')

const drawWaveform = () => {
  const wf = props.source?.waveformData || localWaveform.value
  if (!canvasRef.value || !props.slice || !props.source || !wf) return

  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  // Size canvas using devicePixelRatio to avoid blurriness and resizing flicker
  const dpr = (typeof window !== 'undefined' && (window.devicePixelRatio || 1)) || 1
  const width = Math.max(1, props.width || 800)
  const height = Math.max(1, props.height || 100)
  const pixelW = Math.max(1, Math.floor(width * dpr))
  const pixelH = Math.max(1, Math.floor(height * dpr))
  if (canvas.width !== pixelW || canvas.height !== pixelH) {
    canvas.width = pixelW
    canvas.height = pixelH
    canvas.style.width = width + 'px'
    canvas.style.height = height + 'px'
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)
  } else {
    // Ensure transform is set even if size unchanged
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.scale(dpr, dpr)
  }
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(0, 0, width, height)

  const isClip = (props.source as any)?.isClip && (props.source as any)?.originSliceId === props.slice?.id
  const startTime = isClip ? 0 : (props.slice?.startTime || 0)
  const endTime = isClip ? (props.source?.duration || 0) : (props.slice?.endTime || 0)
  const waveformData = wf
  const { duration } = props.source
  
  const startIdx = Math.floor((startTime / duration) * waveformData.length)
  const endIdxRaw = Math.ceil((endTime / duration) * waveformData.length)
  const endIdx = Math.max(startIdx + 1, endIdxRaw)
  const sliceData = waveformData.slice(Math.max(0, startIdx), Math.max(startIdx + 1, endIdx))

  if (!sliceData.length) {
    // Nothing to draw beyond background
    return
  }
  const stepX = width / sliceData.length
  const centerY = height / 2
  
  // Detect if data contains signed values (new format) or absolute values (old format)
  let hasNegativeValues = false
  for (let i = 0; i < Math.min(sliceData.length, 100); i++) {
    if (sliceData[i] < 0) {
      hasNegativeValues = true
      break
    }
  }
  
  if (props.waveformMode === 'bars') {
    // Draw as bars (slice-specific color for contrast)
    ctx.fillStyle = '#9b59b6'
    const barWidth = width / sliceData.length

    for (let i = 0; i < sliceData.length; i++) {
      const amplitude = Math.abs(sliceData[i])
      const barHeight = amplitude * centerY
      const x = i * barWidth
      const y = centerY - barHeight / 2

      ctx.fillRect(x, y, Math.max(1, barWidth), barHeight)
    }
  } else {
    // Draw as line (slice-specific color for contrast)
    ctx.strokeStyle = '#9b59b6'
    ctx.lineWidth = 1.5
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'

    // Draw single continuous waveform line
    ctx.beginPath()
    for (let i = 0; i < sliceData.length; i++) {
      const amplitude = sliceData[i]
      const x = i * stepX
      let y
      
      if (hasNegativeValues) {
        // New format: signed values that oscillate naturally
        y = centerY - (amplitude * centerY * 0.9)
      } else {
        // Old format: absolute values - alternate above/below center for oscillation effect
        const offset = (i % 2 === 0 ? 1 : -1) * amplitude * centerY * 0.9
        y = centerY - offset
      }
      
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    ctx.stroke()
  }

  // Draw playhead using scrubTime when dragging, otherwise currentTime
  const playheadTime = scrubTime.value != null ? scrubTime.value : props.currentTime
  const sliceDuration = Math.max(0, endTime - startTime)
  const showPlayhead = props.active || hovered.value || scrubTime.value != null
  if (showPlayhead && sliceDuration > 0 && playheadTime >= startTime && playheadTime <= endTime) {
    const relativeTime = playheadTime - startTime
    const playheadX = (relativeTime / sliceDuration) * width
    
    ctx.strokeStyle = '#ff6b6b'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(playheadX, 0)
    ctx.lineTo(playheadX, height)
    ctx.stroke()
  }
}

watch(() => [props.slice, props.source, props.currentTime, props.isPlaying, props.waveformMode, props.width, props.height], async () => {
  // Always try to draw with whatever data is available first
  await nextTick()
  drawWaveform()
  // If no precomputed waveform and no local fallback yet, compute once
  if (props.source && !props.source.waveformData && !localWaveform.value) {
    try {
      const arr = await getSourceArrayBuffer(props.source)
      const buffer = await loadAudioBuffer(arr)
      try {
        localWaveform.value = await generateWaveformData(buffer, widthOrDefault())
      } catch {
        // As a backup, compute a naive waveform in main thread
        localWaveform.value = computeWaveformNaive(buffer, widthOrDefault())
      }
      // Redraw after computing fallback
      await nextTick()
      drawWaveform()
    } catch (err) {
      // keep silent on failure to avoid noisy UI
      localWaveform.value = null
    }
  }
}, { deep: true, immediate: true })

// Recompute local fallback when width changes (only if source lacks precomputed waveform)
watch(() => props.width, async () => {
  if (props.source && !props.source.waveformData) {
    try {
      const arr = await getSourceArrayBuffer(props.source)
      const buffer = await loadAudioBuffer(arr)
      try {
        localWaveform.value = await generateWaveformData(buffer, widthOrDefault())
      } catch {
        localWaveform.value = computeWaveformNaive(buffer, widthOrDefault())
      }
      await nextTick()
      drawWaveform()
    } catch {
      /* noop */
    }
  } else {
    await nextTick()
    drawWaveform()
  }
})

function widthOrDefault(): number {
  return Math.max(1, props.width || 800)
}

// Playhead handle position and dragging
const playheadStyle = computed(() => {
  const showHandle = (props.active || hovered.value)
  if (!showHandle || !props.slice || !props.source) return { display: 'none' }
  const startTime = ((props.source as any)?.isClip && (props.source as any)?.originSliceId === props.slice.id) ? 0 : (props.slice.startTime || 0)
  const endTime = ((props.source as any)?.isClip && (props.source as any)?.originSliceId === props.slice.id) ? (props.source.duration || 0) : (props.slice.endTime || 0)
  const width = widthOrDefault()
  const duration = Math.max(0, endTime - startTime)
  if (duration <= 0) return { display: 'none' }
  const current = scrubTime.value != null ? scrubTime.value : props.currentTime
  const clampedTime = Math.min(Math.max(current, startTime), endTime)
  const x = ((clampedTime - startTime) / duration) * width
  return { left: `${Math.max(0, Math.min(width - 10, x))}px`, display: 'block' }
})

const draggingPlayhead = ref(false)
function startPlayheadDrag(e: MouseEvent) {
  e.stopPropagation()
  draggingPlayhead.value = true
  emit('scrub-start')
  window.addEventListener('mousemove', onPlayheadDragMove)
  window.addEventListener('mouseup', endPlayheadDrag)
}
function startPlayheadDragTouch(e: TouchEvent) {
  e.stopPropagation()
  draggingPlayhead.value = true
  emit('scrub-start')
  window.addEventListener('touchmove', onPlayheadDragMoveTouch, { passive: false })
  window.addEventListener('touchend', endPlayheadDrag)
}
function onPlayheadDragMove(e: MouseEvent) {
  if (!draggingPlayhead.value || !props.slice || !props.source) return
  const rect = (canvasRef.value as HTMLCanvasElement).getBoundingClientRect()
  const localX = e.clientX - rect.left
  applySeekFromX(localX)
}
function onPlayheadDragMoveTouch(e: TouchEvent) {
  if (!draggingPlayhead.value || !props.slice || !props.source) return
  const t = e.touches[0]
  const rect = (canvasRef.value as HTMLCanvasElement).getBoundingClientRect()
  const localX = t.clientX - rect.left
  applySeekFromX(localX)
}
function endPlayheadDrag() {
  draggingPlayhead.value = false
  emit('scrub-end')
  window.removeEventListener('mousemove', onPlayheadDragMove)
  window.removeEventListener('mouseup', endPlayheadDrag)
  window.removeEventListener('touchmove', onPlayheadDragMoveTouch)
  window.removeEventListener('touchend', endPlayheadDrag)
  // Commit seek once at the end for smoother UX
  if (scrubTime.value != null) emit('seek', scrubTime.value)
  scrubTime.value = null
  if (rafId) { cancelAnimationFrame(rafId); rafId = null }
}
function applySeekFromX(localX: number) {
  const width = widthOrDefault()
  const dpr = (typeof window !== 'undefined' && (window.devicePixelRatio || 1)) || 1
  const logicalX = Math.max(0, Math.min(width, localX / dpr))
  const isClip = (props.source as any)?.isClip && (props.source as any)?.originSliceId === props.slice?.id
  const startTime = isClip ? 0 : (props.slice?.startTime || 0)
  const endTime = isClip ? (props.source?.duration || 0) : (props.slice?.endTime || 0)
  const duration = Math.max(0, endTime - startTime)
  if (duration <= 0) return
  const ratio = logicalX / width
  const targetTime = Math.max(startTime, Math.min(endTime, startTime + ratio * duration))
  scrubTime.value = targetTime
  if (!rafId) {
    rafId = requestAnimationFrame(() => {
      rafId = null
      drawWaveform()
    })
  }
}

onMounted(drawWaveform)
</script>

<style scoped>
.slice-waveform-viewer {
  border-top: 1px solid #333;
}
.waveform-wrapper { position: relative; width: 100%; height: 100%; overflow: hidden; }
.waveform-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}
.waveform-wrapper h4 {
  margin: 0;
  font-size: 1rem;
  color: #ccc;
}
canvas { display: block; border-radius: 4px; }
.playhead-handle {
  position: absolute;
  top: 0;
  width: 10px;
  height: 12px;
  transform: translateX(-5px);
  background: #ff6b6b;
  border-radius: 2px 2px 0 0;
  cursor: ew-resize;
  z-index: 2;
}
.empty-state {
  text-align: center;
  color: #888;
  padding: 2rem 0;
}
</style>