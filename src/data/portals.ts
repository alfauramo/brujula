export interface Portal {
  id: string;
  name: string;
  note: string;
  build: (query: string, location: string) => string;
  staticUrl?: string;
}

const q = (value: string) => encodeURIComponent(value.trim());
const l = (value: string) => encodeURIComponent(value.trim());

export const PORTALS: Portal[] = [
  {
    id: 'infojobs',
    name: 'InfoJobs',
    note: 'El portal generalista con más volumen en España.',
    build: (query, location) =>
      `https://www.infojobs.net/ofertas-trabajo?keyword=${q(query)}${location ? `&location=${l(location)}` : ''}`,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn Jobs',
    note: 'Filtra por las últimas 24 h y activa alertas.',
    build: (query, location) =>
      `https://www.linkedin.com/jobs/search/?keywords=${q(query)}&location=${l(location)}&f_TPR=r604800`,
  },
  {
    id: 'indeed',
    name: 'Indeed',
    note: 'Buen cobertura de pymes y entidades locales.',
    build: (query, location) => `https://es.indeed.com/jobs?q=${q(query)}&l=${l(location)}&fromage=7`,
  },
  {
    id: 'googlejobs',
    name: 'Google Empleo',
    note: 'Agrega muchos portales a la vez.',
    build: (query, location) =>
      `https://www.google.com/search?q=${q(`${query} ${location}`)}&ibp=htl;jobs&hl=es`,
  },
  {
    id: 'milanuncios',
    name: 'Milanuncios',
    note: 'Ofertas pequeñas, academias y centros locales.',
    build: (query) => `https://www.milanuncios.com/ofertas-de-empleo/?s=${q(query)}`,
  },
  {
    id: 'empleate',
    name: 'Empléate (SEPE)',
    note: 'Oferta pública y programas de empleo.',
    build: (query) => `https://www.empleate.gob.es/empleo/#/buscar?texto=${q(query)}`,
  },
  {
    id: 'copmadrid',
    name: 'COP Madrid · Empleo',
    note: 'Bolsa de trabajo del Colegio Oficial de Psicólogos.',
    build: () => 'https://www.copmadrid.org/web/empleo',
    staticUrl: 'https://www.copmadrid.org/web/empleo',
  },
  {
    id: 'remoteok',
    name: 'Remote OK',
    note: 'Puestos remotos internacionales, sobre todo tech.',
    build: (query) => `https://remoteok.com/remote-jobs?search=${q(query)}`,
  },
  {
    id: 'wwr',
    name: 'We Work Remotely',
    note: 'Remoto en inglés; útil para perfiles digitales.',
    build: (query) => `https://weworkremotely.com/remote-jobs/search?term=${q(query)}`,
  },
  {
    id: 'eures',
    name: 'EURES',
    note: 'Movilidad laboral dentro de la Unión Europea.',
    build: () => 'https://eures.europa.eu/index_es',
    staticUrl: 'https://eures.europa.eu/index_es',
  },
];

export function portalById(id: string): Portal | undefined {
  return PORTALS.find((portal) => portal.id === id);
}

export interface SearchLink {
  id: string;
  role: string;
  location: string;
  portal: Portal;
  url: string;
}

export function buildSearchLinks(
  roles: string[],
  locations: string[],
  portalIds: string[],
  max = 12,
): SearchLink[] {
  const safeRoles = roles.length ? roles : [''];
  const safeLocations = locations.length ? locations : [''];
  const portals = PORTALS.filter((portal) => portalIds.includes(portal.id));
  const links: SearchLink[] = [];
  for (const role of safeRoles) {
    for (const location of safeLocations) {
      for (const portal of portals) {
        if (links.length >= max) return links;
        links.push({
          id: `${portal.id}-${role}-${location}`,
          role,
          location,
          portal,
          url: portal.build(role, location),
        });
      }
    }
  }
  return links;
}
