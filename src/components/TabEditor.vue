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
                  <input v-model.number="beatUnit" type="number" min="1" max="16" class="form-control" />
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
              <div class="tab-grid overflow-auto border rounded">
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

const save = () => {
  // Persist grid + tuning + signature to tab item
  local.strings = strings.value
  local.tuning = [...tuning.value]
  local.beatsPerBar = beatsPerBar.value
  local.beatUnit = beatUnit.value
  local.bars = bars.value
  local.grid = grid.value.map(row => row.map(v => v))
  local.content = asciiPreview.value
  local.updatedAt = Date.now()
  emit('save', { ...local })
}
</script>

<style scoped>
.modal-dialog { max-width: 1080px; }
.tab-grid { background: #1a1a1a; }
.grid-cell { width: 28px; height: 28px; text-align: center; border: 1px solid #333; cursor: pointer; }
.tuning-cell { width: 60px; text-align: right; padding-right: 6px; }
.chord-cell { width: 28px; height: 24px; text-align: center; font-weight: 600; color: #ddd; }
.chord-cell { position: relative; cursor: pointer; }
.chord-menu { position: absolute; top: 100%; left: 0; background: #222; border: 1px solid #444; padding: 8px; border-radius: 6px; z-index: 10; min-width: 260px; }
.grid-cell.beat-boundary { border-right-color: #555; }
.grid-cell.bar-boundary { border-right-color: #888; border-right-width: 2px; }
.grid-input { width: 100%; height: 100%; text-align: center; background: transparent; border: none; color: #fff; outline: none; }
.grid-cell:focus-within { background: #2a2a2a; }
</style>
