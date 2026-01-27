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
        class="project-card"
        @click="emit('selectProject', project)"
      >
        <div class="project-color-bar" :style="{ background: project.color }"></div>
        <div class="project-content">
          <div class="project-header">
            <h4 class="project-name">{{ project.name }}</h4>
            <span class="project-count">{{ project.sliceCount }}</span>
          </div>
          <p v-if="project.description" class="project-description">
            {{ project.description }}
          </p>
          <div class="project-meta">
            <span>Updated {{ formatDate(project.updatedAt) }}</span>
          </div>
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

.btn-create {
  padding: 0.5rem 1rem;
  background: rgba(74, 158, 255, 0.1);
  border: 1px solid rgba(74, 158, 255, 0.5);
  border-radius: 6px;
  color: #4a9eff;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.btn-create:hover {
  background: rgba(74, 158, 255, 0.2);
  border-color: #4a9eff;
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

.project-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
}

.project-card:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.project-color-bar {
  height: 4px;
  width: 100%;
}

.project-content {
  padding: 1rem;
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
}

.project-name {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 500;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.project-count {
  margin-left: 0.5rem;
  padding: 0.25rem 0.5rem;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 500;
}

.project-description {
  margin: 0 0 0.75rem 0;
  font-size: 0.9rem;
  opacity: 0.8;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.project-meta {
  font-size: 0.8rem;
  opacity: 0.6;
}
</style>
