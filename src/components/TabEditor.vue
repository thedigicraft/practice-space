<template>
  <div class="modal fade show" style="display: block;" tabindex="-1" role="dialog" aria-modal="true" @keydown.esc="$emit('close')">
    <div class="modal-dialog modal-xl">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Edit Tab</h5>
          <button type="button" class="btn-close" aria-label="Close" @click="$emit('close')"></button>
        </div>
        <div class="modal-body">
          <div class="row g-3">
            <div class="col-12 col-lg-4">
              <div class="mb-3">
                <label class="form-label">Title</label>
                <input v-model="local.title" type="text" class="form-control" />
              </div>
              <div class="mb-3">
                <label class="form-label">Strings</label>
                <input v-model.number="strings" type="number" min="1" max="12" class="form-control" @change="adjustStrings" />
              </div>
              <div class="mb-3">
                <label class="form-label">Tuning (top to bottom)</label>
                <div class="d-flex flex-column gap-2">
                  <input v-for="(t,i) in tuning" :key="i" v-model="tuning[i]" type="text" class="form-control form-control-sm" />
                </div>
              </div>
              <div class="row g-2 align-items-end">
                <div class="col-4">
                  <label class="form-label">Beats/Bar</label>
                  <input v-model.number="beatsPerBar" type="number" min="1" max="12" class="form-control" />
                </div>
                <div class="col-4">
                  <label class="form-label">Beat Unit</label>
                  <select v-model.number="beatUnit" class="form-select">
                    <option :value="1">Whole (1)</option>
                    <option :value="2">Half (2)</option>
                    <option :value="4">Quarter (4)</option>
                    <option :value="8">Eighth (8)</option>
                    <option :value="16">Sixteenth (16)</option>
                    <option :value="32">Thirty-second (32)</option>
                  </select>
                </div>
                <div class="col-4">
                  <label class="form-label">Bars</label>
                  <input v-model.number="bars" type="number" min="1" max="64" class="form-control" />
                </div>
              </div>
              <div class="mt-3 text-muted small">Columns: {{ columns }}</div>
              <div class="mt-3">
                <button class="btn btn-sm btn-outline-secondary me-2" @click="clearGrid">Clear Grid</button>
                <button class="btn btn-sm btn-outline-secondary" @click="fillGrid(0)">Fill 0s</button>
              </div>
            </div>
            <div class="col-12 col-lg-8">
              <div class="player-controls d-flex align-items-center justify-content-between mb-2">
                <div class="d-flex align-items-center gap-2">
                  <label class="form-label mb-0">BPM</label>
                  <input v-model.number="bpm" type="number" min="40" max="240" class="form-control form-control-sm" style="width: 90px;" />
                  <label class="form-label mb-0 ms-2">Instrument</label>
                  <select v-model="instrument" class="form-select form-select-sm" style="width: 140px;">
                    <option value="guitar">Guitar</option>
                    <option value="bass">Bass</option>
                    <option value="piano">Piano-like</option>
                    <option value="synth">Synth</option>
                  </select>
                </div>
                <div class="d-flex align-items-center gap-2">
                  <button v-if="hasContiguousBarSelection" class="btn btn-warning btn-sm" @click="createSectionFromSelection">Create Section from Selection</button>
                  <div class="btn-group btn-group-sm">
                    <button class="btn btn-primary" @click="startPlayback" :disabled="isPlaying">Play</button>
                    <button class="btn btn-outline-secondary" @click="stopPlayback" :disabled="!isPlaying">Stop</button>
                  </div>
                </div>
              </div>
              <div class="tab-grid overflow-auto border">
                <table class="table table-sm mb-0">
                  <thead>
                    <tr>
                      <th class="tuning-cell"></th>
                      <th
                        v-for="c in columns"
                        :key="c"
                        class="chord-cell"
                        :class="cellClasses(c-1)"
                        role="button"
                        @click="openChordMenu(c-1, $event)"
                      >
                        <span>{{ chordLabels[c-1] }}</span>
                        <div v-if="menuCol === c-1" class="chord-menu" @click.stop>
                          <div class="d-flex gap-2 align-items-center mb-2">
                            <select v-model.number="menuRoot" class="form-select form-select-sm" style="width: 110px;">
                              <option v-for="opt in rootOptions" :key="opt.pc" :value="opt.pc">{{ opt.label }}</option>
                            </select>
                            <select v-model="menuQuality" class="form-select form-select-sm" style="width: 130px;">
                              <option v-for="q in qualityOptions" :key="q" :value="q">{{ q }}</option>
                            </select>
                            <select v-model="menuRootPlacement" class="form-select form-select-sm" style="width: 140px;">
                              <option value="auto">Auto voicing</option>
                              <option value="lowest">Root on lowest</option>
                              <option value="highest">Root on highest</option>
                            </select>
                          </div>
                          <div class="d-flex gap-2 align-items-center mb-2">
                            <div class="input-group input-group-sm" style="width: 150px;">
                              <span class="input-group-text">Strings</span>
                              <input v-model.number="menuIncludeStrings" type="number" min="1" :max="strings" class="form-control" />
                            </div>
                            <div class="input-group input-group-sm" style="width: 160px;">
                              <span class="input-group-text">Min fret</span>
                              <input v-model.number="menuMinFret" type="number" min="0" max="24" class="form-control" />
                            </div>
                          </div>
                          <div class="d-flex gap-2">
                            <button class="btn btn-primary btn-sm" @click="applyChordToColumn(menuCol, menuRoot, menuQuality)">Apply</button>
                            <button class="btn btn-warning btn-sm" @click="clearColumn(menuCol)">Clear column</button>
                            <button class="btn btn-outline-secondary btn-sm" @click="closeChordMenu">Close</button>
                          </div>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(row, r) in grid" :key="r">
                      <td class="tuning-cell text-muted small align-middle">{{ tuning[r] || '' }}</td>
                      <td
                        v-for="(cell, c) in row"
                        :key="c"
                        class="grid-cell"
                        :class="cellClasses(c)"
                        @click="focusCell(r,c)"
                        @contextmenu.prevent="clearCell(r,c)"
                      >
                        <input
                          :ref="el => setCellRef(r,c, el as HTMLInputElement)"
                          :value="cell == null ? '' : cell"
                          class="grid-input"
                          inputmode="numeric"
                          @focus="selectCell(r,c)"
                          @input="onCellInput(r,c, $event)"
                          @keydown="onCellKeydown(r,c, $event)"
                        />
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr class="bar-selector-row">
                      <td class="tuning-cell"></td>
                      <template v-for="cell in barSelectorCells" :key="cell.key">
                        <td
                          v-if="!cell.section"
                          class="bar-cell"
                          :colspan="beatsPerBar"
                          :class="{ selected: isBarSelected(cell.barIndex) }"
                          @mousedown.stop.prevent="onBarMouseDown(cell.barIndex, $event)"
                          @mousemove.stop.prevent="onBarMouseMove(cell.barIndex, $event)"
                          @mouseup.stop.prevent="onBarMouseUp"
                          @click.stop.prevent="onBarClick(cell.barIndex, $event)"
                          
                        >
                          <span class="bar-label">Bar {{ cell.barIndex + 1 }}</span>
                        </td>
                        <td
                          v-else
                          class="section-cell"
                          :colspan="beatsPerBar * cell.section.barCount"
                        >
                          <div class="section-cell-inner">
                            <button class="section-range-btn" title="Expand left" @click.stop="expandSectionLeft(cell.section.id)">‹</button>
                            <span class="section-cell-title" @dblclick.stop="beginEditRepeatTitle(cell.section.id)">
                              <template v-if="editingRepeatTitleId === cell.section.id">
                                <input class="form-control form-control-sm section-edit-input" v-model="editingRepeatTitle" @blur="saveRepeatTitle(cell.section.id)" @keydown.enter.prevent="saveRepeatTitle(cell.section.id)" @keydown.esc.prevent="cancelRepeatTitleEdit" />
                              </template>
                              <template v-else>{{ cell.section.title }}</template>
                            </span>
                            <span class="section-cell-repeats" @dblclick.stop="beginEditRepeatCount(cell.section.id)">
                              <template v-if="editingRepeatCountId === cell.section.id">
                                <input class="form-control form-control-sm section-edit-input" v-model.number="editingRepeatCount" @blur="saveRepeatCount(cell.section.id)" @keydown.enter.prevent="saveRepeatCount(cell.section.id)" @keydown.esc.prevent="cancelRepeatCountEdit" />
                              </template>
                              <template v-else>x{{ cell.section.repeats }}</template>
                            </span>
                            <button class="section-range-btn" title="Expand right" @click.stop="expandSectionRight(cell.section.id)">›</button>
                            <button class="section-remove-btn" title="Remove section" @click.stop="removeSectionById(cell.section.id)">×</button>
                          </div>
                        </td>
                      </template>
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div class="mt-3">
                <label class="form-label">Preview (ASCII)</label>
                <pre class="form-control" style="min-height: 160px">{{ asciiPreview }}</pre>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="$emit('close')">Cancel</button>
          <button class="btn btn-primary" @click="save">Save</button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
