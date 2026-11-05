export interface SkillEntry {
  label: string;
  aliases: string[];
  groups: Array<'psicologia' | 'tecnologia' | 'general'>;
}

/**
 * Léxico abierto y fácil de ampliar. Cada entrada tiene variantes en español
 * e inglés para que el análisis del CV no dependa de una redacción exacta.
 */
export const SKILLS: SkillEntry[] = [
  // Psicología / salud mental
  { label: 'Terapia cognitivo-conductual', aliases: ['cognitivo-conductual', 'cognitivo conductual', 'tcc', 'cbt'], groups: ['psicologia'] },
  { label: 'Evaluación psicológica', aliases: ['evaluación psicológica', 'psicodiagnóstico', 'psicodiagnostico', 'tests psicométricos'], groups: ['psicologia'] },
  { label: 'Psicología clínica', aliases: ['psicología clínica', 'psicologia clinica', 'psicólogo clínico', 'psicólogo sanitario'], groups: ['psicologia'] },
  { label: 'Psicología educativa', aliases: ['psicología educativa', 'psicopedagogía', 'orientación educativa'], groups: ['psicologia'] },
  { label: 'Psicología social', aliases: ['psicología social', 'intervención social', 'intervencion social'], groups: ['psicologia'] },
  { label: 'Intervención en crisis', aliases: ['intervención en crisis', 'primeros auxilios psicológicos', 'urgencias'], groups: ['psicologia'] },
  { label: 'Terapia familiar', aliases: ['terapia familiar', 'terapia sistémica', 'sistémica'], groups: ['psicologia'] },
  { label: 'Terapia de pareja', aliases: ['terapia de pareja', 'terapia sexual'], groups: ['psicologia'] },
  { label: 'Infancia y adolescencia', aliases: ['infancia', 'adolescencia', 'infantojuvenil', 'infanto-juvenil', 'menores'], groups: ['psicologia'] },
  { label: 'Neuropsicología', aliases: ['neuropsicología', 'neuropsicologia', 'deterioro cognitivo', 'alzhéimer', 'alzheimer'], groups: ['psicologia'] },
  { label: 'Trastornos del espectro autista', aliases: ['autismo', 'tea', 'asperger'], groups: ['psicologia'] },
  { label: 'Violencia de género', aliases: ['violencia de género', 'violencia machista', 'víctimas'], groups: ['psicologia'] },
  { label: 'Adicciones', aliases: ['adicciones', 'drogodependencias', 'prevención de drogas'], groups: ['psicologia'] },
  { label: 'Mindfulness', aliases: ['mindfulness', 'atención plena', 'meditación'], groups: ['psicologia'] },
  { label: 'Habilidades sociales', aliases: ['habilidades sociales', 'entrenamiento en habilidades'], groups: ['psicologia', 'general'] },
  { label: 'Orientación laboral', aliases: ['orientación laboral', 'inserción laboral', 'empleabilidad'], groups: ['psicologia', 'general'] },
  { label: 'Recursos humanos', aliases: ['recursos humanos', 'selección de personal', 'reclutamiento', 'rrhh'], groups: ['psicologia', 'general'] },
  { label: 'Formación y docencia', aliases: ['formación', 'docencia', 'talleres', 'capacitación'], groups: ['psicologia', 'general'] },
  { label: 'Investigación', aliases: ['investigación', 'research', 'publicaciones', 'metodología'], groups: ['psicologia', 'general'] },
  { label: 'Informes y registro clínico', aliases: ['informes', 'historia clínica', 'registro clínico'], groups: ['psicologia'] },
  { label: 'Coordinación de equipos', aliases: ['coordinación de equipos', 'coordinación', 'supervisión de equipo', 'gestión de equipos'], groups: ['psicologia', 'general'] },

  // Tecnología
  { label: 'JavaScript', aliases: ['javascript', 'js', 'es6'], groups: ['tecnologia'] },
  { label: 'TypeScript', aliases: ['typescript', 'ts'], groups: ['tecnologia'] },
  { label: 'React', aliases: ['react', 'react.js', 'reactjs'], groups: ['tecnologia'] },
  { label: 'Node.js', aliases: ['node', 'node.js', 'nodejs'], groups: ['tecnologia'] },
  { label: 'Python', aliases: ['python'], groups: ['tecnologia'] },
  { label: 'SQL', aliases: ['sql', 'postgresql', 'mysql', 'sqlite'], groups: ['tecnologia'] },
  { label: 'AWS', aliases: ['aws', 'amazon web services'], groups: ['tecnologia'] },
  { label: 'Docker', aliases: ['docker', 'contenedores'], groups: ['tecnologia'] },
  { label: 'Git', aliases: ['git', 'github', 'gitlab'], groups: ['tecnologia'] },
  { label: 'Figma', aliases: ['figma', 'sketch', 'prototipado'], groups: ['tecnologia'] },
  { label: 'Diseño UX/UI', aliases: ['ux', 'ui', 'diseño de producto', 'experiencia de usuario'], groups: ['tecnologia'] },
  { label: 'Análisis de datos', aliases: ['análisis de datos', 'data analysis', 'power bi', 'tableau', 'pandas'], groups: ['tecnologia', 'general'] },
  { label: 'Scrum / Agile', aliases: ['scrum', 'agile', 'kanban', 'metodologías ágiles'], groups: ['tecnologia', 'general'] },
  { label: 'Automatización de pruebas', aliases: ['testing', 'jest', 'cypress', 'playwright', 'qa'], groups: ['tecnologia'] },

  // Transversales
  { label: 'Excel / Ofimática', aliases: ['excel', 'ofimática', 'office', 'google workspace'], groups: ['general', 'psicologia', 'tecnologia'] },
  { label: 'Comunicación', aliases: ['comunicación', 'comunicación oral', 'presentaciones'], groups: ['general', 'psicologia'] },
  { label: 'Trabajo en equipo', aliases: ['trabajo en equipo', 'colaboración'], groups: ['general', 'psicologia'] },
  { label: 'Gestión de proyectos', aliases: ['gestión de proyectos', 'project management', 'jira', 'asana', 'notion'], groups: ['general', 'tecnologia'] },
  { label: 'Atención al cliente', aliases: ['atención al cliente', 'customer service', 'atención telefónica'], groups: ['general'] },
  { label: 'Inglés', aliases: ['inglés', 'english'], groups: ['general', 'psicologia', 'tecnologia'] },
  { label: 'Marketing digital', aliases: ['marketing digital', 'seo', 'sem', 'redes sociales', 'google analytics'], groups: ['general', 'tecnologia'] },
  { label: 'Contabilidad', aliases: ['contabilidad', 'facturación', 'nóminas'], groups: ['general'] },
];

