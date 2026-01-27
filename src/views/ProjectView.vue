<template>
  <div class="project-view">
    <header class="view-header">
      <div class="header-content px-4 py-3">
        <button class="btn btn-outline-secondary" @click="$emit('back')">
          <i class="fas fa-arrow-left me-2"></i>Back
        </button>
        <div class="project-header-info" v-if="project">
          <div class="project-color-bar" :style="{ backgroundColor: project.color || '#4a9eff' }"></div>
          <div class="project-title">
            <h1 class="m-0">{{ project.name }}</h1>
            <p class="project-description mt-2" v-if="project.description">
              {{ project.description }}
            </p>
          </div>
        </div>
      </div>
    </header>

    <div class="project-content p-4" v-if="project">
      <section class="slices-section p-4">
        <div class="section-header">
          <h2 class="m-0">Slices in this project ({{ projectSlices.length }})</h2>
        </div>

        <div v-if="projectSlices.length === 0" class="empty-state text-center py-5 px-3">
          <p class="my-2">This project has no slices yet.</p>
          <p class="hint my-2">Add slices to this project from the Slice Browser!</p>
        </div>

        <div v-else class="slices-list">
          <div
            v-for="slice in projectSlices"
            :key="slice.id"
            class="card mb-3"
            :class="{ 'border-primary': currentlyPlayingSliceId === slice.id && isPlaying }"
          >
            <div class="card-body d-flex gap-3 align-items-start">
              <button 
                class="btn btn-primary btn-sm play-btn"
                @click="handlePlaySlice(slice)"
              >
                <i :class="currentlyPlayingSliceId === slice.id && isPlaying ? 'fas fa-pause' : 'fas fa-play'"></i>
              </button>
              <div class="slice-info flex-fill">
                <h3 class="card-title h6 mb-2">{{ slice.title }}</h3>
                <p class="card-text text-muted small mb-1" v-if="getSourceName(slice.audioFileId)">
                  Source: {{ getSourceName(slice.audioFileId) }}
                </p>
                <p class="card-text text-muted small">
                  {{ formatTime(slice.startTime) }} - {{ formatTime(slice.endTime) }}
                  <span class="slice-duration">({{ formatDuration(slice.endTime - slice.startTime) }})</span>
                </p>
                <div v-if="slice.tags && slice.tags.length > 0" class="slice-tags mt-2">
                  <span v-for="tag in slice.tags" :key="tag" class="badge bg-primary me-1">{{ tag }}</span>
                </div>
              </div>
              <button 
                class="btn btn-sm btn-outline-secondary"
                @click="handleViewSource(slice.audioFileId)"
                title="View in Source Editor"
              >
                View Source <i class="fas fa-arrow-right"></i>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>

    <div v-else class="empty-state">
      <p>Project not found.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import type { Ref } from 'vue'
import type { Project, Slice, Source } from '../types/models'
import { formatTime } from '../utils/helpers'

interface Props {
  id: string
  slices: Slice[]
  sources: Source[]
  currentlyPlayingSliceId: string | null
  isPlaying: boolean
}

const props = defineProps<Props>()

// Inject projects from App.vue
const projects = inject<Ref<Project[]>>('projects')!

// Find the project by ID from route param
const project = computed(() => {
  return projects.value.find(p => p.id === props.id) || null
})

const emit = defineEmits<{
  back: []
  playSlice: [slice: Slice]
  viewSource: [sourceId: string]
}>()

const projectSlices = computed(() => {
  if (!props.project) return []
  return props.slices.filter(s => props.project!.sliceIds.includes(s.id))
})

const formatDuration = (seconds: number) => formatTime(seconds)

const getSourceName = (sourceId: string): string | null => {
  const source = props.sources.find(s => s.id === sourceId)
  return source?.name || null
}

const handlePlaySlice = (slice: Slice) => {
  emit('playSlice', slice)
}

const handleViewSource = (sourceId: string) => {
  emit('viewSource', sourceId)
}
</script>

<style scoped>
.project-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #1a1a1a;
}

.view-header {
  
  border-bottom: 1px solid #333;
  padding: 1rem 2rem;
}

.header-content {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.project-header-info {
  flex: 1;
  min-width: 0;
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.project-color-bar {
  width: 4px;
  height: 60px;
  border-radius: 2px;
  flex-shrink: 0;
}

.project-title {
  flex: 1;
  min-width: 0;
}

.project-title h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #fff;
}

.project-description {
  margin: 0.5rem 0 0 0;
  font-size: 0.9rem;
  color: #aaa;
}

.project-content {
  flex: 1;
  overflow: auto;
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.slices-section {
  
  border-radius: 8px;
  padding: 1.5rem;
}

.section-header {
  margin-bottom: 1.5rem;
}

.section-header h2 {
  margin: 0;
  font-size: 1.3rem;
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

/* Slices List */
.slices-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.play-btn {
  background: #4a9eff;
  color: white;
  border: none;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.2s;
}

.play-btn:hover {
  background: #357abd;
  transform: scale(1.05);
}

.slice-info {
  flex: 1;
  min-width: 0;
}

.slice-title {
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  color: #fff;
}

.slice-source {
  margin: 0 0 0.25rem 0;
  font-size: 0.85rem;
  color: #4a9eff;
}

.slice-time {
  margin: 0 0 0.5rem 0;
  font-size: 0.85rem;
  color: #888;
}

.slice-duration {
  color: #666;
  margin-left: 0.5rem;
}

.slice-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tag {
  background: #333;
  color: #4a9eff;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
}

.btn-view-source {
  background: #2a2a2a;
  color: #4a9eff;
  border: 1px solid #4a9eff;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-view-source:hover {
  background: #4a9eff;
  color: white;
}
</style>
