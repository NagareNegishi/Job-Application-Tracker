// Mirrors ValidationConstants.cs in the backend.
// Keep in sync with JobTrackerApi/Models/ValidationConstants.cs.
export const MAX_COMPANY_LENGTH = 100
export const MAX_ROLE_LENGTH = 100
export const MAX_DESCRIPTION_LENGTH = 5000
export const MAX_NOTES_LENGTH = 5000

export const MAX_CONTACT_NAME_LENGTH = 50
export const MAX_CONTACT_ROLE_LENGTH = 50
export const MAX_CONTACT_EMAIL_LENGTH = 100
export const MAX_CONTACT_PHONE_LENGTH = 20

export const MAX_JOB_URL_LENGTH = 2048
export const MAX_SOURCE_LENGTH = 100
export const MAX_LOCATION_LENGTH = 100

export const MAX_TARGET_ROLE_ITEM_LENGTH = 100
export const MAX_SKILL_ITEM_LENGTH = 50
export const MAX_CERTIFICATION_ITEM_LENGTH = 100
export const MAX_LANGUAGE_ITEM_LENGTH = 30

// Profile array-count caps
export const MAX_TARGET_ROLES_COUNT = 10
export const MAX_SKILLS_COUNT = 50
export const MAX_CERTIFICATIONS_COUNT = 20
export const MAX_LANGUAGES_COUNT = 15

// Work history per-item limits
export const MAX_WORK_HISTORY_TITLE_LENGTH = 100
export const MAX_WORK_HISTORY_COMPANY_LENGTH = 100
export const MAX_WORK_HISTORY_DESCRIPTION_LENGTH = 2000

// Education per-item limits
export const MAX_EDUCATION_INSTITUTION_LENGTH = 100
export const MAX_EDUCATION_DEGREE_LENGTH = 100

// Profile conditions — array-count caps
export const MAX_WORK_MODES_COUNT = 3
export const MAX_CONTRACT_TYPES_COUNT = 6
export const MAX_LOCATIONS_COUNT = 10
export const MAX_LOCATION_AREAS_COUNT = 10

// Profile conditions — per-item limits
export const MAX_LOCATION_AREA_ITEM_LENGTH = 100
export const MAX_ADDITIONAL_CONDITIONS_LENGTH = 500
export const MAX_SALARY_AMOUNT = 100_000_000
