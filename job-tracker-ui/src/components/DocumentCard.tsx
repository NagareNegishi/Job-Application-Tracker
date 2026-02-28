import { Button } from "@/components/ui/button";
import { useDeleteDocument, useDownloadDocument, usePatchDocument } from "@/hooks/documentQuery";
import type { JobDocument } from "@/types/jobDocument";
import { Check, Download, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";

interface DocumentCardProps {
  document: JobDocument
}

export function DocumentCard({ document }: DocumentCardProps) {
  const { mutate: download, isPending } = useDownloadDocument()
  const { mutate: deleteDocument, isPending: isDeleting } = useDeleteDocument()
  const { mutate: patchDocument, isPending: isPatching } = usePatchDocument()
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(document.name)
  const [editType, setEditType] = useState(document.type)

  // Confirm edits and send PATCH request to update document metadata
  function handleConfirm() {
    patchDocument(
      { jobId: document.jobId, docId: document.docId, data: { name: editName, type: editType } },
      { onSuccess: () => setIsEditing(false) }
    )
  }

  // Revert to original values if user cancels edit
  function handleCancel() {
    setEditName(document.name)
    setEditType(document.type)
    setIsEditing(false)
  }

  return (
    <div className="border rounded p-3 flex items-center justify-between">
      <div>
        <p className="font-medium">{document.name}</p>
        <p className="text-sm text-muted-foreground">{document.type}</p>
      </div>


      {isEditing ? (
        <>
          <Button variant="ghost" size="icon" onClick={handleConfirm}>
            <Check className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)}>
            <X className="h-4 w-4" />
          </Button>
        </>
      ) : (
        <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
          <Pencil className="h-4 w-4" />
        </Button>
      )}


      <Button
        variant="ghost"
        size="icon"
        onClick={() => download({ jobId: document.jobId, docId: document.docId, fileName: document.name })}
        disabled={isPending}
      >
        <Download className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => deleteDocument({ jobId: document.jobId, docId: document.docId })}
        disabled={isDeleting}
      >
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  )
}
