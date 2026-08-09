import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { AlignmentResultView } from "@/components/AlignmentResultView"
import { useProfile } from "@/hooks/profileQuery"
import { ApiError } from "@/lib/api"
import { MIN_ANALYSIS_DESCRIPTION } from "@/lib/validationConstants"
import { analyseAlignment, type AlignmentResult } from "@/services/analysisService"
import { isProfileReady } from "@/utils/profileReady"
import { Sparkles } from "lucide-react"
import { useState } from "react"
import { Link } from "react-router"

interface AlignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAutoFill: (text: string) => void
}

export function AlignmentDialog({ open, onOpenChange, onAutoFill }: AlignmentDialogProps) {
  const { data: profile } = useProfile()
  const [text, setText] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<AlignmentResult | null>(null)

  const descriptionReady = text.trim().length >= MIN_ANALYSIS_DESCRIPTION
  const profileReady = isProfileReady(profile)
  const disabled = !descriptionReady || !profileReady

  const gateMessage = !descriptionReady
    ? "Paste a longer description to check alignment."
    : !profileReady
      ? <>Complete your <Link to="/profile" className="underline">profile</Link> to run analysis.</>
      : null

  // Clears transient state when the dialog closes (X, Escape, backdrop)
  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setText("")
      setError(null)
      setResult(null)
    }
    onOpenChange(nextOpen)
  }

  async function handleCheck() {
    setError(null)
    setLoading(true)
    try {
      const res = await analyseAlignment({ description: text })
      setResult(res)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  function handleAutoFill() {
    handleOpenChange(false)
    onAutoFill(text)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg flex flex-col max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            See if it's worth applying
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3 overflow-y-auto flex-1 min-h-0">
          <Textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="Paste job listing here..."
            rows={8}
            disabled={loading}
          />
          {(gateMessage ?? error) && (
            <p className="text-sm text-destructive">{gateMessage ?? error}</p>
          )}
          {result && (
            <div className="space-y-2 text-foreground border rounded-lg p-4 text-sm">
              <AlignmentResultView result={result} />
            </div>
          )}
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Close
          </Button>
          {result ? (
            <Button onClick={handleAutoFill}>
              Auto-fill this job
            </Button>
          ) : (
            <Button onClick={handleCheck} disabled={disabled || loading}>
              {loading ? "Checking..." : "Check"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
