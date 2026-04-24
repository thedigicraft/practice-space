<template>
  <div class="project-board-view">
    <div class="header d-flex align-items-center justify-content-between px-3 xmb-2">
      <div class="d-flex align-items-center gap-2">
        <div class="m-0">{{ project?.name || 'Project' }} — Board View</div>
        <span class="text-muted small">Drag items anywhere; snap, zoom, and align.</span>
      </div>
      <div class="d-flex gap-2 align-items-center">
        <button class="btn btn-outline-secondary btn-sm" @click="goStudio">Studio View</button>
      </div>
    </div>
    <div class="canvas-wrapper">
      <div class="board-container" ref="boardRef" @mousedown="onBoardMouseDown" @wheel.prevent="onWheel" @touchstart.passive="onTouchStart" @touchmove.prevent="onTouchMove" @touchend="onTouchEnd">
          <div class="board-toolbar d-flex align-items-center justify-content-between">
          <div class="d-flex align-items-center gap-2">
            <div class="form-check form-switch">
              <input class="form-check-input" type="checkbox" v-model="snap" id="snapSwitch" @mousedown.stop @click.stop>
              <label class="form-check-label" for="snapSwitch">Snap</label>
            </div>
            <div class="xinput-group input-group-sm mx-2" style="width: 200px;">
              <span class="xinput-group-text d-none">Zoom</span>
              <input type="range" min="50" max="200" step="10" v-model.number="zoomPercent" class="form-range" @mousedown.stop @click.stop />
            </div>
          </div>
          <div class="btn-group btn-group-sm">
            <button class="btn btn-outline-secondary" @mousedown.stop @click.stop="alignLeft" :disabled="selectedKeys.length < 2" title="Align Left" aria-label="Align Left">
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg"><line x1="2" y1="2" x2="2" y2="16" stroke="#777" stroke-width="2"/><rect x="4" y="3" width="8" height="3" fill="#999"/><rect x="4" y="8" width="10" height="3" fill="#999"/><rect x="4" y="13" width="6" height="3" fill="#999"/></svg>
            </button>
            <button class="btn btn-outline-secondary" @mousedown.stop @click.stop="alignTop" :disabled="selectedKeys.length < 2" title="Align Top" aria-label="Align Top">
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg"><line x1="2" y1="2" x2="16" y2="2" stroke="#777" stroke-width="2"/><rect x="3" y="4" width="3" height="6" fill="#999"/><rect x="8" y="4" width="3" height="10" fill="#999"/><rect x="13" y="4" width="3" height="4" fill="#999"/></svg>
            </button>
            <button class="btn btn-outline-secondary" @mousedown.stop @click.stop="distributeH" :disabled="selectedKeys.length < 3" title="Distribute Horizontal" aria-label="Distribute Horizontal">
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="5" width="3" height="8" fill="#999"/><rect x="7.5" y="5" width="3" height="8" fill="#999"/><rect x="13" y="5" width="3" height="8" fill="#999"/></svg>
            </button>
            <button class="btn btn-outline-secondary" @mousedown.stop @click.stop="distributeV" :disabled="selectedKeys.length < 3" title="Distribute Vertical" aria-label="Distribute Vertical">
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg"><rect x="5" y="2" width="8" height="3" fill="#999"/><rect x="5" y="7.5" width="8" height="3" fill="#999"/><rect x="5" y="13" width="8" height="3" fill="#999"/></svg>
            </button>
          </div>
        </div>
        <div class="board-inner" :style="boardTransformStyle">
          <div
            v-for="it in boardItems"
            :key="it.key"
            class="board-item"
            :class="[it.type, { selected: isSelected(it.key), 'menu-open': it.type === 'section' && isSectionMenuOpen(it.key) }]"
            :style="itemStyle(it)"
            @mousedown.stop
            @contextmenu.prevent.stop="onItemContextMenu(it, $event)"
            @dblclick="openItem(it)"
            @click.stop="toggleSelect(it.key, $event)"
          >
            <div v-if="it.type === 'section'" class="section-card" :style="sectionCardStyle(it)">
              <div class="section-header d-flex align-items-center" :style="sectionHeaderStyle(it)">
                <template v-if="editingSectionId === it.id">
                  <input class="form-control form-control-sm section-title-input" v-model="editingSectionTitle" @blur="saveSectionTitle(it.id)" @keydown.enter.prevent="saveSectionTitle(it.id)" @keydown.esc.prevent="cancelEditSection()" />
                </template>
                <template v-else>
                  <span class="fw-bold section-title" @dblclick.stop="beginEditSection(it.id)">{{ it.title }}</span>
                </template>
                <div class="drag-handle flex-grow-1" @mousedown.stop="startDrag(it, $event)"></div>
                <button class="section-menu-btn" @mousedown.stop @click.stop="toggleSectionMenu(it.key)"><i class="fas fa-ellipsis-v"></i></button>
                <div v-if="isSectionMenuOpen(it.key)" class="section-menu">
                  <button class="dropdown-item p-1" @mousedown.stop @click.stop="toggleSectionColorPalette(it.id)">Change color</button>
                  <button class="dropdown-item p-1" @mousedown.stop @click.stop="removeSection(it.key, false)">Remove Section</button>
                  <button class="dropdown-item text-danger p-1" @mousedown.stop @click.stop="removeSection(it.key, true)">Remove Section and Return items</button>
                  <div v-if="colorPaletteFor === it.id" class="color-palette">
                    <button v-for="c in sectionColors" :key="c" class="color-swatch" :style="{ background: c }" @mousedown.stop @click.stop="chooseSectionColor(it.id, c)"></button>
                  </div>
                </div>
              </div>
              <div class="section-content"></div>
              <div class="resize-handle" @mousedown.stop="startResize(it, $event)"></div>
            </div>
            <div v-else-if="it.type === 'lyric'" class="paper">
              <div class="paper-header d-flex align-items-center">
                <span class="fw-bold">{{ it.title }}</span>
                <div class="drag-handle flex-grow-1" @mousedown.stop="startDrag(it, $event)"></div>
              </div>
              <div class="paper-content" :style="{ fontSize: lyricFontSize(it) + 'px' }" v-html="getLyricHtml(it.id)"></div>
              <div class="resize-handle" @mousedown.stop="startResize(it, $event)"></div>
            </div>
            <div v-else-if="it.type === 'tab'" class="tab-card">
              <div class="tab-header d-flex align-items-center">
                <span class="fw-bold">{{ it.title }}</span>
                <div class="drag-handle flex-grow-1" @mousedown.stop="startDrag(it, $event)"></div>
                <button class="btn btn-sm btn-outline-secondary" @mousedown.stop @click.stop="openItem(it)" title="Edit Tab" aria-label="Edit Tab"><i class="fas fa-pen"></i></button>
              </div>
              <pre class="tab-content" :style="{ fontSize: tabFontSize(it) + 'px' }">{{ getTabAscii(it.id) }}</pre>
              <div class="resize-handle" @mousedown.stop="startResize(it, $event)"></div>
            </div>
            <div v-else class="slice-card">
              <div class="slice-header d-flex align-items-center">
                <span class="fw-bold">{{ it.title }}</span>
                <div class="drag-handle flex-grow-1" @mousedown.stop="startDrag(it, $event)"></div>
                <div class="btn-group btn-group-sm">
                  <button class="btn btn-outline-secondary" @mousedown.stop @click.stop="playSliceOnBoard(it)" title="Play" aria-label="Play"><i class="fas fa-play"></i></button>
                  <button class="btn btn-outline-secondary" @mousedown.stop @click.stop="pauseAudio()" title="Pause" aria-label="Pause"><i class="fas fa-pause"></i></button>
                </div>
              </div>
              <div class="d-flex align-items-center gap-2 mb-1" v-if="!hasSource(it)">
                <span class="badge bg-secondary">No source</span>
                <button class="btn btn-sm btn-warning" @mousedown.stop @click.stop="regenerateSliceClip(it)" :disabled="isRegenerating(it.key)">Generate Clip</button>
              </div>
              <SliceWaveformViewer
                :slice="getSlice(it.id)"
                :source="getSourceForSlice(it.id)"
                :currentTime="currentTime"
                :isPlaying="isPlaying"
                :width="viewerDims(it).w"
                :height="viewerDims(it).h"
                :active="isActiveViewer(it)"
                @scrub-start="onViewerScrubStart(it)"
                @scrub-end="onViewerScrubEnd(it)"
                @seek="onViewerSeek(it, $event)"
                v-if="getSourceForSlice(it.id)"
              />
              <div class="resize-handle" @mousedown.stop="startResize(it, $event)"></div>
            </div>
          </div>
          <div v-if="marquee.active" class="marquee" :style="marqueeStyle"></div>
          
        </div>
      </div>
      <div v-if="contextMenu.active" class="context-menu" :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }" @mousedown.stop>
        <button class="dropdown-item p-1" @click="editContextItem"><i class="fas fa-pen me-2"></i>Edit</button>
        <button class="dropdown-item text-danger p-1" @click="removeContextItem"><i class="fas fa-trash me-2"></i>Remove</button>
      </div>
      <aside class="pool-container" ref="poolRef">
        <div class="pool-sections">
          <SidebarPanel title="Slices" :showMenu="true">
            <div class="pool-grid">
              <div v-for="it in poolSlices" :key="it.key" class="pool-item card slice" @mousedown.stop="startPoolDrag(it, $event)">
                <div class="card-body p-2">
                  <div class="item-title fw-bold">{{ it.title }}</div>
                  <div class="item-meta text-muted small">Slice</div>
                </div>
              </div>
              <div v-if="poolSlices.length === 0" class="pool-item card empty">
                <div class="card-body p-2">
                  <div class="item-title fw-bold">No more slices available</div>
                </div>
              </div>
            </div>
          </SidebarPanel>
          <SidebarPanel title="Lyrics" :showMenu="true">
            <div class="pool-grid">
              <div v-for="it in poolLyrics" :key="it.key" class="pool-item card lyric" @mousedown.stop="startPoolDrag(it, $event)">
                <div class="card-body p-2">
                  <div class="item-title fw-bold">{{ it.title }}</div>
                  <div class="item-meta text-muted small">Lyrics</div>
                </div>
              </div>
              <div v-if="poolLyrics.length === 0" class="pool-item card empty">
                <div class="card-body p-2">
                  <div class="item-title fw-bold">No more lyrics available</div>
                </div>
              </div>
            </div>
          </SidebarPanel>
          <SidebarPanel title="Tabs" :showMenu="true">
            <div class="pool-grid">
              <div v-for="it in poolTabs" :key="it.key" class="pool-item card tab" @mousedown.stop="startPoolDrag(it, $event)">
                <div class="card-body p-2">
                  <div class="item-title fw-bold">{{ it.title }}</div>
                  <div class="item-meta text-muted small">Tab</div>
                </div>
              </div>
              <div v-if="poolTabs.length === 0" class="pool-item card empty">
                <div class="card-body p-2">
                  <div class="item-title fw-bold">No more tabs available</div>
                </div>
              </div>
            </div>
          </SidebarPanel>
          <SidebarPanel title="Tools" :showMenu="true">
            <div class="pool-grid">
              <div class="pool-item card tool" @mousedown.stop="startSectionToolDrag($event)">
                <div class="card-body p-2">
                  <div class="item-title fw-bold">Section</div>
                  <div class="item-meta text-muted small">Container</div>
                </div>
              </div>
            </div>
          </SidebarPanel>
        </div>
      </aside>
    </div>
    <TabEditor v-if="editingTab" :tab="editingTab" @save="saveTabInline" @close="editingTab = null" />
    <LyricsEditor v-if="editingLyrics" :lyrics="editingLyrics" @save="saveLyricsInline" @close="editingLyrics = null" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, reactive, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getProject, saveProject, getAllSlices, getAllAudioFiles, saveSlice } from '@/services/db'
