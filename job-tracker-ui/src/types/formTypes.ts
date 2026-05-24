import type { JobStatus, Priority, WorkMode } from "@/types/enums"

// FormState represents the internal state of the job create/edit form
export interface FormState {
  company: string
  role: string
  status: JobStatus
  priority: Priority
  appliedAt: Date | undefined
  closedAt: Date | undefined
  description: string
  notes: string
  jobUrl: string
  source: string
  salaryMin: number | ""
  salaryMax: number | ""
  location: string
  workMode: WorkMode | ""
}
