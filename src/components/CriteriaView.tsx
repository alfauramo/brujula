import { useMemo } from 'react';
import type { Criteria, Decision, Job, Profile } from '../types';
import { evaluateJob, filterReason } from '../lib/match';
import { buildSearchLinks } from '../data/portals';
import { packById } from '../data/packs';
import { CriteriaForm } from './CriteriaForm';
import { Icon } from './ui';

export function CriteriaView({
  criteria,
  profile,
  jobs,
  decisions,
  onUpdate,
  onGoOffers,
  notify,
}: {
  criteria: Criteria;
  profile: Profile;
  jobs: Job[];
  decisions: Record<string, Decision>;
  onUpdate: (next: Criteria) => void;
  onGoOffers: () => void;
  notify: (message: string, kind?: 'success' | 'error' | 'info') => void;
}) {
  const stats = useMemo(() => {
    let visible = 0;
    let excellent = 0;
    let hidden = 0;
    for (const job of jobs) {
      if (decisions[job.id]?.state === 'descartada') continue;
      if (filterReason(job, criteria)) {
        hidden += 1;
        continue;
      }
      visible += 1;
      if (evaluateJob(job, profile, criteria).score >= 75) excellent += 1;
    }
    return { visible, excellent, hidden };
  }, [jobs, criteria, profile, decisions]);

  const portals = packById(criteria.sectorPack).portals;
  const links = buildSearchLinks(criteria.roles, criteria.locations, portals, 6);

  return (
    <div className="view">
      <header className="view-header">
        <div>
          <p className="eyebrow">Criterios</p>
          <h1>Afina la búsqueda</h1>
          <p className="view-subtitle">
            Cada cambio se aplica al instante. Ahora mismo verías {stats.visible} ofertas, {stats.excellent} con encaje alto.
          </p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn btn-primary" onClick={onGoOffers}>
            <Icon name="compass" size={16} /> Ver ofertas
          </button>
        </div>
      </header>

      <div className="criteria-layout">
        <div className="card">
          <CriteriaForm value={criteria} onChange={onUpdate} />
        </div>

        <aside className="criteria-aside">
          <section className="card card-soft">
            <h2>Impacto ahora mismo</h2>
            <div className="mini-stats">
              <div><strong>{stats.visible}</strong><span>ofertas visibles</span></div>
              <div><strong>{stats.excellent}</strong><span>con encaje alto</span></div>
              <div><strong>{stats.hidden}</strong><span>ocultas por filtros</span></div>
            </div>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => {
                onUpdate({
                  ...criteria,
                  exclude: [],
                  blockedCompanies: [],
                  strictFilters: false,
                  minSalary: null,
                });
                notify('Filtros relajados. Ahora verás más ofertas.', 'info');
              }}
            >
              <Icon name="refresh" size={14} /> Relajar filtros
            </button>
          </section>

          <section className="card card-soft">
            <h2>Portales recomendados</h2>
            <p className="fine-print">Búsquedas ya preparadas con tus roles y ubicaciones.</p>
            <ul className="simple-links">
              {links.map((link) => (
                <li key={link.id}>
                  <a href={link.url} target="_blank" rel="noopener noreferrer">
                    <span>{link.portal.name}</span>
                    <small>{link.role}{link.location ? ` · ${link.location}` : ''}</small>
                    <Icon name="external" size={13} />
                  </a>
                </li>
              ))}
            </ul>
          </section>

          <section className="card card-soft">
            <h2>Cómo se calcula el encaje</h2>
            <ul className="weight-list">
              <li><span>Relevancia del puesto y tu CV</span><strong>40%</strong></li>
              <li><span>Ubicación y modalidad</span><strong>15%</strong></li>
              <li><span>Tipo de entidad</span><strong>10%</strong></li>
              <li><span>Nivel de experiencia</span><strong>10%</strong></li>
              <li><span>Salario</span><strong>10%</strong></li>
              <li><span>Frescura de la oferta</span><strong>10%</strong></li>
              <li><span>Idioma</span><strong>5%</strong></li>
            </ul>
            <p className="fine-print">
              Los requisitos imprescindibles pesan el doble. Si no aparece ninguno, el encaje se reduce a la mitad.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
