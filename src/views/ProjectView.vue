<template>
  <div class="project-view">
    <PanelHeader>
      <template #left>
        <div class="project-header-info d-flex align-items-start gap-2" v-if="project">
          <div class="project-color-bar" :style="{ backgroundColor: project.color || '#4a9eff' }"></div>
          <div class="project-title">
            <span class="fs-6 text-uppercase text-secondary fw-semibold">{{ project.name }}</span>
            <p class="project-description mt-1 mb-0" v-if="project.description">
              {{ project.description }}
            </p>
          </div>
        </div>
      </template>
    </PanelHeader>

    <div class="project-content p-4" v-if="project">
      <section class="card slices-section">
        <div class="card-header py-2 d-flex align-items-center">
          <span class="fs-6 text-uppercase text-secondary fw-semibold">Slices in this project</span>
          <span class="badge bg-secondary ms-2">{{ projectSlices.length }}</span>
        </div>
        <div class="card-body p-3">
          <div v-if="projectSlices.length === 0" class="empty-state text-center py-4">
            <p class="my-2">This project has no slices yet.</p>
            <p class="hint my-2">Add slices to this project from the Slice Browser!</p>
          </div>

          <div v-else class="slices-list">
            <SliceListItem
              v-for="slice in projectSlices"
              :key="slice.id"
              :slice="slice"
              :source-name="getSourceName(slice.audioFileId)"
              :is-playing="currentlyPlayingSliceId === slice.id && isPlaying"
              @play="handlePlaySlice(slice)"
              @view-source="handleViewSource(slice.audioFileId)"
            />
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
import SliceListItem from '../components/SliceListItem.vue'
import { formatTime } from '../utils/helpers'
import PanelHeader from '@/components/PanelHeader.vue'

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
  if (!project.value) return []
  return props.slices.filter(s => project.value!.sliceIds.includes(s.id))
})

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
  border-bottom: 1px solid var(--bs-border-color);
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

.project-title .fs-6 {
  color: var(--bs-secondary-color);
}

.project-description {
  font-size: 0.9rem;
  color: var(--bs-secondary-color);
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
}

.section-header {
  margin-bottom: 0.5rem;
}

.section-header h2 {
  margin: 0;
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