</template>

<script setup lang="ts">
import { reactive, ref, watch, computed } from 'vue'
import type { ProjectTabItem } from '@/types/models'

interface Props { tab: ProjectTabItem }
const props = defineProps<Props>()
const emit = defineEmits<{ save: [tab: ProjectTabItem]; close: [] }>()

const local = reactive<ProjectTabItem>({ ...props.tab })

// Defaults
const strings = ref<number>(local.strings ?? 6)
const beatsPerBar = ref<number>(local.beatsPerBar ?? 4)
const beatUnit = ref<number>(local.beatUnit ?? 4)
const bars = ref<number>(local.bars ?? 4)
const tuning = ref<string[]>(local.tuning ?? Array.from({ length: strings.value }, (_, i) => ['e','B','G','D','A','E'][i] || ''))
// Playback state
const bpm = ref<number>(120)
const isPlaying = ref<boolean>(false)
let playTimer: number | null = null
const audioCtx = ref<AudioContext | null>(null)
const masterGain = ref<GainNode | null>(null)
const instrument = ref<'guitar' | 'bass' | 'piano' | 'synth'>('guitar')
const baseMidiFor6: number[] = [64, 59, 55, 50, 45, 40] // E4, B3, G3, D3, A2, E2 (top to bottom)
const pcToMidi = (pc: number, octave: number) => (octave * 12) + pc
function getBaseMidiForString(r: number): number {
  // If standard 6-string, use known bases; otherwise derive from PC with octave 3
  const pc = parseTuningPc(tuning.value[r]) ?? 0
  if (strings.value === 6 && r >= 0 && r < 6) return baseMidiFor6[r]
  return pcToMidi(pc, 3)
}
function frequencyFor(r: number, c: number): number | null {
  const v = grid.value[r][c]
  if (v == null) return null
  if (typeof v === 'string' && v.toLowerCase() === 'x') return null
  const fret = tokenToFret(v)
  if (fret == null) return null
  const baseMidi = getBaseMidiForString(r)
  const midi = baseMidi + fret
  return 440 * Math.pow(2, (midi - 69) / 12)
}
function ensureAudio() {
  if (!audioCtx.value) audioCtx.value = new (window.AudioContext || (window as any).webkitAudioContext)()
  if (!masterGain.value) {
    const ctx = audioCtx.value!
    masterGain.value = ctx.createGain()
    masterGain.value.gain.value = 0.6
    masterGain.value.connect(ctx.destination)
  }
}
function createVoice(freq: number, when: number, dur: number) {
  ensureAudio()
  const ctx = audioCtx.value!
  const out = masterGain.value!
  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.0001, when)
  // ADSR defaults
  let A = 0.01, D = 0.12, S = 0.25, R = 0.12
  let cutoff = 1800
  let oscTypes: OscillatorType[] = ['triangle']
  let detuneCents = 0
  // Instrument shaping
  switch (instrument.value) {
    case 'guitar':
      oscTypes = ['triangle']
      cutoff = 2200
      A = 0.008; D = 0.10; S = 0.22; R = 0.1
      break
    case 'bass':
      oscTypes = ['square']
      cutoff = 900
      A = 0.01; D = 0.15; S = 0.3; R = 0.18
      break
    case 'piano':
      oscTypes = ['sine', 'sine']
      detuneCents = 1200 // second osc one octave above for brightness
      cutoff = 2400
      A = 0.005; D = 0.2; S = 0.05; R = 0.12
      break
    case 'synth':
      oscTypes = ['sawtooth']
      cutoff = 1400
      A = 0.02; D = 0.1; S = 0.4; R = 0.16
      break
  }
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(cutoff, when)
  filter.Q.value = 0.8
  // envelope schedule
  gain.gain.exponentialRampToValueAtTime(0.12, when + Math.max(0.005, A))
  gain.gain.exponentialRampToValueAtTime(S, when + Math.max(A + D, 0.02))
  gain.gain.exponentialRampToValueAtTime(0.0001, when + Math.max(dur, A + D) + R)
  // chain connect
  gain.connect(filter)
  filter.connect(out)
  // build oscillators
  const oscs: OscillatorNode[] = []
  oscTypes.forEach((type, idx) => {
    const osc = ctx.createOscillator()
    osc.type = type
    osc.frequency.setValueAtTime(freq, when)
    if (idx === 1 && detuneCents) osc.detune.setValueAtTime(detuneCents, when)
    osc.connect(gain)
    oscs.push(osc)
  })
  // start/stop
  oscs.forEach(o => o.start(when))
  oscs.forEach(o => o.stop(when + Math.max(dur, A + D) + R + 0.02))
}
function playColumnOnce(c: number) {
  ensureAudio()
  const ctx = audioCtx.value!
  const now = ctx.currentTime
  const dur = Math.max(0.12, (60 / bpm.value) * (4 / beatUnit.value) * 0.5)
  for (let r = 0; r < strings.value; r++) {
    const freq = frequencyFor(r, c)
    if (freq) createVoice(freq, now, dur)
  }
}
function startPlayback() {
  if (isPlaying.value) return
  isPlaying.value = true
  let col = 0
  const stepMs = Math.max(50, (60 / bpm.value) * (4 / beatUnit.value) * 1000)
  let currentSection: RepeatSection | null = null
  let repeatRemaining = 1
  const sectionForCol = (c: number): RepeatSection | null => {
    const bi = Math.floor(c / beatsPerBar.value)
    return sectionAtBarIndex(bi)
  }
  const tick = () => {
    if (!isPlaying.value) return
    playColumnOnce(col)
    const sec = currentSection || sectionForCol(col)
    if (sec) {
      const startCol = sec.startBar * beatsPerBar.value
      const endCol = (sec.startBar + sec.barCount) * beatsPerBar.value - 1
      if (!currentSection) { currentSection = sec; repeatRemaining = Math.max(1, sec.repeats) }
      if (col >= endCol) {
        if (repeatRemaining > 1) {
          repeatRemaining -= 1
          col = startCol
        } else {
          currentSection = null
          col = Math.min(endCol + 1, columns.value - 1)
          col = (col + 1) % columns.value
        }
      } else {
        col = col + 1
      }
    } else {
      col = (col + 1) % columns.value
    }
    playTimer = window.setTimeout(tick, stepMs) as unknown as number
  }
  tick()
}
function stopPlayback() {
  isPlaying.value = false
  if (playTimer) { clearTimeout(playTimer as unknown as number); playTimer = null }
}

