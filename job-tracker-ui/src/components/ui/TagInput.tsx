import { useState, type KeyboardEvent } from "react"
import { X } from "lucide-react"

type TagInputProps = {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  maxItems?: number
  layout?: "wrap" | "stack"
  savedValue?: string[]
}

export default function TagInput({ value, onChange, placeholder, maxItems, layout = "wrap", savedValue }: TagInputProps) {
  const [inputValue, setInputValue] = useState("")

  function addTag() {
    const trimmed = inputValue.trim()
    if (!trimmed || value.includes(trimmed)) return
    if (maxItems && value.length >= maxItems) return
    onChange([...value, trimmed])
    setInputValue("")
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      addTag()
    }
  }

  // When savedValue is not provided, all tags are treated as saved
  function isSaved(tag: string) {
    return savedValue ? savedValue.includes(tag) : true
  }

  return (
    <div className="space-y-2">
      <input
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
      />
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
