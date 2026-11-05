import { describe, expect, it } from 'vitest';
import type { Criteria, Job, Profile } from '../types';
import { defaultCriteria, emptyProfile } from './defaults';
import { evaluateJob, filterReason, inferOrgType, inferWorkMode, isEnglishText, listJobs } from './match';
import { parseSalary, termMatches } from './text';

const DAY = 86_400_000;

const profile: Profile = {
  ...emptyProfile(),
  name: 'Lucía Martín',
  headline: 'Psicóloga sanitaria',
  skills: [
    'Terapia cognitivo-conductual',
    'Evaluación psicológica',
    'Intervención en crisis',
    'Terapia familiar',
  ],
  languages: ['Inglés (C1)'],
  yearsExperience: 6,
  titles: ['psicólogo/a'],
};

const criteria: Criteria = {
  ...defaultCriteria('psicologia'),
  roles: ['psicólogo/a'],
  keywords: ['salud mental', 'intervención'],
  mustHave: [],
  locations: ['Madrid'],
  workModes: ['onsite', 'hybrid'],
  orgTypes: ['asociacion', 'fundacion'],
  minSalary: 22_000,
  maxAgeDays: 60,
  strictFilters: false,
};

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 'job-1',
    source: 'demo',
    title: 'Psicóloga/o para programa de intervención',
    company: 'Asociación Punto de Encuentro',
    location: 'Madrid',
    workMode: 'onsite',
    orgType: 'asociacion',
    contractType: 'Jornada completa',
    salaryMin: 24_000,
    salaryMax: 28_000,
    currency: 'EUR',
    description:
      'Buscamos psicóloga/o para intervención en salud mental con familias. Terapia cognitivo-conductual, evaluación psicológica y coordinación de casos. 24.000–28.000 € brutos.',
    url: '',
    tags: ['psicología', 'asociación'],
    publishedAt: Date.now() - DAY,
    fetchedAt: Date.now(),
    ...overrides,
  };
}

describe('motor de encaje', () => {
  it('puntúa alto una oferta que coincide en rol, ubicación, entidad y salario', () => {
    const result = evaluateJob(makeJob(), profile, criteria);
    expect(result.score).toBeGreaterThan(75);
    expect(result.label).toBe('Excelente');
    expect(result.matched.length).toBeGreaterThan(0);
    expect(result.reasons.some((reason) => reason.kind === 'plus')).toBe(true);
  });

  it('penaliza cuando faltan los requisitos imprescindibles', () => {
    const base = evaluateJob(makeJob(), profile, criteria);
    const strict = evaluateJob(makeJob(), profile, { ...criteria, mustHave: ['colegiación obligatoria'] });
    expect(strict.score).toBeLessThan(base.score);
    expect(strict.reasons.some((reason) => reason.label.includes('imprescindibles'))).toBe(true);
  });

  it('penaliza una modalidad que no encaja', () => {
    const onsite = evaluateJob(makeJob(), profile, { ...criteria, workModes: ['remote'] });
    const remote = evaluateJob(makeJob({ workMode: 'remote', location: 'Remoto' }), profile, {
      ...criteria,
      workModes: ['remote'],
    });
    expect(remote.score).toBeGreaterThan(onsite.score);
  });

  it('aplica filtros de exclusión y empresas bloqueadas', () => {
    expect(filterReason(makeJob({ description: 'Puesto de teleoperador' }), {
      ...criteria,
      exclude: ['teleoperador'],
    })).toContain('teleoperador');

    expect(filterReason(makeJob(), { ...criteria, blockedCompanies: ['Punto de Encuentro'] })).toContain(
      'bloqueado',
    );
  });

  it('oculta las ofertas aplicadas salvo que se pida su pestaña', () => {
    const job = makeJob();
    const decisions = { [job.id]: { state: 'aplicada' as const, note: '', updatedAt: Date.now() } };

    const hidden = listJobs([job], profile, criteria, decisions, {
      hideApplied: true,
      tab: 'todas',
      query: '',
      sort: 'match',
    });
    expect(hidden).toHaveLength(0);

    const appliedTab = listJobs([job], profile, criteria, decisions, {
      hideApplied: true,
      tab: 'aplicada',
      query: '',
      sort: 'match',
    });
    expect(appliedTab).toHaveLength(1);
  });

  it('clasifica entidades y modalidad', () => {
    expect(inferOrgType({ company: 'Asociación de Familiares', description: '', tags: [] })).toBe(
      'asociacion',
    );
    expect(inferOrgType({ company: 'Fundación Integra', description: '', tags: [] })).toBe('fundacion');
    expect(inferOrgType({ company: 'Hospital La Paz', description: '', tags: [] })).toBe('sanitario');
    expect(inferOrgType({ company: 'Grupo Nortia S.L.', description: '', tags: [] })).toBe('empresa');
    expect(inferWorkMode({ workMode: 'unknown', description: 'Teletrabajo 100% remoto' })).toBe('remote');
    expect(inferWorkMode({ workMode: 'unknown', description: 'Modelo híbrido, 2 días en casa' })).toBe(
      'hybrid',
    );
  });

  it('detecta ofertas en inglés', () => {
    expect(
      isEnglishText(
        'We are looking for a psychologist to join our team. You will work with the clinical team and our patients.',
      ),
    ).toBe(true);
    expect(
      isEnglishText(
        'Buscamos psicóloga para nuestro equipo de intervención. Trabajarás con familias y coordinarás el programa.',
      ),
    ).toBe(false);
  });
});

describe('utilidades de texto', () => {
  it('normaliza acentos y variantes morfológicas', () => {
    expect(termMatches('psicologa sanitaria en madrid', 'psicólogo/a')).toBe(true);
    expect(termMatches('intervencion familiar', 'intervención')).toBe(true);
    expect(termMatches('desarrollo frontend', 'psicología')).toBe(false);
  });

  it('extrae salarios en euros y dólares', () => {
    expect(parseSalary('Salario: 24.000 - 28.000 € brutos')).toEqual({
      min: 24_000,
      max: 28_000,
      currency: 'EUR',
    });
    expect(parseSalary('$60k - $80k per year')).toEqual({
      min: 60_000,
      max: 80_000,
      currency: 'USD',
    });
    expect(parseSalary('Sin salario indicado')).toEqual({ min: null, max: null, currency: 'EUR' });
  });
});
