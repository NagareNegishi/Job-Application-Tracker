import type { Contact, Correspondence } from "./contact";
import { JobStatus, Priority, WorkMode } from "./enums";
import type { JobDocument } from "./jobDocument";

// Job interface, mirrors JobResponseDto from the backend
export interface Job {
  id: number;
  company: string;
  role: string;
  status: JobStatus;
  priority: Priority;
  appliedAt?: string; // ISO date string
  closedAt?: string; // ISO date string
  documents?: JobDocument[]; // Don't expose internal Document
  description?: string;
  notes?: string;
  contacts?: Contact[];
  correspondences?: Correspondence[];
  jobUrl?: string;
  source?: string;
  salaryMin?: number;
  salaryMax?: number;
  location?: string;
  workMode?: WorkMode;
  interviewAt?: string; // ISO date string
}


// CreateJobRequest interface, mirrors JobDTO from the backend
export interface CreateJobRequest {
  company: string;
  role: string;
  status: JobStatus;
  priority: Priority;
  appliedAt?: string; // ISO date string
  closedAt?: string; // ISO date string
  description?: string;
  notes?: string;
  contacts?: Contact[];
  jobUrl?: string;
  source?: string;
  salaryMin?: number;
  salaryMax?: number;
  location?: string;
  workMode?: WorkMode;
  interviewAt?: string; // ISO date string
}


// UpdateJobRequest interface, mirrors UpdateJobDTO from the backend
export interface UpdateJobRequest {
  company: string;
  role: string;
  status: JobStatus;
  priority: Priority;
  appliedAt?: string; // ISO date string
  closedAt?: string; // ISO date string
  description?: string;
  notes?: string;
  contacts?: Contact[];
  correspondences?: Correspondence[];
  jobUrl?: string;
  source?: string;
  salaryMin?: number;
  salaryMax?: number;
  location?: string;
  workMode?: WorkMode;
  interviewAt?: string; // ISO date string
}


// Set of allowed JSON Patch operations for a Job, used in the patchJob service function
// JSON Patch operations: https://jsonpatch.com/
export type JobPatchOperation =
  // Scalar fields — replace only
  | { op: "replace"; path: "/company"; value: string }
  | { op: "replace"; path: "/role"; value: string }
  | { op: "replace"; path: "/status"; value: JobStatus }
  | { op: "replace"; path: "/priority"; value: Priority }
  | { op: "replace"; path: "/appliedAt"; value: string | null }
  | { op: "replace"; path: "/closedAt"; value: string | null }
  | { op: "replace" | "remove"; path: "/description"; value?: string | null }
  | { op: "replace" | "remove"; path: "/notes"; value?: string | null }
  // Array fields — add, remove, replace
  | { op: "add"; path: "/contacts/-"; value: Contact }        // append
  | { op: "remove"; path: `/contacts/${number}`; value?: never }  // remove by index
  | { op: "replace"; path: `/contacts/${number}`; value: Contact }
  | { op: "add"; path: "/correspondences/-"; value: Correspondence }
  | { op: "remove"; path: `/correspondences/${number}`; value?: never }
  | { op: "replace"; path: `/correspondences/${number}`; value: Correspondence }
  | { op: "replace"; path: "/jobUrl"; value: string | null }
  | { op: "replace"; path: "/source"; value: string | null }
  | { op: "replace"; path: "/salaryMin"; value: number | null }
  | { op: "replace"; path: "/salaryMax"; value: number | null }
  | { op: "replace"; path: "/location"; value: string | null }
  | { op: "replace"; path: "/workMode"; value: WorkMode | null }
  | { op: "replace"; path: "/interviewAt"; value: string | null }