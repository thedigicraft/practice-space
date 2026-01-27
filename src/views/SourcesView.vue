<template>
  <div class="sources-view d-flex flex-column">
    <div class="sources-content p-4">
      <!-- Filters and Search -->
      <div class="filters-bar mb-4 d-flex gap-3 align-items-center">
        <div class="search-box flex-fill">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search sources by name, title, or location..."
            class="form-control"
          />
        </div>
        <select v-model="locationFilter" class="form-select" style="width: 200px;">
          <option value="">All Locations</option>
          <option v-for="location in uniqueLocations" :key="location" :value="location">
            {{ location }}
          </option>
        </select>
        <select v-model="sortBy" class="form-select" style="width: 200px;">
          <option value="importedAt">Sort by Import Date</option>
          <option value="title">Sort by Title</option>
          <option value="name">Sort by Filename</option>
          <option value="duration">Sort by Duration</option>
          <option value="size">Sort by Size</option>
        </select>
      </div>

      <div v-if="filteredSources.length === 0" class="empty-state text-center py-5">
        <p v-if="sources.length === 0">No audio sources imported yet.</p>
        <p v-else>No sources match your filters.</p>
        <p class="hint">{{ sources.length === 0 ? 'Import audio files to get started!' : 'Try adjusting your search or filters.' }}</p>
      </div>

      <table v-else class="sources-table table table-hover">
        <thead>
          <tr>
            <th>Title / Filename</th>
            <th>Location</th>
            <th>Duration</th>
            <th>Size</th>
            <th>Imported</th>
            <th class="text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="source in filteredSources"
            :key="source.id"
            @click="openSource(source.id)"
            class="source-row"
          >
            <td>
              <div class="d-flex align-items-center gap-2">
                <i class="fas fa-file-audio text-primary"></i>
                <div>
                  <div class="source-title">{{ source.title || source.name }}</div>
                  <div v-if="source.title" class="source-filename text-muted">{{ source.name }}</div>
                </div>
              </div>
            </td>
            <td>
              <a
                v-if="source.location"
                class="link-secondary text-decoration-none"
                @click.stop="filterByLocation(source.location)"
                role="button"
              >
                <i class="fas fa-map-marker-alt me-1"></i>{{ source.location }}
              </a>
              <span v-else class="text-muted">—</span>
            </td>
            <td class="text-monospace">{{ formatDuration(source.duration) }}</td>
            <td>{{ formatFileSize(source.size) }}</td>
            <td class="text-muted">{{ formatDate(source.importedAt) }}</td>
            <td class="text-center">
              <button
                class="btn btn-sm btn-outline-secondary"
                @click.stop="editSource(source)"
                title="Edit Metadata"
              >
                <i class="fas fa-edit"></i>
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div v-if="filteredSources.length > 0" class="results-info mt-3 text-muted">
        Showing {{ filteredSources.length }} of {{ sources.length }} sources
      </div>
    </div>

    <SourceMetadataEditor
      v-if="editingSource"
      :source="editingSource"
      @save="handleSaveMetadata"
      @close="editingSource = null"
    />

    <!-- Bottom Action Bar -->
    <div class="action-bar d-flex justify-content-center gap-3">
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
const searchQuery = ref('')
const locationFilter = ref('')
const sortBy = ref<'importedAt' | 'title' | 'name' | 'duration' | 'size'>('importedAt')

const emit = defineEmits<{
  filesImported: [files: Source[]]
  updateSource: [sourceId: string, metadata: Partial<Source>]
}>()

const uniqueLocations = computed(() => {
  const locations = props.sources
    .map(s => s.location)
    .filter((loc): loc is string => !!loc)
  return Array.from(new Set(locations)).sort()
})

const filteredSources = computed(() => {
  let filtered = [...props.sources]

  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    filtered = filtered.filter(source =>
      (source.title?.toLowerCase().includes(query)) ||
      source.name.toLowerCase().includes(query) ||
      (source.location?.toLowerCase().includes(query))
    )
  }

  // Apply location filter
  if (locationFilter.value) {
    filtered = filtered.filter(source => source.location === locationFilter.value)
  }

  // Apply sorting
  filtered.sort((a, b) => {
    switch (sortBy.value) {
      case 'title':
        return (a.title || a.name).localeCompare(b.title || b.name)
      case 'name':
        return a.name.localeCompare(b.name)
      case 'duration':
        return b.duration - a.duration
      case 'size':
        return b.size - a.size
      case 'importedAt':
      default:
        return b.importedAt - a.importedAt
    }
  })

  return filtered
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
  color: #e0e0e0;
}

.sources-content {
  overflow-y: auto;
  padding-bottom: 80px;
}

.filters-bar {
  background: var(--bs-body-bg);
  border-radius: 8px;
  padding: 1rem;
}

.sources-table {
  width: 100%;
  border-collapse: collapse;
}

.sources-table thead th {
  font-size: 0.8rem;
  text-transform: uppercase;
  font-weight: 600;
  padding: 0.75rem;
  border-bottom: 2px solid var(--bs-border-color);
}

.sources-table tbody td {
  padding: 1rem 0.75rem;
  vertical-align: middle;
}

.source-row {
  cursor: pointer;
  transition: background 0.2s;
}

.source-row:hover {
  background: rgba(var(--bs-primary-rgb), 0.1);
}

.source-title {
  font-weight: 500;
  color: var(--bs-body-color);
}

.source-filename {
  font-size: 0.85rem;
}

.text-monospace {
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
}

.results-info {
  font-size: 0.9rem;
  text-align: center;
}

.empty-state {
  color: var(--bs-secondary-color);
}

.hint {
  color: var(--bs-secondary-color);
  font-size: 0.9rem;
}

.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--bs-body-bg);
  border-top: 1px solid var(--bs-border-color);
  padding: 1rem;
  z-index: 100;
}
</style>
