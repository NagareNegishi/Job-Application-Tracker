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

  return <></>
}