import type { Project, Slice } from '@/types/models'
import TabEditor from '@/components/TabEditor.vue'
import LyricsEditor from '@/components/LyricsEditor.vue'
import SliceWaveformViewer from '@/components/SliceWaveformViewer.vue'
import { useAudioPlayback } from '@/composables/useAudioPlayback'
import { getSourceArrayBuffer } from '@/services/platformAudio'
import { loadAudioBuffer } from '@/services/audio'
import { generateWaveformData } from '@/utils/helpers'
import SidebarPanel from '@/components/SidebarPanel.vue'

const route = useRoute()
const router = useRouter()
const project = ref<Project | null>(null)
const slices = ref<Slice[]>([])
const boardRef = ref<HTMLElement | null>(null)
const poolRef = ref<HTMLElement | null>(null)
const sources = ref<any[]>([])
const { isPlaying, currentTime, playSlice, pause, seek, loadAudioFile, currentlyPlayingFileId, currentlyPlayingSliceId } = useAudioPlayback()

onMounted(async () => {
  const id = String(route.params.id)
  project.value = await getProject(id) || null
  slices.value = await getAllSlices()
  sources.value = await getAllAudioFiles()
  // Prewarm waveform data for project slices
  await prewarmWaveformsForProject()
  hydrateDefaults()
  // Restore viewport (zoom & pan) if previously saved
  if (project.value?.boardZoom) zoomPercent.value = project.value.boardZoom
  if (project.value?.boardOffset) {
    offset.x = project.value.boardOffset.x || 0
    offset.y = project.value.boardOffset.y || 0
  }
})

