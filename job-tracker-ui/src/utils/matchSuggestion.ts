// Suggestion-matching strategies for autocomplete inputs.
export type MatchStrategy = "prefix" | "word-start" | "substring"

export function matchesSuggestion(suggestion: string, query: string, strategy: MatchStrategy): boolean {
  const s = suggestion.toLowerCase()
  const q = query.toLowerCase()
  switch (strategy) {
    case "prefix":
      return s.startsWith(q)
    case "word-start":
      return s.split(/\s+/).some(word => word.startsWith(q))
    case "substring":
      return s.includes(q)
  }
}
