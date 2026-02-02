<template>
  <header class="view-header px-3 py-2 border-bottom">
    <div class="d-flex align-items-center">
      <div class="header-left flex-grow-1">
        <slot name="left">
          <span v-if="title" class="fs-6 text-uppercase text-secondary fw-semibold">{{ title }}</span>
        </slot>
      </div>
      <div class="header-center flex-grow-1 d-flex justify-content-center align-items-center">
        <slot name="center" />
      </div>
      <div class="header-right flex-grow-1 d-flex justify-content-end align-items-center gap-2">
        <slot name="right" />
        <router-link
          v-if="showClose"
          :to="closeTo"
          class="btn btn-outline-secondary btn-sm"
          title="Close and go Home"
          aria-label="Close and go Home"
        >
          <i class="fas fa-xmark"></i>
        </router-link>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { toRefs } from 'vue'
interface Props {
  title?: string
  showClose?: boolean
  closeTo?: string
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  showClose: true,
  closeTo: '/',
})
const { title, showClose, closeTo } = toRefs(props)
</script>

<style scoped>
.view-header {
  background: var(--bs-body-bg);
}
</style>
