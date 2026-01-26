<template>
  <div class="sources-view">
    <div class="sources-content p-4">
      <div class="sources-header mb-4">
        <div class="sources-info">
          <p class="subtitle">{{ sources.length }} source{{ sources.length !== 1 ? 's' : '' }}</p>
        </div>
      </div>
      
      <div v-if="sources.length === 0" class="empty-state text-center py-5">
        <p>No audio sources imported yet.</p>
        <p class="hint">Import audio files to get started!</p>
      </div>

      <div v-else class="source-grid">
        <div
          v-for="source in sortedSources"
          :key="source.id"
          class="source-card"
        >
          <div class="source-icon">
            <i class="fas fa-file-audio"></i>
          </div>
          <div class="source-info" @click="openSource(source.id)">
            <h3 class="source-name">{{ source.title || source.name }}</h3>
            <p class="source-meta">
              {{ formatDuration(source.duration) }} • {{ formatFileSize(source.size) }}
            </p>
            <p v-if="source.location" class="source-location" @click.stop="filterByLocation(source.location)">
              <i class="fas fa-map-marker-alt me-1"></i>{{ source.location }}
            </p>
            <p class="source-date">
              Imported {{ formatDate(source.importedAt) }}
            </p>
          </div>
          <button class="btn-edit" @click.stop="editSource(source)" title="Edit Metadata">
            <i class="fas fa-edit"></i>
          </button>
        </div>
      </div>
    </div>

    <SourceMetadataEditor
      v-if="editingSource"
      :source="editingSource"
      @save="handleSaveMetadata"
      @close="editingSource = null"
    />

    <!-- Bottom Action Bar -->
    <div class="action-bar">
      <ImportControls @filesImported="handleFilesImported" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Source } from '@/types/models'
import ImportControls from '@/components/ImportControls.vue'
import SourceMetadataEditor from '@/components/SourceMetadataEditor.vue'
import { formatTime, formatFileSize } from '@/utils/helpers'

interface Props {
  sources: Source[]
}

const props = defineProps<Props>()
const router = useRouter()
const editingSource = ref<Source | null>(null)

const emit = defineEmits<{
  filesImported: [files: Source[]]
  updateSource: [sourceId: string, metadata: Partial<Source>]
}>()

const sortedSources = computed(() => {
  return [...props.sources].sort((a, b) => b.importedAt - a.importedAt)
})

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

const openSource = (sourceId: string) => {
  router.push(`/source/${sourceId}`)
}

const filterByLocation = (location: string) => {
  router.push({
    path: '/slices',
    query: { location }
  })
}

const editSource = (source: Source) => {
  editingSource.value = source
}

const handleSaveMetadata = (metadata: Partial<Source>) => {
  if (editingSource.value) {
    emit('updateSource', editingSource.value.id, metadata)
    editingSource.value = null
  }
}

const handleFilesImported = (files: Source[]) => {
  emit('filesImported', files)
}
</script>

<style scoped>
.sources-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #1a1a1a;
  color: #e0e0e0;
}

.sources-content {
  flex: 1;
  overflow-y: auto;
}

.sources-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sources-info {
  flex: 1;
}

.subtitle {
  color: #999;
  font-size: 0.9rem;
}

.sources-content {
  flex: 1;
  overflow-y: auto;
}

.source-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

.source-card {
  background: #252525;
  border: 1px solid #353535;
  border-radius: 8px;
  padding: 1.5rem;
  display: flex;
  gap: 1rem;
  transition: all 0.2s;
  position: relative;
}

.source-card:hover {
  border-color: #4a9eff;
  box-shadow: 0 4px 12px rgba(74, 158, 255, 0.2);
}

.source-card:hover .btn-edit {
  opacity: 1;
}

.source-icon {
  width: 56px;
  height: 56px;
  border-radius: 8px;
  background: rgba(74, 158, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4a9eff;
  font-size: 1.75rem;
  flex-shrink: 0;
}

.source-info {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}

.source-name {
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  color: #fff;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.source-meta {
  margin: 0.25rem 0;
  font-size: 0.85rem;
  color: #888;
}

.source-location {
  margin: 0.25rem 0;
  font-size: 0.85rem;
  color: #9d4aff;
  cursor: pointer;
  transition: color 0.2s;
}

.source-location:hover {
  color: #b36bff;
}

.source-date {
  margin: 0.25rem 0 0 0;
  font-size: 0.8rem;
  color: #666;
}

.btn-edit {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(74, 158, 255, 0.15);
  border: 1px solid rgba(74, 158, 255, 0.3);
  color: #4a9eff;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  opacity: 0;
}

.btn-edit:hover {
  background: rgba(74, 158, 255, 0.25);
  border-color: #4a9eff;
}

.empty-state {
  color: #888;
}

.hint {
  color: #666;
  font-size: 0.9rem;
}

.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #252525;
  border-top: 1px solid #353535;
  padding: 1rem;
  display: flex;
  justify-content: center;
  gap: 1rem;
  z-index: 100;
}
</style>
