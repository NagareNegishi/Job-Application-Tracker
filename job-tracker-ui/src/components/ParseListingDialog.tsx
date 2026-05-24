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

// Parse endpoint returns DateOnly ("YYYY-MM-DD"), which new Date() treats as UTC midnight —
// shifting the date backwards in UTC+ time zones. The 3-arg constructor always uses local time.
// JS Date months are 0-indexed (0 = Jan); DateOnly strings are 1-indexed, hence m - 1.
function parseDateOnly(s: string): Date {
  const [y, m, d] = s.split("-").map(Number)
  return new Date(y, m - 1, d)
}

export function ParseListingDialog({ open, onOpenChange, onFill, onFillManually }: ParseListingDialogProps) {
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Clears transient state when the dialog closes (X, Escape, backdrop)
  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setText("")
      setError(null)
    }
    onOpenChange(nextOpen)
  }

  // Calls the parse API and hands the converted result to the parent
  async function handleFill() {
    setError(null)
    setLoading(true)
    try {
      const fields = await parseListing(text)
      const initialData: Partial<FormState> = {
        ...fields,
        closedAt: fields.closedAt ? parseDateOnly(fields.closedAt) : undefined,
      }
      onFill(initialData)
      handleOpenChange(false)
    } catch {
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  // Closes the dialog then tells the parent to open the sheet empty
  function handleFillManually() {
    handleOpenChange(false)
    onFillManually()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Auto-fill job details</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Paste the job listing text below and Claude will extract the details for you.
          </p>
          <Textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Paste job listing here..."
            rows={8}
            disabled={loading}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleFillManually} disabled={loading}>
            Fill manually
          </Button>
          <Button onClick={handleFill} disabled={loading || !text.trim()}>
            {loading ? "Filling..." : "Fill fields"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
