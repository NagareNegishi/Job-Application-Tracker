import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { useDeleteDocument, useDownloadDocument, usePatchDocument } from "@/hooks/documentQuery";
import { ApiError } from "@/lib/api";
import { formatEnumLabel, type DocumentType } from "@/types/enums";
import type { JobDocument } from "@/types/jobDocument";
import { Check, Download, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";

interface DocumentCardProps {
  document: JobDocument
}

export function DocumentCard({ document }: DocumentCardProps) {
  // Extract file extension for display and editing purposes
  const extension = document.name.includes('.') ? document.name.slice(document.name.lastIndexOf('.')) : ''
  const baseName = document.name.slice(0, document.name.length - extension.length)
  // Mutations for document actions
  const { mutate: download, isPending: isDownloading } = useDownloadDocument()
  const { mutate: deleteDocument, isPending: isDeleting } = useDeleteDocument()
  const { mutate: patchDocument, isPending: isPatching } = usePatchDocument()
  const isBusy = isDownloading || isDeleting || isPatching
  // Local state for edit mode and form values
  const [editName, setEditName] = useState(baseName)
  const [isEditing, setIsEditing] = useState(false)
  const [editType, setEditType] = useState(document.type)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Confirm edits and send PATCH request to update document metadata
  function handleConfirm() {
    patchDocument(
      {
        jobId: document.jobId,
        docId: document.docId,
        data: { name: editName + extension, type: editType }
      },
      { onSuccess: () => setIsEditing(false) }
    )
  }

  // Revert to original values if user cancels edit
  function handleCancel() {
    setEditName(baseName)
    setEditType(document.type)
    setIsEditing(false)
  }

  return (
    <div className="border rounded p-3 flex items-center justify-between">

      {/* Display document name and type, or input fields if in edit mode */}
      <div className="flex items-center gap-2 flex-1">
        {isEditing ? (
          <>
            <Input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="h-8"
            />
            <span className="text-sm text-muted-foreground">{extension}</span>
            <Select value={editType} onValueChange={val => setEditType(val as DocumentType)}>
              <SelectTrigger className="h-8 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CV">CV</SelectItem>
                <SelectItem value="CoverLetter">Cover Letter</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </>
        ) : (
          <>
            <p className="font-medium">{document.name}</p>
            <p className="text-sm text-muted-foreground">{formatEnumLabel(document.type)}</p>
          </>
        )}
      </div>

      {/* Action buttons: Edit (pencil), Download, Delete (trash) */}
      <div className="flex items-center gap-1">
        
        {/* Edit actions */}
        {isEditing ? (
          <>
            <Button variant="ghost" size="icon" onClick={handleConfirm} disabled={isBusy}>
              <Check className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleCancel} disabled={isBusy}>
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button variant="ghost" size="icon"
            onClick={() => setIsEditing(true)}
            disabled={isBusy}
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}

        {/* Download action */}
        <Button variant="ghost" size="icon"
          onClick={() => download({ jobId: document.jobId, docId: document.docId, fileName: document.name })}
          disabled={isBusy || isEditing}
        >
          <Download className="h-4 w-4" />
        </Button>

        {/* Delete action */}
        <Button variant="ghost" size="icon"
          onClick={() => deleteDocument(
            { jobId: document.jobId, docId: document.docId },
            {
              onError: (err) => setDeleteError(
                err instanceof ApiError ? err.message : "Failed to delete document."
              )
            }
          )}
          disabled={isBusy || isEditing}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      {deleteError && <p className="text-sm text-red-600 mt-1">{deleteError}</p>}
    </div>
  )
}