const sliceMap = computed(() => new Map(slices.value.map(s => [s.id, s])))

interface BoardItemVM {
  key: string
  type: 'slice' | 'tab' | 'lyric' | 'section'
  typeLabel: string
  id: string
  title: string
  x: number
  y: number
}

const boardItems = computed<BoardItemVM[]>(() => {
  if (!project.value) return []
  const items: BoardItemVM[] = []
  const layout = project.value.boardLayout || {}
  // sections first (ensure they render under other items)
  for (const s of project.value.sections || []) {
    const pos = layout[`section:${s.id}`]
    if (!pos) continue
    items.push({ key: `section:${s.id}`, type: 'section', typeLabel: 'Section', id: s.id, title: s.title, x: pos.x, y: pos.y })
  }
  // slices with positions
  for (const sid of project.value.sliceIds || []) {
    const pos = layout[`slice:${sid}`]
    if (!pos) continue
    const s = sliceMap.value.get(sid)
    if (!s) continue
    items.push({ key: `slice:${sid}`, type: 'slice', typeLabel: 'Slice', id: sid, title: s.title, x: pos.x, y: pos.y })
  }
  // tabs with positions
  for (const t of project.value.tabs || []) {
    const pos = layout[`tab:${t.id}`]
    if (!pos) continue
    items.push({ key: `tab:${t.id}`, type: 'tab', typeLabel: 'Tab', id: t.id, title: t.title, x: pos.x, y: pos.y })
  }
  // lyrics with positions
  for (const l of project.value.lyrics || []) {
    const pos = layout[`lyric:${l.id}`]
    if (!pos) continue
    items.push({ key: `lyric:${l.id}`, type: 'lyric', typeLabel: 'Lyrics', id: l.id, title: l.title, x: pos.x, y: pos.y })
  }
  return items
})
const poolItems = computed<BoardItemVM[]>(() => {
  if (!project.value) return []
  const items: BoardItemVM[] = []
  const layout = project.value.boardLayout || {}
  // slices not placed
  for (const sid of project.value.sliceIds || []) {
    if (layout[`slice:${sid}`]) continue
    const s = sliceMap.value.get(sid)
    if (!s) continue
    items.push({ key: `slice:${sid}`, type: 'slice', typeLabel: 'Slice', id: sid, title: s.title, x: 0, y: 0 })
  }
  // tabs not placed
  for (const t of project.value.tabs || []) {
    if (layout[`tab:${t.id}`]) continue
    items.push({ key: `tab:${t.id}`, type: 'tab', typeLabel: 'Tab', id: t.id, title: t.title, x: 0, y: 0 })
  }
  // lyrics not placed
  for (const l of project.value.lyrics || []) {
    if (layout[`lyric:${l.id}`]) continue
    items.push({ key: `lyric:${l.id}`, type: 'lyric', typeLabel: 'Lyrics', id: l.id, title: l.title, x: 0, y: 0 })
  }
  return items
})

const poolSlices = computed(() => poolItems.value.filter(i => i.type === 'slice'))
const poolLyrics = computed(() => poolItems.value.filter(i => i.type === 'lyric'))
const poolTabs = computed(() => poolItems.value.filter(i => i.type === 'tab'))

const itemStyle = (it: BoardItemVM) => ({ left: it.x + 'px', top: it.y + 'px', width: (project.value?.boardLayout?.[it.key]?.w || defaultW(it)) + 'px', height: (project.value?.boardLayout?.[it.key]?.h || defaultH(it)) + 'px' })
function defaultW(it: BoardItemVM) { return it.type === 'tab' ? 280 : it.type === 'lyric' ? 220 : it.type === 'section' ? 360 : 300 }
function defaultH(it: BoardItemVM) { return it.type === 'tab' ? 160 : it.type === 'lyric' ? 180 : it.type === 'section' ? 240 : 140 }
function tabFontSize(it: BoardItemVM) {
  const pos = project.value?.boardLayout?.[it.key]
  const w = pos?.w || defaultW(it)
  const h = pos?.h || defaultH(it)
  const base = 12
  const factor = Math.max(0.8, Math.min(2.0, Math.min(w / 280, h / 160)))
  return Math.round(base * factor)
}

function hydrateDefaults() {
  if (!project.value) return
  if (!project.value.boardLayout) project.value.boardLayout = {}
  // Do not auto-place items; unplaced items should appear in the pool.
}

function goStudio() {
  const id = String(route.params.id)
  router.push({ name: 'project', params: { id } })
}

async function savePositions() {
  if (!project.value) return
  await saveProject(project.value)
}

