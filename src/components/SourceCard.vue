<template>
  <div class="card h-100">
    <div class="card-body d-flex gap-3 align-items-start">
      <div class="source-icon">
        <i class="fas fa-file-audio"></i>
      </div>
      <div class="source-info flex-fill" @click="$emit('click')">
        <h3 class="card-title h5 mb-2">
          {{ source.title || source.name }}
          <span v-if="props.sliceCount != null" class="badge bg-primary rounded-pill ms-2">{{ props.sliceCount }}</span>
        </h3>
        <p class="card-text text-muted my-1">
          {{ formatDuration(source.duration) }} • {{ formatFileSize(source.size) }}
        </p>
        <p v-if="source.location" class="source-location my-1">
          <a class="link-secondary text-decoration-none" @click.stop="$emit('filterLocation', source.location)" role="button">
            <i class="fas fa-map-marker-alt me-1"></i>{{ source.location }}
          </a>
        </p>
        <p class="card-text text-muted small">
          Imported {{ formatDate(source.importedAt) }}
        </p>
      </div>
      <button class="btn btn-outline-secondary btn-sm d-flex align-items-center justify-content-center" @click.stop="$emit('edit')" title="Edit Metadata">
        <i class="fas fa-edit"></i>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Source } from '@/types/models'
import { formatTime, formatFileSize } from '@/utils/helpers'

interface Props {
  source: Source
  sliceCount?: number
}

const props = defineProps<Props>()

defineEmits<{
  click: []
  edit: []
  filterLocation: [location: string]
}>()

const formatDuration = (seconds: number) => formatTime(seconds)

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString()
}
</script>

<style scoped lang="scss">
.source-icon {
  font-size: 2rem;
  color: #4a9eff;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
}

.source-info {
  cursor: pointer;
  transition: opacity 0.2s;
}

.source-info:hover {
  opacity: 0.8;
}

.source-location {
  color: #9d4aff;
  font-size: 0.85rem;
}
</style>
