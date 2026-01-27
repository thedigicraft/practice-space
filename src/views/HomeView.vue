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
          <div
            v-for="source in recentSources"
            :key="source.id"
            class="card h-100"
          >
            <div class="card-body d-flex gap-3 align-items-start">
              <div class="source-icon">
                <i class="fas fa-file-audio"></i>
              </div>
              <div class="source-info flex-fill" @click="$emit('openSource', source.id)">
                <h3 class="card-title h5 mb-2">{{ source.title || source.name }}</h3>
                <p class="card-text text-muted my-1">
                  {{ formatDuration(source.duration) }} • {{ formatFileSize(source.size) }}
                </p>
                <p v-if="source.location" class="source-location my-1">
                  <a class="link-secondary text-decoration-none" @click.stop="filterByLocation(source.location)" role="button">
                    <i class="fas fa-map-marker-alt me-1"></i>{{ source.location }}
                  </a>
                </p>
                <p class="card-text text-muted small">
                  Imported {{ formatDate(source.importedAt) }}
                </p>
              </div>
              <button class="btn btn-outline-secondary btn-sm d-flex align-items-center justify-content-center" @click.stop="editSource(source)" title="Edit Metadata">
                <i class="fas fa-edit"></i>
              </button>
            </div>
          </div>
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
          <div v-for="(groups, sliceType) in recentGroupedSlices" :key="sliceType" class="library-type-section">
            <h3 class="type-header d-flex align-items-center gap-2">
                               <div class="item-icon d-flex align-items-center justify-content-center">
                    <i :class="getTypeIcon(sliceType)"></i>
                  </div>
                  {{ formatTypeName(sliceType) }}</h3>
            <div class="grouped-items d-flex flex-column gap-3">
              <div
                v-for="(sliceGroup, title) in groups"
                :key="`${sliceType}-${title}`"
                class="card grouped-item"
                @click="openGroupedSlices(sliceType, title)"
              >
                <div class="card-body d-flex gap-3 align-items-start">
 
                  <div class="item-info flex-fill">
                    <h4 class="item-title d-flex justify-content-between align-items-center gap-2">
                      <div>{{ title }}</div>
                    <span class="badge bg-primary rounded-pill">{{ sliceGroup.count }}</span>
                    </h4>
                    <p v-if="sliceGroup.locations.size > 0" class="item-locations m-0">
                      <i class="fas fa-map-marker-alt me-1"></i>
                      {{ Array.from(sliceGroup.locations).join(', ') }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
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
      <ImportControls @filesImported="handleFilesImported" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Source, Project, Slice } from '../types/models'
import ImportControls from '../components/ImportControls.vue'
import CreateProjectDialog from '../components/CreateProjectDialog.vue'
import SourceMetadataEditor from '../components/SourceMetadataEditor.vue'
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

// Group slices by type and title
const groupedSlices = computed(() => {
  const groups: Record<string, Record<string, { count: number; slices: Slice[]; locations: Set<string> }>> = {}
  
  props.slices.forEach(slice => {
    // Only group slices that have a type and title
    if (!slice.type || !slice.title) return
    
    if (!groups[slice.type]) {
      groups[slice.type] = {}
    }
    
    if (!groups[slice.type][slice.title]) {
      groups[slice.type][slice.title] = { count: 0, slices: [], locations: new Set() }
    }
    
    groups[slice.type][slice.title].count++
    groups[slice.type][slice.title].slices.push(slice)
    
    // Add location from source file
    const source = props.sources.find(s => s.id === slice.audioFileId)
    if (source?.location) {
      groups[slice.type][slice.title].locations.add(source.location)
    }
  })
  
  return groups
})

// Show only 3 most recent items in each type
const recentGroupedSlices = computed(() => {
  const limitedGroups: typeof groupedSlices.value = {}
  
  Object.keys(groupedSlices.value).forEach(type => {
    const titles = Object.keys(groupedSlices.value[type])
    limitedGroups[type] = {}
    
    // Get first 5 titles (most common ones by count)
    titles.slice(0, 5).forEach(title => {
      limitedGroups[type][title] = groupedSlices.value[type][title]
    })
  })
  
  return limitedGroups
})

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

const formatTypeName = (type: string) => {
  return type.charAt(0).toUpperCase() + type.slice(1) + 's'
}

const getTypeIcon = (type: string) => {
  const icons: Record<string, string> = {
    'song': 'fas fa-music',
    'etude': 'fas fa-graduation-cap',
    'scale': 'fas fa-sliders-h',
    'exercise': 'fas fa-dumbbell',
    'warm-up': 'fas fa-fire',
    'technique': 'fas fa-tools',
  }
  return icons[type.toLowerCase()] || 'fas fa-wave-square'
}

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

const formatDuration = (seconds: number) => formatTime(seconds)

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

.library-type-section {
  /* background: #252525; */
  border-radius: 8px;
  padding: 1.5rem;
  min-width: 280px;
  flex-grow: 1;
}

.type-header {
  margin: 0 0 1rem 0;
  font-size: 1.2rem;
  color: #4a9eff;
}

.grouped-items {
}

/* .grouped-item {
  background: #2a2a2a;
  border: 1px solid #353535;
  border-radius: 6px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
} */

.grouped-item:hover {
  background: #303030;
  border-color: #4a9eff;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(74, 158, 255, 0.2);
}

/* .item-icon {
  width: 40px;
  height: 40px;
  background: #1a1a1a;
  border-radius: 6px;
  color: #4a9eff;
  font-size: 1.2rem;
  flex-shrink: 0;
} */

.item-info {
  min-width: 0;
}

.item-title {
  font-size: 0.95rem;  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-meta {
  margin: 0;
  font-size: 0.8rem;
  color: #888;
}

.item-locations {
  font-size: 0.75rem;
  color: #9d4aff;
}

/* Source Grid */
.source-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.source-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.source-info {
  min-width: 0;
  cursor: pointer;
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
