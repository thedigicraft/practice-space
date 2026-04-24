<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, computed } from 'vue'
import { isRecordingSupported, listInputDevices, startRecording, stopRecording, type RecordingSession } from '@/services/recording'
import { saveAudioFile } from '@/services/db'
import { generateWaveformData } from '@/utils/helpers'

const emit = defineEmits<{ filesImported: [files: any[]] }>()

const supported = isRecordingSupported()
const devices = ref<MediaDeviceInfo[]>([])
const selectedDeviceId = ref<string>('')

const isRecording = ref(false)
const status = ref('')
const elapsed = ref(0)
let timer: number | null = null

let session: RecordingSession | null = null
let audioCtx: AudioContext | null = null
let analyser: AnalyserNode | null = null
let levelRAF: number | null = null
const level = ref(0)

const canStart = computed(() => supported && !isRecording.value)

const formatElapsed = computed(() => {
  const m = Math.floor(elapsed.value / 60)
  const s = Math.floor(elapsed.value % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
})

async function refreshDevices() {
  try {
    devices.value = await listInputDevices()
    if (!selectedDeviceId.value && devices.value.length > 0) {
      selectedDeviceId.value = devices.value[0].deviceId
    }
  } catch (e) {
    console.warn('Unable to list input devices', e)
  }
}

function startLevelMeter(stream: MediaStream) {
  audioCtx = new AudioContext()
  const src = audioCtx.createMediaStreamSource(stream)
  analyser = audioCtx.createAnalyser()
  analyser.fftSize = 2048
  src.connect(analyser)
  const data = new Uint8Array(analyser.fftSize)

  const tick = () => {
    if (!analyser) return
    analyser.getByteTimeDomainData(data)
    // Compute rough peak level 0..1
    let max = 0
    for (let i = 0; i < data.length; i++) {
      const v = Math.abs(data[i] - 128) / 128
      if (v > max) max = v
    }
    level.value = Math.min(1, max)
    levelRAF = requestAnimationFrame(tick)
  }
  levelRAF = requestAnimationFrame(tick)
}

function stopLevelMeter() {
  if (levelRAF) cancelAnimationFrame(levelRAF)
  levelRAF = null
  level.value = 0
  try {
    analyser?.disconnect()
  } catch {}
  analyser = null
  try {
    audioCtx?.close()
  } catch {}
  audioCtx = null
}

async function startRec() {
  if (!supported || isRecording.value) return
  status.value = 'Requesting microphone…'
  try {
    session = await startRecording(selectedDeviceId.value || undefined)
    status.value = 'Recording…'
    isRecording.value = true
    elapsed.value = 0
    timer = window.setInterval(() => { elapsed.value += 0.5 }, 500)

    // Start recorder
    session.recorder.start()
    startLevelMeter(session.stream)
  } catch (e: any) {
    status.value = `Error: ${e?.message || e}`
  }
}

async function stopRec() {
  if (!isRecording.value || !session) return
  status.value = 'Stopping…'
  try {
    const blob = await stopRecording(session)
    stopLevelMeter()
    if (timer) { clearInterval(timer); timer = null }
    isRecording.value = false

    // Decode to gather metadata
    const arr = await blob.arrayBuffer()
    const ctx = new AudioContext()
    const buf = await ctx.decodeAudioData(arr)
    await ctx.close()

    const waveform = await generateWaveformData(buf, 800)
    const now = Date.now()
    const date = new Date(now)
    const ts = `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2,'0')}-${date.getDate().toString().padStart(2,'0')} ${date.getHours().toString().padStart(2,'0')}:${date.getMinutes().toString().padStart(2,'0')}`
    const ext = (blob.type && blob.type.includes('wav')) ? 'wav' : (blob.type.includes('ogg') ? 'ogg' : 'webm')
    const base = `Recording ${ts}`

    const source = {
      id: crypto.randomUUID(),
      name: `${base}.${ext}`,
      title: base,
      blob,
      isClip: false,
      duration: buf.duration,
      sampleRate: buf.sampleRate,
      numberOfChannels: buf.numberOfChannels,
      waveformData: waveform,
      importedAt: now,
      createdAt: now,
      size: blob.size,
      location: 'Recording',
      notes: 'Recorded in Practice Space',
    }

    await saveAudioFile(source as any)
    status.value = 'Saved recording'
    emit('filesImported', [source])
    // Clear status after a moment
    setTimeout(() => { status.value = '' }, 2000)
  } catch (e: any) {
    status.value = `Error saving: ${e?.message || e}`
  } finally {
    session = null
  }
}

onMounted(async () => {
  if (!supported) return
  // First attempt may need a dummy getUserMedia to reveal device labels in some browsers
  await refreshDevices()
})

onBeforeUnmount(() => {
  stopLevelMeter()
  if (timer) { clearInterval(timer); timer = null }
})
</script>

<template>
  <div class="record-controls">
    <div v-if="!supported" class="warn">Microphone recording is not supported in this browser.</div>
    <div v-else class="controls">
      <div class="device-select">
        <label class="me-2">Input</label>
        <select v-model="selectedDeviceId" class="form-select form-select-sm">
          <option v-for="d in devices" :key="d.deviceId" :value="d.deviceId">{{ d.label || 'Microphone' }}</option>
        </select>
      </div>
      <button class="btn btn-sm btn-danger" :disabled="!canStart" @click="startRec" title="Start Recording" aria-label="Start Recording">
        <i class="fa-solid fa-microphone me-1"></i> Record
      </button>
      <button class="btn btn-sm btn-secondary" :disabled="!isRecording" @click="stopRec" title="Stop Recording" aria-label="Stop Recording">
        <i class="fa-solid fa-square me-1"></i> Stop
      </button>
      <div class="elapsed ms-3">{{ formatElapsed }}</div>
      <div class="level ms-3" aria-label="Input Level">
        <div class="bar" :style="{ width: (level*100).toFixed(0) + '%' }"></div>
      </div>
    </div>
    <div v-if="status" class="status">{{ status }}</div>
  </div>
</template>

<style scoped>
.record-controls { display: flex; flex-direction: column; gap: 0.5rem; }
.controls { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
.device-select { display: inline-flex; align-items: center; gap: 0.5rem; }
.elapsed { min-width: 60px; text-align: right; opacity: 0.85; }
.level { width: 160px; height: 8px; background: rgba(255,255,255,0.1); border-radius: 4px; overflow: hidden; }
.level .bar { height: 100%; background: #4a9eff; }
.status { font-size: 0.9rem; opacity: 0.8; }
.warn { padding: 0.5rem; background: rgba(255, 165, 0, 0.1); border: 1px solid rgba(255, 165, 0, 0.3); border-radius: 8px; }
</style>
