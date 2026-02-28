import type { JobDocument } from "@/types/jobDocument"

interface DocumentCardProps {
  document: JobDocument
}

export function DocumentCard({ document }: DocumentCardProps) {
  return (
    <div className="border rounded p-3 flex items-center justify-between">
      <div>
        <p className="font-medium">{document.name}</p>
        <p className="text-sm text-muted-foreground">{document.type}</p>
      </div>
    </div>
  )
}