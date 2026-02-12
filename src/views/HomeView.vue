<template>
  <div class="home-view xp-4">

    <div class="home-content d-flex flex-column gap-5">

      <!-- Sources Section -->
      <section class="home-section">
        <div class="section-header d-flex justify-content-between align-items-center">
          <h2 class="m-0">Sources</h2>
          <div class="d-flex align-items-center gap-2">
            <ImportControls :icon-only="true" :show-status="false" @filesImported="handleFilesImported" />
            <a v-if="sources.length > 0" class="link-primary d-flex align-items-center" @click="$router.push('/sources')" role="button" title="View All Sources" aria-label="View All Sources">
              View All
            </a>
          </div>
        </div>
        
        <div v-if="sources.length === 0" class="empty-state text-center py-5 px-3">
          <p class="my-2">No audio sources imported yet.</p>
          <p class="hint my-2">Import audio files to get started!</p>
        </div>

        <div v-else class="source-grid">
          <SourceCard
            v-for="source in recentSources"
            :key="source.id"
            :source="source"
            :slice-count="getSliceCount(source.id)"
            @click="$emit('openSource', source.id)"
            @edit="editSource(source)"
            @filter-location="filterByLocation"
          />
        </div>
      </section>

            <!-- Grouped Slices Section -->
      <section class="home-section" v-if="Object.keys(groupedSlices).length > 0">
        <div class="section-header d-flex justify-content-between align-items-center">
          <h2 class="m-0">My Library</h2>
          <a class="link-primary d-flex align-items-center" @click="$router.push('/library')" role="button">
            View All
          </a>
        </div>

        <div class="library-grid d-flex flex-row gap-4">
          <LibraryTypeSection
            v-for="(groups, sliceType) in recentGroupedSlices"
            :key="sliceType"
            :slice-type="sliceType"
            :groups="groups"
            @open-group="openGroupedSlices"
          />
        </div>
      </section>

    </div>

    <!-- Create Collection Dialog -->
    <CreateCollectionDialog
      v-if="showCreateCollection"
      :show="showCreateCollection"
      @created="handleCreateCollection"
      @close="showCreateCollection = false"
    />

    <!-- Source Metadata Editor -->
    <SourceMetadataEditor
      v-if="editingSource"
      :source="editingSource"
      @save="handleSaveSourceMetadata"
      @close="editingSource = null"
    />

    
  </div>
</template>

<script setup lang="ts">
import { ref, computed, toRef } from 'vue'
import { useRouter } from 'vue-router'
import type { Source, Collection, Slice } from '../types/models'
import ImportControls from '../components/ImportControls.vue'
import DeviceDiagnostics from '../components/DeviceDiagnostics.vue'
import CreateCollectionDialog from '../components/CreateCollectionDialog.vue'
import SourceMetadataEditor from '../components/SourceMetadataEditor.vue'
import SourceCard from '../components/SourceCard.vue'
import LibraryTypeSection from '../components/LibraryTypeSection.vue'
import { useSliceGrouping } from '../composables/useSliceGrouping'
import { formatTime, formatFileSize } from '../utils/helpers'

interface Props {
  sources: Source[]
  collections: Collection[]
  slices: Slice[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  openSource: [sourceId: string]
  openCollection: [collectionId: string]
  filesImported: [files: Source[]]
  collectionCreated: []
  updateSource: [sourceId: string, metadata: Partial<Source>]
}>()

const router = useRouter()
const showCreateCollection = ref(false)
const editingSource = ref<Source | null>(null)

// Use slice grouping composable
const { groupedSlices, getRecentGroupedSlices } = useSliceGrouping({
  slices: toRef(() => props.slices),
  sources: toRef(() => props.sources)
})

// Show only 5 most recent items in each type
const recentGroupedSlices = computed(() => getRecentGroupedSlices(5))

// Show only 3 most recent sources
const recentSources = computed(() => {
  return props.sources
    .filter(s => !s.isClip)
    .sort((a, b) => b.importedAt - a.importedAt)
    .slice(0, 5)
})

// Show only 3 most recent collections
const recentCollections = computed(() => {
  return [...props.collections]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 3)
})

const openGroupedSlices = (type: string, title: string) => {
  router.push({
    path: '/grouped-slices',
    query: { type, title }
  })
}

const filterByLocation = (location: string) => {
  router.push({
    path: '/slices',
    query: { location }
  })
}

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))
  
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString()
}

const handleFilesImported = (files: Source[]) => {
  emit('filesImported', files)
}

const handleCreateCollection = (_collection: Collection) => {
  // CreateCollectionDialog already creates and saves the collection with id, timestamps
  showCreateCollection.value = false
  emit('collectionCreated') // Trigger reload of collections in parent
}

const editSource = (source: Source) => {
  editingSource.value = source
}

const handleSaveSourceMetadata = (metadata: Partial<Source>) => {
  if (editingSource.value) {
    emit('updateSource', editingSource.value.id, metadata)
    editingSource.value = null
  }
}

// Count slices for a given source
const getSliceCount = (sourceId: string) => {
  return props.slices.filter(s => s.audioFileId === sourceId).length
}
</script>

<style scoped>

.view-header {
  text-align: center;
  margin-bottom: 3rem;
}

.view-header h1 {
  font-size: 2.5rem;
  margin: 0 0 0.5rem 0;
  color: #fff;
}

.subtitle {
  color: #888;
  font-size: 1.1rem;
  margin: 0;
}

.home-content {
  padding-bottom: 80px;
}

.home-section {
  
  border-radius: 8px;
  padding: 1.5rem;
}

.section-header {
  margin-bottom: 1.5rem;
}

.section-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #fff;
}

.view-all-link {
  color: #4a9eff;
  font-size: 0.9rem;
  cursor: pointer;
  transition: color 0.2s;
  text-decoration: none;
}

.view-all-link:hover {
  color: #6bb3ff;
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

/* Library Grid */
.library-grid {
  overflow-x: auto;
}

/* Source Grid */
.source-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 1rem;
}

/* Project Grid */
.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.project-color {
  height: 4px;
  width: 100%;
}

.project-info {
  padding: 1.5rem;
}

.project-name {
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  color: #fff;
}

.project-description {
  margin: 0 0 0.75rem 0;
  font-size: 0.9rem;
  color: #aaa;
  display: -webkit-box;
  line-clamp: 2;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.project-meta {
  margin: 0;
  font-size: 0.85rem;
  color: #888;
}

.action-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #252525;
  border-top: 1px solid #353535;
  padding: 1rem;
  z-index: 100;
}
</style>
