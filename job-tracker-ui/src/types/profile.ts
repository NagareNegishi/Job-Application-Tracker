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
  fromYear: number;         // 0 = not yet selected
  fromMonth: number | null; // 1–12; null = not selected (optional)
  toYear: number | null;    // null = currently working; 0 = unchecked, no year yet
  toMonth: number | null;   // 1–12; null = not selected (optional)
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
