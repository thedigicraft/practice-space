<template>
  <tr @click="$emit('click')" class="source-row">
    <td class="col-title">
      <div class="d-flex align-items-center gap-2">
        <i class="fas fa-file-audio text-primary"></i>
        <div>
          <div class="source-title">
            {{ source.title || source.name }}
            <span v-if="sliceCount != null" class="badge bg-primary rounded-pill ms-2">{{ sliceCount }}</span>
          </div>
          <div v-if="source.title" class="source-filename text-muted">{{ source.name }}</div>
        </div>
      </div>
    </td>
    <td class="col-location">
      <a
        v-if="source.location"
        class="link-secondary text-decoration-none"
        @click.stop="$emit('filterLocation', source.location)"
        role="button"
      >
        <i class="fas fa-map-marker-alt me-1"></i>{{ source.location }}
      </a>
      <span v-else class="text-muted">—</span>
    </td>
    <td class="col-duration text-monospace">{{ formatDuration(source.duration) }}</td>
    <td class="col-size">{{ formatFileSize(source.size) }}</td>
    <td class="col-date text-muted">{{ formatDate(source.importedAt) }}</td>
    <td class="col-actions text-center">
      <button
        class="btn btn-sm btn-outline-secondary"
        @click.stop="$emit('edit')"
        title="Edit Metadata"
      >
        <i class="fas fa-edit"></i>
      </button>
    </td>
  </tr>
</template>

<script setup lang="ts">
import type { Source } from '@/types/models'
import { formatTime, formatFileSize } from '@/utils/helpers'

interface Props {
  source: Source
  sliceCount?: number
}

const { sliceCount } = defineProps<Props>()

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
.source-row {
  cursor: pointer;
  transition: background-color 0.2s;
}

.source-title {
  font-weight: 500;
}

.source-filename {
  font-size: 0.85rem;
}
</style>
