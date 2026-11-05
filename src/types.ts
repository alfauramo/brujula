export type WorkMode = 'remote' | 'hybrid' | 'onsite';

export type OrgType =
  | 'asociacion'
  | 'fundacion'
  | 'publico'
  | 'sanitario'
  | 'educativo'
  | 'empresa'
  | 'desconocido';

export type JobState = 'guardada' | 'aplicada' | 'entrevista' | 'oferta' | 'descartada';

export type Seniority = 'any' | 'practicas' | 'junior' | 'mid' | 'senior';

export type SectorPackId = 'psicologia' | 'tecnologia' | 'general';

export type SourceId = 'demo' | 'arbeitnow' | 'remotive' | 'jobicy' | 'manual';

export type MatchLabel = 'Excelente' | 'Bueno' | 'Posible' | 'Bajo';

export interface Profile {
  name: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  links: string;
  summary: string;
  cvText: string;
  cvFileName: string;
  cvUpdatedAt: number | null;
  skills: string[];
  titles: string[];
  languages: string[];
  education: string[];
  yearsExperience: number | null;
}

export interface Criteria {
  roles: string[];
  keywords: string[];
  mustHave: string[];
  exclude: string[];
  blockedCompanies: string[];
  locations: string[];
  workModes: WorkMode[];
  contractTypes: string[];
  orgTypes: OrgType[];
  minSalary: number | null;
  currency: 'EUR' | 'USD';
  maxAgeDays: number;
  seniority: Seniority;
  sectorPack: SectorPackId;
  includeDemo: boolean;
  strictFilters: boolean;
}

export interface Job {
  id: string;
  source: SourceId;
  title: string;
  company: string;
  location: string;
  workMode: WorkMode | 'unknown';
  orgType: OrgType;
  contractType: string;
  salaryMin: number | null;
  salaryMax: number | null;
  currency: string;
  description: string;
  url: string;
  tags: string[];
  publishedAt: number | null;
  fetchedAt: number;
}

export interface Decision {
  state: JobState;
  note: string;
  updatedAt: number;
}

export interface Settings {
  onboarded: boolean;
  hideApplied: boolean;
  theme: 'auto' | 'light' | 'dark';
  sources: SourceId[];
  lastSyncAt: number | null;
  gistId: string | null;
}

export interface AppState {
  version: 1;
  profile: Profile;
  criteria: Criteria;
  decisions: Record<string, Decision>;
  customJobs: Job[];
  settings: Settings;
  createdAt: number;
  updatedAt: number;
}

export interface MatchReason {
  kind: 'plus' | 'minus' | 'info';
  label: string;
  detail?: string;
}

export interface MatchResult {
  score: number;
  label: MatchLabel;
  reasons: MatchReason[];
  matched: string[];
  missing: string[];
}

export interface SourceError {
  source: SourceId;
  message: string;
}

export interface FetchResult {
  jobs: Job[];
  errors: SourceError[];
  fetchedAt: number;
  fromCache: boolean;
}

export interface CvAnalysis {
  name: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  links: string;
  summary: string;
  skills: string[];
  titles: string[];
  languages: string[];
  education: string[];
  yearsExperience: number | null;
  sectorPack: SectorPackId | null;
  warnings: string[];
}