const columns = computed(() => beatsPerBar.value * bars.value)
const grid = ref<Array<Array<number | string | null>>>(
  local.grid
    ? local.grid.map(row => row.slice(0, columns.value)).slice(0, strings.value)
    : Array.from({ length: strings.value }, () => Array.from({ length: columns.value }, () => null))
)

const recomputeGrid = () => {
  // Adjust rows
  const rows = strings.value
  const cols = columns.value
  // Resize grid
  const next: Array<Array<number | string | null>> = Array.from({ length: rows }, (_, r) => {
    const oldRow = grid.value[r] || []
    const row: Array<number | string | null> = Array.from({ length: cols }, (_, c) => oldRow[c] ?? null)
    return row
  })
  grid.value = next
  // Adjust tuning length
  if (tuning.value.length !== rows) {
    const nextTuning = Array.from({ length: rows }, (_, i) => tuning.value[i] ?? '')
    tuning.value = nextTuning
  }
}

// --- Repeat Sections ---
type RepeatSection = { id: string; title: string; startBar: number; barCount: number; repeats: number }
const repeatSections = ref<RepeatSection[]>([])
const editingRepeatTitleId = ref<string | null>(null)
const editingRepeatTitle = ref<string>('')
const editingRepeatCountId = ref<string | null>(null)
const editingRepeatCount = ref<number>(1)
function beginEditRepeatTitle(id: string) {
  const s = repeatSections.value.find(x => x.id === id)
  if (!s) return
  editingRepeatTitleId.value = id
  editingRepeatTitle.value = s.title
}
function cancelRepeatTitleEdit() { editingRepeatTitleId.value = null; editingRepeatTitle.value = '' }
function saveRepeatTitle(id: string) {
  const s = repeatSections.value.find(x => x.id === id)
  if (!s) return
  s.title = editingRepeatTitle.value || 'Section'
  cancelRepeatTitleEdit()
}
function beginEditRepeatCount(id: string) {
  const s = repeatSections.value.find(x => x.id === id)
  if (!s) return
  editingRepeatCountId.value = id
  editingRepeatCount.value = s.repeats
}
function cancelRepeatCountEdit() { editingRepeatCountId.value = null }
function saveRepeatCount(id: string) {
  const s = repeatSections.value.find(x => x.id === id)
  if (!s) return
  const n = Math.max(1, Math.floor(editingRepeatCount.value || 1))
  s.repeats = n
  cancelRepeatCountEdit()
}
function sectionAtBarIndex(bi: number): RepeatSection | null {
  for (const s of repeatSections.value) {
    if (bi >= s.startBar && bi < s.startBar + s.barCount) return s
  }
  return null
}
const barSelectorCells = computed(() => {
  const cells: Array<{ key: string; barIndex: number; section?: RepeatSection }> = []
  let b = 0
  while (b < bars.value) {
    const s = sectionAtBarIndex(b)
    if (s && s.startBar === b) {
      cells.push({ key: `sec-${s.id}`, barIndex: b, section: s })
      b += s.barCount
    } else if (!s) {
      cells.push({ key: `bar-${b}`, barIndex: b })
      b += 1
    } else {
      // inside a section but not start; skip as rendered by start cell
      b += 1
    }
  }
  return cells
})
// Bar selection (contiguous)
const barSelStart = ref<number | null>(null)
const barSelEnd = ref<number | null>(null)
const barSelecting = ref<boolean>(false)
function clearBarSelection() { barSelStart.value = null; barSelEnd.value = null }
function isBarSelected(bi: number) {
  if (barSelStart.value == null || barSelEnd.value == null) return false
  return bi >= Math.min(barSelStart.value, barSelEnd.value) && bi <= Math.max(barSelStart.value, barSelEnd.value)
}
const hasContiguousBarSelection = computed(() => barSelStart.value != null && barSelEnd.value != null)
function onBarMouseDown(bi: number, e: MouseEvent) {
  barSelecting.value = true
  if (e.shiftKey && barSelStart.value != null && barSelEnd.value != null) {
    // Only expand if adjacent to current selection
    const min = Math.min(barSelStart.value, barSelEnd.value)
    const max = Math.max(barSelStart.value, barSelEnd.value)
    if (bi === min - 1) barSelStart.value = bi
    else if (bi === max + 1) barSelEnd.value = bi
    else { barSelStart.value = bi; barSelEnd.value = bi }
  } else {
    barSelStart.value = bi
    barSelEnd.value = bi
  }
}
function onBarMouseMove(bi: number, e: MouseEvent) {
  if (!barSelecting.value) return
  barSelEnd.value = bi
}
function onBarMouseUp() { barSelecting.value = false }
function onBarClick(bi: number, e: MouseEvent) {
  if (!e.shiftKey) { barSelStart.value = bi; barSelEnd.value = bi }
}
// Context menu for bar selection
const barMenu = reactive<{ active: boolean; x: number; y: number }>({ active: false, x: 0, y: 0 })
function openBarMenu(bi: number, e: MouseEvent) {
  if (!isBarSelected(bi)) { barSelStart.value = bi; barSelEnd.value = bi }
  barMenu.x = e.clientX
  barMenu.y = e.clientY
  barMenu.active = true
}
function closeBarMenu() { barMenu.active = false }
function selectionRange(): { start: number; end: number } | null {
  if (barSelStart.value == null || barSelEnd.value == null) return null
  const start = Math.min(barSelStart.value, barSelEnd.value)
  const end = Math.max(barSelStart.value, barSelEnd.value)
  return { start, end }
}
function overlapsExistingSection(start: number, end: number) {
  for (const s of repeatSections.value) {
    const sStart = s.startBar
    const sEnd = s.startBar + s.barCount - 1
    if (start <= sEnd && end >= sStart) return true
  }
  return false
}
function createSectionFromSelection() {
  const range = selectionRange()
  if (!range) return
  if (overlapsExistingSection(range.start, range.end)) { closeBarMenu(); return }
  const id = crypto.randomUUID()
  const count = range.end - range.start + 1
  repeatSections.value.push({ id, title: 'Section', startBar: range.start, barCount: count, repeats: 1 })
  clearBarSelection()
  closeBarMenu()
}

