// Country picker for working rights entries — button-trigger combobox with flag + name.
import { useState } from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command, CommandEmpty, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { COUNTRY_CODES, getCountryName } from "./countryCodes"

type Props = {
  value: string
  onChange: (code: string) => void
}

function Flag({ code }: { code: string }) {
  return <span className={`fi fi-${code.toLowerCase()} rounded-sm shrink-0`} />
}

export default function CountryCombobox({ value, onChange }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
          {value ? (
            <span className="flex items-center gap-2 truncate">
              <Flag code={value} />
              {getCountryName(value)}
            </span>
          ) : (
            <span className="text-muted-foreground">Select country…</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput placeholder="Search countries…" />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            {COUNTRY_CODES.map(code => (
              <CommandItem
                key={code}
                value={getCountryName(code)}
                onSelect={() => { onChange(code); setOpen(false) }}
              >
                <span className="flex items-center gap-2">
                  <Flag code={code} />
                  {getCountryName(code)}
                </span>
                <Check className={cn("ml-auto h-4 w-4", value === code ? "opacity-100" : "opacity-0")} />
              </CommandItem>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
