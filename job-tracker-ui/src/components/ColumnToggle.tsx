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
