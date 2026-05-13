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
import { Columns2 } from "lucide-react";
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
      mutate({ visibleColumns: draft });
    }
    setOpen(next);
  }

  // Immutable toggle: remove if present, append if not.
  function toggle(key: ColumnKey) {
    setDraft((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }
}
