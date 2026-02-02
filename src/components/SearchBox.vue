<template>
  <div class="search-box d-flex align-items-center" :style="minWidthStyle">
    <input
      :value="modelValue"
      type="text"
      class="form-control form-control-sm"
      :placeholder="placeholder"
      :title="titleText"
      :aria-label="ariaLabelText"
      @input="onInput"
    />
    <button
      v-if="modelValue"
      class="btn btn-outline-secondary btn-sm ms-2"
      :title="clearTitle"
      :aria-label="clearTitle"
      @click="clear"
    >
      <i class="fas fa-times"></i>
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
interface Props {
  modelValue: string
  placeholder?: string
  title?: string
  ariaLabel?: string
  minWidth?: number
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: 'Search…',
  title: '',
  ariaLabel: '',
  minWidth: 340,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  cleared: []
}>()

const minWidthStyle = computed(() => ({ minWidth: `${props.minWidth}px` }))

const titleText = computed(() => props.title || props.placeholder)
const ariaLabelText = computed(() => props.ariaLabel || props.placeholder)
const clearTitle = computed(() => 'Clear')

const onInput = (e: Event) => {
  const target = e.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

const clear = () => {
  emit('update:modelValue', '')
  emit('cleared')
}
</script>

<style scoped>
.search-box {
}
</style>
