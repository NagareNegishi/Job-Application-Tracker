import { DocumentCard } from "@/components/DocumentCard"
import { useDocuments } from "@/hooks/documentQuery"

interface DocumentListProps {
  jobId: number
}

export function DocumentList({ jobId }: DocumentListProps) {
  const { data: documents, isPending, isError } = useDocuments(jobId)

  if (isPending) return <p>Loading documents...</p>
  if (isError) return <p>Failed to load documents.</p>

  return (
    <div className="mt-4">
      <h2 className="text-lg font-semibold mb-2">Documents</h2>
      {documents.length === 0
        ? <p className="text-muted-foreground">No documents uploaded.</p>
        : documents.map(doc => <DocumentCard key={doc.docId} document={doc} />)
      }
    </div>
  )
}