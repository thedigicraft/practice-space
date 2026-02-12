<template>
  <div class="device-diagnostics card p-3">
    <h5 class="mb-2">Device Diagnostics</h5>
    <ul class="list-unstyled mb-0">
      <li><strong>Native Platform:</strong> {{ isNative ? 'Yes' : 'No' }}</li>
      <li><strong>File Picker Plugin:</strong> {{ hasFilePicker ? 'Available' : 'Missing' }}</li>
      <li><strong>Filesystem Plugin:</strong> {{ hasFilesystem ? 'Available' : 'Missing' }}</li>
      <li><strong>Share Plugin:</strong> {{ hasShare ? 'Available' : 'Missing' }}</li>
      <li><strong>Web Audio API:</strong> {{ hasWebAudio ? 'Yes' : 'No' }}</li>
      <li><strong>Web Workers:</strong> {{ hasWorkers ? 'Yes' : 'No' }}</li>
      <li v-if="isNative && hasFilesystem">
        <strong>Storage Permission:</strong>
        <span v-if="permissionState === 'granted'">Granted</span>
        <span v-else-if="permissionState">{{ permissionState }}</span>
        <span v-else>Unknown</span>
        <button class="btn btn-sm btn-outline-primary ms-2" @click="requestStoragePermission">
          Request
        </button>
      </li>
    </ul>
    <hr class="my-3" />
    <div>
      <h6 class="mb-2">One-time: Generate Slice Clips</h6>
      <p class="text-muted small mb-2">Resave all existing slices to create clip files for faster loading.</p>
      <div class="d-flex align-items-center gap-3 mb-2">
        <span><strong>Total Slices:</strong> {{ totalSlices }}</span>
        <span><strong>Clips Created:</strong> {{ clipsCreated }}</span>
        <span v-if="progressTotal > 0"><strong>Progress:</strong> {{ progressDone }} / {{ progressTotal }}</span>
      </div>
      <button class="btn btn-sm btn-primary" :disabled="isPrewarming" @click="runPrewarm">
        {{ isPrewarming ? 'Generating…' : 'Generate Slice Clips' }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Capacitor } from '@capacitor/core'
import { Filesystem } from '@capacitor/filesystem'
import { getAllSlices, prewarmAllSliceClips } from '@/services/db'

const isNative = Capacitor.isNativePlatform()
const hasWebAudio = typeof AudioContext !== 'undefined'
const hasWorkers = typeof Worker !== 'undefined'

const hasFilePicker = ref(false)
const hasFilesystem = ref(false)
const hasShare = ref(false)
const permissionState = ref<string | null>(null)
const totalSlices = ref(0)
const clipsCreated = ref(0)
const isPrewarming = ref(false)
const progressDone = ref(0)
const progressTotal = ref(0)

onMounted(async () => {
  try {
    // Lazy import and check presence
    await import('@capawesome/capacitor-file-picker')
    hasFilePicker.value = true
  } catch {}
  try {
    await import('@capacitor/filesystem')
    hasFilesystem.value = true
  } catch {}
  try {
    await import('@capacitor/share')
    hasShare.value = true
  } catch {}

  // Check storage permission if native
  if (isNative && hasFilesystem.value) {
    try {
      const perm = await (Filesystem as any).checkPermissions?.()
      permissionState.value = perm?.publicStorage || perm?.state || null
    } catch {
      permissionState.value = null
    }
  }

  // Count slices
  try {
    const slices = await getAllSlices()
    totalSlices.value = slices.length
    clipsCreated.value = slices.filter(s => !!s.clipSourceId).length
  } catch {}
})

const requestStoragePermission = async () => {
  try {
    const res = await (Filesystem as any).requestPermissions?.()
    permissionState.value = res?.publicStorage || res?.state || permissionState.value
  } catch {
    // ignore
  }
}

const runPrewarm = async () => {
  isPrewarming.value = true
  progressDone.value = 0
  progressTotal.value = totalSlices.value
  try {
    const res = await prewarmAllSliceClips((done, total) => { progressDone.value = done; progressTotal.value = total })
    clipsCreated.value += res.updated
  } finally {
    isPrewarming.value = false
  }
}
</script>

<style scoped>
.card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
}
</style>
