// Pure functions for computing dashboard widget data from the jobs list.

import { JobStatus } from "@/types/enums";
import type { Job } from "@/types/job";

export type StatusGroup = "active" | "won" | "closed";

/** Maps a job status to its dashboard group. */
export function classifyStatus(status: JobStatus): StatusGroup {
  switch (status) {
    case JobStatus.Wishlist:
    case JobStatus.Applied:
    case JobStatus.Screening:
    case JobStatus.Assessment:
    case JobStatus.Interview:
      return "active";
    case JobStatus.Offered:
      return "won";
    case JobStatus.Rejected:
    case JobStatus.Withdrawn:
    case JobStatus.NoResponse:
      return "closed";
  }
}

export interface SummaryResult {
  active: number;
  won: number;
  closed: number;
}

/** Counts jobs in each status group for the summary bar. */
export function computeSummary(jobs: Job[]): SummaryResult {
  const result: SummaryResult = { active: 0, won: 0, closed: 0 };
  for (const job of jobs) {
    result[classifyStatus(job.status)]++;
  }
  return result;
}
