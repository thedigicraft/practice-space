<template>
  <div class="modal fade show" style="display: block;" tabindex="-1" role="dialog" aria-modal="true" @keydown.esc="$emit('close')">
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Edit Lyrics</h5>
          <button type="button" class="btn-close" aria-label="Close" @click="$emit('close')"></button>
        </div>
        <div class="modal-body">
          <div class="mb-3">
            <label class="form-label">Title</label>
            <input v-model="local.title" type="text" class="form-control" />
          </div>
          <div class="mb-3">
            <label class="form-label">Content</label>
            <div class="wysiwyg-toolbar btn-group btn-group-sm mb-2" role="group" aria-label="Formatting">
              <button class="btn btn-outline-secondary" type="button" @click="format('bold')" title="Bold"><i class="fas fa-bold"></i></button>
              <button class="btn btn-outline-secondary" type="button" @click="format('italic')" title="Italic"><i class="fas fa-italic"></i></button>
              <button class="btn btn-outline-secondary" type="button" @click="format('underline')" title="Underline"><i class="fas fa-underline"></i></button>
              <button class="btn btn-outline-secondary" type="button" @click="formatBlock('H2')" title="Heading"><i class="fas fa-heading"></i></button>
              <button class="btn btn-outline-secondary" type="button" @click="format('insertUnorderedList')" title="Bulleted List"><i class="fas fa-list-ul"></i></button>
              <button class="btn btn-outline-secondary" type="button" @click="format('insertOrderedList')" title="Numbered List"><i class="fas fa-list-ol"></i></button>
              <button class="btn btn-outline-secondary" type="button" @click="createLink" title="Link"><i class="fas fa-link"></i></button>
              <button class="btn btn-outline-secondary" type="button" @click="format('removeFormat')" title="Clear Formatting"><i class="fas fa-eraser"></i></button>
            </div>
            <div ref="editorRef" class="wysiwyg-editor form-control" contenteditable="true" @input="onInput" @paste="onPaste" style="min-height: 200px"></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="$emit('close')">Cancel</button>
          <button class="btn btn-primary" @click="save">Save</button>
        </div>
      </div>
    </div>
  </div>
  <div class="modal-backdrop fade show"></div>
</template>

<script setup lang="ts">
import { reactive, onMounted, ref, nextTick } from 'vue'
import type { ProjectLyricItem } from '@/types/models'

interface Props { lyrics: ProjectLyricItem }
const props = defineProps<Props>()
const emit = defineEmits<{ save: [lyrics: ProjectLyricItem]; close: [] }>()

const local = reactive({ ...props.lyrics })
const editorRef = ref<HTMLDivElement | null>(null)

onMounted(() => {
  // Initialize editor content with existing HTML
  nextTick(() => {
    if (editorRef.value) {
      editorRef.value.innerHTML = local.content || ''
    }
  })
})

const focusEditor = () => {
  if (editorRef.value) {
    editorRef.value.focus()
  }
}

const format = (cmd: string) => {
  focusEditor()
  document.execCommand(cmd, false)
}

const formatBlock = (block: string) => {
  focusEditor()
  document.execCommand('formatBlock', false, block)
}

const createLink = () => {
  focusEditor()
  const url = prompt('Enter URL:') || ''
  if (url.trim()) {
    document.execCommand('createLink', false, url.trim())
  }
}

const onInput = () => {
  if (editorRef.value) {
    local.content = editorRef.value.innerHTML
  }
}

const onPaste = (e: ClipboardEvent) => {
  // Basic paste handling: allow plain text to avoid messy styles
  if (!editorRef.value) return
  e.preventDefault()
  const text = (e.clipboardData?.getData('text/plain') ?? '')
  document.execCommand('insertText', false, text)
}

const save = () => {
  // Persist current HTML content
  if (editorRef.value) local.content = editorRef.value.innerHTML
  emit('save', { ...local })
}
</script>

<style scoped>
.modal-dialog { max-width: 640px; }
.wysiwyg-editor {
  background: #1a1a1a;
  color: #e0e0e0;
}
.wysiwyg-editor a { color: #4a9eff; text-decoration: underline; }
.wysiwyg-toolbar .btn { display: inline-flex; align-items: center; }
</style>
