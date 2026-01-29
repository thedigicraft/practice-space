<template>
  <div class="slice-browser-view d-flex flex-column">
    <header class="view-header border-bottom">
      <div class="header-content px-3 py-2 d-flex align-items-center">
        <div class="header-left flex-grow-1">
          <span class="fs-6 text-uppercase text-secondary fw-semibold">Slice Browser</span>
        </div>
        <div class="header-center flex-grow-1 d-flex justify-content-center align-items-center gap-2">
          <div class="search-box d-flex align-items-center" style="min-width: 340px;">
            <input
              v-model="searchInput"
              type="text"
              class="form-control form-control-sm"
              placeholder="Search slices by title, tags, or file..."
              @input="applySearchFilter"
            />
            <button v-if="searchInput" class="btn btn-outline-secondary btn-sm ms-2" title="Clear" @click="clearSearch">
              <i class="fas fa-times"></i>
            </button>
          </div>
          <button 
            class="btn btn-outline-secondary btn-sm"
            :class="{ 'active': selectionActive }"
            @click="toggleSelectionFromHeader"
            title="Toggle selection mode"
          >
            <i class="fas fa-check-square me-1"></i> Select
          </button>
          <ExportSettings />
        </div>
        <div class="header-right flex-grow-1 d-flex justify-content-end">
          <router-link to="/" class="btn btn-outline-secondary btn-sm" title="Close">
            <i class="fas fa-xmark"></i>
          </router-link>
        </div>
      </div>
    </header>

    <div class="browser-content">
      <FileBrowser
        ref="fileBrowserRef"
        :slices="slices"
        :folders="folders"
        :audioFiles="sources"
        :currentlyPlayingSliceId="currentlyPlayingSliceId"
        :isPlaying="isPlaying"
        @selectSlice="handleSelectSlice"
        @playSlice="handlePlaySlice"
        @createFolder="handleCreateFolder"
        @deleteSlice="handleDeleteSlice"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch, ref } from 'vue'
import { useRoute } from 'vue-router'
import type { Source, Slice, SliceFolder } from '../types/models'
import FileBrowser from '../components/FileBrowser.vue'
import ExportSettings from '../components/ExportSettings.vue'

const route = useRoute()
const fileBrowserRef = ref<InstanceType<typeof FileBrowser> | null>(null)
const searchInput = ref('')
const selectionActive = ref(false)

interface Props {
  slices: Slice[]
  folders: SliceFolder[]
  sources: Source[]
  currentlyPlayingSliceId: string | null
  isPlaying: boolean
  initialFilter?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  back: []
  selectSlice: [slice: Slice]
  playSlice: [slice: Slice]
  createFolder: [folder: Omit<SliceFolder, 'id' | 'createdAt'>]
  deleteSlice: [sliceId: string]
}>()

// Watch for filters in route query
watch(() => [route.query.artist, route.query.type, route.query.location], ([artistName, type, location]) => {
  if (fileBrowserRef.value) {
    // Priority: location > type > artist (apply the first one found)
    if (location && typeof location === 'string') {
      fileBrowserRef.value.setSearchFilter(location)
    } else if (type && typeof type === 'string') {
      fileBrowserRef.value.setSearchFilter(type)
    } else if (artistName && typeof artistName === 'string') {
      fileBrowserRef.value.setSearchFilter(artistName)
    }
  }
}, { immediate: true })

const handleSelectSlice = (slice: Slice) => {
  emit('selectSlice', slice)
}

const handlePlaySlice = (slice: Slice) => {
  emit('playSlice', slice)
}

const handleCreateFolder = (folder: Omit<SliceFolder, 'id' | 'createdAt'>) => {
  emit('createFolder', folder)
}

const handleDeleteSlice = (sliceId: string) => {
  emit('deleteSlice', sliceId)
}

const applySearchFilter = () => {
  if (fileBrowserRef.value) {
    fileBrowserRef.value.setSearchFilter(searchInput.value)
  }
}

const clearSearch = () => {
  searchInput.value = ''
  applySearchFilter()
}

const toggleSelectionFromHeader = () => {
  if (fileBrowserRef.value) {
    fileBrowserRef.value.toggleSelectionMode()
    selectionActive.value = !selectionActive.value
  }
}
</script>

<style scoped>
.slice-browser-view {
  height: 100vh;
  background: #1a1a1a;
}

.view-header {
  border-bottom: 1px solid var(--bs-border-color);
}

.header-content {
}

.view-header .fs-6 {
  color: var(--bs-secondary-color);
}

.browser-content {
  overflow: auto;
  width: 100%;
}
</style>
