<template>
  <div class="grouped-slices-view d-flex flex-column">
    <PanelHeader>
      <template #left>
        <div class="d-flex align-items-center">
          <span class="fs-6 text-uppercase text-secondary fw-semibold">{{ title }}</span>
          <span class="badge bg-secondary ms-2">{{ slices.length }}</span>
          <span class="subtitle small m-0 text-secondary ms-3">{{ type }}</span>
        </div>
      </template>
      <template #right>
        <div class="d-flex align-items-center gap-2" v-if="collections.length">
          <div class="dropdown">
            <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" @click="showCollectionDropdown = !showCollectionDropdown" :aria-expanded="showCollectionDropdown ? 'true' : 'false'" title="Add this group to a collection" aria-label="Add group to collection">
              <i class="fas fa-folder-plus me-1"></i>
              <span class="d-none d-sm-inline">Add to Collection</span>
            </button>
            <ul class="dropdown-menu dropdown-menu-end show" v-show="showCollectionDropdown" style="max-height: 260px; overflow-y: auto; min-width: 240px;">
              <li v-for="c in collections" :key="c.id">
                <button class="dropdown-item" @click="addGroupToCollection(c)">{{ c.name }}</button>
              </li>
            </ul>
          </div>
        </div>
      </template>
    </PanelHeader>

    <div class="slices-content flex-fill overflow-auto">
      <div v-if="slices.length === 0" class="empty-state text-center py-5">
        <p>No slices found.</p>
      </div>

      <table v-else class="app-table table table-hover table-striped">
        <thead>
          <tr>
            <th>Title</th>
            <th>Composer</th>
            <th>Performer</th>
            <th>Type</th>
            <th>Duration</th>
            <th>Jump</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="slice in slices" :key="slice.id">
            <SliceTableRow
              :slice="slice"
              :isSelected="playingSliceId === slice.id"
              @select="openInEditor(slice)"
              @seek-to="playSlice(slice)"
              @filter-artist="() => {}"
              @filter-type="() => {}"
            />
            <tr>
              <td :colspan="6" class="waveform-cell">
                <div class="waveform-container">
                  <SliceWaveformViewer
                    v-if="audioFiles[slice.audioFileId]"
                    :slice="slice"
                    :source="audioFiles[slice.audioFileId]"
                    :currentTime="playingSliceId === slice.id ? slicePlaybackTime : 0"
                    :isPlaying="playingSliceId === slice.id"
                    :waveformMode="waveformMode"
                    @toggle-waveform-mode="toggleWaveformMode"
                  />
                  <div v-else class="loading-waveform">
                    <i class="fas fa-spinner fa-spin"></i> Loading waveform...
                  </div>
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, inject } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAllSlices, getAllCollections, saveCollection, getAudioFile } from '@/services/db'
import type { Slice, AudioFile, Collection } from '@/types/models'
import SliceTableRow from '@/components/SliceTableRow.vue'
import SliceWaveformViewer from '@/components/SliceWaveformViewer.vue'
import { useAudioPlayback } from '@/composables/useAudioPlayback'
import PanelHeader from '@/components/PanelHeader.vue'

const route = useRoute()
const router = useRouter()

const title = ref(route.query.title as string || 'Grouped Slices')
const type = ref(route.query.type as string || '')
const slices = ref<Slice[]>([])
const audioFiles = ref<Record<string, AudioFile>>({})
const collections = inject<any>('collections') as any
const showCollectionDropdown = ref(false)

const { playSlice: playAudioSlice, pause } = useAudioPlayback()
const playingSliceId = ref<string | null>(null)
const slicePlaybackTime = ref(0)
const waveformMode = ref<'line' | 'bars'>('bars')

const getSourceName = (audioFileId: string) => {
  return audioFiles.value[audioFileId]?.name || 'Unknown'
}

const loadSlices = async () => {
  const allSlices = await getAllSlices()
  
  // Filter by type and title
  slices.value = allSlices.filter(
    slice => slice.type === type.value && slice.title === title.value
  )

  // Load audio files for each unique source
  const audioFileIds = new Set(slices.value.map(s => s.audioFileId))
  
  for (const audioFileId of audioFileIds) {
    const audioFile = await getAudioFile(audioFileId)
    if (audioFile) {
      audioFiles.value[audioFileId] = audioFile
    }
  }
}

const addGroupToCollection = async (collection: Collection) => {
  const groupSliceIds = slices.value.map(s => s.id)
  const existing = new Set(collection.sliceIds)
  groupSliceIds.forEach(id => existing.add(id))
  const updated: Collection = { ...collection, sliceIds: Array.from(existing), updatedAt: Date.now() }
  await saveCollection(updated)
  // Refresh provided collections for UI consistency
  try {
    const all = await getAllCollections()
    collections.value = all
  } catch {}
  showCollectionDropdown.value = false
}

const toggleWaveformMode = () => {
  waveformMode.value = waveformMode.value === 'line' ? 'bars' : 'line'
}

const playSlice = async (slice: Slice) => {
  if (playingSliceId.value === slice.id) {
    pause()
    playingSliceId.value = null
  } else {
    const audioFile = audioFiles.value[slice.audioFileId]
    if (audioFile) {
      await playAudioSlice(slice, audioFile)
      playingSliceId.value = slice.id
      
      // Reset playing state when done
      const duration = (slice.endTime - slice.startTime) * 1000
      setTimeout(() => {
        playingSliceId.value = null
      }, duration)
    }
  }
}

const openInEditor = (slice: Slice) => {
  router.push(`/source/${slice.audioFileId}?sliceId=${slice.id}`)
}

onMounted(() => {
  loadSlices()
})
</script>

<style scoped>
.grouped-slices-view {
  height: 100%;
  background: #1a1a1a;
  color: #e0e0e0;
}

.view-header {
  background: var(--bs-body-bg);
}

.subtitle {
  color: var(--bs-secondary-color);
}

.slices-content {
  overflow-y: auto;
  padding: 0;
}


/* Table layout now unified via global .app-table styles */

.slice-header h3 {
  font-size: 1.1rem;
  margin: 0;
  color: #fff;
}

.slice-meta {
  font-size: 0.85rem;
  color: #999;
}

.slice-source {
  font-size: 0.8rem;
  color: #777;
}

.slice-location {
  font-size: 0.8rem;
  color: #9d4aff;
}


.btn-icon {
  background: transparent;
  border: 1px solid #404040;
  color: #e0e0e0;
  width: 36px;
  height: 36px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: #303030;
  border-color: #4a9eff;
  color: #4a9eff;
}

.waveform-container {
  background: #1a1a1a;
  border-radius: 4px;
  padding: 0.5rem;
  margin-top: 0.5rem;
}

.loading-waveform {
  height: 120px;
  color: #666;
}

.slice-notes {
  background: #2a2a2a;
  border-left: 3px solid #4a9eff;
  border-radius: 4px;
  font-size: 0.9rem;
  color: #ccc;
}

.empty-state {
  color: #666;
}
</style>
