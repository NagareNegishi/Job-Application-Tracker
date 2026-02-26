import type { Contact, Correspondence } from "./contact";
import { JobStatus, Priority } from "./enums";
import type { JobDocument } from "./jobDocument";

// Job interface, mirrors JobResponseDto from the backend
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


// CreateJobRequest interface, mirrors JobDTO from the backend
export interface CreateJobRequest {
    company: string;
    role: string;
    status: JobStatus;
    priority?: Priority;
    appliedAt?: string; // ISO date string
    closedAt?: string; // ISO date string
    description?: string;
    notes?: string;
    contacts?: Contact[];
}


// UpdateJobRequest interface, mirrors UpdateJobDTO from the backend
export interface UpdateJobRequest {
    company: string;
    role: string;
    status: JobStatus;
    priority?: Priority;
    appliedAt?: string; // ISO date string
    closedAt?: string; // ISO date string
    description?: string;
    notes?: string;
    contacts?: Contact[];
    correspondences?: Correspondence[];
}