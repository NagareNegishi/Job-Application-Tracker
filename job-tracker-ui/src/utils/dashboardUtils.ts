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

/** Computes the percentage of applications that received a human response (0–100). */
export function computeResponseRate(jobs: Job[]): number {
  let responded = 0;
  let eligible = 0;

  for (const job of jobs) {
    switch (job.status) {
      case JobStatus.Screening:
      case JobStatus.Assessment:
      case JobStatus.Interview:
      case JobStatus.Offered:
      case JobStatus.Rejected:
        responded++;
        eligible++;
        break;
      case JobStatus.Applied:
      case JobStatus.NoResponse:
        eligible++;
        break;
    }
  }

  // Avoid division by zero when no eligible applications exist
  return eligible === 0 ? 0 : Math.round((responded / eligible) * 100);
}

export interface StatusFunnelEntry {
  status: JobStatus;
  count: number;
}

const FUNNEL_ORDER: JobStatus[] = [
  JobStatus.Wishlist,
  JobStatus.Applied,
  JobStatus.Screening,
  JobStatus.Assessment,
  JobStatus.Interview,
  JobStatus.Offered,
  JobStatus.Rejected,
  JobStatus.Withdrawn,
  JobStatus.NoResponse,
];

/** Returns job counts per status in pipeline order. */
export function computeStatusFunnel(jobs: Job[]): StatusFunnelEntry[] {
  const counts = new Map<JobStatus, number>(
    FUNNEL_ORDER.map(status => [status, 0])
  );

  for (const job of jobs) {
    counts.set(job.status, (counts.get(job.status) ?? 0) + 1);
  }

  return FUNNEL_ORDER.map(status => ({ status, count: counts.get(status)! }));
}

/** Returns the Monday of the ISO week containing the given date */
function getWeekMonday(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay(); // 0=Sun, 1=Mon, …6=Sat
  d.setUTCDate(d.getUTCDate() - ((day + 6) % 7));
  return d;
}

export interface WeeklyActivityEntry {
  week: string;
  count: number;
}

/** Groups jobs by the Monday of the ISO week their appliedAt falls in, oldest first. */
export function computeWeeklyActivity(jobs: Job[]): WeeklyActivityEntry[] {
  const counts = new Map<string, number>();

  for (const job of jobs) {
    if (!job.appliedAt) continue; // Jobs without appliedAt are excluded
    const monday = getWeekMonday(new Date(job.appliedAt));
    const key = monday.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, count]) => {
      const d = new Date(key + "T00:00:00Z");
      const month = d.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
      const day = d.getUTCDate();
      const year = String(d.getUTCFullYear()).slice(2);
      return { week: `${month} ${day} '${year}`, count };
    });
}
