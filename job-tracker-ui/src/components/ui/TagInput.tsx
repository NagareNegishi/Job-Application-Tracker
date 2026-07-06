import { useRef, useState, type KeyboardEvent } from "react"
import { Badge } from "@/components/ui/badge"
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
  const inputRef = useRef<HTMLInputElement>(null)

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
    } else if (e.key === "Backspace" && inputValue === "") {
      onChange(value.slice(0, -1))
    }
  }

  // When savedValue is not provided, all tags are treated as saved
  function isSaved(tag: string) {
    return savedValue ? savedValue.includes(tag) : true
  }

  if (layout === "stack") {
    return (
      <div className="space-y-2">
        <input
          ref={inputRef}
          value={inputValue}
          onChange={e => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full bg-background border border-input rounded-md px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring placeholder:text-muted-foreground"
        />
        {value.length > 0 && (
          <ul className="space-y-1">
            {value.map((tag, i) => (
              <li
                key={i}
                className={`flex items-center justify-between gap-2 px-3 py-1.5 rounded-md text-sm ${
                  isSaved(tag)
                    ? "bg-secondary text-secondary-foreground"
                    : "border border-dashed border-primary/50 bg-primary/5"
                }`}
              >
                <span>{tag}</span>
                <button
                  type="button"
                  onClick={() => onChange(value.filter((_, j) => j !== i))}
                  className="hover:text-destructive transition-colors shrink-0"
                  aria-label={`Remove ${tag}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  return (
    <div
      className="flex flex-wrap gap-1.5 p-2 border border-input rounded-md bg-background min-h-10 cursor-text focus-within:ring-1 focus-within:ring-ring"
      onClick={() => inputRef.current?.focus()}
    >
      {value.map((tag, i) => (
        <Badge
          key={i}
          variant="secondary"
          className={isSaved(tag) ? "gap-1 pr-1" : "gap-1 pr-1 border border-dashed border-primary/50 bg-primary/5"}
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
        </Badge>
      ))}
      <input
        ref={inputRef}
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={value.length === 0 ? placeholder : undefined}
        className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  )
}
