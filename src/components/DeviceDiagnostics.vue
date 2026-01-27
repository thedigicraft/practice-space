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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Capacitor } from '@capacitor/core'
import { Filesystem } from '@capacitor/filesystem'

const isNative = Capacitor.isNativePlatform()
const hasWebAudio = typeof AudioContext !== 'undefined'
const hasWorkers = typeof Worker !== 'undefined'

const hasFilePicker = ref(false)
const hasFilesystem = ref(false)
const hasShare = ref(false)
const permissionState = ref<string | null>(null)

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
})

const requestStoragePermission = async () => {
  try {
    const res = await (Filesystem as any).requestPermissions?.()
    permissionState.value = res?.publicStorage || res?.state || permissionState.value
  } catch {
    // ignore
  }
}
</script>

<style scoped>
.card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
}
</style>
