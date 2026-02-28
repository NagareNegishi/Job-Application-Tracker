import { Button } from "@/components/ui/button";
import { useDeleteDocument, useDownloadDocument } from "@/hooks/documentQuery";
import type { JobDocument } from "@/types/jobDocument";
// import { Download, Trash2, Pencil, Check, X } from "lucide-react"
import { Download, Trash2 } from "lucide-react";

interface DocumentCardProps {
  document: JobDocument
}

export function DocumentCard({ document }: DocumentCardProps) {
  const { mutate: download, isPending } = useDownloadDocument()
  const { mutate: deleteDocument, isPending: isDeleting } = useDeleteDocument()

  return (
    <div className="border rounded p-3 flex items-center justify-between">
      <div>
        <p className="font-medium">{document.name}</p>
        <p className="text-sm text-muted-foreground">{document.type}</p>
      </div>

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
