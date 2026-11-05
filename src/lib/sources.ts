import type { SourceError, SourceId, Job, FetchResult } from '../types';
import { DEMO_JOBS } from '../data/demo';
import { normalize, parseSalary } from './text';
import { readJobsCache, writeJobsCache } from './storage';
import { uid } from './id';

const CACHE_TTL = 20 * 60 * 1000;
const TIMEOUT = 12_000;

export function htmlToText(html: string): string {
  if (!html) return '';
  const document = new DOMParser().parseFromString(html, 'text/html');
  document.querySelectorAll('script, style, noscript').forEach((node) => node.remove());
  const text = document.body.textContent ?? '';
  return text
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT),
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return (await response.json()) as T;
}

function timestamp(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value < 1e12 ? value * 1000 : value;
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
}

interface ArbeitnowItem {
  slug: string;
  company_name: string;
  title: string;
  description: string;
  remote: boolean;
  url: string;
  tags: string[];
  location: string;
  created_at: number;
  job_types?: string[];
}

async function fetchArbeitnow(): Promise<Job[]> {
  const payload = await getJson<{ data: ArbeitnowItem[] }>(
    'https://www.arbeitnow.com/api/job-board-api',
  );
  return (payload.data ?? []).slice(0, 60).map((item) => ({
    id: `arbeitnow-${item.slug}`,
    source: 'arbeitnow' as const,
    title: item.title,
    company: item.company_name,
    location: item.location || 'Sin ubicación',
    workMode: item.remote ? ('remote' as const) : ('unknown' as const),
    orgType: 'desconocido' as const,
    contractType: item.job_types?.[0] ?? '',
    salaryMin: null,
    salaryMax: null,
    currency: 'EUR',
    description: htmlToText(item.description),
    url: item.url,
    tags: item.tags ?? [],
    publishedAt: timestamp(item.created_at),
    fetchedAt: Date.now(),
  }));
}

interface RemotiveItem {
  id: number;
  url: string;
  title: string;
  company_name: string;
  category: string;
  job_type: string;
  candidate_required_location: string;
  salary: string;
  description: string;
  publication_date: string;
  tags: string[];
}

async function fetchRemotive(): Promise<Job[]> {
  const payload = await getJson<{ jobs: RemotiveItem[] }>(
    'https://remotive.com/api/remote-jobs?limit=80',
  );
  return (payload.jobs ?? []).map((item) => {
    const description = htmlToText(item.description);
    const salary = parseSalary(`${item.salary ?? ''} ${description.slice(0, 800)}`);
    return {
      id: `remotive-${item.id}`,
      source: 'remotive' as const,
      title: item.title,
      company: item.company_name,
      location: item.candidate_required_location || 'Remoto',
      workMode: 'remote' as const,
      orgType: 'desconocido' as const,
      contractType: item.job_type ?? '',
      salaryMin: salary.min,
      salaryMax: salary.max,
      currency: salary.currency,
      description,
      url: item.url,
      tags: [...(item.tags ?? []), item.category].filter(Boolean),
      publishedAt: timestamp(item.publication_date),
      fetchedAt: Date.now(),
    };
  });
}

interface JobicyItem {
  id: number;
  url: string;
  jobTitle: string;
  companyName: string;
  jobGeo: string;
  jobLevel: string;
  jobType: string;
  annualSalaryMin: number;
  annualSalaryMax: number;
  salaryCurrency: string;
  jobExcerpt: string;
  jobDescription: string;
  pubDate: string;
  jobIndustry: string[] | string;
}

async function fetchJobicy(): Promise<Job[]> {
  const payload = await getJson<{ jobs: JobicyItem[] }>(
    'https://jobicy.com/api/v2/remote-jobs?count=50',
  );
  return (payload.jobs ?? []).map((item) => ({
    id: `jobicy-${item.id}`,
    source: 'jobicy' as const,
    title: item.jobTitle,
    company: item.companyName,
    location: item.jobGeo || 'Remoto',
    workMode: 'remote' as const,
    orgType: 'desconocido' as const,
    contractType: item.jobType ?? '',
    salaryMin: item.annualSalaryMin || null,
    salaryMax: item.annualSalaryMax || null,
    currency: item.salaryCurrency || 'USD',
    description: htmlToText(item.jobDescription || item.jobExcerpt),
    url: item.url,
    tags: Array.isArray(item.jobIndustry) ? item.jobIndustry : [item.jobIndustry].filter(Boolean),
    publishedAt: timestamp(item.pubDate),
    fetchedAt: Date.now(),
  }));
}

