<template>
  <div class="settings-view container py-4">
    <h1 class="mb-3">Settings</h1>
    <p class="text-muted">Configure export behavior and check device capabilities.</p>

    <section class="mb-4">
      <h3 class="h5">Export</h3>
      <ExportSettings />
    </section>

    <section>
      <h3 class="h5">Device Diagnostics</h3>
      <DeviceDiagnostics />
    </section>
  </div>
</template>

<script setup lang="ts">
import ExportSettings from '../components/ExportSettings.vue'
import DeviceDiagnostics from '../components/DeviceDiagnostics.vue'
</script>

<style scoped>
.container {
  max-width: 800px;
}
</style>