function findSectionById(id: string): RepeatSection | undefined {
  return repeatSections.value.find(s => s.id === id)
}
function sectionEndBar(s: RepeatSection) { return s.startBar + s.barCount - 1 }
function neighborSectionAtBar(bi: number): RepeatSection | null {
  return repeatSections.value.find(s => bi >= s.startBar && bi <= sectionEndBar(s)) || null
}
function mergeSections(target: RepeatSection, other: RepeatSection) {
  const start = Math.min(target.startBar, other.startBar)
  const end = Math.max(sectionEndBar(target), sectionEndBar(other))
  target.startBar = start
  target.barCount = end - start + 1
  // Remove other
  repeatSections.value = repeatSections.value.filter(s => s.id !== other.id)
}
function expandSectionLeft(id: string) {
  const s = findSectionById(id)
  if (!s) return
  const prevBar = s.startBar - 1
  if (prevBar < 0) return
  const neighbor = neighborSectionAtBar(prevBar)
  if (neighbor) {
    // merge neighbor if it touches from the left
    mergeSections(s, neighbor)
  } else {
    s.startBar -= 1
    s.barCount += 1
  }
}
function expandSectionRight(id: string) {
  const s = findSectionById(id)
  if (!s) return
  const nextBar = sectionEndBar(s) + 1
  if (nextBar >= bars.value) return
  const neighbor = neighborSectionAtBar(nextBar)
  if (neighbor) {
    // merge neighbor starting at next bar
    mergeSections(s, neighbor)
  } else {
    s.barCount += 1
  }
}
function removeSectionById(id: string) {
  repeatSections.value = repeatSections.value.filter(s => s.id !== id)
}

