import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { usePreferences, useUpdatePreferences } from "@/hooks/preferencesQuery";
import { COLUMNS } from "@/lib/columns";
import type { ColumnKey } from "@/lib/columns";
import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";

// Fixed columns are always visible; only non-fixed columns appear in this toggle list.
const TOGGLEABLE = COLUMNS.filter((c) => !c.fixed);

// Fallback visible set used before preferences load.
const DEFAULT_VISIBLE = COLUMNS
  .filter((c) => c.defaultVisible)
  .map((c) => c.key as ColumnKey);

export function ColumnToggle() {
  const { data: prefs } = usePreferences();
  const { mutate } = useUpdatePreferences();
  const [open, setOpen] = useState(false);
  // draft holds checkbox state while the popover is open; committed to server on close.
  const [draft, setDraft] = useState<ColumnKey[]>([]);

  function handleOpenChange(next: boolean) {
    if (next) {
      // Snapshot on open so draft always starts from the latest saved value, not a stale one.
      setDraft(prefs?.visibleColumns ?? DEFAULT_VISIBLE);
    } else {
      // Spread prefs to preserve all other preference fields — PUT replaces the whole object.
      // TODO: switch to PATCH so each component only sends the fields it owns (see docs/plans/preferences-patch-refactor.md)
      mutate({ ...prefs!, visibleColumns: draft });
    }
    setOpen(next);
  }

  // Immutable toggle: remove if present, append if not.
  function toggle(key: ColumnKey) {
    setDraft((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="shadow-xs hover:bg-secondary">
          <SlidersHorizontal className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" side="bottom" avoidCollisions={false} className="w-48 p-2">
        <div className="flex flex-col gap-1 max-h-[80vh] overflow-y-auto">
          {TOGGLEABLE.map((col) => (
            <label
              key={col.key}
              className="flex items-center gap-2 rounded px-2 py-1.5 text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
            >
              <Checkbox
                checked={draft.includes(col.key as ColumnKey)}
                onCheckedChange={() => toggle(col.key as ColumnKey)}
              />
              {col.label}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
