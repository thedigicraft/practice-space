export interface GeminiChatMessage {
  role: 'user' | 'model'
  text: string
}

export interface GeminiRequestOptions {
  message: string
  history?: GeminiChatMessage[]
  model?: string
}

const DEFAULT_MODEL = 'gemini-2.0-flash'
const GEMINI_API_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta'

const toGeminiContents = (history: GeminiChatMessage[], message: string) => {
  const contents = history
    .filter(entry => entry.text.trim().length > 0)
    .map(entry => ({
      role: entry.role,
      parts: [{ text: entry.text }],
    }))

  contents.push({
    role: 'user',
    parts: [{ text: message }],
  })

  return contents
}

const extractGeminiText = (data: unknown): string => {
  if (!data || typeof data !== 'object') return ''

  const root = data as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }

  const candidate = root.candidates?.[0]
  const parts = candidate?.content?.parts ?? []
  const text = parts
    .map(part => part.text ?? '')
    .join('')
    .trim()

  return text
}

export const sendGeminiMessage = async ({
  message,
  history = [],
  model = import.meta.env.VITE_GEMINI_MODEL || DEFAULT_MODEL,
}: GeminiRequestOptions): Promise<string> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY?.trim()

  if (!apiKey) {
    throw new Error('Gemini API key is missing. Set VITE_GEMINI_API_KEY in your environment.')
  }

  const prompt = message.trim()
  if (!prompt) {
    throw new Error('Message cannot be empty.')
  }

  const response = await fetch(
    `${GEMINI_API_BASE_URL}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: toGeminiContents(history, prompt),
      }),
    }
  )

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const errorMessage =
      (data as { error?: { message?: string } } | null)?.error?.message ||
      `Gemini request failed with status ${response.status}`

    throw new Error(errorMessage)
  }

  const text = extractGeminiText(data)

  if (!text) {
    throw new Error('Gemini returned an empty response.')
  }

  return text
}
