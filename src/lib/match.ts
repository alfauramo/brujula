import type {
  Criteria,
  Decision,
  Job,
  JobState,
  MatchLabel,
  MatchReason,
  MatchResult,
  OrgType,
  Profile,
  Seniority,
} from '../types';
import { ORG_LABEL } from './labels';
import { daysSince } from './dates';
import { normalize, parseSalary, termMatches, unique } from './text';

const ORG_RULES: Array<{ type: OrgType; patterns: RegExp[] }> = [
  {
    type: 'asociacion',
    patterns: [/asociaci[oó]n/i, /\bentidad social\b/i, /\btercer sector\b/i, /\bcolectivo\b/i],
  },
  {
    type: 'fundacion',
    patterns: [/fundaci[oó]n/i, /\bong\b/i, /\bfundacion\b/i, /\bcruz roja\b/i, /\bc[aá]ritas\b/i],
  },
  {
    type: 'publico',
    patterns: [
      /ayuntamiento/i,
      /diputaci[oó]n/i,
      /consejer[ií]a/i,
      /ministerio/i,
      /administraci[oó]n p[uú]blica/i,
      /servicios sociales/i,
      /empleo p[uú]blico/i,
    ],
  },
  {
    type: 'sanitario',
    patterns: [/hospital/i, /cl[ií]nica/i, /centro de salud/i, /sanitari/i, /urgencias/i, /unidad de psiquiatr/i],
  },
  {
    type: 'educativo',
    patterns: [/colegio/i, /escuela/i, /instituto/i, /universidad/i, /educativ/i, /academia/i, /gabinete/i],
  },
  {
    type: 'empresa',
    patterns: [/s\.l\./i, /s\.a\./i, /\bconsultora\b/i, /\bstartup\b/i, /\bgrupo\b/i, /\bempresa\b/i, /\binc\b/i, /\blabs\b/i],
  },
];

const ENGLISH_MARKERS = [
  'the', 'and', 'with', 'for', 'our', 'you', 'will', 'team', 'experience', 'requirements',
  'responsibilities', 'skills', 'about', 'this', 'are', 'your', 'have', 'from', 'work',
];

const SPANISH_MARKERS = [
  'de', 'la', 'que', 'con', 'para', 'los', 'las', 'una', 'del', 'por', 'como', 'más',
  'buscamos', 'funciones', 'requisitos', 'experiencia', 'equipo', 'puesto', 'jornada',
];

export function inferOrgType(job: Pick<Job, 'company' | 'description' | 'tags'>): OrgType {
  const strong = normalize(`${job.company} ${job.tags.join(' ')}`);
  for (const rule of ORG_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(strong))) return rule.type;
  }
  const weak = normalize(job.description.slice(0, 1200));
  for (const rule of ORG_RULES) {
    if (rule.patterns.some((pattern) => pattern.test(weak))) return rule.type;
  }
  return 'desconocido';
}

export function inferWorkMode(job: Pick<Job, 'workMode' | 'description'>): Job['workMode'] {
  if (job.workMode !== 'unknown') return job.workMode;
  const text = normalize(job.description);
  if (/\b(100% remoto|teletrabajo|remoto|remote-first|fully remote)\b/.test(text)) return 'remote';
  if (/\b(h[ií]brido|hybrid|d[ií]as? en remoto|d[ií]as? de teletrabajo)\b/.test(text)) return 'hybrid';
  if (/\b(presencial|on-site|en oficina)\b/.test(text)) return 'onsite';
  return 'unknown';
}

export function inferSeniority(text: string): Seniority {
  const value = normalize(text);
  if (/\b(pr[aá]cticas|becari[oa]|beca|internship|trainee)\b/.test(value)) return 'practicas';
  if (/\b(junior|sin experiencia|primer empleo|0-2 a[nñ]os)\b/.test(value)) return 'junior';
  if (/\b(senior|lead|principal|\+5 a[nñ]os|5\+ years|direcci[oó]n|head of)\b/.test(value)) return 'senior';
  return 'mid';
}