// Dragging
const dragging = reactive<{ key: string | null; dx: number; dy: number; fromPool?: boolean; lastX?: number; lastY?: number; enteredBoard?: boolean; prevX?: number; prevY?: number; lastClientX?: number; lastClientY?: number }>({ key: null, dx: 0, dy: 0, fromPool: false, lastX: 0, lastY: 0, enteredBoard: false, prevX: 0, prevY: 0, lastClientX: 0, lastClientY: 0 })
const snap = ref(true)
const gridSize = 20
const zoomPercent = ref(100)
const scale = computed(() => zoomPercent.value / 100)
const offset = reactive({ x: 0, y: 0 })
const boardTransformStyle = computed(() => ({ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale.value})` }))
// Debounced auto-save for board changes (viewport & layout)
let saveTimer: any = null
function scheduleSave() {
  if (!project.value) return
  // Persist viewport
  project.value.boardZoom = zoomPercent.value
  project.value.boardOffset = { x: offset.x, y: offset.y }
  project.value.updatedAt = Date.now()
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    if (project.value) saveProject(project.value)
  }, 300)
}
function startDrag(it: BoardItemVM, e: MouseEvent) {
  e.preventDefault()
  dragging.key = it.key
  const pos = project.value?.boardLayout?.[it.key]
  if (!pos) return
  const origin = boardOrigin()
  const mx = (e.clientX - origin.x - offset.x) / scale.value
  const my = (e.clientY - origin.y - offset.y) / scale.value
  dragging.dx = mx - pos.x
  dragging.dy = my - pos.y
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}
function startPoolDrag(it: BoardItemVM, e: MouseEvent) {
  e.preventDefault()
  dragging.key = it.key
  dragging.fromPool = true
  const origin = boardOrigin()
  const mx = (e.clientX - origin.x - offset.x) / scale.value
  const my = (e.clientY - origin.y - offset.y) / scale.value
  dragging.dx = 0
  dragging.dy = 0
  dragging.enteredBoard = false
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}
function startSectionToolDrag(e: MouseEvent) {
  e.preventDefault()
  if (!project.value) return
  const id = `${Date.now()}-${Math.random().toString(36).slice(2,7)}`
  const now = Date.now()
  project.value.sections = project.value.sections || []
  project.value.sections.push({ id, title: 'Section', createdAt: now, updatedAt: now })
  // Set dragging key to the new section
  dragging.key = `section:${id}`
  dragging.fromPool = true
  dragging.dx = 0
  dragging.dy = 0
  dragging.enteredBoard = false
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}
function onMove(e: MouseEvent) {
  if (!dragging.key || !project.value) return
  dragging.lastClientX = e.clientX
  dragging.lastClientY = e.clientY
  const origin = boardOrigin()
  const mx = (e.clientX - origin.x - offset.x) / scale.value
  const my = (e.clientY - origin.y - offset.y) / scale.value
  const x = mx - dragging.dx
  const y = my - dragging.dy
  const pos = (project.value.boardLayout![dragging.key] ||= { x: 0, y: 0 })
  const prevX = pos.x || 0
  const prevY = pos.y || 0
  pos.x = snap.value ? Math.round(x / gridSize) * gridSize : x
  pos.y = snap.value ? Math.round(y / gridSize) * gridSize : y
  dragging.lastX = x
  dragging.lastY = y
  dragging.prevX = prevX
  dragging.prevY = prevY
  // Track if cursor entered board bounds
  dragging.enteredBoard = pos.x >= 0 && pos.y >= 0 && pos.x <= BOARD_W && pos.y <= BOARD_H
  // If dragging a section, move children by delta
  if (dragging.key.startsWith('section:')) {
    const deltaX = pos.x - prevX
    const deltaY = pos.y - prevY
    if (deltaX !== 0 || deltaY !== 0) {
      for (const [k, child] of Object.entries(project.value.boardLayout!)) {
        if (child.parent === dragging.key) {
          child.x = (child.x || 0) + deltaX
          child.y = (child.y || 0) + deltaY
        }
      }
    }
  }
}
const BOARD_W = 2000
const BOARD_H = 1200
function onUp() {
  window.removeEventListener('mousemove', onMove)
  window.removeEventListener('mouseup', onUp)
  if (dragging.fromPool && dragging.key && project.value) {
    // ensure drop within board bounds
    const x = dragging.lastX ?? 0
    const y = dragging.lastY ?? 0
    const inBounds = x >= 0 && y >= 0 && x <= BOARD_W && y <= BOARD_H
    if (!inBounds || !dragging.enteredBoard) {
      delete project.value.boardLayout![dragging.key]
      // if a tool created a section but never entered board, also remove from sections
      if (dragging.key.startsWith('section:')) {
        const id = dragging.key.split(':')[1]
        project.value.sections = (project.value.sections || []).filter(s => s.id !== id)
      }
    }
  } else if (dragging.key && project.value && poolRef.value) {
    // If dropped over the pool sidebar, return item to pool (remove from layout)
    const rect = poolRef.value.getBoundingClientRect()
    const cx = dragging.lastClientX || 0
    const cy = dragging.lastClientY || 0
    const overPool = cx >= rect.left && cx <= rect.right && cy >= rect.top && cy <= rect.bottom
    if (overPool && !dragging.key.startsWith('section:')) {
      delete project.value.boardLayout![dragging.key]
    }
  }
  // Persist layout changes on drag end
  scheduleSave()
  dragging.key = null
  dragging.fromPool = false
  dragging.enteredBoard = false
}
function boardOrigin() {
  const rect = boardRef.value?.getBoundingClientRect()
  return { x: rect?.left || 0, y: rect?.top || 0 }
}
function onWheel(e: WheelEvent) {
  // Two-finger scroll pans; pinch zoom sets ctrlKey true on Mac trackpads.
  if (e.ctrlKey) {
    const delta = Math.sign(e.deltaY)
    const next = Math.min(200, Math.max(50, zoomPercent.value - delta * 10))
    zoomPercent.value = next
    scheduleSave()
  } else {
    // Pan the board
    offset.x -= e.deltaX
    offset.y -= e.deltaY
    scheduleSave()
  }
}

// Touch gestures: two-finger pan and pinch to zoom
const touchState = reactive<{ active: boolean; lastDistance: number; lastCenterX: number; lastCenterY: number }>({ active: false, lastDistance: 0, lastCenterX: 0, lastCenterY: 0 })
function onTouchStart(e: TouchEvent) {
  if (e.touches.length === 2) {
    const [t1, t2] = [e.touches[0], e.touches[1]]
    const dx = t2.clientX - t1.clientX
    const dy = t2.clientY - t1.clientY
    touchState.lastDistance = Math.hypot(dx, dy)
    touchState.lastCenterX = (t1.clientX + t2.clientX) / 2
    touchState.lastCenterY = (t1.clientY + t2.clientY) / 2
    touchState.active = true
  }
}
function onTouchMove(e: TouchEvent) {
  if (!touchState.active || e.touches.length !== 2) return
  const [t1, t2] = [e.touches[0], e.touches[1]]
  const dx = t2.clientX - t1.clientX
  const dy = t2.clientY - t1.clientY
  const distance = Math.hypot(dx, dy)
  const centerX = (t1.clientX + t2.clientX) / 2
  const centerY = (t1.clientY + t2.clientY) / 2
  // Pan by center movement
  offset.x += (centerX - touchState.lastCenterX)
  offset.y += (centerY - touchState.lastCenterY)
  // Zoom by pinch delta
  const delta = distance - touchState.lastDistance
  if (Math.abs(delta) > 2) {
    const next = Math.min(200, Math.max(50, zoomPercent.value + Math.sign(delta) * 5))
    zoomPercent.value = next
  }
  touchState.lastDistance = distance
  touchState.lastCenterX = centerX
  touchState.lastCenterY = centerY
  scheduleSave()
}
function onTouchEnd() {
  touchState.active = false
}

// Marquee selection
const marquee = reactive<{ active: boolean; x: number; y: number; w: number; h: number }>({ active: false, x: 0, y: 0, w: 0, h: 0 })
const marqueeStyle = computed(() => ({ left: marquee.x + 'px', top: marquee.y + 'px', width: marquee.w + 'px', height: marquee.h + 'px' }))
function onBoardMouseDown(e: MouseEvent) {
  e.preventDefault()
  // Close any open context menu
  closeContextMenu()
  // Only start marquee on left-click
  if (e.button !== 0) return
  const origin = boardOrigin()
  const sx = (e.clientX - origin.x - offset.x) / scale.value
  const sy = (e.clientY - origin.y - offset.y) / scale.value
  marquee.active = true
  marquee.x = sx
  marquee.y = sy
  marquee.w = 0
  marquee.h = 0
  window.addEventListener('mousemove', onMarqueeMove)
  window.addEventListener('mouseup', onMarqueeUp)
}
function onMarqueeMove(e: MouseEvent) {
  e.preventDefault()
  if (!marquee.active) return
  const origin = boardOrigin()
  const mx = (e.clientX - origin.x - offset.x) / scale.value
  const my = (e.clientY - origin.y - offset.y) / scale.value
  marquee.w = Math.abs(mx - marquee.x)
  marquee.h = Math.abs(my - marquee.y)
  marquee.x = Math.min(mx, (marquee.x))
  marquee.y = Math.min(my, (marquee.y))
  // update selection to items intersecting marquee
  const rect = { x: marquee.x, y: marquee.y, w: marquee.w, h: marquee.h }
  const hits: string[] = []
  for (const it of boardItems.value) {
    const pos = project.value?.boardLayout?.[it.key]
    if (!pos) continue
    const w = pos.w || defaultW(it)
    const h = pos.h || defaultH(it)
    if (intersects(rect, { x: pos.x, y: pos.y, w, h })) hits.push(it.key)
  }
  selectedKeys.value = hits
}
function onMarqueeUp() {
  marquee.active = false
  window.removeEventListener('mousemove', onMarqueeMove)
  window.removeEventListener('mouseup', onMarqueeUp)
}
function intersects(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

// When an item drag ends, assign containment to a section if dropped inside
watch(() => dragging.key, (key, prev) => {
  // Only handle on transition from a non-null to null after drop
  if (prev && !key && project.value) {
    // last dragged item key is prev
    const pos = project.value.boardLayout?.[prev]
    if (!pos) return
    // If it is a section, skip
    if (prev.startsWith('section:')) return
    // Determine section under drop center
    const center = { x: (pos.x || 0) + ((pos.w || 120) / 2), y: (pos.y || 0) + ((pos.h || 80) / 2) }
    let targetSection: string | null = null
    for (const s of project.value.sections || []) {
      const sp = project.value.boardLayout?.[`section:${s.id}`]
      if (!sp) continue
      const sw = sp.w || 200
      const sh = sp.h || 160
      if (center.x >= (sp.x || 0) && center.x <= (sp.x || 0) + sw && center.y >= (sp.y || 0) && center.y <= (sp.y || 0) + sh) {
        targetSection = `section:${s.id}`
        break
      }
    }
    // Assign or clear parent
    pos.parent = targetSection || undefined
    // If assigned to a section, auto-grow the section to fit if needed
    if (targetSection) {
      const sp = project.value.boardLayout?.[targetSection]
      if (sp) {
        const itemW = pos.w || 120
        const itemH = pos.h || 80
        const secW = sp.w || 200
        const secH = sp.h || 160
        const left = sp.x || 0
        const top = sp.y || 0
        const itemRight = (pos.x || 0) + itemW
        const itemBottom = (pos.y || 0) + itemH
        const secRight = left + secW
        const secBottom = top + secH
        const margin = 10
        const needGrowRight = itemRight > secRight
        const needGrowBottom = itemBottom > secBottom
        // Only expand width/height; keep section's top-left unchanged
        if (needGrowRight) {
          sp.w = Math.max(secW, itemRight - left + margin)
        }
        if (needGrowBottom) {
          sp.h = Math.max(secH, itemBottom - top + margin)
        }
      }
    }
    scheduleSave()
  }
})

// Context menu state and handlers
const contextMenu = reactive<{ active: boolean; x: number; y: number; item: BoardItemVM | null }>({ active: false, x: 0, y: 0, item: null })
function onItemContextMenu(it: BoardItemVM, e: MouseEvent) {
  e.preventDefault()
  const rect = boardRef.value?.getBoundingClientRect()
  contextMenu.x = (e.clientX - (rect?.left || 0))
  contextMenu.y = (e.clientY - (rect?.top || 0))
  contextMenu.item = it
  contextMenu.active = true
}
function closeContextMenu() { contextMenu.active = false; contextMenu.item = null }
function editContextItem() {
  if (!contextMenu.item) return
  openItem(contextMenu.item)
  closeContextMenu()
}
function removeContextItem() {
  if (!project.value || !contextMenu.item) return
  const key = contextMenu.item.key
  if (project.value.boardLayout && project.value.boardLayout[key]) {
    delete project.value.boardLayout[key]
    if (key.startsWith('section:')) {
      const id = key.split(':')[1]
      project.value.sections = (project.value.sections || []).filter(s => s.id !== id)
      // Clear parent for any children of this section
      for (const child of Object.values(project.value.boardLayout)) {
        if (child.parent === key) child.parent = undefined
      }
    }
    project.value.updatedAt = Date.now()
    scheduleSave()
  }
  closeContextMenu()
}

// Selection & alignment
const selectedKeys = ref<string[]>([])
function isSelected(key: string) { return selectedKeys.value.includes(key) }
function toggleSelect(key: string, e: MouseEvent) {
  if (e.shiftKey) {
    if (isSelected(key)) selectedKeys.value = selectedKeys.value.filter(k => k !== key)
    else selectedKeys.value = [...selectedKeys.value, key]
  } else {
    selectedKeys.value = isSelected(key) ? [] : [key]
  }
}
function alignLeft() {
  if (!project.value) return
  const xs = selectedKeys.value.map(k => project.value!.boardLayout![k]?.x || 0)
  const minX = Math.min(...xs)
  for (const k of selectedKeys.value) { if (project.value.boardLayout![k]) project.value.boardLayout![k].x = minX }
  scheduleSave()
}
function alignTop() {
  if (!project.value) return
  const ys = selectedKeys.value.map(k => project.value!.boardLayout![k]?.y || 0)
  const minY = Math.min(...ys)
  for (const k of selectedKeys.value) { if (project.value.boardLayout![k]) project.value.boardLayout![k].y = minY }
  scheduleSave()
}
function distributeH() {
  if (!project.value) return
  const keys = [...selectedKeys.value]
  keys.sort((a,b) => (project.value!.boardLayout![a]?.x || 0) - (project.value!.boardLayout![b]?.x || 0))
  const xs = keys.map(k => project.value!.boardLayout![k]?.x || 0)
  const min = xs[0], max = xs[xs.length - 1]
  const step = xs.length > 1 ? (max - min) / (xs.length - 1) : 0
  keys.forEach((k, i) => { if (project.value!.boardLayout![k]) project.value!.boardLayout![k].x = Math.round((min + step * i) / gridSize) * gridSize })
  scheduleSave()
}
function distributeV() {
  if (!project.value) return
  const keys = [...selectedKeys.value]
  keys.sort((a,b) => (project.value!.boardLayout![a]?.y || 0) - (project.value!.boardLayout![b]?.y || 0))
  const ys = keys.map(k => project.value!.boardLayout![k]?.y || 0)
  const min = ys[0], max = ys[ys.length - 1]
  const step = ys.length > 1 ? (max - min) / (ys.length - 1) : 0
  keys.forEach((k, i) => { if (project.value!.boardLayout![k]) project.value!.boardLayout![k].y = Math.round((min + step * i) / gridSize) * gridSize })
  scheduleSave()
}

// Open editors inline
const editingTab = ref<any | null>(null)
const editingLyrics = ref<any | null>(null)
async function openItem(it: BoardItemVM) {
  if (!project.value) return
  if (it.type === 'tab') {
    const tab = project.value.tabs?.find(t => t.id === it.id)
    if (tab) editingTab.value = { ...tab }
  } else if (it.type === 'lyric') {
    const lyr = project.value.lyrics?.find(l => l.id === it.id)
    if (lyr) editingLyrics.value = { ...lyr }
  } else {
    // No-op for slice and section on double-click
  }
}
async function saveTabInline(t: any) {
  if (!project.value) return
  const now = Date.now()
  project.value.tabs = (project.value.tabs || []).map(x => x.id === t.id ? { ...t, updatedAt: now } : x)
  project.value.updatedAt = now
  await saveProject(project.value)
  editingTab.value = null
}
async function saveLyricsInline(l: any) {
  if (!project.value) return
  const now = Date.now()
  project.value.lyrics = (project.value.lyrics || []).map(x => x.id === l.id ? { ...l, updatedAt: now } : x)
  project.value.updatedAt = now
  await saveProject(project.value)
  editingLyrics.value = null
}

// Board content helpers
function getLyricHtml(id: string): string {
  const lyr = project.value?.lyrics?.find(l => l.id === id)
  return lyr?.content || ''
}
function getTabAscii(id: string): string {
  const tab = project.value?.tabs?.find(t => t.id === id)
  return tab?.content || ''
}
function getSlice(id: string): Slice | null {
  return sliceMap.value.get(id) || null
}
function getSourceForSlice(id: string) {
  const s = sliceMap.value.get(id)
  if (!s) return null
  // Prefer generated clip source if available
  if (s.clipSourceId) {
    const clip = sources.value.find(src => src.id === s.clipSourceId)
    if (clip) return clip
  }
  return sources.value.find(src => src.id === s.audioFileId) || null
}
function hasSource(it: BoardItemVM) {
  return !!getSourceForSlice(it.id)
}
function playSliceOnBoard(it: BoardItemVM) {
  if (it.type !== 'slice') return
  const slice = getSlice(it.id)
  const src = slice ? getSourceForSlice(it.id) : null
  if (slice && src) {
    // useAudioPlayback composable
    playSlice(slice, src)
  }
}
function pauseAudio() { pause() }

function onViewerSeek(it: BoardItemVM, time: number) {
  activeViewerKey.value = it.key
  const slice = getSlice(it.id)
  const src = slice ? getSourceForSlice(it.id) : null
  if (!src) return
  const ensureThenSeek = async () => {
    if (currentlyPlayingFileId.value !== src.id) {
      await loadAudioFile(src)
    }
    if (wasPlayingDuringScrub.value) {
      // Resume playback smoothly from the target time
      // Use play to avoid composable seek restart overhead
      pause()
      playSlice(slice!, src)
      seek(time)
      wasPlayingDuringScrub.value = false
    } else {
      seek(time)
    }
  }
  ensureThenSeek()
}

// Track active viewer (interaction focus)
const activeViewerKey = ref<string | null>(null)
const wasPlayingDuringScrub = ref(false)
function isActiveViewer(it: BoardItemVM) {
  const src = getSourceForSlice(it.id)
  const playingMatches = !!src && (currentlyPlayingFileId.value === src.id || currentlyPlayingSliceId.value === it.id)
  return playingMatches || activeViewerKey.value === it.key
}

function onViewerScrubStart(it: BoardItemVM) {
  activeViewerKey.value = it.key
  wasPlayingDuringScrub.value = isPlaying.value
  if (isPlaying.value) pause()
}
function onViewerScrubEnd(it: BoardItemVM) {
  // no-op here; resume handled in onViewerSeek
}

// Regenerate clip for a single slice (quick fix)
const regeneratingMap = reactive<Record<string, boolean>>({})
function isRegenerating(key: string) { return !!regeneratingMap[key] }
async function regenerateSliceClip(it: BoardItemVM) {
  const s = sliceMap.value.get(it.id)
  if (!s) return
  regeneratingMap[it.key] = true
  try {
    await saveSlice({ ...s, updatedAt: Date.now() })
    // Refresh slices and sources to pick up new clip
    slices.value = await getAllSlices()
    sources.value = await getAllAudioFiles()
  } catch (err) {
    console.warn('Failed to regenerate clip for slice', it.id, err)
  } finally {
    regeneratingMap[it.key] = false
  }
}

function viewerDims(it: BoardItemVM) {
  const pos = project.value?.boardLayout?.[it.key]
  const w = (pos?.w || defaultW(it)) - 12 // account for card padding
  const h = Math.max(60, (pos?.h || defaultH(it)) - 48) // header + padding
  return { w: Math.max(120, w), h }
}

function lyricFontSize(it: BoardItemVM) {
  const pos = project.value?.boardLayout?.[it.key]
  const w = pos?.w || defaultW(it)
  const h = pos?.h || defaultH(it)
  const base = 14
  const factor = Math.max(0.8, Math.min(2.0, Math.min(w / 220, h / 180)))
  return Math.round(base * factor)
}

// Resize handle
const resizing = reactive<{ key: string | null; startX: number; startY: number; startW: number; startH: number }>({ key: null, startX: 0, startY: 0, startW: 0, startH: 0 })
function startResize(it: BoardItemVM, e: MouseEvent) {
  if (!project.value) return
  const pos = project.value.boardLayout?.[it.key]
  if (!pos) return
  resizing.key = it.key
  const origin = boardOrigin()
  resizing.startX = (e.clientX - origin.x - offset.x) / scale.value
  resizing.startY = (e.clientY - origin.y - offset.y) / scale.value
  resizing.startW = pos.w || defaultW(it)
  resizing.startH = pos.h || defaultH(it)
  window.addEventListener('mousemove', onResizeMove)
  window.addEventListener('mouseup', onResizeUp)
}

// Ensure waveform data for visible slice sources
async function ensureWaveformForSource(source: any) {
  try {
    if (source.waveformData) return
    const arrayBuffer = await getSourceArrayBuffer(source)
    const audioBuffer = await loadAudioBuffer(arrayBuffer)
    const waveformData = await generateWaveformData(audioBuffer, 800)
    // Replace source object to update reactivity
    sources.value = sources.value.map(s => s.id === source.id ? { ...s, waveformData } : s)
  } catch (err) {
    console.warn('Failed to generate waveform for source', source?.id, err)
  }
}

watch(boardItems, async (items) => {
  // Only process slices currently visible on the board
  const sliceItems = items.filter(it => it.type === 'slice')
  for (const it of sliceItems) {
    const src = getSourceForSlice(it.id)
    if (src && !src.waveformData) {
      await ensureWaveformForSource(src)
    }
  }
}, { immediate: true })

watch(sources, async () => {
  // If sources update, ensure visible slices have waveforms
  const items = boardItems.value.filter(it => it.type === 'slice')
  for (const it of items) {
    const src = getSourceForSlice(it.id)
    if (src && !src.waveformData) {
      await ensureWaveformForSource(src)
    }
  }
})

// Persist when zoom changes via slider
watch(zoomPercent, () => {
  scheduleSave()
})

async function prewarmWaveformsForProject() {
  if (!project.value) return
  for (const sid of project.value.sliceIds || []) {
    const src = getSourceForSlice(sid)
    if (src && !src.waveformData) {
      await ensureWaveformForSource(src)
    }
  }
}
function onResizeMove(e: MouseEvent) {
  if (!resizing.key || !project.value) return
  const pos = project.value.boardLayout![resizing.key]
  const origin = boardOrigin()
  const mx = (e.clientX - origin.x - offset.x) / scale.value
  const my = (e.clientY - origin.y - offset.y) / scale.value
  const dw = mx - resizing.startX
  const dh = my - resizing.startY
  const key = resizing.key
  const vm = boardItems.value.find(b => b.key === key)
  let minW = vm ? 160 : 120
  let minH = vm ? 100 : 80
  // If resizing a section, ensure it cannot be smaller than its children bounds
  if (key.startsWith('section:')) {
    const children = Object.entries(project.value.boardLayout!)
      .filter(([, child]) => child.parent === key)
      .map(([, child]) => child)
    if (children.length > 0) {
      const left = pos.x || 0
      const top = pos.y || 0
      let maxRight = left + minW
      let maxBottom = top + minH
      for (const child of children) {
        const cw = child.w || 120
        const ch = child.h || 80
        maxRight = Math.max(maxRight, (child.x || 0) + cw)
        maxBottom = Math.max(maxBottom, (child.y || 0) + ch)
      }
      minW = Math.max(minW, maxRight - left + 10)
      minH = Math.max(minH, maxBottom - top + 10)
    }
  }
  pos.w = Math.max(minW, resizing.startW + dw)
  pos.h = Math.max(minH, resizing.startH + dh)
}
function onResizeUp() {
  window.removeEventListener('mousemove', onResizeMove)
  window.removeEventListener('mouseup', onResizeUp)
  // Persist layout changes on resize end
  scheduleSave()
  resizing.key = null
}

// Section helpers: editing title, colors, and menu actions
const editingSectionId = ref<string | null>(null)
const editingSectionTitle = ref<string>('')
function beginEditSection(id: string) {
  const s = getSectionById(id)
  if (!s) return
  editingSectionId.value = id
  editingSectionTitle.value = s.title || ''
}
function cancelEditSection() {
  editingSectionId.value = null
  editingSectionTitle.value = ''
}
async function saveSectionTitle(id: string) {
  if (!project.value) return
  const now = Date.now()
  project.value.sections = (project.value.sections || []).map(s => s.id === id ? { ...s, title: editingSectionTitle.value, updatedAt: now } : s)
  project.value.updatedAt = now
  await saveProject(project.value)
  cancelEditSection()
}
function getSectionById(id: string) {
  return project.value?.sections?.find(s => s.id === id)
}
function hexToRgba(hex: string, alpha: number) {
  const h = hex.replace('#','')
  const full = h.length === 3 ? h.split('').map(ch => ch + ch).join('') : h
  const r = parseInt(full.slice(0,2), 16)
  const g = parseInt(full.slice(2,4), 16)
  const b = parseInt(full.slice(4,6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
function sectionColor(id: string): string | null {
  const s = getSectionById(id)
  return s?.color || null
}
function sectionCardStyle(it: BoardItemVM) {
  if (it.type !== 'section') return {}
  const col = sectionColor(it.id)
  if (!col) return {}
  return { background: hexToRgba(col, 0.06), borderColor: hexToRgba(col, 0.25) }
}
function sectionHeaderStyle(it: BoardItemVM) {
  if (it.type !== 'section') return {}
  const col = sectionColor(it.id)
  if (!col) return {}
  return { background: hexToRgba(col, 0.15), borderBottomColor: hexToRgba(col, 0.3) }
}
const sectionMenuKey = ref<string | null>(null)
function toggleSectionMenu(key: string) { sectionMenuKey.value = sectionMenuKey.value === key ? null : key }
function isSectionMenuOpen(key: string) { return sectionMenuKey.value === key }
// Close section menu on outside click
function onGlobalMouseDown(e: MouseEvent) {
  const target = e.target as HTMLElement
  if (!target) return
  const inside = !!target.closest('.section-menu, .section-menu-btn')
  if (!inside) {
    sectionMenuKey.value = null
    colorPaletteFor.value = null
  }
}
watch(sectionMenuKey, (key) => {
  if (key) {
    window.addEventListener('mousedown', onGlobalMouseDown)
  } else {
    window.removeEventListener('mousedown', onGlobalMouseDown)
  }
})
const sectionColors = ['#4da3ff', '#50e3a4', '#e350a4', '#f5a623', '#b0b0b0', '#9b59b6']
const colorPaletteFor = ref<string | null>(null)
function toggleSectionColorPalette(id: string) { colorPaletteFor.value = colorPaletteFor.value === id ? null : id }
async function chooseSectionColor(id: string, color: string) {
  if (!project.value) return
  const now = Date.now()
  project.value.sections = (project.value.sections || []).map(s => s.id === id ? { ...s, color, updatedAt: now } : s)
  project.value.updatedAt = now
  await saveProject(project.value)
  colorPaletteFor.value = null
}
function removeSection(key: string, returnItems: boolean) {
  if (!project.value) return
  // Remove section record
  if (key.startsWith('section:')) {
    const id = key.split(':')[1]
    project.value.sections = (project.value.sections || []).filter(s => s.id !== id)
  }
  // Handle children: either return to pool (delete layout) or leave on board (clear parent)
  for (const [k, child] of Object.entries(project.value.boardLayout || {})) {
    if (child.parent === key) {
      if (returnItems) delete project.value.boardLayout![k]
      else child.parent = undefined
    }
  }
  // Also remove section layout
  if (project.value.boardLayout && project.value.boardLayout[key]) delete project.value.boardLayout[key]
  project.value.updatedAt = Date.now()
  scheduleSave()
  // Close any open menus
  sectionMenuKey.value = null
}
</script>

<style scoped>
.project-board-view { height: 100%; display: flex; flex-direction: column; }
.header { padding: 6px 4px; }
.canvas-wrapper { display: grid; grid-template-columns: 1fr 320px; grid-template-rows: auto 1fr; gap: 8px; flex: 1; height: 100%; align-items: start; }
.board-toolbar { position: absolute; top: 8px; left: 8px; background: #0d0d11; border: 1px solid #26262d; border-radius: 6px; padding: 6px; z-index: 5; pointer-events: none; }
.board-toolbar .btn,
.board-toolbar input,
.board-toolbar label { pointer-events: auto; }
.board-container { position: relative; background: #101012; border: 1px solid #2a2a2a;  overflow: hidden; height: 100%; }
.board-inner { 
    position: relative; 
    width: 2000px; height: 1200px; 
    transform-origin: 0 0; 
   }
.board-container, .board-inner, .board-item { -webkit-user-select: none; -ms-user-select: none; user-select: none; }
.board-item { position: absolute; width: 180px; min-height: 80px; cursor: grab; }
.board-item.selected { outline: 2px solid #5aa2ff; }
.board-item.slice { border-left: 4px solid #4da3ff; }
.board-item.tab { border-left: 4px solid #50e3a4; }
.board-item.lyric { border-left: 4px solid #e350a4; }
.board-item.section { border-left: 4px solid #b0b0b0; z-index: 1; }
.board-item.section.menu-open { z-index: 10; }
.board-item:not(.section) { z-index: 2; }
.item-title { font-size: 0.95rem; }
.marquee { position: absolute; border: 1px dashed #5aa2ff; background: rgba(90,162,255,0.1); }

/* Content cards */
.paper { background: #fff; color: #222; border-radius: 6px; box-shadow: 0 2px 6px rgba(0,0,0,0.25); height: 100%; display: flex; flex-direction: column; }
.paper-header { padding: 6px 8px; border-bottom: 1px solid #eee; background: #fafafa; }
.drag-handle { cursor: grab; height: 24px; }
.paper-content { padding: 8px; overflow: auto; white-space: pre-wrap; }

.tab-card { background: #161616; color: #ddd; border-radius: 6px; border: 1px solid #2a2a2a; height: 100%; position: relative; padding: 6px; }
.tab-content { white-space: pre-wrap; font-family: Menlo, Monaco, Consolas, 'Courier New', monospace; font-size: 12px; line-height: 1.3; margin: 6px 0 12px; }
.resize-handle { position: absolute; right: 4px; bottom: 4px; width: 12px; height: 12px; cursor: se-resize; border-right: 2px solid #777; border-bottom: 2px solid #777; }

.slice-card { background: #161616; color: #ddd; border-radius: 6px; border: 1px solid #2a2a2a; height: 100%; padding: 6px; display: flex; flex-direction: column; gap: 6px; position: relative; }

.section-card { background: #0f0f13; color: #ddd; border-radius: 6px; border: 1px dashed #3a3a45; height: 100%; display: flex; flex-direction: column; position: relative; }
.section-header { padding: 6px 8px; border-bottom: 1px solid #2a2a2a; background: #121218; position: relative; }
.section-content { flex: 1; }
.section-title-input { height: 24px; font-size: 12px; padding: 2px 6px; }
.section-title { cursor: text; }
.section-menu-btn { border: none; background: transparent; color: #bbb; padding: 2px 6px; }
.section-menu-btn:hover { color: #fff; }
.section-menu { position: absolute; top: 30px; right: 6px; background: #1c1c22; border: 1px solid #2a2a2a; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.4); min-width: 180px; z-index: 100; }
.section-menu .dropdown-item { color: #ddd; font-size: 11px; }
.section-menu .dropdown-item:hover { background: rgba(255,255,255,0.08); }
.color-palette { display: grid; grid-template-columns: repeat(6, 1fr); gap: 6px; padding: 6px; }
.color-swatch { width: 20px; height: 20px; border: none; border-radius: 4px; cursor: pointer; }

.pool-container { background: #0d0d11; border: 1px solid #26262d;  padding: 0; }
.pool-sections { display: flex; flex-direction: column; gap: 0; }
.pool-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
.pool-item { cursor: grab; }
.pool-item.card { background: #161616; border: 1px solid #2a2a2a; color: #ddd; border-radius: 6px; }
.pool-item.card.empty { background: #121218; border-style: dashed; color: #888; }

.context-menu {
  position: absolute;
  z-index: 1000;
  background: #1c1c22;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.4);
  min-width: 160px;
}
.context-menu .dropdown-item {
  color: #ddd;
  font-size: 11px;
}
.context-menu .dropdown-item:hover {
  background: rgba(255,255,255,0.08);
}
</style>
