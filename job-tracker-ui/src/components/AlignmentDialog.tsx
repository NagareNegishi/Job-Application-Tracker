import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Sparkles } from "lucide-react"
import { useState } from "react"

interface AlignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAutoFill: (text: string) => void
}

export function AlignmentDialog({ open, onOpenChange, onAutoFill }: AlignmentDialogProps) {
  const [text, setText] = useState("")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
          />
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={() => onAutoFill(text)}>
            Check
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