export function isEnglishText(text: string): boolean {
  const tokens = normalize(text).replace(/[^a-z\s]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 900);
  if (!tokens.length) return false;
  const english = tokens.filter((token) => ENGLISH_MARKERS.includes(token)).length;
  const spanish = tokens.filter((token) => SPANISH_MARKERS.includes(token)).length;
  return english >= 6 && english > spanish * 1.35;
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function labelFor(score: number): MatchLabel {
  if (score >= 80) return 'Excelente';
  if (score >= 65) return 'Bueno';
  if (score >= 45) return 'Posible';
  return 'Bajo';
}

function levelIndex(level: Seniority): number {
  return { practicas: 0, junior: 1, mid: 2, senior: 3, any: 2 }[level];
}

function coverage(text: string, terms: string[]): { ratio: number; hits: string[] } {
  if (!terms.length) return { ratio: -1, hits: [] };
  const hits = terms.filter((term) => termMatches(text, term));
  return { ratio: hits.length / terms.length, hits };
}

export function evaluateJob(job: Job, profile: Profile, criteria: Criteria): MatchResult {
  const text = normalize(
    `${job.title} ${job.company} ${job.location} ${job.tags.join(' ')} ${job.description}`,
  );
  const title = normalize(job.title);
  const reasons: MatchReason[] = [];
  const matched: string[] = [];
  const missing: string[] = [];

  // 1. Relevancia: roles deseados, requisitos, palabras clave y competencias del CV.
  const roleCoverage = coverage(text, criteria.roles);
  const mustCoverage = coverage(text, criteria.mustHave);
  const keywordCoverage = coverage(text, criteria.keywords);
  const cvCoverage = coverage(text, profile.skills.slice(0, 14));

  const relevanceParts: Array<{ ratio: number; weight: number }> = [];
  if (roleCoverage.ratio >= 0) relevanceParts.push({ ratio: roleCoverage.ratio, weight: 1.6 });
  if (mustCoverage.ratio >= 0) relevanceParts.push({ ratio: mustCoverage.ratio, weight: 2.2 });
  if (keywordCoverage.ratio >= 0) relevanceParts.push({ ratio: keywordCoverage.ratio, weight: 1 });
  if (cvCoverage.ratio >= 0) relevanceParts.push({ ratio: cvCoverage.ratio, weight: 0.8 });

  let relevance = relevanceParts.length
    ? relevanceParts.reduce((sum, part) => sum + part.ratio * part.weight, 0) /
      relevanceParts.reduce((sum, part) => sum + part.weight, 0)
    : 0.6;

  const titleHit = criteria.roles.some((role) => termMatches(title, role));
  if (titleHit) relevance = clamp01(relevance + 0.18);

  if (roleCoverage.hits.length) {
    matched.push(...roleCoverage.hits);
    reasons.push({ kind: 'plus', label: 'Puesto relacionado', detail: roleCoverage.hits.slice(0, 3).join(' · ') });
  } else if (criteria.roles.length) {
    missing.push(...criteria.roles);
    reasons.push({ kind: 'minus', label: 'El puesto no coincide con los roles que buscas' });
  }

  if (mustCoverage.ratio >= 0) {
    if (mustCoverage.ratio === 0) {
      relevance *= 0.45;
      reasons.push({
        kind: 'minus',
        label: 'No contiene ninguno de tus requisitos imprescindibles',
        detail: criteria.mustHave.slice(0, 4).join(' · '),
      });
    } else {
      matched.push(...mustCoverage.hits);
      reasons.push({
        kind: 'plus',
        label: `Cumple ${mustCoverage.hits.length} de ${criteria.mustHave.length} requisitos imprescindibles`,
        detail: mustCoverage.hits.slice(0, 4).join(' · '),
      });
      const absent = criteria.mustHave.filter((term) => !mustCoverage.hits.includes(term));
      if (absent.length) {
        missing.push(...absent);
        reasons.push({ kind: 'minus', label: 'Requisito sin rastro en la oferta', detail: absent.slice(0, 3).join(' · ') });
      }
    }
  }

  if (keywordCoverage.hits.length) {
    matched.push(...keywordCoverage.hits);
    reasons.push({
      kind: 'plus',
      label: 'Coincide con tus palabras clave',
      detail: keywordCoverage.hits.slice(0, 5).join(' · '),
    });
  }

  if (cvCoverage.hits.length >= 3) {
    matched.push(...cvCoverage.hits);
    reasons.push({
      kind: 'plus',
      label: 'Tu CV encaja aquí',
      detail: `${cvCoverage.hits.length} competencias en común: ${cvCoverage.hits.slice(0, 4).join(', ')}`,
    });
  } else if (cvCoverage.hits.length) {
    matched.push(...cvCoverage.hits);
  }

  if (keywordCoverage.ratio === 0 && criteria.keywords.length) {
    missing.push(...criteria.keywords);
    reasons.push({ kind: 'minus', label: 'No aparecen tus palabras clave principales' });
  }

  // 2. Ubicación y modalidad.
  const mode = inferWorkMode(job);
  const modeScore = mode === 'unknown' ? 0.6 : criteria.workModes.includes(mode) ? 1 : 0.1;
  const normalizedLocation = normalize(job.location);
  const locationHit = criteria.locations.some((location) => termMatches(normalizedLocation, location));
  let locationScore = 0.7;
  if (criteria.locations.length) {
    locationScore = locationHit ? 1 : mode === 'remote' ? 0.85 : 0.2;
  } else if (mode === 'remote') {
    locationScore = 0.9;
  }
  const locationMode = 0.55 * modeScore + 0.45 * locationScore;

  if (mode !== 'unknown') {
    const label = { remote: 'Remoto', hybrid: 'Híbrido', onsite: 'Presencial' }[mode];
    const wanted = criteria.workModes.includes(mode);
    reasons.push({
      kind: wanted ? 'plus' : 'minus',
      label: wanted ? `${label}: encaja con tu preferencia` : `${label} · tú buscas ${criteria.workModes.map((m) => ({ remote: 'remoto', hybrid: 'híbrido', onsite: 'presencial' })[m]).join(' o ')}`,
    });
  } else {
    reasons.push({ kind: 'info', label: 'La oferta no indica la modalidad' });
  }

  if (criteria.locations.length) {
    reasons.push({
      kind: locationHit ? 'plus' : 'info',
      label: locationHit
        ? `Ubicación: ${job.location}`
        : `Ubicada en ${job.location || 'un lugar sin especificar'} · tú buscas ${criteria.locations.join(' o ')}`,
    });
  }

  // 3. Tipo de organización.
  const orgType = job.orgType === 'desconocido' ? inferOrgType(job) : job.orgType;
  const orgScore =
    !criteria.orgTypes.length || orgType === 'desconocido'
      ? 0.75
      : criteria.orgTypes.includes(orgType)
        ? 1
        : 0.12;
  if (orgType !== 'desconocido') {
    reasons.push({
      kind: criteria.orgTypes.includes(orgType) || !criteria.orgTypes.length ? 'plus' : 'minus',
      label: `${ORG_LABEL[orgType]}${criteria.orgTypes.includes(orgType) || !criteria.orgTypes.length ? ': encaja con el tipo de entidad que buscas' : ' · tú buscas otro tipo de entidad'}`,
    });
  }

  // 4. Nivel de experiencia.
  const jobLevel = inferSeniority(`${job.title} ${job.description}`);
  const profileYears = profile.yearsExperience ?? 0;
  let seniorityScore = 0.75;
  if (criteria.seniority !== 'any') {
    const distance = Math.abs(levelIndex(jobLevel) - levelIndex(criteria.seniority));
    seniorityScore = distance === 0 ? 1 : distance === 1 ? 0.55 : 0.2;
  } else if (jobLevel === 'practicas' && profileYears >= 2) {
    seniorityScore = 0.25;
    reasons.push({ kind: 'minus', label: 'Es un puesto de prácticas y tu perfil tiene más recorrido' });
  } else if (jobLevel === 'senior' && profileYears > 0 && profileYears < 3) {
    seniorityScore = 0.35;
    reasons.push({ kind: 'minus', label: 'Piden un perfil sénior y tu experiencia es más reciente' });
  }

  // 5. Salario.
  const detected = parseSalary(job.description);
  const salaryMin = job.salaryMin ?? detected.min;
  const salaryMax = job.salaryMax ?? detected.max;
  const salaryCurrency = job.currency || detected.currency;
  let salaryScore = 0.7;
  if (criteria.minSalary) {
    if (!salaryMin && !salaryMax) {
      salaryScore = 0.5;
      reasons.push({ kind: 'info', label: 'No indica salario; habrá que preguntar' });
    } else if (salaryCurrency !== criteria.currency) {
      salaryScore = 0.6;
      reasons.push({ kind: 'info', label: `Salario en ${salaryCurrency}; tu mínimo está en ${criteria.currency}` });
    } else {
      const top = salaryMax ?? salaryMin ?? 0;
      const bottom = salaryMin ?? salaryMax ?? 0;
      if (top >= criteria.minSalary) {
        salaryScore = bottom >= criteria.minSalary ? 1 : 0.8;
        reasons.push({
          kind: 'plus',
          label: `Salario por encima de tu mínimo (${Math.round(top / 1000)}k ${salaryCurrency === 'USD' ? '$' : '€'})`,
        });
      } else {
        salaryScore = clamp01(top / criteria.minSalary) * 0.7;
        reasons.push({
          kind: 'minus',
          label: `Salario por debajo de tu mínimo (${Math.round(top / 1000)}k ${salaryCurrency === 'USD' ? '$' : '€'})`,
        });
      }
    }
  } else if (salaryMin || salaryMax) {
    reasons.push({
      kind: 'info',
      label: `Salario orientativo: ${Math.round((salaryMax ?? salaryMin ?? 0) / 1000)}k ${salaryCurrency === 'USD' ? '$' : '€'}`,
    });
  }

  // 6. Frescura.
  const age = daysSince(job.publishedAt);
  let freshness = 0.5;
  if (Number.isFinite(age)) {
    freshness = clamp01(1 - age / Math.max(criteria.maxAgeDays, 14));
    if (age <= 3) reasons.push({ kind: 'plus', label: 'Publicada hace muy poco' });
    else if (age > 21) reasons.push({ kind: 'minus', label: 'Lleva más de tres semanas publicada' });
  }

  // 7. Idioma.
  const englishJob = isEnglishText(job.description);
  const knowsEnglish = profile.languages.some((language) => /ingl[eé]s|english/i.test(language));
  const languageScore = !englishJob ? 0.8 : knowsEnglish ? 0.95 : 0.3;
  if (englishJob) {
    reasons.push({
      kind: knowsEnglish ? 'plus' : 'minus',
      label: knowsEnglish ? 'Oferta en inglés: tu CV lo acredita' : 'Oferta en inglés y no consta nivel en tu CV',
    });
  }

  const parts: Array<{ value: number; weight: number }> = [
    { value: relevance, weight: 0.4 },
    { value: locationMode, weight: 0.15 },
    { value: orgScore, weight: 0.1 },
    { value: seniorityScore, weight: 0.1 },
    { value: salaryScore, weight: 0.1 },
    { value: freshness, weight: 0.1 },
    { value: languageScore, weight: 0.05 },
  ];
  const score = Math.round(
    parts.reduce((sum, part) => sum + clamp01(part.value) * part.weight, 0) * 100,
  );

  const seen = new Set<string>();
  const uniqueReasons = reasons.filter((reason) => {
    const key = `${reason.kind}|${reason.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return {
    score: Math.min(99, Math.max(0, score)),
    label: labelFor(score),
    reasons: uniqueReasons.slice(0, 9),
    matched: unique(matched).slice(0, 12),
    missing: unique(missing).slice(0, 8),
  };
}

/** Motivos por los que una oferta no debería mostrarse (independientes del score). */
export function filterReason(job: Job, criteria: Criteria): string | null {
  const text = normalize(`${job.title} ${job.company} ${job.description}`);
  const excluded = criteria.exclude.find((term) => termMatches(text, term));
  if (excluded) return `Contiene «${excluded}», que has excluido.`;

  const blocked = criteria.blockedCompanies.find((company) =>
    termMatches(normalize(job.company), company),
  );
  if (blocked) return `Has bloqueado la empresa «${blocked}».`;

  const age = daysSince(job.publishedAt);
  if (Number.isFinite(age) && age > criteria.maxAgeDays) {
    return `Tiene más de ${criteria.maxAgeDays} días.`;
  }

  if (criteria.strictFilters) {
    const mode = inferWorkMode(job);
    if (mode !== 'unknown' && criteria.workModes.length && !criteria.workModes.includes(mode)) {
      return 'La modalidad no está entre tus preferencias.';
    }
    const org = job.orgType === 'desconocido' ? inferOrgType(job) : job.orgType;
    if (org !== 'desconocido' && criteria.orgTypes.length && !criteria.orgTypes.includes(org)) {
      return 'El tipo de entidad no está entre tus preferencias.';
    }
    if (criteria.locations.length) {
      const locationHit = criteria.locations.some((location) =>
        termMatches(normalize(job.location), location),
      );
      if (!locationHit && mode !== 'remote') {
        return 'La ubicación no coincide con la que buscas.';
      }
    }
  }

  return null;
}

export type SortMode = 'match' | 'recent' | 'salary';

export interface ListOptions {
  hideApplied: boolean;
  tab: 'todas' | JobState;
  query: string;
  sort: SortMode;
}

export interface ListedJob {
  job: Job;
  match: MatchResult;
  decision: Decision | undefined;
}

export function listJobs(
  jobs: Job[],
  profile: Profile,
  criteria: Criteria,
  decisions: Record<string, Decision>,
  options: ListOptions,
): ListedJob[] {
  const visible: ListedJob[] = [];
  for (const job of jobs) {
    if (!options.query.trim() && filterReason(job, criteria)) continue;
    const decision = decisions[job.id];
    const state = decision?.state;

    if (options.tab === 'todas') {
      if (state === 'descartada') continue;
      if (options.hideApplied && (state === 'aplicada' || state === 'entrevista' || state === 'oferta')) {
        continue;
      }
    } else if (state !== options.tab) {
      continue;
    }

    if (options.query.trim()) {
      const query = normalize(options.query);
      const haystack = normalize(`${job.title} ${job.company} ${job.location} ${job.tags.join(' ')}`);
      if (!haystack.includes(query)) continue;
    }

    visible.push({ job, match: evaluateJob(job, profile, criteria), decision });
  }

  visible.sort((a, b) => {
    if (options.sort === 'recent') {
      return (b.job.publishedAt ?? 0) - (a.job.publishedAt ?? 0);
    }
    if (options.sort === 'salary') {
      const salaryA = a.job.salaryMax ?? a.job.salaryMin ?? 0;
      const salaryB = b.job.salaryMax ?? b.job.salaryMin ?? 0;
      return salaryB - salaryA;
    }
    return b.match.score - a.match.score;
  });

  return visible;
}
