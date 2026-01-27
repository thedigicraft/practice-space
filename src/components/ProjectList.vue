<script setup lang="ts">
import { computed } from 'vue'
import type { Project, Slice } from '@/types/models'

interface Props {
  projects: Project[]
  slices: Slice[]
}

const props = defineProps<Props>()

const emit = defineEmits<{
  selectProject: [project: Project]
  createProject: []
}>()

const projectsWithCounts = computed(() => {
  return props.projects.map(project => ({
    ...project,
    sliceCount: project.sliceIds.length,
  }))
})

const formatDate = (timestamp: number): string => {
  const date = new Date(timestamp)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
</script>

<template>
  <div class="project-list">
    <div class="list-header">
      <h3>Projects</h3>
      <button @click="emit('createProject')" class="btn btn-primary">
        <i class="fas fa-plus me-1"></i>New Project
      </button>
    </div>

    <div v-if="projects.length === 0" class="empty-state">
      <p>No projects yet</p>
      <p class="hint">Create projects to organize your slices</p>
    </div>

    <div v-else class="projects-grid">
      <div
        v-for="project in projectsWithCounts"
        :key="project.id"
        class="card h-100"
        style="cursor: pointer;"
        @click="emit('selectProject', project)"
      >
        <div class="project-color-bar" :style="{ background: project.color, height: '4px' }"></div>
        <div class="card-body">
          <div class="d-flex justify-content-between align-items-start mb-2">
            <h4 class="card-title h6 m-0">{{ project.name }}</h4>
            <span class="badge bg-primary">{{ project.sliceCount }}</span>
          </div>
          <p v-if="project.description" class="card-text">
            {{ project.description }}
          </p>
          <p class="card-text text-muted small">
            Updated {{ formatDate(project.updatedAt) }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.project-list {
  width: 100%;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
}

.list-header h3 {
  margin: 0;
  font-size: 1.25rem;
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  opacity: 0.5;
}

.empty-state p {
  margin: 0.5rem 0;
}

.hint {
  font-size: 0.85rem;
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.project-color-bar {
  width: 100%;
}
</style>
