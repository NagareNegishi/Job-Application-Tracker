import { Button } from "@/components/ui/button";
import { useDeleteDocument, useDownloadDocument } from "@/hooks/documentQuery";
import type { JobDocument } from "@/types/jobDocument";

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
        variant="outline"
        onClick={() => download({ jobId: document.jobId, docId: document.docId, fileName: document.name })}
        disabled={isPending}
      >
        {isPending ? "Downloading..." : "Download"}
      </Button>

      <Button
        variant="destructive"
        onClick={() => deleteDocument({ jobId: document.jobId, docId: document.docId })}
        disabled={isDeleting}
      >
        {isDeleting ? "Deleting..." : "Delete"}
      </Button>
    </div>
  )
}
