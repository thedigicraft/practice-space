<template>
  <div class="collections-view">
    <PanelHeader>
      <template #left>
        <div class="d-flex align-items-center gap-2">
          <span class="fs-6 text-uppercase text-secondary fw-semibold">Collections</span>
          <span class="badge bg-secondary">{{ collections.length }}</span>
        </div>
      </template>
      <template #right>
        <button class="btn btn-primary btn-sm" @click="showCreateCollection = true" title="Create new collection" aria-label="Create new collection">
          <i class="fas fa-plus me-2"></i>New Collection
        </button>
      </template>
    </PanelHeader>

    <div class="collections-layout d-flex flex-row flex-grow-1">
      <div class="collections-content flex-fill p-4">
        <div v-if="collections.length === 0" class="empty-state text-center py-5">
          <p>No collections created yet.</p>
          <p class="hint">Create a collection to organize your practice slices!</p>
        </div>

        <div v-else class="collection-grid">
          <div
            v-for="collection in sortedCollections"
            :key="collection.id"
            class="card h-100 collection-card"
            :class="{ 'is-drop-hover': dropHoverCollectionId === collection.id, 'is-drop-denied': dropDeniedCollectionId === collection.id }"
            @click="openCollection(collection.id)"
            @dragover.prevent="onDragOverCollection(collection, $event)"
            @dragenter.prevent="onDragEnterCollection(collection, $event)"
            @dragleave.prevent="onDragLeaveCollection(collection.id)"
            @drop.prevent="onDropToCollection(collection, $event)"
          >
            <div class="collection-color" :style="{ backgroundColor: collection.color || '#4a9eff', height: '6px' }"></div>
            <div class="card-body">
              <h3 class="card-title h5 d-flex align-items-center justify-content-between">
                <span>{{ collection.name }}</span>
                <span class="badge bg-secondary">{{ getEffectiveSliceCount(collection) }}</span>
              </h3>
              <p class="card-text" v-if="collection.description">
                {{ collection.description }}
              </p>
              <p class="card-text text-muted small" v-if="collection.type">
                Type: {{ collection.type }}
              </p>
              <p class="card-text text-muted small" v-if="collection.owner">
                Owner: {{ collection.owner }}
              </p>
              <p class="card-text text-muted small" v-if="collection.collaborators && collection.collaborators.length">
                Collaborators: {{ collection.collaborators.join(', ') }}
              </p>
              <p class="card-text text-muted small">
                Updated {{ formatDate(collection.updatedAt) }}
              </p>
              <div class="drop-hint small text-muted">Drag slices or groups here</div>
            </div>

            <!-- Drag-over overlay indication -->
            <div v-if="dropHoverCollectionId === collection.id" :class="['drop-target-overlay', { denied: dropDeniedCollectionId === collection.id }]" aria-label="Drop slices to add to collection">
              <div class="overlay-inner d-flex flex-column align-items-center justify-content-center">
                <i :class="dropDeniedCollectionId === collection.id ? 'fas fa-ban fa-2x mb-2' : 'fas fa-plus-circle fa-2x mb-2'"></i>
                <div class="text">
                  {{ dropDeniedCollectionId === collection.id
                    ? 'Already added'
                    : (hoverAddCount != null ? `Release to add ${hoverAddCount}` : 'Release to add') }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sidebar Slice Browser -->
      <SidebarSliceBrowser class="sidebar" :slices="slices" :sources="sources" />
    </div>

    <CreateCollectionDialog
      v-if="showCreateCollection"
      :show="showCreateCollection"
      @created="handleCreateCollection"
      @close="showCreateCollection = false"
    />

    <!-- Toast -->
    <ToastNotification
      :visible="toastVisible"
      :message="toastMessage"
      :type="toastType"
      @close="toastVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject } from 'vue'
import { useRouter } from 'vue-router'
import type { Collection } from '@/types/models'
import CreateCollectionDialog from '@/components/CreateCollectionDialog.vue'
import PanelHeader from '@/components/PanelHeader.vue'
import SidebarSliceBrowser from '@/components/SidebarSliceBrowser.vue'
import ToastNotification from '@/components/ToastNotification.vue'
import type { Slice, Source } from '@/types/models'
import { saveCollection, getAllCollections } from '@/services/db'

interface Props {
  collections: Collection[]
  slices: Slice[]
  sources: Source[]
}

const props = defineProps<Props>()
const router = useRouter()
const showCreateCollection = ref(false)
const collectionsRef = inject<any>('collections') as any
const dropHoverCollectionId = ref<string | null>(null)
const lastDropAt = ref<number>(0)
const dropDeniedCollectionId = ref<string | null>(null)
const hoverAddCount = ref<number | null>(null)

// Effective slice IDs considering group references
const getSlicesForGroup = (type: string, title: string): Slice[] => {
  return props.slices.filter(s => s.type === type && s.title === title)
}

const getEffectiveSliceIds = (collection: Collection): Set<string> => {
  const ids = new Set(collection.sliceIds || [])
  const groups = collection.groups || []
  for (const g of groups) {
    for (const s of getSlicesForGroup(g.type, g.title)) {
      ids.add(s.id)
    }
  }
  return ids
}

const getEffectiveSliceCount = (collection: Collection): number => {
  return getEffectiveSliceIds(collection).size
}

// Toast state
const toastVisible = ref(false)
const toastMessage = ref('')
const toastType = ref<'success' | 'error' | 'info' | 'loading'>('info')
const showToast = (message: string, type: 'success' | 'error' | 'info' | 'loading' = 'info') => {
  toastMessage.value = message
  toastType.value = type
  toastVisible.value = true
}

const emit = defineEmits<{
  collectionCreated: []
}>()

const sortedCollections = computed(() => {
  return [...props.collections].sort((a, b) => {
    const an = (a.name || '').toLocaleLowerCase()
    const bn = (b.name || '').toLocaleLowerCase()
    if (an < bn) return -1
    if (an > bn) return 1
    return 0
  })
})

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString()
}

