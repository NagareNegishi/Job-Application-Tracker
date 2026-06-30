// Pure functions for computing dashboard widget data from the jobs list.

import { JobStatus } from "@/types/enums";
import type { Job } from "@/types/job";

export type StatusGroup = "active" | "won" | "closed";

/**
 * Maps a job status to its dashboard group.
 */
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
