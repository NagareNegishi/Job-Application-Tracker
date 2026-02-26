// Job interface, mirrors JobResponseDto from the backend
import { JobStatus, Priority } from "./enums";
import type { JobDocument } from "./jobDocument";

export interface Job {
    id: number;
    company: string;
    role: string;
    status: JobStatus;
    priority?: Priority;
    appliedAt?: string; // ISO date string
    closedAt?: string; // ISO date string
    documents?: JobDocument[]; // Don't expose internal Document
    description?: string;
    notes?: string;
    // contacts?: Contact[]; // Define Contact interface later
    // correspondences?: Correspondence[]; // Define Correspondence interface later
}


// Later
// CreateJobRequest → mirrors CreateJobDTO