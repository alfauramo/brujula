import { useEffect, useMemo, useState } from 'react';
import type { Criteria, Decision, Job, JobState, MatchResult, Profile, SourceError } from '../types';
import { evaluateJob, listJobs } from '../lib/match';
import { formatSalary, timeAgo } from '../lib/dates';
import { CONTRACT_TYPES, ORG_LABEL, SOURCE_LABEL, STATE_LABEL, WORK_MODE_LABEL } from '../lib/labels';
import { buildSearchLinks } from '../data/portals';
import { packById } from '../data/packs';
import { createManualJob } from '../lib/sources';
import type { SortMode } from '../lib/match';
import { Chip, EmptyState, Icon, Modal, ScoreRing } from './ui';

const TABS: Array<{ id: 'todas' | JobState; label: string }> = [
  { id: 'todas', label: 'Para ti' },
  { id: 'guardada', label: 'Guardadas' },
  { id: 'aplicada', label: 'Aplicadas' },
  { id: 'entrevista', label: 'Entrevistas' },
  { id: 'oferta', label: 'Ofertas' },
  { id: 'descartada', label: 'Descartadas' },
];

export function OffersView({
  jobs,
  profile,
  criteria,
  decisions,
  hideApplied,
  onDecision,
  onAddJob,
  onRefresh,
  onGoCriteria,
  loading,
  errors,
  fetchedAt,
  notify,
}: {
  jobs: Job[];
  profile: Profile;
  criteria: Criteria;
  decisions: Record<string, Decision>;
  hideApplied: boolean;
  onDecision: (jobId: string, state: JobState | null, note?: string) => void;
  onAddJob: (job: Job) => void;
  onRefresh: () => void;
  onGoCriteria: () => void;
  loading: boolean;
  errors: SourceError[];
  fetchedAt: number | null;
  notify: (message: string, kind?: 'success' | 'error' | 'info') => void;
}) {
  const [tab, setTab] = useState<'todas' | JobState>('todas');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortMode>('match');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [portalOpen, setPortalOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  const listed = useMemo(
    () => listJobs(jobs, profile, criteria, decisions, { hideApplied, tab, query, sort }),
    [jobs, profile, criteria, decisions, hideApplied, tab, query, sort],
  );

  const counts = useMemo(() => {
    const base: Record<string, number> = { todas: 0, guardada: 0, aplicada: 0, entrevista: 0, oferta: 0, descartada: 0 };
    for (const value of Object.values(decisions)) base[value.state] = (base[value.state] ?? 0) + 1;
    base.todas = Math.max(
      0,
      jobs.length - base.descartada - base.aplicada - base.entrevista - base.oferta,
    );
    return base;
  }, [decisions, jobs.length]);

  const selected = listed.find((entry) => entry.job.id === selectedId) ?? null;
  const selectedJob = selected?.job ?? jobs.find((job) => job.id === selectedId) ?? null;
  const selectedMatch: MatchResult | null =
    selected?.match ?? (selectedJob ? evaluateJob(selectedJob, profile, criteria) : null);
  const selectedDecision = selectedJob ? decisions[selectedJob.id] : undefined;

  const closeIfHidden = (state: JobState | null) => {
    if (state === 'aplicada' || state === 'descartada') setSelectedId(null);
  };

  const mark = (job: Job, state: JobState | null, openUrl = false) => {
    if (openUrl && job.url) {
      window.open(job.url, '_blank', 'noopener,noreferrer');
    }
    onDecision(job.id, state);
    closeIfHidden(state);
    if (state === 'aplicada') notify('Marcada como aplicada. La ocultamos de tus resultados.', 'success');
    else if (state === 'descartada') notify('Descartada. No volverá a aparecer.', 'info');
    else if (state === 'guardada') notify('Guardada para revisarla con calma.', 'success');
  };

  const links = useMemo(
    () => buildSearchLinks(criteria.roles, criteria.locations, packById(criteria.sectorPack).portals, 12),
    [criteria.roles, criteria.locations, criteria.sectorPack],
  );

  return (
    <div className="view">
      <header className="view-header">
        <div>
          <p className="eyebrow">Ofertas</p>
          <h1>Lo que encaja contigo</h1>
          <p className="view-subtitle">
            {listed.length} {listed.length === 1 ? 'oferta visible' : 'ofertas visibles'}
            {fetchedAt ? ` · actualizado ${timeAgo(fetchedAt)}` : ''}
            {' · '}las aplicadas y descartadas no se muestran.
          </p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn btn-ghost" onClick={onGoCriteria}>
            <Icon name="sliders" size={16} /> Ajustar criterios
          </button>
          <button type="button" className="btn btn-primary" onClick={onRefresh} disabled={loading}>
            <Icon name={loading ? 'refresh' : 'refresh'} size={16} className={loading ? 'spin' : ''} />
            {loading ? 'Buscando…' : 'Buscar de nuevo'}
          </button>
        </div>
      </header>

      {errors.length > 0 && (
        <div className="banner banner-warning" role="status">
          <Icon name="alert" size={16} />
          <div>
            <strong>Algunas fuentes no respondieron.</strong>
            <p>{errors.map((error) => `${SOURCE_LABEL[error.source] ?? error.source}: ${error.message}`).join(' · ')}</p>
          </div>
        </div>
      )}

      <nav className="tabs" aria-label="Estado de las ofertas">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`tab${tab === item.id ? ' is-active' : ''}`}
            onClick={() => setTab(item.id)}
            aria-current={tab === item.id ? 'page' : undefined}
          >
            {item.label}
            <span className="tab-count">{counts[item.id] ?? 0}</span>
          </button>
        ))}
      </nav>

      <div className="toolbar">
        <label className="search-field">
          <Icon name="search" size={16} />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filtrar por puesto, empresa o ciudad…"
            aria-label="Filtrar ofertas"
          />
          {query && (
            <button type="button" onClick={() => setQuery('')} aria-label="Limpiar búsqueda">
              <Icon name="x" size={13} />
            </button>
          )}
        </label>
        <select value={sort} onChange={(event) => setSort(event.target.value as SortMode)} aria-label="Ordenar ofertas">
          <option value="match">Mejor encaje</option>
          <option value="recent">Más recientes</option>
          <option value="salary">Mejor salario</option>
        </select>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setManualOpen(true)}>
          <Icon name="plus" size={14} /> Añadir oferta
        </button>
        <button
          type="button"
          className={`btn btn-ghost btn-sm${portalOpen ? ' is-active' : ''}`}
          onClick={() => setPortalOpen((value) => !value)}
          aria-expanded={portalOpen}
        >
          <Icon name="external" size={14} /> Buscar en portales
        </button>
      </div>

      {portalOpen && (
        <section className="portal-panel">
          <div className="section-heading">
            <h2>Buscar fuera de Brújula</h2>
            <p>
              Abrimos la búsqueda ya escrita en cada portal con tus roles y ubicaciones. Así cubres las
              ofertas locales que no llegan a las APIs públicas (asociaciones, colegios, ayuntamientos).
            </p>
          </div>
          <div className="portal-links">
            {links.map((link) => (
              <a key={link.id} className="portal-link" href={link.url} target="_blank" rel="noopener noreferrer">
                <span className="portal-name">{link.portal.name}</span>
                <span className="portal-query">
                  {link.role || 'tu perfil'}{link.location ? ` · ${link.location}` : ''}
                </span>
                <Icon name="external" size={14} />
              </a>
            ))}
          </div>
          <p className="fine-print">
            Algunos portales ignoran parte de los filtros de la URL; si ocurre, ajusta la ubicación dentro del portal.
          </p>
        </section>
      )}

      {listed.length === 0 ? (
        <EmptyState
          icon={tab === 'todas' ? 'compass' : 'bookmark'}
          title={tab === 'todas' ? 'No hay ofertas que encajen todavía' : `Todavía no tienes ofertas en «${STATE_LABEL[tab as JobState] ?? ''}»`}
          action={
            <div className="empty-actions">
              <button type="button" className="btn btn-ghost" onClick={onGoCriteria}>
                Revisar mis criterios
              </button>
              <button type="button" className="btn btn-primary" onClick={onRefresh}>
                Buscar de nuevo
              </button>
            </div>
          }
        >
          {tab === 'todas'
            ? 'Prueba a ampliar la ubicación, desactivar el filtrado estricto o añadir alguna palabra clave. También puedes buscar directamente en los portales.'
            : 'Cuando marques una oferta desde la lista aparecerá aquí.'}
        </EmptyState>
      ) : (
        <div className="job-grid">
          {listed.map(({ job, match, decision }) => (
            <JobCard
              key={job.id}
              job={job}
              match={match}
              decision={decision}
              onOpen={() => setSelectedId(job.id)}
              onMark={(state) => mark(job, state)}
            />
          ))}
        </div>
      )}

      <Modal
        open={Boolean(selectedJob)}
        onClose={() => setSelectedId(null)}
        title={selectedJob?.title ?? 'Oferta'}
        subtitle={selectedJob ? `${selectedJob.company} · ${selectedJob.location}` : undefined}
        wide
        footer={
          selectedJob ? (
            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => mark(selectedJob, selectedDecision?.state === 'guardada' ? null : 'guardada')}
              >
                <Icon name="bookmark" size={15} /> {selectedDecision?.state === 'guardada' ? 'Quitar de guardadas' : 'Guardar'}
              </button>
              <button type="button" className="btn btn-ghost danger" onClick={() => mark(selectedJob, 'descartada')}>
                <Icon name="x" size={15} /> Descartar
              </button>
              <button type="button" className="btn btn-primary" onClick={() => mark(selectedJob, 'aplicada', true)}>
                <Icon name="send" size={15} /> Aplicar
              </button>
            </div>
          ) : null
        }
      >
        {selectedJob && selectedMatch && (
          <div className="job-detail">
            <div className="detail-top">
              <ScoreRing score={selectedMatch.score} size={76} />
              <div>
                <span className={`match-label match-${selectedMatch.label.toLowerCase()}`}>{selectedMatch.label}</span>
                <p>Encaje calculado con tu CV y tus criterios.</p>
              </div>
            </div>

            <div className="job-meta detail-meta">
              <Chip tone="info"><Icon name="mapPin" size={12} /> {selectedJob.location}</Chip>
              <Chip>{WORK_MODE_LABEL[selectedJob.workMode as keyof typeof WORK_MODE_LABEL] ?? 'Modalidad sin indicar'}</Chip>
              <Chip>{ORG_LABEL[selectedJob.orgType]}</Chip>
              {selectedJob.contractType && <Chip>{selectedJob.contractType}</Chip>}
              {(selectedJob.salaryMin || selectedJob.salaryMax) && (
                <Chip tone="accent">
                  {formatSalary(selectedJob.salaryMin, selectedJob.salaryMax, selectedJob.currency)}
                </Chip>
              )}
              <Chip><Icon name="clock" size={12} /> {timeAgo(selectedJob.publishedAt)}</Chip>
            </div>

            <section className="detail-section">
              <h3>Por qué encaja (o no)</h3>
              <ul className="reason-list">
                {selectedMatch.reasons.map((reason, index) => (
                  <li key={`${reason.label}-${index}`} className={`reason reason-${reason.kind}`}>
                    <Icon name={reason.kind === 'plus' ? 'check' : reason.kind === 'minus' ? 'x' : 'info'} size={14} />
                    <div>
                      <strong>{reason.label}</strong>
                      {reason.detail && <span>{reason.detail}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {selectedMatch.matched.length > 0 && (
              <section className="detail-section">
                <h3>Coincidencias</h3>
                <div className="tag-list">
                  {selectedMatch.matched.map((item) => <Chip key={item} tone="good">{item}</Chip>)}
                </div>
              </section>
            )}

            {selectedMatch.missing.length > 0 && (
              <section className="detail-section">
                <h3>No aparece en la oferta</h3>
                <div className="tag-list">
                  {selectedMatch.missing.map((item) => <Chip key={item} tone="bad">{item}</Chip>)}
                </div>
              </section>
            )}

            <section className="detail-section">
              <h3>Descripción</h3>
              <p className="job-description">{selectedJob.description || 'Esta oferta no incluye descripción.'}</p>
              {selectedJob.tags.length > 0 && (
                <div className="tag-list">
                  {selectedJob.tags.slice(0, 10).map((tag) => <Chip key={tag}>{tag}</Chip>)}
                </div>
              )}
            </section>

            <section className="detail-section">
              <h3>Tu seguimiento</h3>
              <div className="status-row">
                {(['guardada', 'aplicada', 'entrevista', 'oferta', 'descartada'] as JobState[]).map((state) => (
                  <button
                    key={state}
                    type="button"
                    className={`choice${selectedDecision?.state === state ? ' is-active' : ''}`}
                    onClick={() => mark(selectedJob, selectedDecision?.state === state ? null : state)}
                  >
                    {STATE_LABEL[state]}
                  </button>
                ))}
              </div>
              <label className="field">
                <span>Notas privadas</span>
                <textarea
                  rows={3}
                  value={selectedDecision?.note ?? ''}
                  placeholder="Contacto, fecha de respuesta, impresiones…"
                  onChange={(event) => onDecision(selectedJob.id, selectedDecision?.state ?? 'guardada', event.target.value)}
                />
              </label>
            </section>

            <div className="detail-footer">
              {selectedJob.url ? (
                <a className="btn btn-ghost" href={selectedJob.url} target="_blank" rel="noopener noreferrer">
                  <Icon name="external" size={15} /> Ver oferta original
                </a>
              ) : (
                <span className="fine-print">Oferta de ejemplo: no tiene enlace externo.</span>
              )}
              <span className="fine-print">Fuente: {SOURCE_LABEL[selectedJob.source]}</span>
            </div>
          </div>
        )}
      </Modal>

      <ManualJobModal
        open={manualOpen}
        onClose={() => setManualOpen(false)}
        onAdd={(job) => {
          onAddJob(job);
          setManualOpen(false);
          notify('Oferta añadida. Ya aparece en tu lista.', 'success');
        }}
      />
    </div>
  );
}

function JobCard({
  job,
  match,
  decision,
  onOpen,
  onMark,
}: {
  job: Job;
  match: MatchResult;
  decision: Decision | undefined;
  onOpen: () => void;
  onMark: (state: JobState) => void;
}) {
  const positives = match.reasons.filter((reason) => reason.kind === 'plus').slice(0, 2);
  const negatives = match.reasons.filter((reason) => reason.kind === 'minus').slice(0, 1);

  return (
    <article className={`job-card${decision ? ' is-marked' : ''}`}>
      <div className="job-card-top">
        <ScoreRing score={match.score} />
        <div className="job-card-heading">
          <button type="button" className="job-title" onClick={onOpen}>
            {job.title}
          </button>
          <p>
            <Icon name="building" size={13} /> {job.company}
          </p>
        </div>
        {decision && <Chip tone={decision.state === 'descartada' ? 'bad' : 'accent'}>{STATE_LABEL[decision.state]}</Chip>}
      </div>

      <div className="job-meta">
        <span><Icon name="mapPin" size={13} /> {job.location}</span>
        <span>{WORK_MODE_LABEL[job.workMode as keyof typeof WORK_MODE_LABEL] ?? 'Sin modalidad'}</span>
        <span>{ORG_LABEL[job.orgType]}</span>
        {(job.salaryMin || job.salaryMax) && (
          <span className="salary">{formatSalary(job.salaryMin, job.salaryMax, job.currency)}</span>
        )}
        <span><Icon name="clock" size={13} /> {timeAgo(job.publishedAt)}</span>
      </div>

      <div className="job-reasons">
        {positives.map((reason) => (
          <span key={reason.label} className="reason-pill reason-pill-plus">
            <Icon name="check" size={11} /> {reason.label}
          </span>
        ))}
        {negatives.map((reason) => (
          <span key={reason.label} className="reason-pill reason-pill-minus">
            <Icon name="x" size={11} /> {reason.label}
          </span>
        ))}
      </div>

      <footer className="job-card-actions">
        <button type="button" className="btn btn-primary btn-sm" onClick={onOpen}>
          Ver detalle
        </button>
        <button
          type="button"
          className="icon-button"
          title={decision?.state === 'guardada' ? 'Quitar de guardadas' : 'Guardar'}
          aria-label={decision?.state === 'guardada' ? 'Quitar de guardadas' : 'Guardar oferta'}
          onClick={() => onMark('guardada')}
        >
          <Icon name="bookmark" size={15} />
        </button>
        <button type="button" className="icon-button" title="Descartar" aria-label="Descartar oferta" onClick={() => onMark('descartada')}>
          <Icon name="x" size={15} />
        </button>
        <button
          type="button"
          className="btn btn-ghost btn-sm apply-button"
          onClick={() => {
            if (job.url) window.open(job.url, '_blank', 'noopener,noreferrer');
            onMark('aplicada');
          }}
        >
          Aplicar
        </button>
      </footer>
    </article>
  );
}

function ManualJobModal({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (job: Job) => void;
}) {
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [location, setLocation] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [workMode, setWorkMode] = useState<Job['workMode']>('unknown');
  const [contractType, setContractType] = useState('');

  useEffect(() => {
    if (!open) {
      setTitle('');
      setCompany('');
      setLocation('');
      setUrl('');
      setDescription('');
      setWorkMode('unknown');
      setContractType('');
    }
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Añadir una oferta a mano"
      subtitle="Útil para ofertas de asociaciones o portales sin API."
      footer={
        <div className="modal-actions">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancelar</button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!title.trim() || !description.trim()}
            onClick={() =>
              onAdd(
                createManualJob({ title, company, location, url, description, workMode, contractType }),
              )
            }
          >
            Añadir y puntuar
          </button>
        </div>
      }
    >
      <div className="field-grid">
        <label className="field">
          <span>Puesto *</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Psicólogo/a en asociación" />
        </label>
        <label className="field">
          <span>Entidad</span>
          <input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Nombre de la asociación o empresa" />
        </label>
        <label className="field">
          <span>Ubicación</span>
          <input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="Madrid" />
        </label>
        <label className="field">
          <span>Enlace</span>
          <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://…" inputMode="url" />
        </label>
        <label className="field">
          <span>Modalidad</span>
          <select value={workMode} onChange={(event) => setWorkMode(event.target.value as Job['workMode'])}>
            <option value="unknown">Sin indicar</option>
            <option value="onsite">Presencial</option>
            <option value="hybrid">Híbrido</option>
            <option value="remote">Remoto</option>
          </select>
        </label>
        <label className="field">
          <span>Jornada</span>
          <select value={contractType} onChange={(event) => setContractType(event.target.value)}>
            <option value="">Sin indicar</option>
            {CONTRACT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </label>
      </div>
      <label className="field">
        <span>Descripción o requisitos *</span>
        <textarea
          rows={8}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Pega aquí el texto de la oferta. Cuanto más completo, mejor será el encaje."
        />
      </label>
    </Modal>
  );
}
