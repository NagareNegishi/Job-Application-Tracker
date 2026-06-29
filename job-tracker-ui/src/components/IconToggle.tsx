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

/** Renders a rounded button group where exactly one option is active at a time. */
export function IconToggle<T extends string>({ options, value, onChange }: IconToggleProps<T>) {
  return (
    <div className="flex gap-1 bg-card rounded-xl p-1 shadow-sm">
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <Button
            key={opt.value}
            variant={active ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => onChange(opt.value)}
          >
            {opt.icon}
            {opt.label && <span>{opt.label}</span>}
            {/* Always rendered so button width stays fixed regardless of active state. */}
            <Check className={cn('h-3 w-3', active ? 'visible' : 'invisible')} />
          </Button>
        )
      })}
    </div>
  )
}
