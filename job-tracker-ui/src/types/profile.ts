import type { WorkMode } from "@/types/enums";

export const WorkingRight = {
  Citizen: "Citizen",
  PermanentResident: "PermanentResident",
  WorkVisa: "WorkVisa",
  RequiresSponsorship: "RequiresSponsorship",
  Other: "Other",
} as const;

export type WorkingRight = typeof WorkingRight[keyof typeof WorkingRight];

export const ContractType = {
  FullTimePermanent: "FullTimePermanent",
  FullTimeContract: "FullTimeContract",
  PartTime: "PartTime",
  Casual: "Casual",
  Internship: "Internship",
  Temporary: "Temporary",
} as const;

export type ContractType = typeof ContractType[keyof typeof ContractType];

export const SalaryPeriod = {
  Annual: "Annual",
  Monthly: "Monthly",
  Hourly: "Hourly",
} as const;

export type SalaryPeriod = typeof SalaryPeriod[keyof typeof SalaryPeriod];

export type WorkingRightEntry = {
  country: string;
  status: WorkingRight;
};

export type SalaryExpectation = {
  minAmount: number;     // 0 = not yet entered
  currency: string;      // defaults to "NZD" when a new entry is created
  period: SalaryPeriod;  // defaults to Annual when a new entry is created
};

export type PreferredLocationEntry = {
  country: string;
  areas: string[];
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
  // What I'm looking for
  targetRoles: string[];
  workModes: WorkMode[];
  contractTypes: ContractType[];
  salaryExpectation: SalaryExpectation | null;
  preferredLocations: PreferredLocationEntry[];
  additionalConditions: string;

  // Background
  skills: string[];
  certifications: string[];
  languages: string[];
  workingRights: WorkingRightEntry[];
  workHistory: WorkHistoryEntry[];
  education: EducationEntry[];
};

export type ProfilePatch = Partial<UserProfile>;
