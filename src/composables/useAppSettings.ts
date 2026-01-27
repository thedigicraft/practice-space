import { ref, watch } from 'vue'

export type ExportMode = 'auto' | 'save' | 'share'

const STORAGE_KEY = 'practice-space:export-mode'

export function useAppSettings() {
  const exportMode = ref<ExportMode>('auto')

  // Load from localStorage
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'auto' || saved === 'save' || saved === 'share') {
      exportMode.value = saved
    }
  } catch {
    // ignore
  }

  watch(exportMode, (val) => {
    try {
      localStorage.setItem(STORAGE_KEY, val)
    } catch {
      // ignore
    }
  })

  return { exportMode }
}
