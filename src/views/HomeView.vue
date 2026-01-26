<template>
  <div class="home-view p-4">
    <header class="view-header">
      <h1 class="mb-2">Practice Space</h1>
      <p class="subtitle m-0">Your local-first music practice companion</p>
    </header>

    <div class="home-content">
      <!-- Grouped Slices Section -->
      <section class="home-section" v-if="Object.keys(groupedSlices).length > 0">
        <div class="section-header">
          <h2 class="m-0">My Library</h2>
        </div>

        <div class="library-grid">
          <div v-for="(groups, sliceType) in groupedSlices" :key="sliceType" class="library-type-section">
            <h3 class="type-header">{{ formatTypeName(sliceType) }}</h3>
            <div class="grouped-items">
              <div
                v-for="(sliceGroup, title) in groups"
                :key="`${sliceType}-${title}`"
                class="grouped-item"
                @click="openGroupedSlices(sliceType, title)"
              >
                <div class="item-icon">
                  <i :class="getTypeIcon(sliceType)"></i>
                </div>
                <div class="item-info">
                  <h4 class="item-title">{{ title }}</h4>
                  <p class="item-meta">
                    {{ sliceGroup.count }} {{ sliceGroup.count === 1 ? 'slice' : 'slices' }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Sources Section -->
      <section class="home-section">
        <div class="section-header">
          <h2 class="m-0">Sources</h2>
          <ImportControls @filesImported="handleFilesImported" />
        </div>
        
        <div v-if="sources.length === 0" class="empty-state text-center py-5 px-3">
          <p class="my-2">No audio sources imported yet.</p>
          <p class="hint my-2">Import audio files to get started!</p>
        </div>

        <div v-else class="source-grid">
          <div
            v-for="source in sources"
            :key="source.id"
            class="source-card p-3"
            @click="$emit('openSource', source.id)"
          >
            <div class="source-icon">🎵</div>
            <div class="source-info">
              <h3 class="source-name mb-2">{{ source.name }}</h3>
              <p class="source-meta my-1">
                {{ formatDuration(source.duration) }} • {{ formatFileSize(source.size) }}
              </p>
              <p class="source-date">
                Imported {{ formatDate(source.importedAt) }}
              </p>
            </div>
          </div>
        </div>
      </section>

      <!-- Projects Section -->
      <section class="home-section">
        <div class="section-header">
          <h2>Projects</h2>
          <button class="btn-primary" @click="showCreateProject = true">
            + New Project
          </button>
        </div>

        <div v-if="projects.length === 0" class="empty-state">
          <p>No projects created yet.</p>
          <p class="hint">Create a project to organize your practice slices!</p>
        </div>

        <div v-else class="project-grid">
          <div
            v-for="project in projects"
            :key="project.id"
            class="project-card"
            @click="$emit('openProject', project.id)"
          >
            <div class="project-color" :style="{ backgroundColor: project.color || '#4a9eff' }"></div>
            <div class="project-info">
              <h3 class="project-name">{{ project.name }}</h3>
              <p class="project-description" v-if="project.description">
                {{ project.description }}
              </p>
              <p class="project-meta">
                {{ project.sliceIds.length }} slice{{ project.sliceIds.length !== 1 ? 's' : '' }}
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- Create Project Dialog -->
    <CreateProjectDialog
      v-if="showCreateProject"
      :slices="slices"
      @create="handleCreateProject"
      @cancel="showCreateProject = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Source, Project, Slice } from '../types/models'
import ImportControls from '../components/ImportControls.vue'
import CreateProjectDialog from '../components/CreateProjectDialog.vue'
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
  createProject: [project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>]
}>()

const router = useRouter()
const showCreateProject = ref(false)

// Group slices by type and title
const groupedSlices = computed(() => {
  const groups: Record<string, Record<string, { count: number; slices: Slice[] }>> = {}
  
  props.slices.forEach(slice => {
    // Only group slices that have a type and title
    if (!slice.type || !slice.title) return
    
    if (!groups[slice.type]) {
      groups[slice.type] = {}
    }
    
    if (!groups[slice.type][slice.title]) {
      groups[slice.type][slice.title] = { count: 0, slices: [] }
    }
    
    groups[slice.type][slice.title].count++
    groups[slice.type][slice.title].slices.push(slice)
  })
  
  return groups
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

const handleCreateProject = (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
  emit('createProject', project)
  showCreateProject.value = false
}
</script>

<style scoped>
.home-view {
  padding: 2rem;
}

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
  display: flex;
  flex-direction: column;
  gap: 3rem;
}

.home-section {
  background: #1e1e1e;
  border-radius: 8px;
  padding: 1.5rem;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.section-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #fff;
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
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.library-type-section {
  background: #252525;
  border-radius: 8px;
  padding: 1.5rem;
}

.type-header {
  margin: 0 0 1rem 0;
  font-size: 1.2rem;
  color: #4a9eff;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.grouped-items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 0.75rem;
}

.grouped-item {
  background: #2a2a2a;
  border: 1px solid #353535;
  border-radius: 6px;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  gap: 1rem;
  align-items: center;
}

.grouped-item:hover {
  background: #303030;
  border-color: #4a9eff;
  transform: translateY(-2px);
  box-shadow: 0 2px 8px rgba(74, 158, 255, 0.2);
}

.item-icon {
  width: 40px;
  height: 40px;
  background: #1a1a1a;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #4a9eff;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-title {
  margin: 0 0 0.25rem 0;
  font-size: 0.95rem;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-meta {
  margin: 0;
  font-size: 0.8rem;
  color: #888;
}

/* Source Grid */
.source-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.source-card {
  background: #2a2a2a;
  border-radius: 8px;
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.source-card:hover {
  background: #333;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.source-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.source-info {
  flex: 1;
  min-width: 0;
}

.source-name {
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.source-meta,
.source-date {
  margin: 0.25rem 0;
  font-size: 0.85rem;
  color: #888;
}

/* Project Grid */
.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.project-card {
  background: #2a2a2a;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
}

.project-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
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

.btn-primary {
  background: #4a9eff;
  color: white;
  border: none;
  padding: 0.6rem 1.2rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  transition: background 0.2s;
}

.btn-primary:hover {
  background: #357abd;
}
</style>
