import { ResponsiveButton } from "@/components/ui/ResponsiveButton"
import { DocumentCard } from "@/components/DocumentCard"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useCreateDocument, useDocuments } from "@/hooks/documentQuery"
import { ApiError, MaintenanceError } from "@/lib/api"
import type { DocumentType } from "@/types/enums"
import { Plus } from "lucide-react"
import { useRef, useState } from "react"

interface DocumentListProps {
  jobId: number
}

export function DocumentList({ jobId }: DocumentListProps) {
  const { data: documents, isPending, isError, error } = useDocuments(jobId)
  const { mutate: addDocument, isPending: isUploading } = useCreateDocument()
  const [selectedType, setSelectedType] = useState<DocumentType>("Other")
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    addDocument(
      { jobId, data: { file, type: selectedType } },
      {
        onSuccess: () => setUploadError(null),
        onError: (err) => setUploadError(
          err instanceof MaintenanceError || err instanceof ApiError ? err.message : "Failed to upload document."
        )
      }
    )
    e.target.value = ""
  }

  if (isPending) return <p>Loading documents...</p>
  if (isError) return <p>{error instanceof MaintenanceError ? error.message : "Failed to load documents."}</p>

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-y-2">
        <h2 className="text-sm uppercase tracking-wider font-semibold text-muted-foreground border-l-2 border-primary pl-3">Documents</h2>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.doc,.docx"
            className="hidden"
            onChange={handleFileChange}
          />
          <Select value={selectedType} onValueChange={v => setSelectedType(v as DocumentType)}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="CV">CV</SelectItem>
              <SelectItem value="CoverLetter">Cover Letter</SelectItem>
              <SelectItem value="Other">Other</SelectItem>
            </SelectContent>
          </Select>
          <ResponsiveButton
            icon={Plus}
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? "Uploading..." : "Add Document"}
          </ResponsiveButton>
        </div>
      </div>
      {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}

      {documents.length === 0
        ? <p className="text-muted-foreground">No documents uploaded.</p>
        : documents.map(doc => <DocumentCard key={doc.docId} document={doc} />)
      }
    </div>
  )
}