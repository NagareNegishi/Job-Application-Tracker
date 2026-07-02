import { useNavigate } from "react-router"
import type { Job } from "@/types/job"
import { formatEnumLabel } from "@/types/enums"

interface Props {
  jobs: Job[]
}

function daysSince(isoString: string): number | null {
  const d = new Date(isoString)
  if (d.getFullYear() < 2000) return null // pre-migration rows have DateTime.MinValue (year 0001)
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  return Math.floor((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24))
}

export function StaleApplicationsList({ jobs }: Props) {
  const navigate = useNavigate()

  return (
    <div className="bg-card rounded-lg shadow-sm p-5 col-span-2">
      <p className="text-sm text-muted-foreground mb-3">Applications with no recent activity</p>
      {jobs.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No applications have gone quiet
        </p>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground border-b">
              <th className="pb-2 font-medium">Company</th>
              <th className="pb-2 font-medium">Role</th>
              <th className="pb-2 font-medium">Status</th>
              <th className="pb-2 font-medium text-right">Days since last update</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map(job => {
              const days = daysSince(job.statusChangedAt!)
              return (
                <tr
                  key={job.id}
                  onClick={() => navigate(`/jobs/${job.id}`)}
                  className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors"
                >
                  <td className="py-2">{job.company}</td>
                  <td className="py-2 text-muted-foreground">{job.role}</td>
                  <td className="py-2 text-muted-foreground">{formatEnumLabel(job.status)}</td>
                  <td className="py-2 text-right font-medium text-amber-500">
                    {days !== null ? `${days}d` : "—"}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}
