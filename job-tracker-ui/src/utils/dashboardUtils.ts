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

/** Returns ISO date strings for each week Monday that overlaps the current month */
function getMonthWeeks(): string[] {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  const firstDay = new Date(Date.UTC(year, month, 1));
  const lastDay  = new Date(Date.UTC(year, month + 1, 0));

  const weeks: string[] = [];
  let monday = getWeekMonday(firstDay);
  while (monday <= lastDay) {
    weeks.push(monday.toISOString().slice(0, 10));
    monday = new Date(monday);
    monday.setUTCDate(monday.getUTCDate() + 7);
  }
  return weeks;
}

/** Returns ISO date strings for all week Mondays in the current year */
function getYearWeeks(): string[] {
  const year = new Date().getUTCFullYear();
  const firstDay = new Date(Date.UTC(year, 0, 1));
  const lastDay  = new Date(Date.UTC(year, 11, 31));

  const weeks: string[] = [];
  let monday = getWeekMonday(firstDay);
  while (monday <= lastDay) {
    weeks.push(monday.toISOString().slice(0, 10));
    monday = new Date(monday);
    monday.setUTCDate(monday.getUTCDate() + 7);
  }
  return weeks;
}

export interface WeeklyActivityEntry {
  week: string;
  count: number;
}

/**
 * Groups jobs by the Monday of the ISO week their appliedAt falls in, oldest first.
 * When fillScope is "month" or "year", all weeks in that period are included (zeros for empty weeks).
 */
export function computeWeeklyApplications(jobs: Job[], fillScope: "month" | "year" | null = null): WeeklyActivityEntry[] {
  const counts = new Map<string, number>();

  for (const job of jobs) {
    if (!job.appliedAt) continue; // Jobs without appliedAt are excluded
    const monday = getWeekMonday(new Date(job.appliedAt));
    const key = monday.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const keys =
    fillScope === "month" ? getMonthWeeks() :
    fillScope === "year"  ? getYearWeeks()  :
    Array.from(counts.keys()).sort();

  return keys.map(key => {
    const monday = new Date(key + "T00:00:00Z");
    // ISO 8601: a week belongs to the month/year of its Thursday (Mon+3).
    // Avoids Dec 29 labelling as "Dec" when the week is functionally a January week.
    const thursday = new Date(monday);
    thursday.setUTCDate(monday.getUTCDate() + 3);
    const month = thursday.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" });
    const day = thursday.getUTCDate();
    const year = String(thursday.getUTCFullYear()).slice(2);
    return { week: `${month} ${day} '${year}`, count: counts.get(key) ?? 0 };
  });
}

const STALE_STATUSES = new Set<JobStatus>([
  JobStatus.Applied,
  JobStatus.Screening,
  JobStatus.Assessment,
  JobStatus.Interview,
]);

/** Returns days since status change if the job is stale, null otherwise. */
export function staleDaysSince(job: Job, thresholdDays: number): number | null {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0); // normalise to midnight UTC so daysSince is always a whole number

  if (!STALE_STATUSES.has(job.status)) return null;
  if (job.closedAt && new Date(job.closedAt) > today) return null;

  // statusChangedAt is non-nullable on the entity
  const daysSince = (today.getTime() - new Date(job.statusChangedAt!).getTime()) / (1000 * 60 * 60 * 24);
  return daysSince >= thresholdDays ? daysSince : null;
}

/** Returns active jobs where status hasn't changed in thresholdDays or more.
 *  Excludes Wishlist, Won, and Closed statuses. Jobs with a future closedAt are also excluded. */
export function computeStaleApplications(jobs: Job[], thresholdDays: number): Job[] {
  return jobs.filter(job => staleDaysSince(job, thresholdDays) !== null);
}
