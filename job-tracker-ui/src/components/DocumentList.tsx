import { Button } from "@/components/ui/button"
import { DocumentCard } from "@/components/DocumentCard"
import { useCreateDocument, useDocuments } from "@/hooks/documentQuery"
import type { DocumentType } from "@/types/enums"
import { useRef, useState } from "react"

interface DocumentListProps {
  jobId: number
}

export function DocumentList({ jobId }: DocumentListProps) {
  const { data: documents, isPending, isError } = useDocuments(jobId)
  const { mutate: addDocument, isPending: isUploading } = useCreateDocument()
  const [selectedType, setSelectedType] = useState<DocumentType>("Other")
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    addDocument({ jobId, data: { file, type: selectedType } })
    e.target.value = ""
  }

  if (isPending) return <p>Loading documents...</p>
  if (isError) return <p>Failed to load documents.</p>

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold">Documents</h2>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={handleFileChange}
          />
          <select
            value={selectedType}
            onChange={e => setSelectedType(e.target.value as DocumentType)}
          >
            <option value="CV">CV</option>
            <option value="CoverLetter">Cover Letter</option>
            <option value="Other">Other</option>
          </select>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? "Uploading..." : "Add Document"}
          </Button>
        </div>
      </div>
      {documents.length === 0
        ? <p className="text-muted-foreground">No documents uploaded.</p>
        : documents.map(doc => <DocumentCard key={doc.docId} document={doc} />)
      }
    </div>
  )
}