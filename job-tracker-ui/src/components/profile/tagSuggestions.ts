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

// PLACEHOLDER — representative universities only.
// Full list from Hipolabs world_universities_and_domains.json added in sub-step I.
export const INSTITUTION_SUGGESTIONS: string[] = [
  "University of Auckland",
  "University of Melbourne",
  "University of Sydney",
  "Massachusetts Institute of Technology",
  "Stanford University",
]

export const DEGREE_SUGGESTIONS: string[] = [
  // Bachelor
  "Bachelor of Science",
  "Bachelor of Arts",
  "Bachelor of Engineering",
  "Bachelor of Commerce",
  "Bachelor of Education",
  "Bachelor of Laws",
  "Bachelor of Architecture",
  "Bachelor of Nursing",
  "Bachelor of Fine Arts",
  "Bachelor of Information Technology",
  "Bachelor of Science in Computer Science",
  "Bachelor of Science in Software Engineering",
  "Bachelor of Business Administration",
  // Master
  "Master of Science",
  "Master of Arts",
  "Master of Engineering",
  "Master of Business Administration",
  "Master of Laws",
  "Master of Education",
  "Master of Public Health",
  "Master of Fine Arts",
  "Master of Information Technology",
  "Master of Science in Computer Science",
  "Master of Science in Data Science",
  // Doctoral
  "Doctor of Philosophy",
  "Doctor of Medicine",
  "Juris Doctor",
  "Doctor of Engineering",
  // Associate / Diploma
  "Associate of Science",
  "Associate of Arts",
  "Graduate Diploma",
  "Postgraduate Diploma",
  // High school
  "High School Diploma",
]
