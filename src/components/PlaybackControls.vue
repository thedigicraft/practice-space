<script setup lang="ts">
import { computed } from 'vue'
import { formatTime } from '@/utils/helpers'

interface Props {
  isPlaying: boolean
  currentTime: number
  duration: number
  isLoading: boolean
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  disabled: false,
})

const emit = defineEmits<{
  play: []
  pause: []
  seek: [time: number]
}>()

// Progress as a percentage
const progress = computed(() => {
  if (props.duration === 0) return 0
  return (props.currentTime / props.duration) * 100
})

const handleProgressClick = (event: MouseEvent) => {
  if (props.disabled || props.duration === 0) return

  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  const x = event.clientX - rect.left
  const percentage = x / rect.width
  const newTime = percentage * props.duration

  emit('seek', newTime)
}

const handlePlayPause = () => {
  if (props.disabled) return
  
  if (props.isPlaying) {
    emit('pause')
  } else {
    emit('play')
  }
}
</script>

<template>
  <div class="playback-controls">
    <!-- Play/Pause Button -->
    <button
      @click="handlePlayPause"
      :disabled="disabled || isLoading"
      class="btn btn-primary btn-play-pause"
      :class="{ playing: isPlaying }"
    >
      <span v-if="isLoading" class="spinner"></span>
      <span v-else-if="isPlaying">⏸</span>
      <span v-else>▶</span>
    </button>

    <!-- Time Display -->
    <div class="time-display">
      <span class="current-time">{{ formatTime(currentTime) }}</span>
      <span class="separator">/</span>
      <span class="total-time">{{ formatTime(duration) }}</span>
    </div>

    <!-- Progress Bar -->
    <div
      class="progress-container"
      @click="handleProgressClick"
      :class="{ disabled: disabled || duration === 0 }"
    >
      <div class="progress-track">
        <div class="progress-fill" :style="{ width: `${progress}%` }"></div>
        <div class="progress-handle" :style="{ left: `${progress}%` }"></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.playback-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(74, 158, 255, 0.3);
  border-top-color: #4a9eff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.time-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  min-width: 120px;
  flex-shrink: 0;
}

.current-time {
  color: #4a9eff;
}

.separator {
  opacity: 0.5;
}

.total-time {
  opacity: 0.7;
}

.progress-container {
  flex: 1;
  cursor: pointer;
  padding: 0.5rem 0;
}

.progress-container.disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.progress-track {
  position: relative;
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: visible;
}

.progress-fill {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  background: linear-gradient(90deg, #4a9eff, #3a8eef);
  border-radius: 3px;
  transition: width 0.1s linear;
}

.progress-handle {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 14px;
  height: 14px;
  background: #4a9eff;
  border: 2px solid white;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  transition: left 0.1s linear;
  opacity: 0;
}

.progress-container:hover .progress-handle {
  opacity: 1;
}

.progress-container:not(.disabled):hover .progress-track {
  height: 8px;
}
</style>
