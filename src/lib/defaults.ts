import type { AppState, Criteria, Profile, SectorPackId } from '../types';
import { packById } from '../data/packs';

export function emptyProfile(): Profile {
  return {
    name: '',
    headline: '',
    email: '',
    phone: '',
    location: '',
    links: '',
    summary: '',
    cvText: '',
    cvFileName: '',
    cvUpdatedAt: null,
    skills: [],
    titles: [],
    languages: [],
    education: [],
    yearsExperience: null,
  };
}

export function defaultCriteria(packId: SectorPackId = 'general'): Criteria {
  const pack = packById(packId);
  return {
    roles: pack.roles.slice(0, 2),
    keywords: pack.keywords.slice(0, 6),
    mustHave: [],
    exclude: [],
    blockedCompanies: [],
    locations: [],
    workModes: ['onsite', 'hybrid', 'remote'],
    contractTypes: [],
    orgTypes: pack.orgTypes,
    minSalary: null,
    currency: 'EUR',
    maxAgeDays: 45,
    seniority: 'any',
    sectorPack: packId,
    includeDemo: true,
    strictFilters: true,
  };
}

export function emptyState(): AppState {
  const now = Date.now();
  return {
    version: 1,
    profile: emptyProfile(),
    criteria: defaultCriteria('psicologia'),
    decisions: {},
    customJobs: [],
    settings: {
      onboarded: false,
      hideApplied: true,
      theme: 'auto',
      sources: ['demo'],
      lastSyncAt: null,
      gistId: null,
    },
    createdAt: now,
    updatedAt: now,
  };
}
