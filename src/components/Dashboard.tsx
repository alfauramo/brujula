import { useMemo } from 'react';
import type { AppState, Decision, Job, JobState, SourceError } from '../types';
import { evaluateJob, listJobs } from '../lib/match';
import { timeAgo } from '../lib/dates';
import { ORG_LABEL, STATE_LABEL, WORK_MODE_LABEL } from '../lib/labels';
import { buildSearchLinks } from '../data/portals';
import { packById } from '../data/packs';
import { Chip, EmptyState, Icon, ScoreRing } from './ui';

export function Dashboard({
  state,
  jobs,
  decisions,
  onDecision,
  onNavigate,
  onRefresh,
  loading,
  errors,
  fetchedAt,
}: {
  state: AppState;
  jobs: Job[];
  decisions: Record<string, Decision>;
  onDecision: (jobId: string, jobState: JobState, note?: string) => void;
  onNavigate: (view: string) => void;
  onRefresh: () => void;
  loading: boolean;
  errors: SourceError[];
  fetchedAt: number | null;
}) {
  const { profile, criteria } = state;

  const top = useMemo(
    () =>
      listJobs(jobs, profile, criteria, decisions, {
        hideApplied: true,
        tab: 'todas',
        query: '',
        sort: 'match',
      }).slice(0, 3),
    [jobs, profile, criteria, decisions],
  );

  const stats = useMemo(() => {
    const decisionsList = Object.values(decisions);
    const applied = decisionsList.filter((entry) =>
      ['aplicada', 'entrevista', 'oferta'].includes(entry.state),
    ).length;
    const interviews = decisionsList.filter((entry) => entry.state === 'entrevista' || entry.state === 'oferta').length;
    const saved = decisionsList.filter((entry) => entry.state === 'guardada').length;
    let high = 0;
    for (const job of jobs) {
      if (decisions[job.id]?.state === 'descartada') continue;
      if (evaluateJob(job, profile, criteria).score >= 75) high += 1;
    }
    return { applied, interviews, saved, high };
  }, [decisions, jobs, profile, criteria]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches';
  const firstName = profile.name.split(' ')[0] || 'hola';
  const links = buildSearchLinks(criteria.roles, criteria.locations, packById(criteria.sectorPack).portals, 4);
  const checklist = [
    { done: Boolean(profile.cvText || profile.skills.length), label: 'Subir el CV o revisar competencias', view: 'perfil' },
    { done: criteria.roles.length > 0, label: 'Definir qué puestos buscas', view: 'criterios' },
    { done: Object.keys(decisions).length > 0, label: 'Revisar y marcar la primera oferta', view: 'ofertas' },
    { done: stats.applied > 0, label: 'Aplicar a algo que encaje', view: 'ofertas' },
  ];

  return (
    <div className="view">
      <header className="dashboard-hero">
        <div>
          <p className="eyebrow">{greeting}, {firstName}</p>
          <h1>{profile.headline || 'Tu próxima oportunidad está más cerca.'}</h1>
          <p className="view-subtitle">
            {fetchedAt
              ? `Ofertas actualizadas ${timeAgo(fetchedAt)}. `
              : 'Estas son las ofertas de ejemplo mientras conectas las fuentes. '}
            Has aplicado a {stats.applied} {stats.applied === 1 ? 'puesto' : 'puestos'}.
          </p>
          <div className="hero-actions">
            <button type="button" className="btn btn-primary" onClick={() => onNavigate('ofertas')}>
              Ver mis ofertas <Icon name="arrowRight" size={15} />
            </button>
            <button type="button" className="btn btn-ghost" onClick={onRefresh} disabled={loading}>
              <Icon name="refresh" size={15} className={loading ? 'spin' : ''} />
              {loading ? 'Buscando…' : 'Actualizar fuentes'}
            </button>
          </div>
        </div>
        <div className="hero-stats">
          <div><strong>{stats.high}</strong><span>encaje alto</span></div>
          <div><strong>{stats.saved}</strong><span>guardadas</span></div>
          <div><strong>{stats.applied}</strong><span>aplicadas</span></div>
          <div><strong>{stats.interviews}</strong><span>entrevistas</span></div>
        </div>
      </header>

      {errors.length > 0 && (
        <div className="banner banner-warning" role="status">
          <Icon name="alert" size={16} />
          <p>No se pudieron cargar algunas fuentes. Las ofertas en caché siguen disponibles.</p>
        </div>
      )}

      <div className="dashboard-grid">
        <section className="card card-wide">
          <div className="card-header">
            <div>
              <h2>Mejores coincidencias</h2>
              <p className="fine-print">Ordenadas por encaje con tu CV y tus criterios.</p>
            </div>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onNavigate('ofertas')}>
              Ver todas <Icon name="arrowRight" size={14} />
            </button>
          </div>

          {top.length === 0 ? (
            <EmptyState
              icon="search"
              title="Sin coincidencias por ahora"
              action={<button type="button" className="btn btn-primary" onClick={() => onNavigate('criterios')}>Revisar criterios</button>}
            >
              Amplía la ubicación o desactiva el filtrado estricto. También puedes buscar fuera de Brújula con los portales.
            </EmptyState>
          ) : (
            <div className="top-list">
              {top.map(({ job, match }) => (
                <article key={job.id} className="top-item">
                  <ScoreRing score={match.score} size={52} />
                  <div className="top-main">
                    <button type="button" className="job-title" onClick={() => onNavigate('ofertas')}>
                      {job.title}
                    </button>
                    <p>{job.company} · {job.location} · {WORK_MODE_LABEL[job.workMode as keyof typeof WORK_MODE_LABEL] ?? '—'}</p>
                    <div className="job-reasons">
                      {match.reasons.filter((reason) => reason.kind === 'plus').slice(0, 2).map((reason) => (
                        <span key={reason.label} className="reason-pill reason-pill-plus">
                          <Icon name="check" size={11} /> {reason.label}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="top-actions">
                    <Chip tone="info">{ORG_LABEL[job.orgType]}</Chip>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => onDecision(job.id, 'guardada')}
                    >
                      <Icon name="bookmark" size={13} /> Guardar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <aside className="dashboard-aside">
          <section className="card card-soft">
            <h2>Tu puesta a punto</h2>
            <ul className="checklist">
              {checklist.map((item) => (
                <li key={item.label} className={item.done ? 'is-done' : ''}>
                  <button type="button" onClick={() => onNavigate(item.view)}>
                    <span className="check-dot">{item.done ? <Icon name="check" size={11} /> : null}</span>
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </section>

          <section className="card card-soft">
            <div className="card-header">
              <h2>Buscar fuera</h2>
              <Icon name="external" size={15} />
            </div>
            <p className="fine-print">Tus criterios ya escritos en cada portal.</p>
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

          <section className="card card-soft privacy-card">
            <h2><Icon name="shield" size={16} /> Privado por diseño</h2>
            <p>
              Tu CV y tus notas no salen de este navegador. Sin cuentas obligatorias, sin cookies de
              terceros y sin analítica.
            </p>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onNavigate('ajustes')}>
              Gestionar mis datos
            </button>
          </section>
        </aside>
      </div>

      <section className="state-strip">
        {(Object.keys(STATE_LABEL) as JobState[]).map((jobState) => {
          const count = Object.values(decisions).filter((entry) => entry.state === jobState).length;
          return (
            <button key={jobState} type="button" className={`state-pill state-${jobState}`} onClick={() => onNavigate('seguimiento')}>
              <strong>{count}</strong>
              <span>{STATE_LABEL[jobState]}</span>
            </button>
          );
        })}
      </section>
    </div>
  );
}
