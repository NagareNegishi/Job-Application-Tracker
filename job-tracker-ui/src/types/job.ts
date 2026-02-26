// Job interface, mirrors JobResponseDto from the backend
import type { Contact, Correspondence } from "./contact";
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
    contacts?: Contact[];
    correspondences?: Correspondence[];
}


// Later
// CreateJobRequest → mirrors CreateJobDTO