const openCollection = (collectionId: string) => {
  // Suppress accidental click triggered immediately after a drop
  if (Date.now() - lastDropAt.value < 300) return
  router.push(`/collection/${collectionId}`)
}

type DragPayload = { kind: 'slice-ids'; sliceIds: string[] } | { kind: 'group-ref'; ref: { type: string; title: string } }

const getDragPayload = (dt: DataTransfer | null): DragPayload | null => {
  if (!dt) return null
  try {
    const raw = dt.getData('application/x-practice-slices')
    if (raw) {
      const payload = JSON.parse(raw) as DragPayload
      if (payload && payload.kind) return payload
    }
  } catch {}
  const text = dt.getData('text/plain') || ''
  if (text.startsWith('slices:')) {
    const sliceIds = text.replace('slices:', '').split(',').filter(Boolean)
    return { kind: 'slice-ids', sliceIds }
  }
  if (text.startsWith('group:')) {
    const parts = Object.fromEntries(text.replace('group:', '').split(';').map(kv => kv.split('='))) as any
    if (parts.type && parts.title) return { kind: 'group-ref', ref: { type: parts.type, title: parts.title } }
  }
  return null
}

const evaluateDrop = (collection: Collection, e: DragEvent) => {
  const payload = getDragPayload(e.dataTransfer)
  if (!payload) {
    dropDeniedCollectionId.value = null
    hoverAddCount.value = null
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    return
  }
  if (payload.kind === 'slice-ids') {
    const existing = getEffectiveSliceIds(collection)
    const addable = payload.sliceIds.filter(id => !existing.has(id))
    hoverAddCount.value = addable.length
    const denied = addable.length === 0
    dropDeniedCollectionId.value = denied ? collection.id : null
    if (e.dataTransfer) e.dataTransfer.dropEffect = denied ? 'none' : 'copy'
  } else {
    // group-ref
    const exists = (collection.groups || []).some(g => g.type === payload.ref.type && g.title === payload.ref.title)
    dropDeniedCollectionId.value = exists ? collection.id : null
    const groupSliceCount = getSlicesForGroup(payload.ref.type, payload.ref.title).length
    hoverAddCount.value = exists ? 0 : groupSliceCount
    if (e.dataTransfer) e.dataTransfer.dropEffect = exists ? 'none' : 'copy'
  }
}