const CONNECTORS: Partial<Record<SourceId, { run: () => Promise<Job[]> }>> = {
  arbeitnow: { run: fetchArbeitnow },
  remotive: { run: fetchRemotive },
  jobicy: { run: fetchJobicy },
};

export const REMOTE_SOURCES: Array<{ id: SourceId; label: string; note: string }> = [
  { id: 'arbeitnow', label: 'Arbeitnow', note: 'Ofertas europeas, muchas en Alemania.' },
  { id: 'remotive', label: 'Remotive', note: 'Remoto internacional, en inglés.' },
  { id: 'jobicy', label: 'Jobicy', note: 'Remoto internacional, sobre todo tech.' },
];

export function dedupeJobs(jobs: Job[]): Job[] {
  const seen = new Map<string, Job>();
  for (const job of jobs) {
    const key = `${normalize(job.title)}|${normalize(job.company)}`;
    const current = seen.get(key);
    if (!current || (job.publishedAt ?? 0) > (current.publishedAt ?? 0)) {
      seen.set(key, job);
    }
  }
  return [...seen.values()];
}

export function demoJobsFor(criteria: { includeDemo: boolean }): Job[] {
  if (!criteria.includeDemo) return [];
  return DEMO_JOBS.map((job) => ({ ...job, fetchedAt: Date.now() }));
}

/**
 * Descarga las fuentes activas en paralelo. Nunca lanza: devuelve los errores
 * para que la UI pueda explicar qué fuente falló sin romper la experiencia.
 */
export async function fetchRemoteJobs(
  enabledSources: SourceId[],
  options: { force?: boolean } = {},
): Promise<FetchResult> {
  const active = enabledSources.filter((source) => CONNECTORS[source]);
  const cache = readJobsCache();
  const now = Date.now();
  // La caché solo vale si se generó con exactamente las mismas fuentes.
  const cacheMatches =
    cache !== null &&
    cache.sources.length === active.length &&
    active.every((source) => cache.sources.includes(source));
  if (!options.force && cacheMatches && cache && now - cache.fetchedAt < CACHE_TTL) {
    return {
      jobs: cache.jobs as Job[],
      errors: [],
      fetchedAt: cache.fetchedAt,
      fromCache: true,
    };
  }

  const errors: SourceError[] = [];
  const batches = await Promise.allSettled(
    active.map((source) => (CONNECTORS[source] as { run: () => Promise<Job[]> }).run()),
  );

  const jobs: Job[] = [];
  batches.forEach((batch, index) => {
    const source = active[index];
    if (batch.status === 'fulfilled') {
      jobs.push(...batch.value);
    } else {
      const message =
        batch.reason instanceof Error ? batch.reason.message : 'No se pudo conectar con la fuente.';
      errors.push({ source, message });
    }
  });

  if (!jobs.length) {
    // Si todo falla, reutilizamos la última caché de estas mismas fuentes.
    const cached = cache && cacheMatches ? (cache.jobs as Job[]) : [];
    if (cached.length) {
      return {
        jobs: cached,
        errors,
        fetchedAt: cache?.fetchedAt ?? now,
        fromCache: true,
      };
    }
  }

  const deduped = dedupeJobs(jobs);
  if (deduped.length) writeJobsCache(Date.now(), deduped, active);
  return { jobs: deduped, errors, fetchedAt: Date.now(), fromCache: false };
}

export interface ManualJobInput {
  title: string;
  company: string;
  location: string;
  url: string;
  description: string;
  workMode: Job['workMode'];
  contractType: string;
}

export function createManualJob(input: ManualJobInput): Job {
  const salary = parseSalary(`${input.title} ${input.description}`);
  return {
    id: uid('manual'),
    source: 'manual',
    title: input.title.trim() || 'Oferta sin título',
    company: input.company.trim() || 'Empresa sin especificar',
    location: input.location.trim() || 'Sin ubicación',
    workMode: input.workMode,
    orgType: 'desconocido',
    contractType: input.contractType,
    salaryMin: salary.min,
    salaryMax: salary.max,
    currency: salary.currency,
    description: input.description.trim(),
    url: input.url.trim(),
    tags: [],
    publishedAt: Date.now(),
    fetchedAt: Date.now(),
  };
}
