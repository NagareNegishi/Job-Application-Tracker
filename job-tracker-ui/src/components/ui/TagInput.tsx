import { useState, type KeyboardEvent } from "react"
import { Badge } from "@/components/ui/badge"
import { X } from "lucide-react"

type TagInputProps = {
  value: string[]
  onChange: (tags: string[]) => void
  placeholder?: string
  maxItems?: number
}

export default function TagInput({ value, onChange, placeholder, maxItems }: TagInputProps) {
  const [inputValue, setInputValue] = useState("")

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      const trimmed = inputValue.trim()
      if (!trimmed || value.includes(trimmed)) return
      if (maxItems && value.length >= maxItems) return
      onChange([...value, trimmed])
      setInputValue("")
    } else if (e.key === "Backspace" && inputValue === "") {
      onChange(value.slice(0, -1))
    }
  }

  return (
    <div className="flex flex-wrap gap-1.5 p-2 border border-input rounded-md bg-background min-h-10 cursor-text focus-within:ring-1 focus-within:ring-ring">
      {value.map((tag, i) => (
        <Badge key={i} variant="secondary" className="gap-1 pr-1">
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
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={value.length === 0 ? placeholder : undefined}
        className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
      />
    </div>
  )
}