export const ROLE_LEXICON: string[] = [
  'psicólogo/a',
  'psicólogo clínico',
  'psicólogo sanitario',
  'psicólogo educativo',
  'psicoterapeuta',
  'neuropsicólogo/a',
  'orientador/a laboral',
  'técnico/a de recursos humanos',
  'técnico/a de selección',
  'people partner',
  'recruiter',
  'frontend developer',
  'backend developer',
  'full stack developer',
  'data analyst',
  'product designer',
  'project manager',
  'administrativo/a',
  'atención al cliente',
  'marketing digital',
  'formador/a',
  'investigador/a',
  'coordinador/a de proyectos',
];

export interface LanguageMatch {
  label: string;
  level: string;
}

const LANGUAGE_NAMES: Array<[string, RegExp]> = [
  ['Inglés', /ingl[eé]s|english/i],
  ['Francés', /franc[eé]s|french/i],
  ['Alemán', /alem[aá]n|german|deutsch/i],
  ['Italiano', /italiano/i],
  ['Portugués', /portugu[eé]s/i],
  ['Catalán', /catal[aá]n/i],
  ['Euskera', /euskera|vascuence/i],
  ['Gallego', /gallego/i],
  ['Árabe', /[aá]rabe/i],
  ['Chino', /chino|mandar[ií]n/i],
];

const LEVELS = /\b(a1|a2|b1|b2|c1|c2|nativo|nativa|biling[uü]e|intermedio|avanzado|fluido)\b/i;

function formatLevel(level: string): string {
  const lower = level.toLowerCase();
  if (lower === 'nativo' || lower === 'nativa') return 'nativo';
  if (lower.startsWith('biling')) return 'bilingüe';
  return level.toUpperCase();
}

export function findLanguages(text: string): string[] {
  const found: string[] = [];
  for (const [name, pattern] of LANGUAGE_NAMES) {
    const match = pattern.exec(text);
    if (!match) continue;
    // Solo miramos el nivel que sigue al idioma: "Inglés C1 · Francés B1" no debe
    // heredar el C1 del inglés.
    const after = text.slice(match.index + match[0].length, match.index + match[0].length + 30);
    const level = after.match(LEVELS)?.[1];
    found.push(level ? `${name} (${formatLevel(level)})` : name);
  }
  return found.slice(0, 6);
}