watch([strings, beatsPerBar, bars], recomputeGrid)

const clearGrid = () => {
  grid.value = grid.value.map(row => row.map(() => null))
}
const fillGrid = (n: number) => {
  grid.value = grid.value.map(row => row.map(() => n))
}
const clearCell = (r: number, c: number) => {
  grid.value[r][c] = null
}

// Selection & keyboard controls
const selR = ref<number>(0)
const selC = ref<number>(0)
const isSelected = (r: number, c: number) => selR.value === r && selC.value === c
const selectCell = (r: number, c: number) => {
  selR.value = Math.max(0, Math.min(strings.value - 1, r))
  selC.value = Math.max(0, Math.min(columns.value - 1, c))
}
const moveSelection = (dr: number, dc: number) => {
  selectCell(selR.value + dr, selC.value + dc)
}
// Inline inputs and refs
const cellRefs = ref<Map<string, HTMLInputElement>>(new Map())
const keyFor = (r: number, c: number) => `${r}-${c}`
const setCellRef = (r: number, c: number, el: HTMLInputElement | null) => {
  const map = cellRefs.value
  const key = keyFor(r, c)
  if (el) map.set(key, el)
  else map.delete(key)
}
const focusCell = (r: number, c: number) => {
  selectCell(r, c)
  const el = cellRefs.value.get(keyFor(r, c))
  el?.focus()
  el?.select?.()
}
const onCellInput = (r: number, c: number, e: Event) => {
  const el = e.target as HTMLInputElement
  // allow digits and these markers: x,h,p,b,r,~,/,\
  let raw = el.value.replace(/\s+/g, '')
  raw = raw.replace(/[^0-9xhpb r~\/\\]/gi, '')
  // normalize case
  raw = raw.toLowerCase()
  // limit length: either 'x' OR up to 2 digits + optional 1 marker
  if (raw === 'x') {
    el.value = 'x'
    grid.value[r][c] = 'x'
    return
  }
  const match = raw.match(/^([0-9]{1,2})([hprb~\/\\])?$/)
  if (!match) {
    el.value = ''
    grid.value[r][c] = null
    return
  }
  const num = Number(match[1])
  const clamped = Math.max(0, Math.min(24, Math.floor(num)))
  const marker = match[2] ?? ''
  if (marker) {
    const token = `${clamped}${marker}`
    el.value = token
    grid.value[r][c] = token
  } else {
    el.value = String(clamped)
    grid.value[r][c] = clamped
  }
}
const onCellKeydown = (r: number, c: number, e: KeyboardEvent) => {
  if (e.key === 'ArrowLeft') { e.preventDefault(); focusCell(r, Math.max(0, c - 1)); return }
  if (e.key === 'ArrowRight') { e.preventDefault(); focusCell(r, Math.min(columns.value - 1, c + 1)); return }
  if (e.key === 'ArrowUp') { e.preventDefault(); focusCell(Math.max(0, r - 1), c); return }
  if (e.key === 'ArrowDown') { e.preventDefault(); focusCell(Math.min(strings.value - 1, r + 1), c); return }
  if (e.key === 'Tab') {
    e.preventDefault()
    if (e.shiftKey) {
      const prevC = c > 0 ? c - 1 : columns.value - 1
      const prevR = c > 0 ? r : Math.max(0, r - 1)
      focusCell(prevR, prevC)
    } else {
      const nextC = c < columns.value - 1 ? c + 1 : 0
      const nextR = c < columns.value - 1 ? r : Math.min(strings.value - 1, r + 1)
      focusCell(nextR, nextC)
    }
    return
  }
  if (e.key === 'Enter') { e.preventDefault(); focusCell(r, Math.min(columns.value - 1, c + 1)); return }
  if (e.key === 'Escape') { (e.target as HTMLInputElement).blur(); return }
  if (e.key === 'Backspace' || e.key === 'Delete') {
    // allow default editing; if becomes empty, grid is set via input handler
    return
  }
}

