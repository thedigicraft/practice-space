<template>
  <div class="collection-view">
    <PanelHeader :style="headerBgStyle">
      <template #left>
        <div class="collection-header-info d-flex align-items-start gap-2" v-if="collection">
          <div class="collection-title">
            <span class="fs-6 text-uppercase fw-semibold">{{ collection.name }}</span>
            <p class="collection-description mt-1 mb-0" v-if="collection.description">
              {{ collection.description }}
            </p>
            <div class="collection-meta small mt-1">
              <span v-if="collection.type" class="me-3">Type: {{ collection.type }}</span>
              <span v-if="collection.owner" class="me-3">Owner: {{ collection.owner }}</span>
              <span v-if="collection.collaborators && collection.collaborators.length">Collab: {{ collection.collaborators.join(', ') }}</span>
            </div>
          </div>
        </div>
      </template>
      <template #right>
        <div class="d-flex align-items-center gap-2" v-if="collection">
          <button class="btn btn-sm btn-outline-secondary" @click="navigateToSliceBrowser" title="Add slices to this collection" aria-label="Add slices">
            <i class="fas fa-folder-plus me-1"></i>
            <span class="d-none d-sm-inline">Add Slices</span>
          </button>
          <button class="btn btn-sm btn-outline-secondary" @click="showEditCollection = true" title="Edit Collection" aria-label="Edit Collection">
            <i class="fas fa-pen"></i>
          </button>
        </div>
      </template>
    </PanelHeader>

    <div class="collection-content" v-if="collection">
      <section class="card slices-section rounded-0">
        <div class="card-header py-2 d-flex align-items-center rounded-0">
          <span class="fs-6 text-uppercase text-secondary fw-semibold">Slices in this collection</span>
          <span class="badge bg-secondary ms-2">{{ collectionSlices.length }}</span>
        </div>
        <div class="card-body p-3">
          <div v-if="collectionSlices.length === 0" class="empty-state text-center py-4">
            <p class="my-2">This collection has no slices yet.</p>
            <p class="hint my-2">Add slices to this collection from the Slice Browser!</p>
          </div>

          <div v-else class="slices-list">
            <SliceListItem
              v-for="slice in collectionSlices"
              :key="slice.id"
              :slice="slice"
              :source-name="getSourceName(slice.audioFileId)"
              :is-playing="currentlyPlayingSliceId === slice.id && isPlaying"
              @play="handlePlaySlice(slice)"
              @view-source="handleViewSource(slice.audioFileId)"
            />
          </div>
        </div>
      </section>
    </div>

    <div v-else class="empty-state">
      <p>Collection not found.</p>
    </div>
    <EditCollectionDialog
      v-if="collection && showEditCollection"
      :show="showEditCollection"
      :collection="collection"
      @updated="handleCollectionUpdated"
      @close="showEditCollection = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject } from 'vue'
import { useRouter } from 'vue-router'
import type { Ref } from 'vue'
import type { Collection, Slice, Source } from '../types/models'
import SliceListItem from '../components/SliceListItem.vue'
import { formatTime } from '../utils/helpers'
import PanelHeader from '@/components/PanelHeader.vue'
import EditCollectionDialog from '@/components/EditCollectionDialog.vue'
import { getAllCollections } from '@/services/db'

interface Props {
  id: string
  slices: Slice[]
  sources: Source[]
  currentlyPlayingSliceId: string | null
  isPlaying: boolean
}

const props = defineProps<Props>()

// Inject collections from App.vue
const collections = inject<Ref<Collection[]>>('collections')!
const router = useRouter()

// Find the collection by ID from route param
const collection = computed(() => {
  return collections.value.find(p => p.id === props.id) || null
})

const showEditCollection = ref(false)

const emit = defineEmits<{
  back: []
  playSlice: [slice: Slice]
  viewSource: [sourceId: string]
}>()

const collectionSlices = computed(() => {
  const p = collection.value
  if (!p) return []
  const explicit = new Set(p.sliceIds || [])
  const effective = new Set(explicit)
  // Include group-referenced slices dynamically
  for (const g of p.groups || []) {
    for (const s of props.slices) {
      if (s.type === g.type && s.title === g.title) {
        effective.add(s.id)
      }
    }
  }
  return props.slices.filter(s => effective.has(s.id))
})

// Compute a dark, muted background tint from the collection color
const headerBgStyle = computed(() => {
  const baseDark = { r: 18, g: 18, b: 18 } // near app bg
  const hex = collection.value?.color || '#4a9eff'
  const c = hexToRgb(hex)
  if (!c) {
    return { backgroundColor: `rgb(${baseDark.r}, ${baseDark.g}, ${baseDark.b})` }
  }
  // Mix heavily toward dark base for a muted tint
  const weightToDark = 0.8 // 80% dark base, 20% collection color
  const r = Math.round(c.r * (1 - weightToDark) + baseDark.r * weightToDark)
  const g = Math.round(c.g * (1 - weightToDark) + baseDark.g * weightToDark)
  const b = Math.round(c.b * (1 - weightToDark) + baseDark.b * weightToDark)
  return { backgroundColor: `rgb(${r}, ${g}, ${b})` }
})

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.replace('#', '')
  const full = normalized.length === 3
    ? normalized.split('').map(ch => ch + ch).join('')
    : normalized
  const int = parseInt(full, 16)
  if (Number.isNaN(int)) return null
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  }
}

const getSourceName = (sourceId: string): string | undefined => {
  const source = props.sources.find(s => s.id === sourceId)
  return source?.name || undefined
}

const handlePlaySlice = (slice: Slice) => {
  emit('playSlice', slice)
}

const handleViewSource = (sourceId: string) => {
  emit('viewSource', sourceId)
}

const handleCollectionUpdated = async (_collection: Collection) => {
  collections.value = await getAllCollections()
}

const navigateToSliceBrowser = () => {
  if (!collection.value) return
  router.push({ path: '/slices', query: { addToCollection: collection.value.id } })
}
</script>

<style scoped>
.collection-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #1a1a1a;
}

.view-header {
  border-bottom: 1px solid var(--bs-border-color);
}

.header-content {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.collection-header-info {
  flex: 1;
  min-width: 0;
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
}

.collection-title {
  flex: 1;
  min-width: 0;
}

.collection-title .fs-6 {
  color: #fefefe;
}

.collection-description {
  font-size: 0.9rem;
  color: #fefefe;
}

.collection-meta {
  color: #fefefe;
}

.collection-content {
  flex: 1;
  overflow: auto;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.slices-section {
}

.section-header {
  margin-bottom: 0.5rem;
}

.section-header h2 {
  margin: 0;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #888;
}

.empty-state p {
  margin: 0.5rem 0;
}

.hint {
  font-size: 0.9rem;
  color: #666;
}

/* Slices List */
.slices-list {
  display: flex;
  flex-direction: column;
}
</style>