<template>
  <div class="project-view">
    <PanelHeader :style="headerBgStyle">
      <template #left>
        <div class="project-header-info d-flex align-items-start gap-2" v-if="project">
          <div class="project-title">
            <span class="fs-6 text-uppercase fw-semibold">{{ project.name }}</span>
            <p class="project-description mt-1 mb-0" v-if="project.description">
              {{ project.description }}
            </p>
            <div class="project-meta small mt-1">
              <span v-if="project.type" class="me-3">Type: {{ project.type }}</span>
              <span v-if="project.owner" class="me-3">Owner: {{ project.owner }}</span>
              <span v-if="project.collaborators && project.collaborators.length">Collab: {{ project.collaborators.join(', ') }}</span>
            </div>
          </div>
        </div>
      </template>
      <template #right>
        <div class="d-flex align-items-center gap-2" v-if="project">
          <button class="btn btn-sm btn-outline-secondary" @click="navigateToSliceBrowser" title="Add slices to this project" aria-label="Add slices">
            <i class="fas fa-folder-plus me-1"></i>
            <span class="d-none d-sm-inline">Add Slices</span>
          </button>
          <button class="btn btn-sm btn-outline-secondary" @click="showEditProject = true" title="Edit Project" aria-label="Edit Project">
            <i class="fas fa-pen"></i>
          </button>
        </div>
      </template>
    </PanelHeader>

    <div class="project-content" v-if="project">
      <section class="card slices-section rounded-0">
        <div class="card-header py-2 d-flex align-items-center rounded-0">
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
    <EditProjectDialog
      v-if="project && showEditProject"
      :show="showEditProject"
      :project="project"
      @updated="handleProjectUpdated"
      @close="showEditProject = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject } from 'vue'
import { useRouter } from 'vue-router'
import type { Ref } from 'vue'
import type { Project, Slice, Source } from '../types/models'
import SliceListItem from '../components/SliceListItem.vue'
import { formatTime } from '../utils/helpers'
import PanelHeader from '@/components/PanelHeader.vue'
import EditProjectDialog from '@/components/EditProjectDialog.vue'
import { getAllProjects } from '@/services/db'

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
const router = useRouter()

// Find the project by ID from route param
const project = computed(() => {
  return projects.value.find(p => p.id === props.id) || null
})

const showEditProject = ref(false)

const emit = defineEmits<{
  back: []
  playSlice: [slice: Slice]
  viewSource: [sourceId: string]
}>()

const projectSlices = computed(() => {
  const p = project.value
  if (!p) return []
  const explicit = new Set(p.sliceIds || [])
  const effective = new Set(explicit)
  // Include group-referenced slices dynamically
  for (const g of p.groups || []) {
    for (const s of props.slices) {
      if (s.type === g.type && s.title === g.title) {
        effective.add(s.id)
      }
    }
  }
  return props.slices.filter(s => effective.has(s.id))
})

// Compute a dark, muted background tint from the project color
const headerBgStyle = computed(() => {
  const baseDark = { r: 18, g: 18, b: 18 } // near app bg
  const hex = project.value?.color || '#4a9eff'
  const c = hexToRgb(hex)
  if (!c) {
    return { backgroundColor: `rgb(${baseDark.r}, ${baseDark.g}, ${baseDark.b})` }
  }
  // Mix heavily toward dark base for a muted tint
  const weightToDark = 0.8 // 80% dark base, 20% project color
  const r = Math.round(c.r * (1 - weightToDark) + baseDark.r * weightToDark)
  const g = Math.round(c.g * (1 - weightToDark) + baseDark.g * weightToDark)
  const b = Math.round(c.b * (1 - weightToDark) + baseDark.b * weightToDark)
  return { backgroundColor: `rgb(${r}, ${g}, ${b})` }
})

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = hex.replace('#', '')
  const full = normalized.length === 3
    ? normalized.split('').map(ch => ch + ch).join('')
    : normalized
  const int = parseInt(full, 16)
  if (Number.isNaN(int)) return null
  return {
    r: (int >> 16) & 255,
    g: (int >> 8) & 255,
    b: int & 255,
  }
}

const getSourceName = (sourceId: string): string | undefined => {
  const source = props.sources.find(s => s.id === sourceId)
  return source?.name || undefined
}

const handlePlaySlice = (slice: Slice) => {
  emit('playSlice', slice)
}

const handleViewSource = (sourceId: string) => {
  emit('viewSource', sourceId)
}

const handleProjectUpdated = async (_project: Project) => {
  projects.value = await getAllProjects()
}

const navigateToSliceBrowser = () => {
  if (!project.value) return
  router.push({ path: '/slices', query: { addToProject: project.value.id } })
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
  gap: 0.5rem;
  align-items: flex-start;
}

.project-title {
  flex: 1;
  min-width: 0;
}

.project-title .fs-6 {
  color: #fefefe; /* Brighten project title for contrast */
}

.project-description {
  font-size: 0.9rem;
  color: #fefefe; /* Lighter description text on tinted header */
}

.project-meta {
  color: #fefefe; /* Subtle but readable meta text */
}

.project-content {
  flex: 1;
  overflow: auto;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.slices-section {
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
