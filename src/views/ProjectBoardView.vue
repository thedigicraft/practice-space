<template>
  <div class="project-board-view">
    <div class="header d-flex align-items-center justify-content-between mb-2">
      <div class="d-flex align-items-center gap-2">
        <h4 class="m-0">{{ project?.name || 'Project' }} — Board View</h4>
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
            :class="[it.type, { selected: isSelected(it.key) }]"
            :style="itemStyle(it)"
            @mousedown.stop
            @contextmenu.prevent.stop="onItemContextMenu(it, $event)"
            @dblclick="openItem(it)"
            @click.stop="toggleSelect(it.key, $event)"
          >
            <div v-if="it.type === 'lyric'" class="paper">
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
        <div class="pool-header d-flex align-items-center justify-content-between">
          <strong>Pool</strong>
          <small class="text-muted">New items appear here</small>
        </div>
        <div class="pool-grid">
          <div
            v-for="it in poolItems"
    
            :key="it.key"
            class="pool-item card"
            :class="it.type"
            @mousedown.stop="startPoolDrag(it, $event)"
          >
            <div class="card-body p-2">
              <div class="item-title fw-bold">{{ it.title }}</div>
              <div class="item-meta text-muted small">{{ it.typeLabel }}</div>
            </div>
          </div>
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
  type: 'slice' | 'tab' | 'lyric'
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

const itemStyle = (it: BoardItemVM) => ({ left: it.x + 'px', top: it.y + 'px', width: (project.value?.boardLayout?.[it.key]?.w || defaultW(it)) + 'px', height: (project.value?.boardLayout?.[it.key]?.h || defaultH(it)) + 'px' })
function defaultW(it: BoardItemVM) { return it.type === 'tab' ? 280 : it.type === 'lyric' ? 220 : 300 }
function defaultH(it: BoardItemVM) { return it.type === 'tab' ? 160 : it.type === 'lyric' ? 180 : 140 }
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
const dragging = reactive<{ key: string | null; dx: number; dy: number; fromPool?: boolean; lastX?: number; lastY?: number }>({ key: null, dx: 0, dy: 0, fromPool: false, lastX: 0, lastY: 0 })
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
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}
function onMove(e: MouseEvent) {
  if (!dragging.key || !project.value) return
  const origin = boardOrigin()
  const mx = (e.clientX - origin.x - offset.x) / scale.value
  const my = (e.clientY - origin.y - offset.y) / scale.value
  const x = mx - dragging.dx
  const y = my - dragging.dy
  const pos = (project.value.boardLayout![dragging.key] ||= { x: 0, y: 0 })
  pos.x = snap.value ? Math.round(x / gridSize) * gridSize : x
  pos.y = snap.value ? Math.round(y / gridSize) * gridSize : y
  dragging.lastX = x
  dragging.lastY = y
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
    if (!inBounds) {
      delete project.value.boardLayout![dragging.key]
    }
  }
  // Persist layout changes on drag end
  scheduleSave()
  dragging.key = null
  dragging.fromPool = false
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
    // slices: navigate to studio view for full context
    router.push({ name: 'project', params: { id: project.value.id } })
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
  const minW = vm ? 160 : 120
  const minH = vm ? 100 : 80
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
</script>

<style scoped>
.project-board-view { height: 100%; display: flex; flex-direction: column; }
.header { padding: 6px 4px; }
.canvas-wrapper { display: grid; grid-template-columns: 1fr 320px; grid-template-rows: auto 1fr; gap: 8px; flex: 1; height: 100%; align-items: start; }
.board-toolbar { position: absolute; top: 8px; left: 8px; background: #0d0d11; border: 1px solid #26262d; border-radius: 6px; padding: 6px; z-index: 5; pointer-events: none; }
.board-toolbar .btn,
.board-toolbar input,
.board-toolbar label { pointer-events: auto; }
.board-container { position: relative; background: #101012; border: 1px solid #2a2a2a; border-radius: 6px; overflow: hidden; height: 100%; }
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

.pool-container { background: #0d0d11; border: 1px solid #26262d; border-radius: 6px; padding: 6px; }
.pool-header { padding: 4px 2px; }
.pool-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; }
.pool-item { cursor: grab; }

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
