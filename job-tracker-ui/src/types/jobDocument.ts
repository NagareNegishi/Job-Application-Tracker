// Document interface mirrors DocumentResponseDto from the backend
import { DocumentType } from "./enums";

export interface JobDocument {
    jobId: number; // Associated Job ID
    docId: number; // Document ID
    type: DocumentType;
    name: string; // Original, display name
}


// Later
// UpdateJobRequest → mirrors UpdateJobDTO