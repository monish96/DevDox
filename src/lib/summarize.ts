import { splitSentences, tokenize } from './text'

export function summarize(text: string, maxSentences = 5): string {
  const sentences = splitSentences(text)
  if (sentences.length <= maxSentences) return sentences.join(' ')

  const freq = new Map<string, number>()
  for (const s of sentences) {
    for (const t of tokenize(s)) {
      freq.set(t, (freq.get(t) ?? 0) + 1)
    }
  }

  const scored = sentences.map((s, idx) => {
    const tokens = tokenize(s)
    const score =
      tokens.reduce((acc, t) => acc + (freq.get(t) ?? 0), 0) / Math.max(1, tokens.length)
    return { s, idx, score }
  })

  const picked = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, maxSentences))
    .sort((a, b) => a.idx - b.idx)
    .map((x) => x.s)

  return picked.join(' ')
}


