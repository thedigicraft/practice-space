<template>
  <div class="slice-waveform-viewer">
    <div v-if="slice && source" class="waveform-wrapper">
      <h4>{{ slice.title }} Waveform</h4>
      <canvas ref="canvasRef" :width="800" :height="100"></canvas>
    </div>
    <div v-else class="empty-state">
      <p>No slice selected</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import type { Slice, Source } from '../types/models'

interface Props {
  slice: Slice | null
  source: Source | null
  currentTime: number
  isPlaying: boolean
}

const props = defineProps<Props>()
const canvasRef = ref<HTMLCanvasElement | null>(null)

const drawWaveform = () => {
  if (!canvasRef.value || !props.slice || !props.source?.waveformData) return

  const canvas = canvasRef.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const { width, height } = canvas
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(0, 0, width, height)

  const { startTime, endTime } = props.slice
  const { waveformData, duration } = props.source
  
  const startIdx = Math.floor((startTime / duration) * waveformData.length)
  const endIdx = Math.ceil((endTime / duration) * waveformData.length)
  const sliceData = waveformData.slice(startIdx, endIdx)

  const barWidth = width / sliceData.length
  const centerY = height / 2
  ctx.fillStyle = '#4a9eff'

  for (let i = 0; i < sliceData.length; i++) {
    const amp = sliceData[i]
    const barHeight = amp * centerY
    ctx.fillRect(i * barWidth, centerY - barHeight / 2, Math.max(1, barWidth), barHeight)
  }

  // Draw playhead
  if (props.isPlaying && props.currentTime >= startTime && props.currentTime <= endTime) {
    const relativeTime = props.currentTime - startTime
    const sliceDuration = endTime - startTime
    const playheadX = (relativeTime / sliceDuration) * width
    
    ctx.strokeStyle = '#ff6b6b'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(playheadX, 0)
    ctx.lineTo(playheadX, height)
    ctx.stroke()
  }
}

watch(() => [props.slice, props.currentTime, props.isPlaying], () => {
  drawWaveform()
}, { deep: true, immediate: true })

onMounted(drawWaveform)
</script>

<style scoped>
.slice-waveform-viewer {
  padding: 1rem;
  background: #1e1e1e;
  border-top: 1px solid #333;
}
.waveform-wrapper h4 {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  color: #ccc;
}
canvas {
  display: block;
  width: 100%;
  border-radius: 4px;
}
.empty-state {
  text-align: center;
  color: #888;
  padding: 2rem 0;
}
</style>