<template>
  <div class="card mb-3" :class="{ 'border-primary': isPlaying }">
    <div class="card-body d-flex gap-3 align-items-start">
      <button 
        class="btn btn-primary btn-sm play-btn"
        @click="$emit('play')"
      >
        <i :class="isPlaying ? 'fas fa-pause' : 'fas fa-play'"></i>
      </button>
      <div class="slice-info flex-fill">
        <h3 class="card-title h6 mb-2">{{ slice.title }}</h3>
        <p v-if="sourceName" class="card-text text-muted small mb-1">
          Source: {{ sourceName }}
        </p>
        <p class="card-text text-muted small">
          {{ formatTime(slice.startTime) }} - {{ formatTime(slice.endTime) }}
          <span class="slice-duration">({{ formatDuration(slice.endTime - slice.startTime) }})</span>
        </p>
        <div v-if="slice.tags && slice.tags.length > 0" class="slice-tags mt-2">
          <span v-for="tag in slice.tags" :key="tag" class="badge bg-primary me-1">{{ tag }}</span>
        </div>
      </div>
      <button 
        v-if="showViewSource"
        class="btn btn-sm btn-outline-secondary"
        @click="$emit('viewSource')"
        title="View in Source Editor"
      >
        View Source <i class="fas fa-arrow-right"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Slice } from '@/types/models'
import { formatTime } from '@/utils/helpers'

interface Props {
  slice: Slice
  sourceName?: string
  isPlaying?: boolean
  showViewSource?: boolean
}

withDefaults(defineProps<Props>(), {
  isPlaying: false,
  showViewSource: true
})

defineEmits<{
  play: []
  viewSource: []
}>()

const formatDuration = (seconds: number) => formatTime(seconds)
</script>

<style scoped lang="scss">
.play-btn {
  flex-shrink: 0;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.slice-info {
  min-width: 0;
}

.slice-duration {
  margin-left: 0.5rem;
}

.slice-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}
</style>
