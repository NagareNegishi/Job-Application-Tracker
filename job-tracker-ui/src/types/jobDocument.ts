import { DocumentType } from "./enums";

// Document interface mirrors DocumentResponseDto from the backend
export interface JobDocument {
    jobId: number; // Associated Job ID
    docId: number; // Document ID
    type: DocumentType;
    name: string; // Original, display name
}


// CreateJobDocumentRequest interface, mirrors DocumentDTO from the backend
export interface CreateJobDocumentRequest {
    file: File; // File to be uploaded
    type: DocumentType;
    name?: string; // optional override
}


// UpdateJobDocumentRequest interface, mirrors UpdateDocumentDTO from the backend
export interface UpdateJobDocumentRequest {
    type?: DocumentType;
    name?: string; // optional override
}
