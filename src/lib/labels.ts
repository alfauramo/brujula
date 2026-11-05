import type { JobState, OrgType, Seniority, WorkMode } from '../types';

export const WORK_MODE_LABEL: Record<WorkMode, string> = {
  onsite: 'Presencial',
  hybrid: 'Híbrido',
  remote: 'Remoto',
};

export const ORG_LABEL: Record<OrgType, string> = {
  asociacion: 'Asociación',
  fundacion: 'Fundación',
  publico: 'Administración pública',
  sanitario: 'Sanitario',
  educativo: 'Educativo',
  empresa: 'Empresa',
  desconocido: 'Sin clasificar',
};

export const STATE_LABEL: Record<JobState, string> = {
  guardada: 'Guardada',
  aplicada: 'Aplicada',
  entrevista: 'Entrevista',
  oferta: 'Oferta',
  descartada: 'Descartada',
};

export const STATE_ORDER: JobState[] = ['guardada', 'aplicada', 'entrevista', 'oferta', 'descartada'];

export const SENIORITY_LABEL: Record<Seniority, string> = {
  any: 'Cualquier nivel',
  practicas: 'Prácticas / primer empleo',
  junior: 'Junior (0–2 años)',
  mid: 'Intermedio (2–5 años)',
  senior: 'Senior (+5 años)',
};

export const CONTRACT_TYPES = [
  'Jornada completa',
  'Media jornada',
  'Temporal',
  'Prácticas',
  'Freelance',
] as const;

export const SOURCE_LABEL: Record<string, string> = {
  demo: 'Ejemplo',
  arbeitnow: 'Arbeitnow',
  remotive: 'Remotive',
  jobicy: 'Jobicy',
  manual: 'Añadida a mano',
};
