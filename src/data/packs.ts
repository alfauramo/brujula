import type { OrgType, SectorPackId } from '../types';

export interface SectorPack {
  id: SectorPackId;
  label: string;
  tagline: string;
  roles: string[];
  keywords: string[];
  orgTypes: OrgType[];
  portals: string[];
  cvSignals: string[];
}

export const PACKS: Record<SectorPackId, SectorPack> = {
  psicologia: {
    id: 'psicologia',
    label: 'Psicología y salud mental',
    tagline: 'Clínica, educativa, social, asociaciones y fundaciones.',
    roles: ['psicólogo/a', 'psicólogo/a sanitario/a', 'psicólogo/a educativo/a', 'orientador/a laboral'],
    keywords: [
      'psicología',
      'salud mental',
      'intervención',
      'evaluación',
      'terapia',
      'acompañamiento',
      'asociación',
      'fundación',
      'clínico',
      'educativo',
      'social',
    ],
    orgTypes: ['asociacion', 'fundacion', 'sanitario', 'educativo', 'publico', 'empresa'],
    portals: ['infojobs', 'linkedin', 'indeed', 'googlejobs', 'copmadrid', 'milanuncios', 'empleate'],
    cvSignals: ['psicolog', 'psicoterap', 'terapia', 'clinico', 'salud mental', 'cognitivo-conductual'],
  },
  tecnologia: {
    id: 'tecnologia',
    label: 'Tecnología y producto',
    tagline: 'Desarrollo, datos, diseño y roles remotos.',
    roles: ['frontend developer', 'backend developer', 'full stack developer', 'data analyst', 'product designer'],
    keywords: ['react', 'typescript', 'javascript', 'python', 'sql', 'aws', 'docker', 'figma', 'producto'],
    orgTypes: ['empresa', 'fundacion', 'publico'],
    portals: ['linkedin', 'infojobs', 'indeed', 'googlejobs', 'remoteok', 'wwr'],
    cvSignals: ['javascript', 'typescript', 'react', 'python', 'sql', 'desarrollo', 'software', 'figma'],
  },
  general: {
    id: 'general',
    label: 'Generalista',
    tagline: 'Administración, atención al cliente, proyectos y más.',
    roles: ['administrativo/a', 'atención al cliente', 'gestor/a de proyectos', 'marketing digital'],
    keywords: ['atención al cliente', 'administración', 'gestión', 'proyectos', 'ofimática', 'marketing'],
    orgTypes: ['empresa', 'fundacion', 'publico', 'asociacion'],
    portals: ['infojobs', 'linkedin', 'indeed', 'googlejobs', 'milanuncios', 'empleate', 'eures'],
    cvSignals: [],
  },
};

export const PACK_LIST: SectorPack[] = [PACKS.psicologia, PACKS.tecnologia, PACKS.general];

export function packById(id: SectorPackId): SectorPack {
  return PACKS[id] ?? PACKS.general;
}
