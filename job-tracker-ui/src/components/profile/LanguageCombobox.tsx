// Language picker for language entries — button-trigger combobox, mirrors CountryCombobox
// but matches plain names (no code lookup, no flag) against LANGUAGE_SUGGESTIONS.
// Creatable: languages are free-text, so a typed value with no suggestion match can still
// be committed via an "Add …" item (CountryCombobox stays closed-set — no such item there).
import { useState } from "react"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command, CommandEmpty, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { MAX_LANGUAGE_ITEM_LENGTH } from "@/lib/validationConstants"
import { LANGUAGE_SUGGESTIONS } from "./tagSuggestions"

type Props = {
  value: string
  onChange: (language: string) => void
  excludeValues?: string[]
}

export default function LanguageCombobox({ value, onChange, excludeValues }: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  function commit(language: string) {
    onChange(language)
    setQuery("")
    setOpen(false)
  }

  // Offer the typed value when it is non-empty, within the server length cap, and not
  // already an existing option — matched case-insensitively so it mirrors server dedup.
  const trimmed = query.trim()
  const tooLong = trimmed.length > MAX_LANGUAGE_ITEM_LENGTH
  const taken = (name: string) => name.toLowerCase() === trimmed.toLowerCase()
  const canCreate =
    trimmed.length > 0 &&
    !tooLong &&
    !LANGUAGE_SUGGESTIONS.some(taken) &&
    !excludeValues?.some(taken)

  return (
    <Popover open={open} onOpenChange={o => { setOpen(o); if (!o) setQuery("") }}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
          {value || <span className="text-muted-foreground">Select language…</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput placeholder="Search languages…" value={query} onValueChange={setQuery} />
          <CommandList>
            {!canCreate && (
              <CommandEmpty>
                {tooLong
                  ? `Language must be ${MAX_LANGUAGE_ITEM_LENGTH} characters or fewer.`
                  : "No language found."}
              </CommandEmpty>
            )}
            {LANGUAGE_SUGGESTIONS.filter(name => !excludeValues?.includes(name)).map(name => (
              <CommandItem
                key={name}
                value={name}
                onSelect={() => commit(name)}
              >
                {name}
                <Check className={cn("ml-auto h-4 w-4", value === name ? "opacity-100" : "opacity-0")} />
              </CommandItem>
            ))}
            {canCreate && (
              // value carries the query so cmdk's filter always keeps this item visible
              <CommandItem value={`add-${trimmed}`} onSelect={() => commit(trimmed)}>
                <Plus className="mr-2 h-4 w-4 shrink-0" />
                Add "{trimmed}"
              </CommandItem>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
