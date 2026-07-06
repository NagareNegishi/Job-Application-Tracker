export const WorkingRight = {
  Citizen: "Citizen",
  PermanentResident: "PermanentResident",
  WorkVisa: "WorkVisa",
  RequiresSponsorship: "RequiresSponsorship",
  Other: "Other",
} as const;

export type WorkingRight = typeof WorkingRight[keyof typeof WorkingRight];

export type WorkingRightEntry = {
  country: string;
  status: WorkingRight;
};

export type WorkHistoryEntry = {
  title: string;
  company: string;
  from: string;
  to: string | null;
  description: string;
};

export type EducationEntry = {
  institution: string;
  degree: string;
  from: number;
  to: number | null;
};

export type UserProfile = {
  targetRoles: string[];
  skills: string[];
  certifications: string[];
  languages: string[];
  workingRights: WorkingRightEntry[];
  workHistory: WorkHistoryEntry[];
  education: EducationEntry[];
};

export type ProfilePatch = Partial<UserProfile>;
