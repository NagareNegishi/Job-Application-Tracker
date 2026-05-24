import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { parseListing } from "@/services/parseService"
import type { FormState } from "@/types/formTypes"
import { useState } from "react"

interface ParseListingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onFill: (data: Partial<FormState>) => void
  onFillManually: () => void
}

export function ParseListingDialog({ open, onOpenChange, onFill, onFillManually }: ParseListingDialogProps) {
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Clears transient state when the dialog closes (X, Escape, backdrop)
  function handleOpenChange(nextOpen: boolean) {}

  // Calls the parse API and hands the converted result to the parent
  async function handleFill() {}

  // Closes the dialog then tells the parent to open the sheet empty
  function handleFillManually() {}

  return <></>
}
