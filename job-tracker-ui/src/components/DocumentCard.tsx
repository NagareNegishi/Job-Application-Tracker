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
import type { DocumentType } from "@/types/enums";
import type { JobDocument } from "@/types/jobDocument";
import { Check, Download, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";

interface DocumentCardProps {
  document: JobDocument
}

export function DocumentCard({ document }: DocumentCardProps) {
  const { mutate: download, isPending: isDownloading } = useDownloadDocument()
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

      <div className="flex items-center gap-2 flex-1">
        {isEditing ? (
          <>
            <Input
              value={editName}
              onChange={e => setEditName(e.target.value)}
              className="h-8"
            />
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
            <p className="text-sm text-muted-foreground">{document.type}</p>
          </>
        )}
      </div>


      <div className="flex items-center gap-1">
        {isEditing ? (
          <>
            <Button variant="ghost" size="icon" onClick={handleConfirm} disabled={isPatching}>
              <Check className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={handleCancel} disabled={isPatching}>
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
            <Pencil className="h-4 w-4" />
          </Button>
        )}

        <Button variant="ghost" size="icon"
          onClick={() => download({ jobId: document.jobId, docId: document.docId, fileName: document.name })}
          disabled={isDownloading}
        >
          <Download className="h-4 w-4" />
        </Button>

        <Button variant="ghost" size="icon"
          onClick={() => deleteDocument({ jobId: document.jobId, docId: document.docId })}
          disabled={isDeleting}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

    </div>
  )
}
