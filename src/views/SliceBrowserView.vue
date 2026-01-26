<template>
  <div class="slice-browser-view">
    <header class="view-header">
      <div class="header-content px-4 py-3">
        <button class="btn-back py-2 px-3" @click="$emit('back')">
          <i class="fas fa-arrow-left"></i> Back
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

// Watch for artist filter in route query
watch(() => route.query.artist, (artistName) => {
  if (artistName && typeof artistName === 'string' && fileBrowserRef.value) {
    fileBrowserRef.value.setSearchFilter(artistName)
  }
}, { immediate: true })

// Watch for type filter in route query
watch(() => route.query.type, (type) => {
  if (type && typeof type === 'string' && fileBrowserRef.value) {
    fileBrowserRef.value.setSearchFilter(type)
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
  display: flex;
  flex-direction: column;
  background: #1a1a1a;
}

.view-header {
  background: #1e1e1e;
  border-bottom: 1px solid #333;
  padding: 1rem 2rem;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.btn-back {
  background: #2a2a2a;
  color: #fff;
  border: 1px solid #444;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.95rem;
  transition: all 0.2s;
}

.btn-back:hover {
  background: #333;
  border-color: #555;
}

.view-header h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #fff;
}

.browser-content {
  flex: 1;
  overflow: auto;
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}
</style>
