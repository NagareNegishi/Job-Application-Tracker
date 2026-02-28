import type { Correspondence } from "@/types/contact";

export function CorrespondenceEntry({ entry }: { entry: Correspondence }) {
  return (
    <div className="flex gap-3">
      <span className="text-sm text-muted-foreground w-24 shrink-0">
        {new Date(entry.date).toLocaleDateString()}
      </span>
      <p className="text-sm">{entry.note}</p>
    </div>
  )
}

export function CorrespondenceList({ entries }: { entries: Correspondence[] }) {
  if (entries.length === 0) return <p className="text-sm text-muted-foreground">No correspondence.</p>
  return (
    <div className="space-y-3 border-l pl-4">
      {entries.map((e, i) => <CorrespondenceEntry key={i} entry={e} />)}
    </div>
  )
}