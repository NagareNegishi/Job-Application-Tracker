// Language picker for language entries — button-trigger combobox, mirrors CountryCombobox
// but matches plain names (no code lookup, no flag) against LANGUAGE_SUGGESTIONS.
import { useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command, CommandEmpty, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { LANGUAGE_SUGGESTIONS } from "./tagSuggestions"

type Props = {
  value: string
  onChange: (language: string) => void
  excludeValues?: string[]
}

export default function LanguageCombobox({ value, onChange, excludeValues }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
          {value || <span className="text-muted-foreground">Select language…</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput placeholder="Search languages…" />
          <CommandList>
            <CommandEmpty>No language found.</CommandEmpty>
            {LANGUAGE_SUGGESTIONS.filter(name => !excludeValues?.includes(name)).map(name => (
              <CommandItem
                key={name}
                value={name}
                onSelect={() => { onChange(name); setOpen(false) }}
              >
                {name}
                <Check className={cn("ml-auto h-4 w-4", value === name ? "opacity-100" : "opacity-0")} />
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
