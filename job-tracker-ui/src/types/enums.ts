// This file contains enums used in the backend as const objects
// Type for compilation, does not exist at runtime,
// Const object is used for runtime checks
export const JobStatus = {
        Wishlist: "Wishlist",
        Applied: 'Applied',
        Screening: 'Screening',
        Interview: 'Interview',
        Offered: 'Offered',
        Rejected: 'Rejected'
} as const;

export type JobStatus = typeof JobStatus[keyof typeof JobStatus];

export const Priority = {
        Low: "Low",
        Medium: 'Medium',
        High: 'High',
        Urgent: 'Urgent'
} as const;

export type Priority = typeof Priority[keyof typeof Priority];

export const DocumentType = {
        CV: "CV",
        CoverLetter: 'CoverLetter',
        Description: 'Description',
        ReferenceLetter: 'ReferenceLetter',
        Other: 'Other'
} as const;

export type DocumentType = typeof DocumentType[keyof typeof DocumentType];

export const WorkMode = {
  Remote: "Remote",
  Hybrid: "Hybrid",
  OnSite: "OnSite",
} as const;

export type WorkMode = typeof WorkMode[keyof typeof WorkMode];

