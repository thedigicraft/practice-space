<template>
  <div class="settings-view d-flex flex-column">
    <PanelHeader title="Settings" />

    <div class="settings-content p-4 container">
      <p class="text-muted small mb-3">Configure export behavior and check device capabilities.</p>

      <section class="mb-4 card">
        <div class="card-header py-2">
          <span class="fs-6 text-uppercase text-secondary fw-semibold">Export</span>
        </div>
        <div class="card-body">
          <ExportSettings />
        </div>
      </section>

      <section class="card">
        <div class="card-header py-2">
          <span class="fs-6 text-uppercase text-secondary fw-semibold">Device Diagnostics</span>
        </div>
        <div class="card-body">
          <DeviceDiagnostics />
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import ExportSettings from '../components/ExportSettings.vue'
import DeviceDiagnostics from '../components/DeviceDiagnostics.vue'
import PanelHeader from '../components/PanelHeader.vue'
</script>

<style scoped>
.settings-view {
  height: 100vh;
  background: #1a1a1a;
  color: #e0e0e0;
}

.view-header {
  background: var(--bs-body-bg);
}

.settings-content .card {
  border-radius: 8px;
}

.container {
  max-width: 800px;
}
</style>
