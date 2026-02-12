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
          <div class="dropdown" v-if="collections && (collections.value?.length ?? 0) > 0">
            <button 
              class="btn btn-outline-secondary btn-sm dropdown-toggle"
              type="button"
              @click="headerCollectionDropdownOpen = !headerCollectionDropdownOpen"
              :aria-expanded="headerCollectionDropdownOpen ? 'true' : 'false'"
              title="Add selected to a collection"
              aria-label="Add selected to a collection"
              :disabled="(fileBrowserRef?.getSelectedCount?.() ?? 0) === 0"
            >
              <i class="fas fa-folder-plus me-1"></i>
              Add to Collection
            </button>
            <ul class="dropdown-menu dropdown-menu-end show" v-show="headerCollectionDropdownOpen" style="max-height: 260px; overflow-y: auto; min-width: 240px;">
              <li v-for="c in collections.value" :key="c.id">
                <button class="dropdown-item" @click="addSelectedToCollectionFromHeader(c)">{{ c.name }}</button>
              </li>
            </ul>
          </div>
          <div class="dropdown" v-if="projects && (projects.value?.length ?? 0) > 0">
            <button 
              class="btn btn-outline-secondary btn-sm dropdown-toggle"
              type="button"
              @click="headerProjectDropdownOpen = !headerProjectDropdownOpen"
              :aria-expanded="headerProjectDropdownOpen ? 'true' : 'false'"
              title="Add selected to a project"
              aria-label="Add selected to a project"
              :disabled="(fileBrowserRef?.getSelectedCount?.() ?? 0) === 0"
            >
              <i class="fas fa-music me-1"></i>
              Add to Project
            </button>
            <ul class="dropdown-menu dropdown-menu-end show" v-show="headerProjectDropdownOpen" style="max-height: 260px; overflow-y: auto; min-width: 240px;">
              <li v-for="p in projects.value" :key="p.id">
                <button class="dropdown-item" @click="addSelectedToProjectFromHeader(p)">{{ p.name }}</button>
              </li>
            </ul>
          </div>
          <button 
            v-if="currentCollection"
            class="btn btn-primary btn-sm"
            :disabled="(fileBrowserRef?.getSelectedCount?.() ?? 0) === 0"
            @click="quickAddToCurrentCollection"
            title="Add selected to current collection"
            aria-label="Add selected to current collection"
          >
            <i class="fas fa-plus me-1"></i>
            Add to {{ currentCollection.name }}
          </button>
          <button 
            v-if="currentProject"
            class="btn btn-primary btn-sm"
            :disabled="(fileBrowserRef?.getSelectedCount?.() ?? 0) === 0"
            @click="quickAddToCurrentProject"
            title="Add selected to current project"
            aria-label="Add selected to current project"
          >
            <i class="fas fa-plus me-1"></i>
            Add to {{ currentProject.name }}
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
        :audioFiles="nonClipSources"
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
import { onMounted, watch, ref, inject, computed } from 'vue'
import { useRoute } from 'vue-router'
import type { Source, Slice, SliceFolder, Collection, Project } from '../types/models'
import FileBrowser from '../components/FileBrowser.vue'
import ExportSettings from '../components/ExportSettings.vue'
import PanelHeader from '../components/PanelHeader.vue'
import SearchBox from '@/components/SearchBox.vue'

const route = useRoute()
const fileBrowserRef = ref<InstanceType<typeof FileBrowser> | null>(null)
const searchInput = ref('')
const selectionActive = ref(false)
const headerCollectionDropdownOpen = ref(false)
const headerProjectDropdownOpen = ref(false)
const collections = inject<any>('collections') as any
const projects = inject<any>('projects') as any
const currentCollection = computed<Collection | null>(() => {
  const id = route.query.addToCollection
  if (!id || typeof id !== 'string') return null
  return (collections?.value || []).find((c: Collection) => c.id === id) || null
})

const currentProject = computed<Project | null>(() => {
  const id = route.query.addToProject
  if (!id || typeof id !== 'string') return null
  return (projects?.value || []).find((p: Project) => p.id === id) || null
})

interface Props {
  slices: Slice[]
  folders: SliceFolder[]
  sources: Source[]
  currentlyPlayingSliceId: string | null
  isPlaying: boolean
  initialFilter?: string
}

const props = defineProps<Props>()

// Exclude generated clip sources from the FileBrowser
const nonClipSources = computed(() => props.sources.filter(s => !s.isClip))

const emit = defineEmits<{
  back: []
  selectSlice: [slice: Slice]
  playSlice: [slice: Slice]
  createFolder: [folder: Omit<SliceFolder, 'id' | 'createdAt'>]
  deleteSlice: [sliceId: string]
}>()

// Watch for filters in route query
watch(() => [route.query.artist, route.query.type, route.query.location, route.query.addToCollection, route.query.addToProject], ([artistName, type, location, addToCollection, addToProject]) => {
  if (fileBrowserRef.value) {
    // Priority: location > type > artist (apply the first one found)
    if (location && typeof location === 'string') {
      fileBrowserRef.value.setSearchFilter(location)
    } else if (type && typeof type === 'string') {
      fileBrowserRef.value.setSearchFilter(type)
    } else if (artistName && typeof artistName === 'string') {
      fileBrowserRef.value.setSearchFilter(artistName)
    }
    // Enable selection mode if arriving from a detail view to add slices
    if ((addToCollection && typeof addToCollection === 'string') || (addToProject && typeof addToProject === 'string')) {
      fileBrowserRef.value.toggleSelectionMode()
      selectionActive.value = true
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

const addSelectedToCollectionFromHeader = (collection: Collection) => {
  headerCollectionDropdownOpen.value = false
  fileBrowserRef.value?.addSelectedToCollection?.(collection)
}

const quickAddToCurrentCollection = () => {
  if (!currentCollection.value) return
  fileBrowserRef.value?.addSelectedToCollection?.(currentCollection.value)
}

const addSelectedToProjectFromHeader = (project: Project) => {
  headerProjectDropdownOpen.value = false
  fileBrowserRef.value?.addSelectedToProject?.(project)
}

const quickAddToCurrentProject = () => {
  if (!currentProject.value) return
  fileBrowserRef.value?.addSelectedToProject?.(currentProject.value)
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


.view-header .fs-6 {
  color: var(--bs-secondary-color);
}

.browser-content {
  overflow: auto;
  width: 100%;
}
</style>
