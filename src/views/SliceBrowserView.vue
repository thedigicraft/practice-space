<template>
  <div class="slice-browser-view d-flex flex-column">
    <header class="view-header">
      <div class="header-content px-4 py-3 d-flex align-items-center gap-3">
        <button class="btn btn-outline-secondary" @click="$emit('back')">
          <i class="fas fa-arrow-left me-2"></i>Back
        </button>
        <h1 class="m-0">Slice Browser</h1>
      </div>
    </header>

    <div class="browser-content p-4">
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

const route = useRoute()
const fileBrowserRef = ref<InstanceType<typeof FileBrowser> | null>(null)

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
</script>

<style scoped>
.slice-browser-view {
  height: 100vh;
  background: #1a1a1a;
}

.view-header {
  background: #1e1e1e;
  border-bottom: 1px solid #333;
  padding: 1rem 2rem;
}

.header-content {
}

.view-header h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #fff;
}

.browser-content {
  overflow: auto;
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}
</style>
