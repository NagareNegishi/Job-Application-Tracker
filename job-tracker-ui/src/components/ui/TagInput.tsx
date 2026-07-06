import { useState, useMemo, useRef, useEffect, type KeyboardEvent } from "react"
import { X } from "lucide-react"

type TagInputProps = {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  maxItems?: number
  layout?: "wrap" | "stack"
  savedValue?: string[]
  suggestions?: string[]   // optional autocomplete pool; omit → no dropdown
}

// Cap rendered matches so the DOM stays light; the scroll box handles overflow.
const SUGGESTION_LIMIT = 50

export default function TagInput({ value, onChange, placeholder, maxItems, layout = "wrap", savedValue, suggestions }: TagInputProps) {
  const [inputValue, setInputValue] = useState("")
  const [open, setOpen] = useState(false)        // dropdown visibility
  const [highlight, setHighlight] = useState(-1) // keyboard-active option index (-1 = none)
  const listRef = useRef<HTMLUListElement>(null)

  // Substring matches (case-insensitive), excluding already-added tags; empty until the user types
  const suggestionMatches = useMemo(() => {
    const query = inputValue.trim().toLowerCase()
    if (!query || !suggestions) return []
    const taken = new Set(value.map(v => v.toLowerCase()))
    return suggestions
      .filter(s => s.toLowerCase().includes(query) && !taken.has(s.toLowerCase()))
      .slice(0, SUGGESTION_LIMIT)
  }, [inputValue, suggestions, value])

  const showList = open && suggestionMatches.length > 0

  // Keep the keyboard-highlighted option scrolled into view
  useEffect(() => {
    if (highlight < 0 || !listRef.current) return
    const el = listRef.current.children[highlight] as HTMLElement | undefined
    el?.scrollIntoView({ block: "nearest" })
  }, [highlight])

  // Adds a tag from any source (typed text or a picked suggestion); preserves original casing
  function commitTag(raw: string) {
    const trimmed = raw.trim()
    if (!trimmed || value.includes(trimmed)) return
    if (maxItems && value.length >= maxItems) return
    onChange([...value, trimmed])
    setInputValue("")
    setOpen(false)
    setHighlight(-1)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && showList) {
      e.preventDefault()
      setHighlight(h => (h + 1) % suggestionMatches.length)
    } else if (e.key === "ArrowUp" && showList) {
      e.preventDefault()
      setHighlight(h => (h <= 0 ? suggestionMatches.length - 1 : h - 1))
    } else if (e.key === "Enter") {
      e.preventDefault()
      // Enter picks the highlighted suggestion if one is active, else commits the typed text
      commitTag(highlight >= 0 && showList ? suggestionMatches[highlight] : inputValue)
    } else if (e.key === "Escape") {
      setOpen(false)
      setHighlight(-1)
    }
  }

  // When savedValue is not provided, all tags are treated as saved
  function isSaved(tag: string) {
    return savedValue ? savedValue.includes(tag) : true
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          value={inputValue}
          onChange={e => { setInputValue(e.target.value); setOpen(true); setHighlight(-1) }}
          onKeyDown={handleKeyDown}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={showList}
          aria-autocomplete="list"
          className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
        />
        {showList && (
          <ul
            ref={listRef}
            role="listbox"
            className="absolute z-10 mt-1 w-full max-h-48 overflow-y-auto rounded-md border bg-popover text-popover-foreground shadow-md"
          >
            {suggestionMatches.map((s, i) => (
              <li
                key={s}
                role="option"
                aria-selected={i === highlight}
                onMouseDown={e => { e.preventDefault(); commitTag(s) }}
                onMouseEnter={() => setHighlight(i)}
                className={`px-3 py-1.5 text-sm cursor-pointer ${i === highlight ? "bg-accent text-accent-foreground" : ""}`}
              >
                {s}
              </li>
            ))}
          </ul>
        )}
      </div>
      {value.length > 0 && (
        <div className={layout === "stack" ? "flex flex-col items-start gap-1" : "flex flex-wrap gap-1.5"}>
          {value.map((tag, i) => (
            <span
              key={i}
              className={`inline-flex items-center gap-1 rounded-md border pl-3 pr-2 py-1.5 text-sm font-semibold ${
                isSaved(tag)
                  ? "border-transparent bg-secondary text-secondary-foreground"
                  : "border-dashed border-primary/50 bg-primary/5"
              }`}
            >
              {tag}
              <button
                type="button"
                onClick={() => onChange(value.filter((_, j) => j !== i))}
                className="hover:text-destructive transition-colors"
                aria-label={`Remove ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
