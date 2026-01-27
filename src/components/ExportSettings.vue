<template>
  <div class="export-settings dropdown">
    <button class="btn btn-outline-secondary btn-sm" @click="toggle">
      <i class="fas fa-gear me-1"></i> Export
    </button>
    <ul v-if="isOpen" class="dropdown-menu show" style="right: 0; left: auto; min-width: 14rem;">
      <li class="dropdown-header px-3 py-2">Android Export Mode</li>
      <li>
        <button class="dropdown-item" :class="{ active: exportMode === 'auto' }" @click="setMode('auto')">
          Auto (Save + Share)
        </button>
      </li>
      <li>
        <button class="dropdown-item" :class="{ active: exportMode === 'save' }" @click="setMode('save')">
          Save Only (Filesystem)
        </button>
      </li>
      <li>
        <button class="dropdown-item" :class="{ active: exportMode === 'share' }" @click="setMode('share')">
          Share Only (No Save)
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAppSettings } from '@/composables/useAppSettings'

const isOpen = ref(false)
const toggle = () => { isOpen.value = !isOpen.value }

const { exportMode } = useAppSettings()

const setMode = (mode: 'auto' | 'save' | 'share') => {
  exportMode.value = mode
  isOpen.value = false
}
</script>

<style scoped>
.dropdown-menu .dropdown-item.active {
  font-weight: 600;
}
</style>
