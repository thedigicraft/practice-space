<template>
  <section class="sidebar-panel">
    <div class="sidebar-panel__header">
      <span class="sidebar-panel__title">{{ title }}</span>
      <button v-if="showMenu" class="sidebar-panel__menu" @mousedown.stop @click.stop title="Panel menu" aria-label="Panel menu">
        <i class="fas fa-ellipsis-v"></i>
      </button>
    </div>
    <div class="sidebar-panel__content">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{ title: string; showMenu?: boolean }>()
</script>

<style scoped>
.sidebar-panel { background: #111216; border: 1px solid #2a2a2a; border-radius: 0; }
.sidebar-panel__header { display: flex; align-items: center; justify-content: space-between; padding: 6px; border-bottom: 1px solid #2a2a2a; }
.sidebar-panel__title { font-weight: 600; font-size: 11px; color: #ddd; text-transform: uppercase; }
.sidebar-panel__content { padding: 8px; }
.sidebar-panel__menu { padding: 2px 6px; border: none; background: transparent; color: #bbb; }
.sidebar-panel__menu:hover { color: #fff; }
</style>