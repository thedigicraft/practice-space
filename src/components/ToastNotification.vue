<template>
  <Transition name="toast">
    <div v-if="visible" class="toast-notification" :class="type">
      <div class="toast-icon">
        <i v-if="type === 'success'" class="fas fa-check-circle"></i>
        <i v-else-if="type === 'error'" class="fas fa-exclamation-circle"></i>
        <i v-else-if="type === 'info'" class="fas fa-info-circle"></i>
        <i v-else class="fas fa-spinner fa-spin"></i>
      </div>
      <div class="toast-content">
        <div class="toast-message">{{ message }}</div>
        <div v-if="progress !== undefined" class="toast-progress-bar">
          <div class="toast-progress-fill" :style="{ width: `${progress}%` }"></div>
        </div>
      </div>
      <button v-if="type !== 'loading'" @click="close" class="toast-close">
        <i class="fas fa-times"></i>
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

interface Props {
  message: string
  type?: 'success' | 'error' | 'info' | 'loading'
  duration?: number
  progress?: number
  visible: boolean
}

const props = withDefaults(defineProps<Props>(), {
  type: 'info',
  duration: 3000
})

const emit = defineEmits<{
  close: []
}>()

let timeoutId: number | null = null

watch(() => props.visible, (newVisible) => {
  if (newVisible && props.type !== 'loading' && props.duration > 0) {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = window.setTimeout(() => {
      close()
    }, props.duration)
  }
})

const close = () => {
  if (timeoutId) {
    clearTimeout(timeoutId)
    timeoutId = null
  }
  emit('close')
}
</script>

<style scoped>
.toast-notification {
  position: fixed;
  left: 50%;
  bottom: 16px;
  transform: translateX(-50%);
  background: rgba(30, 30, 30, 0.98);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  padding: 8px 14px;
  min-width: 0;
  max-width: 80vw;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  gap: 10px;
  z-index: 10000;
  backdrop-filter: blur(8px);
}

.toast-notification.success {
  border-left: 4px solid #4caf50;
}

.toast-notification.error {
  border-left: 4px solid #f44336;
}

.toast-notification.info {
  border-left: 4px solid #2196f3;
}

.toast-notification.loading {
  border-left: 4px solid #ff9800;
}

.toast-icon {
  font-size: 1rem;
  flex-shrink: 0;
}

.toast-notification.success .toast-icon {
  color: #4caf50;
}

.toast-notification.error .toast-icon {
  color: #f44336;
}

.toast-notification.info .toast-icon {
  color: #2196f3;
}

.toast-notification.loading .toast-icon {
  color: #ff9800;
}

.toast-content {
  flex: 1;
  min-width: 0;
}

.toast-message {
  font-size: 0.9rem;
  line-height: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toast-progress-bar {
  width: 120px;
  height: 3px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 999px;
  overflow: hidden;
}

.toast-progress-fill {
  height: 100%;
  background: #ff9800;
  transition: width 0.3s ease;
  border-radius: 2px;
}

.toast-close {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  font-size: 1rem;
  padding: 0;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: color 0.2s;
}

.toast-close:hover {
  color: rgba(255, 255, 255, 0.9);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translate(-50%, 20px);
}

.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 20px) scale(0.98);
}
</style>
