export function useTypeFormatting() {
  const formatTypeName = (type: string): string => {
    return type.charAt(0).toUpperCase() + type.slice(1) + 's'
  }

  const getTypeIcon = (type: string): string => {
    const icons: Record<string, string> = {
      'song': 'fas fa-music',
      'etude': 'fas fa-graduation-cap',
      'scale': 'fas fa-sliders-h',
      'exercise': 'fas fa-dumbbell',
      'warm-up': 'fas fa-fire',
      'technique': 'fas fa-tools',
    }
    return icons[type.toLowerCase()] || 'fas fa-wave-square'
  }

  return {
    formatTypeName,
    getTypeIcon
  }
}
