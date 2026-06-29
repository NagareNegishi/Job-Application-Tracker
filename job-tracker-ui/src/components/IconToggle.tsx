// Reusable icon-based toggle group for mutually exclusive view/mode switching.
import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ToggleOption<T extends string> {
  value: T
  icon: ReactNode
  label?: string
}

interface IconToggleProps<T extends string> {
  options: ToggleOption<T>[]
  value: T
  onChange: (value: T) => void
}

/** Renders a pill-shaped button group where exactly one option is active at a time. */
export function IconToggle<T extends string>({ options, value, onChange }: IconToggleProps<T>) {
  return (
    <div className="flex bg-card rounded-full p-1 shadow-sm divide-x divide-border">
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <Button
            key={opt.value}
            variant={active ? 'secondary' : 'ghost'}
            size="sm"
            className="rounded-full"
            onClick={() => onChange(opt.value)}
          >
            {/* Always rendered so button width stays fixed regardless of active state. */}
            <Check className={cn('h-3 w-3', active ? 'visible' : 'invisible')} />
            {opt.icon}
            {opt.label && <span>{opt.label}</span>}
          </Button>
        )
      })}
    </div>
  )
}
