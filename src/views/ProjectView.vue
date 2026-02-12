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
              <span class="me-3">Items: {{ (project.sliceIds?.length || 0) + (project.groups?.length || 0) }} slices/groups, {{ project.tabs?.length || 0 }} tabs, {{ project.lyrics?.length || 0 }} lyrics</span>
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
          <button class="btn btn-sm btn-outline-secondary" @click="goBoardView" title="Open Board View" aria-label="Board View">
            <i class="fas fa-border-all me-1"></i>
            <span class="d-none d-sm-inline">Board View</span>
          </button>
          <button class="btn btn-sm btn-outline-secondary" @click="showEditProject = true" title="Edit Project" aria-label="Edit Project">
            <i class="fas fa-pen"></i>
          </button>
        </div>
      </template>
    </PanelHeader>

    <div class="project-content" v-if="project">
      <!-- Slices Section -->
      <section class="card slices-section rounded-0">
        <div class="card-header py-2 d-flex align-items-center gap-2 rounded-0">
          <span class="fs-6 text-uppercase text-secondary fw-semibold">Slices in this project</span>
          <span class="badge bg-secondary">{{ projectSlices.length }}</span>
          <div class="ms-auto d-flex align-items-center gap-2">
            <button class="btn btn-sm btn-outline-secondary" @click="toggleSelectionMode" title="Toggle selection" aria-label="Toggle selection" :class="{ active: selectionMode }">
              <i class="fas fa-check-square me-1"></i> Select
            </button>
            <template v-if="selectionMode">
              <button class="btn btn-sm btn-outline-secondary" @click="selectAllSlices" title="Select all" aria-label="Select all"><i class="fas fa-tasks me-1"></i> All</button>
              <button class="btn btn-sm btn-outline-secondary" @click="clearSelection" title="Clear selection" aria-label="Clear selection"><i class="fas fa-times me-1"></i> Clear</button>
              <button class="btn btn-sm btn-outline-danger" :disabled="selectedSliceIds.size === 0" @click="removeSelectedSlices" title="Remove selected" aria-label="Remove selected">
                <i class="fas fa-trash me-1"></i> Remove ({{ selectedSliceIds.size }})
              </button>
            </template>
          </div>
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
            >
              <template #left>
                <div v-if="selectionMode" class="form-check mt-1">
                  <input class="form-check-input" type="checkbox" :checked="selectedSliceIds.has(slice.id)" @change="toggleSliceSelection(slice)" :aria-label="`Select ${slice.title}`" />
                </div>
                <button v-else class="btn btn-primary btn-sm play-btn" @click="handlePlaySlice(slice)">
                  <i :class="(currentlyPlayingSliceId === slice.id && isPlaying) ? 'fas fa-pause' : 'fas fa-play'"></i>
                </button>
              </template>
              <template #footer>
                <div class="d-flex justify-content-end">
                  <button class="btn btn-sm btn-outline-danger" @click="removeSliceFromProject(slice)" title="Remove from Project" aria-label="Remove from Project">
                    <i class="fas fa-trash me-1"></i> Remove from Project
                  </button>
                </div>
              </template>
            </SliceListItem>
          </div>
        </div>
      </section>

      <!-- Tabs Section -->
      <section class="card tabs-section rounded-0">
        <div class="card-header py-2 d-flex align-items-center rounded-0">
          <span class="fs-6 text-uppercase text-secondary fw-semibold">Tabs</span>
          <span class="badge bg-secondary ms-2">{{ project?.tabs?.length || 0 }}</span>
          <button class="btn btn-sm btn-outline-secondary ms-auto" @click="createTab()" title="Add Tab" aria-label="Add Tab">
            <i class="fas fa-plus"></i>
          </button>
        </div>
        <div class="card-body p-3">
          <div v-if="!project?.tabs || project.tabs.length === 0" class="empty-state text-center py-4">
            <p class="my-2">No tabs yet.</p>
            <p class="hint my-2">Create tab items to draft parts.</p>
          </div>
          <div v-else class="tab-list d-flex flex-column gap-2">
            <div v-for="t in project.tabs" :key="t.id" class="tab-item p-2 border rounded">
              <div class="d-flex align-items-center">
                <strong class="me-auto">{{ t.title }}</strong>
                <div class="btn-group btn-group-sm">
                  <button class="btn btn-outline-secondary" @click="editTab(t)" title="Edit Tab" aria-label="Edit Tab"><i class="fas fa-pen"></i></button>
                  <button class="btn btn-outline-danger" @click="removeTab(t)" title="Remove Tab" aria-label="Remove Tab"><i class="fas fa-trash"></i></button>
                </div>
              </div>
              <pre class="small mt-2">{{ t.content }}</pre>
            </div>
          </div>
        </div>
      </section>

      <!-- Lyrics Section -->
      <section class="card lyrics-section rounded-0">
        <div class="card-header py-2 d-flex align-items-center rounded-0">
          <span class="fs-6 text-uppercase text-secondary fw-semibold">Lyrics</span>
          <span class="badge bg-secondary ms-2">{{ project?.lyrics?.length || 0 }}</span>
          <button class="btn btn-sm btn-outline-secondary ms-auto" @click="createLyrics()" title="Add Lyrics" aria-label="Add Lyrics">
            <i class="fas fa-plus"></i>
          </button>
        </div>
        <div class="card-body p-3">
          <div v-if="!project?.lyrics || project.lyrics.length === 0" class="empty-state text-center py-4">
            <p class="my-2">No lyrics yet.</p>
            <p class="hint my-2">Create lyric items to write words.</p>
          </div>
          <div v-else class="lyrics-list d-flex flex-column gap-2">
            <div v-for="l in project.lyrics" :key="l.id" class="lyrics-item p-2 border rounded">
              <div class="d-flex align-items-center">
                <strong class="me-auto">{{ l.title }}</strong>
                <div class="btn-group btn-group-sm">
                  <button class="btn btn-outline-secondary" @click="editLyrics(l)" title="Edit Lyrics" aria-label="Edit Lyrics"><i class="fas fa-pen"></i></button>
                  <button class="btn btn-outline-danger" @click="removeLyrics(l)" title="Remove Lyrics" aria-label="Remove Lyrics"><i class="fas fa-trash"></i></button>
                </div>
              </div>
              <div class="lyrics-content small mt-2" v-html="l.content"></div>
            </div>
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

    <!-- Simple editors for Tab/Lyrics -->
    <TabEditor v-if="editingTab" :tab="editingTab" @save="saveTab" @close="editingTab = null" />
    <LyricsEditor v-if="editingLyrics" :lyrics="editingLyrics" @save="saveLyrics" @close="editingLyrics = null" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject } from 'vue'
