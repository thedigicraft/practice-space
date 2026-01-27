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
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Capacitor } from '@capacitor/core'

const isNative = Capacitor.isNativePlatform()
const hasWebAudio = typeof AudioContext !== 'undefined'
const hasWorkers = typeof Worker !== 'undefined'

const hasFilePicker = ref(false)
const hasFilesystem = ref(false)
const hasShare = ref(false)

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
})
</script>

<style scoped>
.card {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.15);
}
</style>