// Beat/bar separator classes
const cellClasses = (c: number) => {
  const classes: Record<string, boolean> = {}
  const colsPerBar = beatsPerBar.value
  if ((c + 1) % colsPerBar === 0) classes['bar-boundary'] = true
  else classes['beat-boundary'] = true
  if (isSelected(selR.value, c)) classes['has-selected-row'] = true
  return classes
}

const asciiPreview = computed(() => {
  const cols = columns.value
  const header = `Time: ${beatsPerBar.value}/${beatUnit.value}  Bars: ${bars.value}  Columns: ${cols}`
  const lines = [header]
  if (repeatSections.value.length > 0) {
    const secLine = 'Sections: ' + repeatSections.value.map(s => `${s.title} (bars ${s.startBar + 1}-${s.startBar + s.barCount}) x${s.repeats}`).join('; ')
    lines.push(secLine)
  }
  for (let r = 0; r < strings.value; r++) {
    let line = (tuning.value[r] || '').padEnd(3, ' ') + '|'
    for (let c = 0; c < cols; c++) {
      const v = grid.value[r][c]
      if (v == null) {
        line += '-' // empty
      } else {
        const s = String(v)
        line += s
      }
      // end-of-bar separator (double barline)
      if ((c + 1) % beatsPerBar.value === 0) line += '||'
    }
    lines.push(line)
  }
  // Repeat markers line under bars: shows where repeats start and counts
  const repeatPrefix = '   |'
  // Bar numbers line for clarity
  let barNumbersLine = repeatPrefix
  for (let b = 0; b < bars.value; b++) {
    barNumbersLine += String(b + 1) + '||'
  }
  lines.push(barNumbersLine)
  let repeatLine = repeatPrefix
  for (let b = 0; b < bars.value; b++) {
    const start = repeatSections.value.find(sec => sec.startBar === b)
    const label = start ? `↺${start.repeats}` : ' '
    repeatLine += label + '||'
  }
  lines.push(repeatLine)
  return lines.join('\n')
})

// --- Chord detection above columns ---
const NOTE_TO_PC: Record<string, number> = {
  'C': 0, 'C#': 1, 'Db': 1,
  'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4,
  'F': 5, 'F#': 6, 'Gb': 6,
  'G': 7, 'G#': 8, 'Ab': 8,
  'A': 9, 'A#': 10, 'Bb': 10,
  'B': 11,
}
const PC_TO_NOTE_SHARP = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B']
const PC_TO_NOTE_FLAT = ['C','Db','D','Eb','E','F','Gb','G','Ab','A','Bb','B']
const preferFlats = computed(() => tuning.value.some(t => (t || '').includes('b')))

