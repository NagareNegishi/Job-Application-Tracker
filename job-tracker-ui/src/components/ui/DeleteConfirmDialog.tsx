import type { ReactNode } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

// DeleteConfirmDialogProps defines the props for the DeleteConfirmDialog component
interface DeleteConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: ReactNode  // ReactNode allows JSX (e.g. <br />) for formatted messages
  onConfirm: () => void
}

/**
 * DeleteConfirmDialog provides a reusable confirmation dialog for destructive actions.
 */
export function DeleteConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xs" showCloseButton={false}>
        {/* Title and description */}
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {/* Cancel and confirm actions */}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="outline"
            className={cn(
              "border-destructive/50 text-destructive/70",
              "hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
            )}
            onClick={() => { onOpenChange(false); onConfirm() }}
          >
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
