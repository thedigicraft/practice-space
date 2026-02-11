/**
 * Service for managing credit names across the app
 * Stores and retrieves composer, performer, and other credit names
 */

const CREDITS_STORAGE_KEY = 'practice-space-credits'

export interface CreditNames {
  composers: string[]
  performers: string[]
  writers: string[]
  types: string[]
  projectTypes: string[]
}

/**
 * Get all stored credit names
 */
export function getAllCreditNames(): CreditNames {
  const defaults: CreditNames = {
    composers: [],
    performers: [],
    writers: [],
    types: [],
    projectTypes: [],
  }
  
  const stored = localStorage.getItem(CREDITS_STORAGE_KEY)
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      // Merge with defaults to ensure all fields exist
      return {
        ...defaults,
        ...parsed,
      }
    } catch (e) {
      console.error('Failed to parse credit names:', e)
    }
  }
  return defaults
}

/**
 * Add a new credit name to a specific category
 */
export function addCreditName(category: keyof CreditNames, name: string): void {
  if (!name.trim()) return
  
  const credits = getAllCreditNames()
  const trimmedName = name.trim()
  
  // Add if not already present
  if (!credits[category].includes(trimmedName)) {
    credits[category].push(trimmedName)
    credits[category].sort() // Keep alphabetically sorted
    localStorage.setItem(CREDITS_STORAGE_KEY, JSON.stringify(credits))
  }
}

/**
 * Add multiple credit names at once
 */
export function addCreditNames(category: keyof CreditNames, names: string[]): void {
  names.forEach(name => addCreditName(category, name))
}

/**
 * Get autocomplete suggestions for a category
 */
export function getCreditSuggestions(category: keyof CreditNames, query: string = ''): string[] {
  const credits = getAllCreditNames()
  const categoryNames = credits[category] || []
  
  if (!query) {
    return categoryNames
  }
  
  const lowerQuery = query.toLowerCase()
  return categoryNames.filter(name => 
    name.toLowerCase().includes(lowerQuery)
  )
}

/**
 * Get autocomplete suggestions from all credit pools
 * Useful for fields where any artist name might be relevant
 */
export function getAllCreditSuggestions(query: string = ''): string[] {
  const credits = getAllCreditNames()
  
  // Combine all names from all categories and remove duplicates
  const allNames = new Set([
    ...credits.composers,
    ...credits.performers,
    ...credits.writers,
  ])
  
  const uniqueNames = Array.from(allNames).sort()
  
  if (!query) {
    return uniqueNames
  }
  
  const lowerQuery = query.toLowerCase()
  return uniqueNames.filter(name => 
    name.toLowerCase().includes(lowerQuery)
  )
}
