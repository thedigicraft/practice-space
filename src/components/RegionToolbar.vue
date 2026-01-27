<template>
  <div class="region-toolbar" :style="style">
    <div class="toolbar-content">
      <button @click.stop="emit('play')" class="btn btn-primary">
        {{ isPlaying ? '⏸' : '▶' }}
      </button>
      <div class="region-info">
        <p>
          <strong>Selection</strong>
        </p>
        <p>{{ formatTime(startTime) }} - {{ formatTime(endTime) }}</p>
        <p class="duration">({{ formatDuration(duration) }})</p>
      </div>
      <div class="actions d-flex gap-2">
        <button @click.stop="emit('createSlice')" class="btn btn-success">
          Create Slice
        </button>
        <button @click.stop="emit('export')" class="btn btn-outline-secondary" disabled>
          Export
        </button>
      </div>
      <button @click.stop="emit('clear')" class="btn btn-sm btn-outline-danger">✕</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatTime } from '../utils/helpers'

interface Props {
  startTime: number
  endTime: number
  top: number
  left: number
  width: number
  isPlaying: boolean
}

const props = defineProps<Props>()

const emit = defineEmits<{
  play: []
  createSlice: []
  export: []
  clear: []
}>()

const duration = computed(() => props.endTime - props.startTime)

const style = computed(() => ({
  top: `${props.top}px`,
  left: `${props.left}px`,
  width: `${props.width}px`,
}))

const formatDuration = (seconds: number) => {
  return `${seconds.toFixed(2)}s`
}
</script>

<style scoped>
.region-toolbar {
  position: absolute;
  background: #1e1e1e;
  border: 1px solid #4a9eff;
  border-radius: 8px;
  padding: 0.75rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  z-index: 10;
  transform: translateY(10px);
  transition: all 0.2s;
  min-width: 300px;
}

.toolbar-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.region-info {
  flex: 1;
  font-size: 0.85rem;
  color: #ccc;
}

.region-info p {
  margin: 0;
  line-height: 1.4;
}

.region-info .duration {
  font-size: 0.8rem;
  color: #888;
}
</style>