const parseTuningPc = (label: string | undefined): number | null => {
  if (!label) return null
  const s = label.trim()
  if (!s) return null
  // normalize: capitalize first letter, keep accidental
  const base = s[0].toUpperCase() + (s[1] === '#' || s[1] === 'b' ? s[1] : '')
  return NOTE_TO_PC[base] ?? null
}
const tokenToFret = (v: number | string | null): number | null => {
  if (v == null) return null
  if (typeof v === 'number') return v
  if (v.toLowerCase() === 'x') return null
  const m = v.match(/^(\d{1,2})/)
  if (!m) return null
  const num = Number(m[1])
  return Math.max(0, Math.min(24, Math.floor(num)))
}
const colPitchClasses = (c: number): Set<number> => {
  const pcs = new Set<number>()
  for (let r = 0; r < strings.value; r++) {
    const basePc = parseTuningPc(tuning.value[r])
    const fret = tokenToFret(grid.value[r][c])
    if (basePc == null || fret == null) continue
    pcs.add((basePc + fret) % 12)
  }
  return pcs
}
const hasAll = (set: Set<number>, arr: number[]) => arr.every(n => set.has(n))
const detectChord = (pcs: Set<number>): string => {
  if (pcs.size === 0) return ''
  // try each pc as root
  const candidates = Array.from(pcs)
  for (const R of candidates) {
    const maj = [R, (R + 4) % 12, (R + 7) % 12]
    const min = [R, (R + 3) % 12, (R + 7) % 12]
    const pwr = [R, (R + 7) % 12]
    const sus2 = [R, (R + 2) % 12, (R + 7) % 12]
    const sus4 = [R, (R + 5) % 12, (R + 7) % 12]
    const dom7 = [R, (R + 4) % 12, (R + 7) % 12, (R + 10) % 12]
    const maj7 = [R, (R + 4) % 12, (R + 7) % 12, (R + 11) % 12]
    const min7 = [R, (R + 3) % 12, (R + 7) % 12, (R + 10) % 12]
    const add9maj = [R, (R + 4) % 12, (R + 7) % 12, (R + 2) % 12]
    const add9min = [R, (R + 3) % 12, (R + 7) % 12, (R + 2) % 12]
    const name = (pc: number) => (preferFlats.value ? PC_TO_NOTE_FLAT[pc] : PC_TO_NOTE_SHARP[pc])
    if (hasAll(pcs, dom7)) return `${name(R)}7`
    if (hasAll(pcs, maj7)) return `${name(R)}maj7`
    if (hasAll(pcs, min7)) return `${name(R)}m7`
    if (hasAll(pcs, maj)) return `${name(R)}`
    if (hasAll(pcs, min)) return `${name(R)}m`
    if (hasAll(pcs, add9maj)) return `${name(R)}add9`
    if (hasAll(pcs, add9min)) return `${name(R)}m(add9)`
    if (hasAll(pcs, sus2)) return `${name(R)}sus2`
    if (hasAll(pcs, sus4)) return `${name(R)}sus4`
    if (hasAll(pcs, pwr)) return `${name(R)}5`
  }
  return ''
}
const chordLabels = computed(() => {
  return Array.from({ length: columns.value }, (_, c) => detectChord(colPitchClasses(c)))
})

// --- Interactive chord menu ---
const menuCol = ref<number | null>(null)
const rootOptions = [
  { pc: 0, label: 'C' }, { pc: 1, label: 'C#/Db' }, { pc: 2, label: 'D' }, { pc: 3, label: 'D#/Eb' },
  { pc: 4, label: 'E' }, { pc: 5, label: 'F' }, { pc: 6, label: 'F#/Gb' }, { pc: 7, label: 'G' },
  { pc: 8, label: 'G#/Ab' }, { pc: 9, label: 'A' }, { pc: 10, label: 'A#/Bb' }, { pc: 11, label: 'B' },
]
const qualityOptions = ['maj', 'm', '7', 'maj7', 'm7', 'sus2', 'sus4', '5', 'add9']
const menuRoot = ref<number>(0)
const menuQuality = ref<string>('maj')
const menuRootPlacement = ref<'auto' | 'lowest' | 'highest'>('auto')
const menuIncludeStrings = ref<number>(6)
const menuMinFret = ref<number>(0)
const openChordMenu = (c: number, e: MouseEvent) => {
  menuCol.value = c
}
const closeChordMenu = () => { menuCol.value = null }
const clearColumn = (c: number | null) => {
  if (c == null) return
  grid.value = grid.value.map(row => row.map((val, idx) => (idx === c ? null : val)))
}

