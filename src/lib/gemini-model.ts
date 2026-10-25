/** One place for the Gemini model name so analysis and Q&A cannot drift apart. Override with the GEMINI_MODEL environment variable. */
export const DEFAULT_GEMINI_MODEL = 'gemini-3.8-flash'

export function geminiModel(env: Record<string, string | undefined> = process.env): string {
  return env['GEMINI_MODEL'] || DEFAULT_GEMINI_MODEL
}

export function geminiEndpoint(model: string = geminiModel()): string {
  return `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`
}