import { useRouter } from 'vue-router'
import type { Ref } from 'vue'
import type { Project, Slice, Source, ProjectTabItem, ProjectLyricItem } from '../types/models'
import SliceListItem from '../components/SliceListItem.vue'
import PanelHeader from '@/components/PanelHeader.vue'
import EditProjectDialog from '@/components/EditProjectDialog.vue'
import { getAllProjects, saveProject } from '@/services/db'
import TabEditor from '@/components/TabEditor.vue'
import LyricsEditor from '@/components/LyricsEditor.vue'

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

// Find the project by ID
const project = computed(() => {
  return projects.value.find(p => p.id === props.id) || null
})

const showEditProject = ref(false)
const editingTab = ref<ProjectTabItem | null>(null)
const editingLyrics = ref<ProjectLyricItem | null>(null)
const selectionMode = ref(false)
const selectedSliceIds = ref<Set<string>>(new Set())

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

// Compute muted header background tint from the project color
const headerBgStyle = computed(() => {
  const baseDark = { r: 18, g: 18, b: 18 }
  const hex = project.value?.color || '#9b59b6'
  const c = hexToRgb(hex)
  if (!c) {
    return { backgroundColor: `rgb(${baseDark.r}, ${baseDark.g}, ${baseDark.b})` }
  }
  const weightToDark = 0.8
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

const goBoardView = () => {
  if (!project.value) return
  router.push({ name: 'project-board', params: { id: project.value.id } })
}

const createTab = async () => {
  if (!project.value) return
  const now = Date.now()
  const newTab: ProjectTabItem = { id: `tab-${now}`, title: 'New Tab', content: '', createdAt: now, updatedAt: now }
  const updated: Project = { ...project.value, tabs: [...(project.value.tabs || []), newTab], updatedAt: now }
  await saveProject(updated)
  projects.value = await getAllProjects()
}

const editTab = (t: ProjectTabItem) => {
  editingTab.value = { ...t }
}

const saveTab = async (t: ProjectTabItem) => {
  if (!project.value) return
  const now = Date.now()
  const tabs = (project.value.tabs || []).map(x => x.id === t.id ? { ...t, updatedAt: now } : x)
  const updated: Project = { ...project.value, tabs, updatedAt: now }
  await saveProject(updated)
  projects.value = await getAllProjects()
  editingTab.value = null
}

const createLyrics = async () => {
  if (!project.value) return
  const now = Date.now()
  const newLyrics: ProjectLyricItem = { id: `lyrics-${now}`, title: 'New Lyrics', content: '', createdAt: now, updatedAt: now }
  const updated: Project = { ...project.value, lyrics: [...(project.value.lyrics || []), newLyrics], updatedAt: now }
  await saveProject(updated)
  projects.value = await getAllProjects()
}

const editLyrics = (l: ProjectLyricItem) => {
  editingLyrics.value = { ...l }
}

const saveLyrics = async (l: ProjectLyricItem) => {
  if (!project.value) return
  const now = Date.now()
  const lyrics = (project.value.lyrics || []).map(x => x.id === l.id ? { ...l, updatedAt: now } : x)
  const updated: Project = { ...project.value, lyrics, updatedAt: now }
  await saveProject(updated)
  projects.value = await getAllProjects()
  editingLyrics.value = null
}

// Remove actions
const removeSliceFromProject = async (slice: Slice) => {
  if (!project.value) return
  const now = Date.now()
  const sliceIds = (project.value.sliceIds || []).filter(id => id !== slice.id)
  const updated: Project = { ...project.value, sliceIds, updatedAt: now }
  if (updated.boardLayout) {
    delete updated.boardLayout[`slice:${slice.id}`]
  }
  await saveProject(updated)
  projects.value = await getAllProjects()
}

const removeTab = async (t: ProjectTabItem) => {
  if (!project.value) return
  const now = Date.now()
  const tabs = (project.value.tabs || []).filter(x => x.id !== t.id)
  const updated: Project = { ...project.value, tabs, updatedAt: now }
  if (updated.boardLayout) {
    delete updated.boardLayout[`tab:${t.id}`]
  }
  await saveProject(updated)
  projects.value = await getAllProjects()
}

const removeLyrics = async (l: ProjectLyricItem) => {
  if (!project.value) return
  const now = Date.now()
  const lyrics = (project.value.lyrics || []).filter(x => x.id !== l.id)
  const updated: Project = { ...project.value, lyrics, updatedAt: now }
  if (updated.boardLayout) {
    delete updated.boardLayout[`lyric:${l.id}`]
  }
  await saveProject(updated)
  projects.value = await getAllProjects()
}

// Selection helpers
const toggleSelectionMode = () => {
  selectionMode.value = !selectionMode.value
  if (!selectionMode.value) {
    selectedSliceIds.value.clear()
  }
}

const toggleSliceSelection = (slice: Slice) => {
  if (selectedSliceIds.value.has(slice.id)) selectedSliceIds.value.delete(slice.id)
  else selectedSliceIds.value.add(slice.id)
}

const selectAllSlices = () => {
  projectSlices.value.forEach(s => selectedSliceIds.value.add(s.id))
}

const clearSelection = () => {
  selectedSliceIds.value.clear()
}

const removeSelectedSlices = async () => {
  if (!project.value || selectedSliceIds.value.size === 0) return
  const now = Date.now()
  const toRemove = new Set(selectedSliceIds.value)
  const sliceIds = (project.value.sliceIds || []).filter(id => !toRemove.has(id))
  const updated: Project = { ...project.value, sliceIds, updatedAt: now }
  if (updated.boardLayout) {
    for (const id of toRemove) {
      delete updated.boardLayout[`slice:${id}`]
    }
  }
  await saveProject(updated)
  projects.value = await getAllProjects()
  selectedSliceIds.value.clear()
  selectionMode.value = false
}
</script>

<style scoped>
.project-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #1a1a1a;
}

.project-header-info .fs-6 {
  color: #fefefe;
}

.project-description,
.project-meta {
  color: #fefefe;
}

.hint {
  color: #888;
}
</style>
