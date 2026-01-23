<template>
  <div class="home-view">
    <header class="view-header">
      <h1>Practice Space</h1>
      <p class="subtitle">Your local-first music practice companion</p>
    </header>

    <div class="home-content">
      <!-- Sources Section -->
      <section class="home-section">
        <div class="section-header">
          <h2>Sources</h2>
          <ImportControls @filesImported="handleFilesImported" />
        </div>
        
        <div v-if="sources.length === 0" class="empty-state">
          <p>No audio sources imported yet.</p>
          <p class="hint">Import audio files to get started!</p>
        </div>

        <div v-else class="source-grid">
          <div
            v-for="source in sources"
            :key="source.id"
            class="source-card"
            @click="$emit('openSource', source.id)"
          >
            <div class="source-icon">🎵</div>
            <div class="source-info">
              <h3 class="source-name">{{ source.name }}</h3>
              <p class="source-meta">
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
import { ref } from 'vue'
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

const showCreateProject = ref(false)

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
