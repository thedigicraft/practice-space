<template>
  <div class="grouped-slices-view d-flex flex-column">
    <header class="view-header px-3 py-2 border-bottom">
      <div class="d-flex justify-content-between align-items-center">
        <div class="d-flex align-items-center">
          <span class="fs-6 text-uppercase text-secondary fw-semibold">{{ title }}</span>
          <span class="badge bg-secondary ms-2">{{ slices.length }}</span>
          <span class="subtitle small m-0 text-secondary ms-3">{{ type }}</span>
        </div>
        <router-link to="/" class="btn btn-outline-secondary btn-sm" title="Close">
          <i class="fas fa-xmark"></i>
        </router-link>
      </div>
    </header>

    <div class="slices-content p-4 container-fluid flex-fill overflow-auto">
      <div v-if="slices.length === 0" class="empty-state text-center py-5">
        <p>No slices found.</p>
      </div>

      <div v-else class="slices-list">
        <div
          v-for="slice in slices"
          :key="slice.id"
          class="slice-item mb-4"
        >
          <div class="slice-header d-flex justify-content-between align-items-start mb-2">
            <div>
              <h3 class="mb-1">{{ slice.title }}</h3>
              <div class="slice-meta">
                <span v-if="slice.composers && slice.composers.length > 0">
                  <i class="fas fa-user-edit me-1"></i>
                  {{ slice.composers.join(', ') }}
                </span>
                <span v-if="slice.performers && slice.performers.length > 0" class="ms-3">
                  <i class="fas fa-user me-1"></i>
                  {{ slice.performers.join(', ') }}
                </span>
              </div>
              <div class="slice-source mt-1">
                <i class="fas fa-file-audio me-1"></i>
                {{ getSourceName(slice.audioFileId) }}
              </div>
              <div v-if="audioFiles[slice.audioFileId]?.location" class="slice-location mt-1">
                <i class="fas fa-map-marker-alt me-1"></i>
                {{ audioFiles[slice.audioFileId].location }}
              </div>
            </div>
            <div class="slice-actions d-flex gap-2">
              <button class="btn btn-primary btn-sm d-flex align-items-center justify-content-center" @click="playSlice(slice)" :title="playingSliceId === slice.id ? 'Pause' : 'Play'">
                <i :class="playingSliceId === slice.id ? 'fas fa-pause' : 'fas fa-play'"></i>
              </button>
              <button class="btn btn-outline-secondary btn-sm" @click="openInEditor(slice)" title="Open in Editor">
                <i class="fas fa-edit"></i>
              </button>
            </div>
          </div>

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

          <div v-if="slice.notes" class="slice-notes mt-2 p-2">
            <i class="fas fa-sticky-note me-2"></i>
            {{ slice.notes }}
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAllSlices } from '@/services/db'
import { getAudioFile } from '@/services/db'
import type { Slice, AudioFile } from '@/types/models'
import SliceWaveformViewer from '@/components/SliceWaveformViewer.vue'
import { useAudioPlayback } from '@/composables/useAudioPlayback'

const route = useRoute()
const router = useRouter()

const title = ref(route.query.title as string || 'Grouped Slices')
const type = ref(route.query.type as string || '')
const slices = ref<Slice[]>([])
const audioFiles = ref<Record<string, AudioFile>>({})

const { playSlice: playAudioSlice, pause, currentlyPlaying } = useAudioPlayback()
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
}


.slice-item {
  background: #252525;
  border: 1px solid #353535;
  border-radius: 8px;
  padding: 1rem;
  transition: all 0.2s;
}

.slice-item:hover {
  border-color: #4a9eff;
  box-shadow: 0 2px 8px rgba(74, 158, 255, 0.1);
}

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

.slice-actions {
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
