// Suggestion pools for the profile tag sections' autocomplete.
// Data-only: TagInput reads each as a flat string[] and only *suggests* — input is never restricted to these.
import ISO6391 from "iso-639-1"

// PLACEHOLDER seeds — representative values only.
// Full curated lists are generated in a dedicated session (needs no repo context). See job-analysis.md Notes.
export const TARGET_ROLE_SUGGESTIONS: string[] = [
  "Frontend Developer",
  "Backend Developer",
  "Full Stack Developer",
  "Software Engineer",
  "DevOps Engineer",
]

export const SKILL_SUGGESTIONS: string[] = [
  "TypeScript",
  "React",
  "C#",
  ".NET",
  "PostgreSQL",
]

export const CERTIFICATION_SUGGESTIONS: string[] = [
  "AWS Certified Solutions Architect",
  "Azure Fundamentals (AZ-900)",
  "Certified Kubernetes Administrator (CKA)",
]

// All ISO 639-1 English language names (~184), computed once at module load. Custom entries still allowed.
export const LANGUAGE_SUGGESTIONS: string[] = ISO6391.getAllNames()