const onDragOverCollection = (collection: Collection, e: DragEvent) => {
  evaluateDrop(collection, e)
}

const onDragEnterCollection = (collection: Collection, e: DragEvent) => {
  dropHoverCollectionId.value = collection.id
  evaluateDrop(collection, e)
}

const onDragLeaveCollection = (id: string) => {
  if (dropHoverCollectionId.value === id) dropHoverCollectionId.value = null
  if (dropDeniedCollectionId.value === id) dropDeniedCollectionId.value = null
  hoverAddCount.value = null
}

const onDropToCollection = async (collection: Collection, e: DragEvent) => {
  dropHoverCollectionId.value = null
  try {
    const payload = getDragPayload(e.dataTransfer)
    if (!payload) return
    if (payload.kind === 'slice-ids') {
      const existing = getEffectiveSliceIds(collection)
      const toAdd = payload.sliceIds.filter(id => !existing.has(id))
      if (toAdd.length === 0) {
        showToast('Already in collection', 'info')
        return
      }
      const updated: Collection = { ...collection, sliceIds: Array.from(new Set([...(collection.sliceIds || []), ...toAdd])), updatedAt: Date.now() }
      showToast(`Adding ${toAdd.length} to \"${collection.name}\"...`, 'loading')
      await saveCollection(updated)
    } else {
      // Add group reference
      const already = (collection.groups || []).some(g => g.type === payload.ref.type && g.title === payload.ref.title)
      if (already) {
        showToast('Group already in collection', 'info')
        return
      }
      const updated: Collection = { ...collection, groups: [ ...(collection.groups || []), { type: payload.ref.type, title: payload.ref.title } ], updatedAt: Date.now() }
      showToast(`Adding group to \"${collection.name}\"...`, 'loading')
      await saveCollection(updated)
    }
    lastDropAt.value = Date.now()
    try {
      const all = await getAllCollections()
      if (collectionsRef && collectionsRef.value) collectionsRef.value = all
    } catch {}
    showToast(`Added to "${collection.name}"`, 'success')
  } catch (err) {
    console.error('Drop failed', err)
    showToast('Failed to add to collection', 'error')
  }
}

const handleCreateCollection = (_collection: Collection) => {
  // CreateCollectionDialog already creates and saves the collection
  showCreateCollection.value = false
  emit('collectionCreated') // Trigger reload of collections in parent
}
</script>

<style scoped>
.collections-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #1a1a1a;
  color: #e0e0e0;
}

.view-header {
  background: var(--bs-body-bg);
}

.header-flex {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;
}

.subtitle {
  color: var(--bs-secondary-color);
}

.collections-layout { min-height: 0; }

.collections-content {
  flex: 1;
  overflow-y: auto;
}

.collection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

.collection-card {
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  position: relative;
  overflow: hidden;
}

.collection-card.is-drop-hover {
  border-color: rgba(74, 158, 255, 0.8) !important;
  box-shadow: 0 0 0 3px rgba(74, 158, 255, 0.35), 0 8px 24px rgba(0,0,0,0.35);
}

.collection-card.is-drop-denied {
  border-color: rgba(244, 67, 54, 0.85) !important;
  box-shadow: 0 0 0 3px rgba(244, 67, 54, 0.35), 0 8px 24px rgba(0,0,0,0.35);
  cursor: not-allowed;
}

.collection-color {
  height: 6px;
  width: 100%;
}

.collection-info {
  padding: 1.5rem;
}

.collection-name {
  margin: 0 0 0.5rem 0;
  font-size: 1.2rem;
  color: #fff;
}
</style>