const chordTonesFor = (rootPc: number, quality: string): number[] => {
  const r = rootPc % 12
  switch (quality) {
    case 'maj': return [r, (r + 4) % 12, (r + 7) % 12]
    case 'm': return [r, (r + 3) % 12, (r + 7) % 12]
    case '7': return [r, (r + 4) % 12, (r + 7) % 12, (r + 10) % 12]
    case 'maj7': return [r, (r + 4) % 12, (r + 7) % 12, (r + 11) % 12]
    case 'm7': return [r, (r + 3) % 12, (r + 7) % 12, (r + 10) % 12]
    case 'sus2': return [r, (r + 2) % 12, (r + 7) % 12]
    case 'sus4': return [r, (r + 5) % 12, (r + 7) % 12]
    case '5': return [r, (r + 7) % 12]
    case 'add9': return [r, (r + 4) % 12, (r + 7) % 12, (r + 2) % 12]
    default: return [r]
  }
}
const nearestFretForPc = (basePc: number, targetPc: number, minFret = 0, maxFret = 24): number => {
  // choose the smallest fret >= minFret that yields target pc, prefer within 12 semitones span
  for (let f = Math.max(0, minFret); f <= Math.min(24, maxFret); f++) {
    const pc = (basePc + f) % 12
    if (pc === targetPc) return f
  }
  return 0
}
const applyChordToColumn = (c: number | null, rootPc: number, quality: string) => {
  if (c == null) return
  const tones = chordTonesFor(rootPc, quality)
  const totalStrings = strings.value
  const count = Math.max(1, Math.min(totalStrings, menuIncludeStrings.value || totalStrings))
  // choose which rows to fill
  let rows: number[] = []
  if (menuRootPlacement.value === 'lowest') {
    rows = Array.from({ length: count }, (_, i) => totalStrings - 1 - i) // bottom up
  } else if (menuRootPlacement.value === 'highest') {
    rows = Array.from({ length: count }, (_, i) => i) // top down
  } else {
    // auto: spread from bottom then top alternating
    rows = Array.from({ length: count }, (_, i) => (i % 2 === 0 ? totalStrings - 1 - i : i))
  }
  // assign tones cycling, ensure root first
  const seq = [tones[0], ...tones.slice(1)]
  rows.forEach((r, idx) => {
    const basePc = parseTuningPc(tuning.value[r])
    if (basePc == null) { grid.value[r][c] = null; return }
    const targetPc = seq[idx % seq.length]
    const fret = nearestFretForPc(basePc, targetPc, menuMinFret.value || 0)
    grid.value[r][c] = fret
  })
  closeChordMenu()
}

const adjustStrings = () => {
  recomputeGrid()
}

// Initialize repeat sections from incoming tab data
if (Array.isArray(local.repeatSections)) {
  repeatSections.value = local.repeatSections.map(s => ({ id: s.id, title: s.title, startBar: s.startBar, barCount: s.barCount, repeats: s.repeats }))
}

const save = () => {
  // Persist grid + tuning + signature to tab item
  local.strings = strings.value
  local.tuning = [...tuning.value]
  local.beatsPerBar = beatsPerBar.value
  local.beatUnit = beatUnit.value
  local.bars = bars.value
  local.grid = grid.value.map(row => row.map(v => v))
  // Save repeat sections
  local.repeatSections = repeatSections.value.map(s => ({ id: s.id, title: s.title, startBar: s.startBar, barCount: s.barCount, repeats: s.repeats }))
  local.content = asciiPreview.value
  local.updatedAt = Date.now()
  emit('save', { ...local })
}
</script>

<style scoped>
.modal-dialog { max-width: 1080px; }
.tab-grid { background: #1a1a1a; overflow-x: auto; overflow-y: auto; }
.tab-grid .table { width: max-content; table-layout: fixed; }
.grid-cell { width: 28px; min-width: 28px; height: 28px; text-align: center; border: 1px solid #333; cursor: pointer; }
.tuning-cell { width: 60px; min-width: 60px; text-align: right; padding-right: 6px; position: sticky; left: 0; background: #1a1a1a; z-index: 5; }
.chord-cell { width: 28px; min-width: 28px; height: 24px; text-align: center; font-weight: 600; color: #ddd; }
.chord-cell { position: relative; cursor: pointer; }
.chord-menu { position: absolute; top: 100%; left: 0; background: #222; border: 1px solid #444; padding: 8px; border-radius: 6px; z-index: 10; min-width: 260px; }
.bar-selector-row .bar-cell { background: #1d1d1d; border-top: 2px solid #2a2a2a; text-align: center; color: #bbb; cursor: pointer; }
.bar-selector-row .bar-cell.selected { background: #2a2a2a; color: #fff; }
.bar-selector-row .section-cell { background: #161616; border-top: 2px solid #2a2a2a; color: #ddd; }
.section-cell-inner { display: flex; align-items: center; justify-content: space-between; padding: 2px 6px; }
.section-range-btn { border: none; background: transparent; color: #bbb; padding: 0 4px; cursor: pointer; }
.section-range-btn:hover { color: #fff; }
.section-remove-btn { border: none; background: transparent; color: #d66; padding: 0 6px; cursor: pointer; }
.section-remove-btn:hover { color: #f88; }
.section-edit-input { height: 22px; font-size: 12px; padding: 2px 4px; }
.bar-menu { position: fixed; background: #1c1c22; border: 1px solid #2a2a2a; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.4); min-width: 160px; z-index: 200; }
.bar-menu .dropdown-item { color: #ddd; font-size: 11px; }
.bar-menu .dropdown-item:disabled { opacity: 0.5; }
.grid-cell.beat-boundary { border-right-color: #555; }
.grid-cell.bar-boundary { border-right-color: #888; border-right-width: 2px; }
.grid-input { width: 100%; height: 100%; text-align: center; background: transparent; border: none; color: #fff; outline: none; }
.grid-cell:focus-within { background: #2a2a2a; }
.player-controls .form-label { font-size: 12px; color: #bbb; }
</style>
