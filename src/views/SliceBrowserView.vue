<template>
  <div class="slice-browser-view d-flex flex-column">
    <PanelHeader title="Slice Browser">
      <template #center>
        <div class="header-center d-flex align-items-center gap-2">
          <SearchBox
            v-model="searchInput"
            placeholder="Search slices by title, tags, or file..."
            title="Search slices"
            aria-label="Search slices"
            :minWidth="340"
            @update:modelValue="applySearchFilter"
            @cleared="clearSearch"
          />
          <button 
            class="btn btn-outline-secondary btn-sm"
            :class="{ 'active': selectionActive }"
            @click="toggleSelectionFromHeader"
            title="Toggle selection mode"
            aria-label="Toggle selection mode"
          >
            <i class="fas fa-check-square me-1"></i> Select
          </button>
          <ExportSettings />
        </div>
      </template>
    </PanelHeader>

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
import PanelHeader from '../components/PanelHeader.vue'
import SearchBox from '@/components/SearchBox.vue'

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
