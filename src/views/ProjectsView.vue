<template>
  <div class="projects-view">
    <PanelHeader>
      <template #left>
        <div class="d-flex align-items-center gap-2">
          <span class="fs-6 text-uppercase text-secondary fw-semibold">Projects</span>
          <span class="badge bg-secondary">{{ projects.length }}</span>
        </div>
      </template>
      <template #right>
        <button class="btn btn-primary btn-sm" @click="showCreateProject = true" title="Create new project" aria-label="Create new project">
          <i class="fas fa-plus me-2"></i>New Project
        </button>
      </template>
    </PanelHeader>

    <div class="projects-layout d-flex flex-row flex-grow-1">
      <div class="projects-content flex-fill p-4">
        <div v-if="projects.length === 0" class="empty-state text-center py-5">
          <p>No projects created yet.</p>
          <p class="hint">Create a project to gather slices and start song development.</p>
        </div>

        <div v-else class="project-grid">
          <div
            v-for="project in sortedProjects"
            :key="project.id"
            class="card h-100 project-card"
            :class="{ 'is-drop-hover': dropHoverProjectId === project.id, 'is-drop-denied': dropDeniedProjectId === project.id }"
            @click="openProject(project.id)"
            @dragover.prevent="onDragOverProject(project, $event)"
            @dragenter.prevent="onDragEnterProject(project, $event)"
            @dragleave.prevent="onDragLeaveProject(project.id)"
            @drop.prevent="onDropToProject(project, $event)"
          >
            <div class="project-color" :style="{ backgroundColor: project.color || '#9b59b6', height: '6px' }"></div>
            <div class="card-body">
              <h3 class="card-title h5 d-flex align-items-center justify-content-between">
                <span>{{ project.name }}</span>
                <span class="badge bg-secondary">{{ getEffectiveSliceCount(project) }}</span>
              </h3>
              <p class="card-text" v-if="project.description">
                {{ project.description }}
              </p>
              <p class="card-text text-muted small">
                Updated {{ formatDate(project.updatedAt) }}
              </p>
              <div class="text-muted small">Items: Slices/Groups<span v-if="(project.tabs?.length || 0) + (project.lyrics?.length || 0) > 0">, Tabs, Lyrics</span></div>
            </div>

            <!-- Drag-over overlay indication -->
            <div v-if="dropHoverProjectId === project.id" :class="['drop-target-overlay', { denied: dropDeniedProjectId === project.id }]" aria-label="Drop slices to add to project">
              <div class="overlay-inner d-flex flex-column align-items-center justify-content-center">
                <i :class="dropDeniedProjectId === project.id ? 'fas fa-ban fa-2x mb-2' : 'fas fa-plus-circle fa-2x mb-2'"></i>
                <div class="text">
                  {{ dropDeniedProjectId === project.id
                    ? 'Already added'
                    : (hoverAddCount != null ? `Release to add ${hoverAddCount}` : 'Release to add') }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Sidebar Slice Browser -->
      <SidebarSliceBrowser class="sidebar" :slices="slices" :sources="sources" />
    </div>

    <CreateProjectDialog
      v-if="showCreateProject"
      :show="showCreateProject"
      @created="handleCreateProject"
      @close="showCreateProject = false"
    />

    <!-- Toast -->
    <ToastNotification
      :visible="toastVisible"
      :message="toastMessage"
      :type="toastType"
      @close="toastVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, inject } from 'vue'
import { useRouter } from 'vue-router'
import type { Project } from '@/types/models'
import CreateProjectDialog from '@/components/CreateProjectDialog.vue'
import PanelHeader from '@/components/PanelHeader.vue'
import SidebarSliceBrowser from '@/components/SidebarSliceBrowser.vue'
import ToastNotification from '@/components/ToastNotification.vue'
import type { Slice, Source } from '@/types/models'
import { saveProject, getAllProjects } from '@/services/db'

interface Props {
  projects: Project[]
  slices: Slice[]
  sources: Source[]
}

const props = defineProps<Props>()
const router = useRouter()
const showCreateProject = ref(false)
const projectsRef = inject<any>('projects') as any
const dropHoverProjectId = ref<string | null>(null)
const lastDropAt = ref<number>(0)
const dropDeniedProjectId = ref<string | null>(null)
const hoverAddCount = ref<number | null>(null)

// Toast state
const toastVisible = ref(false)
const toastMessage = ref('')
const toastType = ref<'success' | 'error' | 'info' | 'loading'>('info')
const showToast = (message: string, type: 'success' | 'error' | 'info' | 'loading' = 'info') => {
  toastMessage.value = message
  toastType.value = type
  toastVisible.value = true
}

const sortedProjects = computed(() => {
  return [...props.projects].sort((a, b) => {
    const an = (a.name || '').toLocaleLowerCase()
    const bn = (b.name || '').toLocaleLowerCase()
    if (an < bn) return -1
    if (an > bn) return 1
    return 0
  })
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

// Duplicate helpers removed; using earlier declarations above

const getEffectiveSliceCount = (project: Project): number => {
  return getEffectiveSliceIds(project).size
}

const openProject = (projectId: string) => {
  router.push(`/project/${projectId}`)
}

const handleCreateProject = async (project: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>) => {
  const now = Date.now()
  const newProject: Project = {
    ...project,
    id: `project-${now}`,
    createdAt: now,
    updatedAt: now,
  }
  await saveProject(newProject)
  projectsRef.value = await getAllProjects()
  showCreateProject.value = false
  showToast('Project created', 'success')
}

type DragPayload = { kind: 'slice-ids'; sliceIds: string[] } | { kind: 'group-ref'; ref: { type: string; title: string } }

const getDragPayload = (dt: DataTransfer | null): DragPayload | null => {
  if (!dt) return null
  try {
    const raw = dt.getData('application/x-practice-slices')
    if (raw) {
      const payload = JSON.parse(raw) as DragPayload
      if (payload && payload.kind) return payload
    }
  } catch {}
  const text = dt.getData('text/plain') || ''
  if (text.startsWith('slices:')) {
    const sliceIds = text.replace('slices:', '').split(',').filter(Boolean)
    return { kind: 'slice-ids', sliceIds }
  }
  if (text.startsWith('group:')) {
    const parts = Object.fromEntries(text.replace('group:', '').split(';').map(kv => kv.split('='))) as any
    if (parts.type && parts.title) return { kind: 'group-ref', ref: { type: parts.type, title: parts.title } }
  }
  return null
}

const getSlicesForGroup = (type: string, title: string): Slice[] => {
  return props.slices.filter(s => s.type === type && s.title === title)
}

const getEffectiveSliceIds = (project: Project): Set<string> => {
  const ids = new Set(project.sliceIds || [])
  const groups = project.groups || []
  for (const g of groups) {
    for (const s of getSlicesForGroup(g.type, g.title)) {
      ids.add(s.id)
    }
  }
  return ids
}

const evaluateDrop = (project: Project, e: DragEvent) => {
  const payload = getDragPayload(e.dataTransfer)
  if (!payload) {
    dropDeniedProjectId.value = null
    hoverAddCount.value = null
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'copy'
    return
  }
  if (payload.kind === 'slice-ids') {
    const existing = getEffectiveSliceIds(project)
    const addable = payload.sliceIds.filter(id => !existing.has(id))
    hoverAddCount.value = addable.length
    const denied = addable.length === 0
    dropDeniedProjectId.value = denied ? project.id : null
    if (e.dataTransfer) e.dataTransfer.dropEffect = denied ? 'none' : 'copy'
  } else {
    // group-ref
    const exists = (project.groups || []).some(g => g.type === payload.ref.type && g.title === payload.ref.title)
    dropDeniedProjectId.value = exists ? project.id : null
    const groupSliceCount = getSlicesForGroup(payload.ref.type, payload.ref.title).length
    hoverAddCount.value = exists ? 0 : groupSliceCount
    if (e.dataTransfer) e.dataTransfer.dropEffect = exists ? 'none' : 'copy'
  }
}

const onDragOverProject = (project: Project, e: DragEvent) => {
  evaluateDrop(project, e)
}

const onDragEnterProject = (project: Project, e: DragEvent) => {
  dropHoverProjectId.value = project.id
  evaluateDrop(project, e)
}

const onDragLeaveProject = (id: string) => {
  if (dropHoverProjectId.value === id) dropHoverProjectId.value = null
  if (dropDeniedProjectId.value === id) dropDeniedProjectId.value = null
  hoverAddCount.value = null
}

const onDropToProject = async (project: Project, e: DragEvent) => {
  dropHoverProjectId.value = null
  try {
    const payload = getDragPayload(e.dataTransfer)
    if (!payload) return
    if (payload.kind === 'slice-ids') {
      const existing = getEffectiveSliceIds(project)
      const toAdd = payload.sliceIds.filter(id => !existing.has(id))
      if (toAdd.length === 0) {
        showToast('Already in project', 'info')
        return
      }
      const updated: Project = { ...project, sliceIds: Array.from(new Set([...(project.sliceIds || []), ...toAdd])), updatedAt: Date.now() }
      showToast(`Adding ${toAdd.length} to \"${project.name}\"...`, 'loading')
      await saveProject(updated)
    } else {
      const exists = (project.groups || []).some(g => g.type === payload.ref.type && g.title === payload.ref.title)
      if (exists) {
        showToast('Group already in project', 'info')
        return
      }
      const updated: Project = { ...project, groups: [...(project.groups || []), { type: payload.ref.type, title: payload.ref.title }], updatedAt: Date.now() }
      showToast(`Adding group to \"${project.name}\"...`, 'loading')
      await saveProject(updated)
    }
    projectsRef.value = await getAllProjects()
    lastDropAt.value = Date.now()
    showToast('Added', 'success')
  } catch (err) {
    console.error(err)
    showToast('Failed to add', 'error')
  }
}
</script>

<style scoped>
.projects-view {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #1a1a1a;
}

.projects-layout .sidebar {
  width: 420px;
  border-left: 1px solid var(--bs-border-color);
}

.project-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.project-card {
  cursor: pointer;
}

.hint {
  color: #888;
}
</style>
