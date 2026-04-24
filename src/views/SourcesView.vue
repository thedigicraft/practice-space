<template>
  <div class="sources-view d-flex flex-column">
    <PanelHeader title="Sources">
      <template #center>
        <FilterBar
          :locations="uniqueLocations"
          search-placeholder="Search sources by name, title, or location..."
          :initial-search="searchQuery"
          :initial-location="locationFilter"
          :initial-sort="sortBy"
          compact
          @update:search="searchQuery = $event"
          @update:location="locationFilter = $event"
          @update:sort="sortBy = $event as 'importedAt' | 'title' | 'name' | 'duration' | 'size'"
        />
      </template>
      <template #right>
        <div class="d-flex align-items-center gap-2">
          <div class="btn-group" role="group">
            <button class="btn btn-sm btn-outline-success dropdown-toggle" type="button" @click="toggleBatchNormalize">
              <i class="fas fa-level-up-alt me-1"></i>
              <span>Normalize Filtered</span>
            </button>
            <ul class="dropdown-menu show" v-if="batchNormalizeOpen" style="min-width: 240px; right: 0; left: auto;">
              <li><button class="dropdown-item" @click="batchNormalize(-1)">Normalize to -1 dBFS</button></li>
              <li><button class="dropdown-item" @click="batchNormalize(-3)">Normalize to -3 dBFS</button></li>
              <li><button class="dropdown-item" @click="batchNormalize(0)">Normalize to 0 dBFS (safe 0.98)</button></li>
            </ul>
          </div>
        </div>
      </template>
    </PanelHeader>
    <div class="sources-content flex-fill overflow-auto">

      <div v-if="filteredSources.length === 0" class="empty-state text-center py-5">
        <p v-if="sources.length === 0">No audio sources imported yet.</p>
        <p v-else>No sources match your filters.</p>
        <p class="hint">{{ sources.length === 0 ? 'Import audio files to get started!' : 'Try adjusting your search or filters.' }}</p>
      </div>

      <table v-else class="app-table table table-hover table-striped">
        <thead>
          <tr>
            <th class="col-title">Title / Filename</th>
            <th class="col-location">Location</th>
            <th class="col-duration">Duration</th>
            <th class="col-size">Size</th>
            <th class="col-date">Imported</th>
            <th class="col-actions text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          <SourceTableRow
            v-for="source in filteredSources"
            :key="source.id"
            :source="source"
            :slice-count="getSliceCount(source.id)"
            @click="openSource(source.id)"
            @edit="editSource(source)"
            @filter-location="filterByLocation"
          />
        </tbody>
      </table>

      <div v-if="filteredSources.length > 0" class="results-info mt-3 text-muted">
        Showing {{ filteredSources.length }} of {{ nonClipCount }} sources
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
      <RecordControls @filesImported="handleFilesImported" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, toRef, inject } from 'vue'
import { useRouter } from 'vue-router'
import type { Source, Slice } from '@/types/models'
import ImportControls from '@/components/ImportControls.vue'
import RecordControls from '@/components/RecordControls.vue'
import SourceMetadataEditor from '@/components/SourceMetadataEditor.vue'
import SourceTableRow from '@/components/SourceTableRow.vue'
import FilterBar from '@/components/FilterBar.vue'
import PanelHeader from '@/components/PanelHeader.vue'
import { useSourceFiltering } from '@/composables/useSourceFiltering'
import { formatTime, formatFileSize } from '@/utils/helpers'
import { createNormalizedSource, getAllAudioFiles } from '@/services/db'

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

// Use source filtering composable
const { uniqueLocations, filteredSources } = useSourceFiltering({
  sources: toRef(() => props.sources),
  searchQuery,
  locationFilter,
  sortBy
})

const nonClipCount = computed(() => props.sources.filter(s => !s.isClip).length)

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

// Inject slices provided by App.vue to compute counts
import type { Ref } from 'vue'
const slices = inject<Ref<Slice[]>>('slices')!

const getSliceCount = (sourceId: string) => {
  if (!slices?.value) return 0
  return slices.value.filter(s => s.audioFileId === sourceId).length
}

// Batch normalize
const batchNormalizeOpen = ref(false)
const toggleBatchNormalize = () => { batchNormalizeOpen.value = !batchNormalizeOpen.value }
function dbfsToLinear(dbfs: number): number { return dbfs === 0 ? 0.98 : Math.pow(10, dbfs / 20) }
const isBatching = ref(false)
const batchStatus = ref('')
const batchNormalize = async (presetDbfs: number) => {
  if (filteredSources.value.length === 0) return
  const confirmMsg = `Normalize ${filteredSources.value.length} filtered source(s)? This creates new normalized copies.`
  if (!confirm(confirmMsg)) return
  try {
    isBatching.value = true
    batchStatus.value = 'Starting normalization…'
    const linear = dbfsToLinear(presetDbfs)
    let done = 0
    for (const s of filteredSources.value) {
      if (s.isClip) continue // skip clips
      batchStatus.value = `Normalizing: ${s.title || s.name}`
      await createNormalizedSource(s, linear)
      done++
    }
    // Refresh injected sources list via emit
    emit('filesImported', []) // trigger update path
    // Also optimistic update if parent doesn’t reload automatically
    // Parent App.vue will reload sources on filesImported
    batchStatus.value = `Normalized ${done} source(s).`
    setTimeout(() => { batchStatus.value = ''; isBatching.value = false; batchNormalizeOpen.value = false }, 1500)
  } catch (e) {
    console.error('Batch normalize failed:', e)
    batchStatus.value = 'Batch normalize failed.'
    setTimeout(() => { batchStatus.value = ''; isBatching.value = false }, 2000)
  }
}
</script>

<style scoped lang="scss">
.sources-view {
  height: 100vh;
  color: #e0e0e0;
}

.sources-content {
  overflow-y: auto;
  padding: 0;
  padding-bottom: 80px;
}

/* Table layout now unified via global .app-table styles */

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
