<template>
  <div class="home-view xp-4">

    <div class="home-content d-flex flex-column gap-5">

      <!-- Sources Section -->
      <section class="home-section">
        <div class="section-header d-flex justify-content-between align-items-center">
          <h2 class="m-0">Sources</h2>
          <a v-if="sources.length > 0" class="link-primary d-flex align-items-center" @click="$router.push('/sources')" role="button">
            View All
          </a>
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

    <!-- Create Project Dialog -->
    <CreateProjectDialog
      v-if="showCreateProject"
      :show="showCreateProject"
      @created="handleCreateProject"
      @close="showCreateProject = false"
    />

    <!-- Source Metadata Editor -->
    <SourceMetadataEditor
      v-if="editingSource"
      :source="editingSource"
      @save="handleSaveSourceMetadata"
      @close="editingSource = null"
    />

    <!-- Bottom Action Bar -->
    <div class="action-bar d-flex justify-content-center gap-3">
      <DeviceDiagnostics />
      <ImportControls @filesImported="handleFilesImported" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, toRef } from 'vue'
import { useRouter } from 'vue-router'
import type { Source, Project, Slice } from '../types/models'
import ImportControls from '../components/ImportControls.vue'
import DeviceDiagnostics from '../components/DeviceDiagnostics.vue'
import CreateProjectDialog from '../components/CreateProjectDialog.vue'
import SourceMetadataEditor from '../components/SourceMetadataEditor.vue'
import SourceCard from '../components/SourceCard.vue'
import LibraryTypeSection from '../components/LibraryTypeSection.vue'
import { useSliceGrouping } from '../composables/useSliceGrouping'
import { formatTime, formatFileSize } from '../utils/helpers'

interface Props {
  sources: Source[]
  projects: Project[]
  slices: Slice[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  openSource: [sourceId: string]
  openProject: [projectId: string]
  filesImported: [files: Source[]]
  projectCreated: []
  updateSource: [sourceId: string, metadata: Partial<Source>]
}>()

const router = useRouter()
const showCreateProject = ref(false)
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
  return [...props.sources]
    .sort((a, b) => b.importedAt - a.importedAt)
    .slice(0, 5)
})

// Show only 3 most recent projects
const recentProjects = computed(() => {
  return [...props.projects]
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

const handleCreateProject = (_project: Project) => {
  // CreateProjectDialog already creates and saves the project with id, timestamps
  showCreateProject.value = false
  emit('projectCreated') // Trigger reload of projects in parent
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

.section-header-actions {
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
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
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
