<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import type { GeminiChatMessage } from '../services/gemini'
import { sendGeminiMessage } from '../services/gemini'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  (event: 'update:open', value: boolean): void
}>()

const draft = ref('')
const isSending = ref(false)
const requestError = ref('')
const messages = ref<GeminiChatMessage[]>([])
const messageList = ref<HTMLElement | null>(null)

const hasApiKey = computed(() => Boolean(import.meta.env.VITE_GEMINI_API_KEY?.trim()))

const closeDrawer = () => {
  emit('update:open', false)
}

const scrollToBottom = async () => {
  await nextTick()
  const list = messageList.value
  if (list) {
    list.scrollTop = list.scrollHeight
  }
}

watch(
  () => props.open,
  async open => {
    if (open) {
      await scrollToBottom()
    }
  }
)

const sendMessage = async () => {
  const text = draft.value.trim()
  if (!text || isSending.value || !hasApiKey.value) return

  requestError.value = ''
  draft.value = ''
  messages.value.push({ role: 'user', text })
  await scrollToBottom()

  isSending.value = true
  try {
    const response = await sendGeminiMessage({
      message: text,
      history: messages.value,
    })

    messages.value.push({ role: 'model', text: response })
    await scrollToBottom()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected Gemini error.'
    requestError.value = message
  } finally {
    isSending.value = false
  }
}

const handleSubmit = async (event: Event) => {
  event.preventDefault()
  await sendMessage()
}

const clearChat = () => {
  messages.value = []
  requestError.value = ''
}
</script>

<template>
  <div
    class="chat-drawer-backdrop"
    :class="{ open }"
    @click="closeDrawer"
    aria-hidden="true"
  />

  <aside class="chat-drawer" :class="{ open }" aria-label="Gemini Chat">
    <header class="chat-drawer__header">
      <div class="chat-drawer__title-wrap">
        <h2 class="chat-drawer__title">AI Chat</h2>
        <span class="chat-drawer__badge" :class="{ online: hasApiKey }">
          {{ hasApiKey ? 'Connected' : 'Missing API Key' }}
        </span>
      </div>
      <button class="chat-drawer__close" type="button" @click="closeDrawer" aria-label="Close AI chat">
        <i class="fa-solid fa-xmark" />
      </button>
    </header>

    <section class="chat-drawer__body">
      <p v-if="!hasApiKey" class="chat-drawer__hint">
        Add VITE_GEMINI_API_KEY to your environment to enable chat.
      </p>

      <div ref="messageList" class="chat-drawer__messages">
        <div v-if="messages.length === 0" class="chat-empty">
          <p>Start a thread for writing practice plans, riff ideas, or lyric prompts.</p>
        </div>

        <article
          v-for="(message, index) in messages"
          :key="`${message.role}-${index}`"
          class="chat-message"
          :class="`chat-message--${message.role}`"
        >
          <span class="chat-message__role">{{ message.role === 'user' ? 'You' : 'Gemini' }}</span>
          <p class="chat-message__text">{{ message.text }}</p>
        </article>
      </div>

      <p v-if="requestError" class="chat-drawer__error">{{ requestError }}</p>
    </section>

    <footer class="chat-drawer__footer">
      <form class="chat-input" @submit="handleSubmit">
        <textarea
          v-model="draft"
          class="chat-input__field"
          rows="3"
          placeholder="Ask Gemini for arrangement ideas, rehearsal goals, or note rewrites..."
          :disabled="isSending || !hasApiKey"
        />

        <div class="chat-input__actions">
          <button class="btn btn-sm btn-outline-secondary" type="button" @click="clearChat" :disabled="isSending || messages.length === 0">
            Clear
          </button>
          <button class="btn btn-sm btn-primary" type="submit" :disabled="isSending || !draft.trim() || !hasApiKey">
            {{ isSending ? 'Thinking...' : 'Send' }}
          </button>
        </div>
      </form>
    </footer>
  </aside>
</template>

<style scoped>
.chat-drawer-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.24);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s ease;
  z-index: 890;
}

.chat-drawer-backdrop.open {
  opacity: 1;
  pointer-events: auto;
}

.chat-drawer {
  position: fixed;
  top: 0;
  right: 0;
  width: min(420px, 100vw);
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #131722;
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  transform: translateX(100%);
  transition: transform 0.25s ease;
  z-index: 900;
}

.chat-drawer.open {
  transform: translateX(0);
}

.chat-drawer__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.chat-drawer__title-wrap {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.chat-drawer__title {
  margin: 0;
  font-size: 1rem;
  color: #f8f9fa;
}

.chat-drawer__badge {
  display: inline-flex;
  width: fit-content;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 0.72rem;
  background: #6c757d;
  color: #ffffff;
}

.chat-drawer__badge.online {
  background: #1e7f4f;
}

.chat-drawer__close {
  border: 0;
  border-radius: 6px;
  padding: 4px 8px;
  background: transparent;
  color: #cfd4db;
}

.chat-drawer__close:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #ffffff;
}

.chat-drawer__body {
  flex: 1;
  min-height: 0;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.chat-drawer__hint {
  margin: 0;
  padding: 8px 10px;
  border-radius: 8px;
  font-size: 0.85rem;
  background: rgba(255, 193, 7, 0.12);
  color: #ffdf7e;
}

.chat-drawer__messages {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding-right: 4px;
}

.chat-empty {
  color: #9fa8b3;
  font-size: 0.9rem;
  border: 1px dashed rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  padding: 12px;
}

.chat-empty p {
  margin: 0;
}

.chat-message {
  border-radius: 10px;
  padding: 10px;
}

.chat-message--user {
  background: rgba(13, 110, 253, 0.24);
  align-self: flex-end;
  max-width: 88%;
}

.chat-message--model {
  background: rgba(248, 249, 250, 0.08);
  align-self: flex-start;
  max-width: 95%;
}

.chat-message__role {
  font-size: 0.72rem;
  text-transform: uppercase;
  color: #adb5bd;
}

.chat-message__text {
  margin: 4px 0 0;
  white-space: pre-wrap;
  color: #f1f3f5;
}

.chat-drawer__error {
  margin: 0;
  color: #ff8787;
  font-size: 0.85rem;
}

.chat-drawer__footer {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding: 10px 12px 12px;
}

.chat-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.chat-input__field {
  width: 100%;
  resize: vertical;
  min-height: 68px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: #0d1118;
  color: #f8f9fa;
  border-radius: 8px;
  padding: 8px;
}

.chat-input__field:focus {
  outline: none;
  border-color: rgba(13, 110, 253, 0.8);
}

.chat-input__actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 767px) {
  .chat-drawer {
    width: 100vw;
  }
}
</style>
