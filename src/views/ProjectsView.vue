<template>
  <div class="projects-view">
    <header class="view-header p-4 border-bottom">
      <button class="btn btn-outline-secondary mb-3" @click="$router.back()">
        <i class="fas fa-arrow-left me-2"></i>Back
      </button>
      <div class="header-flex">
        <div>
          <h1 class="mb-2">Projects</h1>
          <p class="subtitle m-0">{{ projects.length }} project{{ projects.length !== 1 ? 's' : '' }}</p>
        </div>
        <button class="btn btn-primary" @click="showCreateProject = true">
          <i class="fas fa-plus me-2"></i>New Project
        </button>
      </div>
    </header>

    <div class="projects-content p-4">
      <div v-if="projects.length === 0" class="empty-state text-center py-5">
        <p>No projects created yet.</p>
        <p class="hint">Create a project to organize your practice slices!</p>
      </div>

      <div v-else class="project-grid">
        <div
          v-for="project in sortedProjects"
          :key="project.id"
          class="card h-100"
          style="cursor: pointer;"
          @click="openProject(project.id)"
        >
          <div class="project-color" :style="{ backgroundColor: project.color || '#4a9eff', height: '6px' }"></div>
          <div class="card-body">
            <h3 class="card-title h5">{{ project.name }}</h3>
            <p class="card-text" v-if="project.description">
              {{ project.description }}
            </p>
            <p class="card-text text-muted small">
              {{ project.sliceIds.length }} slice{{ project.sliceIds.length !== 1 ? 's' : '' }}
            </p>
            <p class="card-text text-muted small">
              Updated {{ formatDate(project.updatedAt) }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <CreateProjectDialog
      v-if="showCreateProject"
      :show="showCreateProject"
      @created="handleCreateProject"
      @close="showCreateProject = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import type { Project } from '@/types/models'
import CreateProjectDialog from '@/components/CreateProjectDialog.vue'

interface Props {
  projects: Project[]
}

const props = defineProps<Props>()
const router = useRouter()
const showCreateProject = ref(false)

const emit = defineEmits<{
  projectCreated: []
}>()

const sortedProjects = computed(() => {
  return [...props.projects].sort((a, b) => b.updatedAt - a.updatedAt)
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

const openProject = (projectId: string) => {
  router.push(`/project/${projectId}`)
}

const handleCreateProject = (_project: Project) => {
  // CreateProjectDialog already creates and saves the project
  showCreateProject.value = false
  emit('projectCreated') // Trigger reload of projects in parent
}
</script>

<style scoped>
.projects-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #1a1a1a;
  color: #e0e0e0;
}

.view-header {
  background: #252525;
}

.header-flex {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;
}

.subtitle {
  color: #999;
  font-size: 0.9rem;
}

.projects-content {
  flex: 1;
  overflow-y: auto;
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
}

.project-color {
  height: 6px;
  width: 100%;
}

.project-info {
  padding: 1.5rem;
}

.project-name {
  margin: 0 0 0.5rem 0;
  font-size: 1.2rem;
  color: #fff;
}

.project-description {
  margin: 0.5rem 0;
  font-size: 0.9rem;
  color: #aaa;
  line-height: 1.5;
}

.project-meta {
  margin: 0.75rem 0 0 0;
  font-size: 0.85rem;
  color: #888;
}

.project-date {
  margin: 0.25rem 0 0 0;
  font-size: 0.8rem;
  color: #666;
}

.empty-state {
  color: #888;
}

.hint {
  color: #666;
  font-size: 0.9rem;
}
</style>
