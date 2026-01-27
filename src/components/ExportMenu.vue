<template>
  <div class="dropdown">
    <button 
      class="btn btn-sm btn-success dropdown-toggle"
      type="button"
      @click="toggleDropdown"
    >
      💾
    </button>
    <ul v-if="isOpen" class="dropdown-menu show" style="right: 0; left: auto;">
      <li>
        <button class="dropdown-item" @click="$emit('export', 'wav')">
          <i class="fas fa-wave-square me-2"></i> WAV (Instant, Lossless)
        </button>
      </li>
      <li>
        <button class="dropdown-item" @click="$emit('export', 'mp3')">
          <i class="fas fa-music me-2"></i> MP3 (Compressed)
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  isOpen: boolean
}

defineProps<Props>()

const emit = defineEmits<{
  export: [format: 'wav' | 'mp3']
  toggle: []
}>()

const toggleDropdown = () => {
  emit('toggle')
}
</script>

<style scoped lang="scss">
.dropdown {
  position: relative;
}

.dropdown-menu {
  position: absolute;
  z-index: 1000;
  display: block;
  min-width: 12rem;
  padding: 0.5rem 0;
  margin: 0.125rem 0 0;
  font-size: 0.9rem;
  background-color: var(--bs-dropdown-bg);
  border: 1px solid var(--bs-border-color);
  border-radius: 0.375rem;
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.3);
}

.dropdown-item {
  display: block;
  width: 100%;
  padding: 0.5rem 1rem;
  clear: both;
  font-weight: 400;
  color: var(--bs-dropdown-link-color);
  text-align: inherit;
  text-decoration: none;
  white-space: nowrap;
  background-color: transparent;
  border: 0;
  cursor: pointer;
  transition: background-color 0.2s;

  &:hover,
  &:focus {
    color: var(--bs-dropdown-link-hover-color);
    background-color: var(--bs-dropdown-link-hover-bg);
  }

  i {
    width: 1.25rem;
  }
}
</style>
