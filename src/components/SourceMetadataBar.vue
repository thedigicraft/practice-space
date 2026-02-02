<template>
  <div class="source-metadata px-4 py-3">
    <div class="source-title d-flex justify-content-between align-items-center">
      <input
        v-if="isEditing"
        v-model="titleValue"
        @blur="saveName"
        @keyup.enter="saveName"
        @keyup.esc="cancelEdit"
        class="form-control"
        ref="titleInput"
      />
      <h1 
        v-else
        @dblclick="startEdit"
        :title="'Double-click to edit'"
        class="editable-title"
      >
        {{ title }}
      </h1>
      <div class="source-metadata d-flex justify-content-center flex-wrap gap-4">
        <span class="metadata-item">
          <i class="fas fa-file-audio me-1"></i>{{ filename }}
        </span>
        <span class="metadata-item">
          <i class="fas fa-clock me-1"></i>{{ formatDuration(duration) }}
        </span>
        <span class="metadata-item">
          <i class="fas fa-hdd me-1"></i>{{ formatFileSize(size) }}
        </span>
        <span class="metadata-item">
          <i class="fas fa-wave-square me-1"></i>{{ sampleRate }}Hz
        </span>
        <span class="metadata-item">
          <i class="fas fa-volume-up me-1"></i>{{ numberOfChannels }} channel{{ numberOfChannels > 1 ? 's' : '' }}
        </span>
        <span v-if="location" class="metadata-item">
          <i class="fas fa-map-marker-alt me-1"></i>{{ location }}
        </span>
        <span class="metadata-item">
          <i class="fas fa-calendar-plus me-1"></i>Imported {{ formatDate(importedAt) }}
        </span>
        <span v-if="createdAt" class="metadata-item">
          <i class="fas fa-calendar me-1"></i>Created {{ formatDate(createdAt) }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import { formatTime, formatFileSize } from '@/utils/helpers'

interface Props {
  title: string
  filename: string
  duration: number
  size: number
  sampleRate: number
  numberOfChannels: number
  location?: string
  importedAt: number
  createdAt?: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  updateTitle: [title: string]
}>()

const isEditing = ref(false)
const titleValue = ref(props.title)
const titleInput = ref<HTMLInputElement>()

const startEdit = () => {
  titleValue.value = props.title
  isEditing.value = true
  nextTick(() => {
    titleInput.value?.focus()
    titleInput.value?.select()
  })
}

const saveName = () => {
  if (titleValue.value.trim() && titleValue.value !== props.title) {
    emit('updateTitle', titleValue.value.trim())
  }
  isEditing.value = false
}

const cancelEdit = () => {
  titleValue.value = props.title
  isEditing.value = false
}

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

.source-title {
  margin-bottom: 1rem;

  h1 {
    margin: 0;
    font-size: 1.75rem;
    color: var(--bs-body-color);
  }

  .form-control {
    font-size: 1.75rem;
    font-weight: 700;
    padding: 0.25rem 0.5rem;
  }
}

.editable-title {
  cursor: pointer;
  transition: opacity 0.2s;

  &:hover {
    opacity: 0.7;
  }
}

.metadata-item {
  font-size: 0.9rem;
  color: var(--bs-secondary-color);
  white-space: nowrap;

  i {
    color: var(--bs-primary);
  }
}
</style>
