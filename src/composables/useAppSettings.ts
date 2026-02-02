import { ref, watch } from 'vue'

export type ExportMode = 'auto' | 'save' | 'share'

const STORAGE_KEY = 'practice-space:export-mode'
const SOURCE_SIDEBAR_WIDTH_KEY = 'practice-space:source-sidebar-width'

export function useAppSettings() {
  const exportMode = ref<ExportMode>('auto')
  const sourceSidebarWidth = ref<number>(500)

  // Load from localStorage
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'auto' || saved === 'save' || saved === 'share') {
      exportMode.value = saved
    }
    const savedSidebar = localStorage.getItem(SOURCE_SIDEBAR_WIDTH_KEY)
    if (savedSidebar) {
      const n = parseInt(savedSidebar, 10)
      if (!isNaN(n) && n > 200 && n < 1200) sourceSidebarWidth.value = n
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

  watch(sourceSidebarWidth, (val) => {
    try {
      localStorage.setItem(SOURCE_SIDEBAR_WIDTH_KEY, String(val))
    } catch {
      // ignore
    }
  })

  return { exportMode, sourceSidebarWidth }
}
