import { useMemo } from 'react';
import type { Criteria, Decision, Job, JobState, Profile } from '../types';
import { evaluateJob } from '../lib/match';
import { timeAgo } from '../lib/dates';
import { ORG_LABEL, STATE_LABEL, STATE_ORDER, WORK_MODE_LABEL } from '../lib/labels';
import { EmptyState, Icon, ScoreRing } from './ui';

export function TrackerView({
  jobs,
  profile,
  criteria,
  decisions,
  onDecision,
  onGoOffers,
}: {
  jobs: Job[];
  profile: Profile;
  criteria: Criteria;
  decisions: Record<string, Decision>;
  onDecision: (jobId: string, state: JobState | null, note?: string) => void;
  onGoOffers: () => void;
}) {
  const grouped = useMemo(() => {
    const map: Record<JobState, Array<{ job: Job; decision: Decision; score: number }>> = {
      guardada: [],
      aplicada: [],
      entrevista: [],
      oferta: [],
      descartada: [],
    };
    for (const [jobId, decision] of Object.entries(decisions)) {
      const job = jobs.find((entry) => entry.id === jobId);
      if (!job) continue;
      map[decision.state].push({
        job,
        decision,
        score: evaluateJob(job, profile, criteria).score,
      });
    }
    for (const list of Object.values(map)) {
      list.sort((a, b) => b.decision.updatedAt - a.decision.updatedAt);
    }
    return map;
  }, [jobs, decisions, profile, criteria]);

  const total = Object.keys(decisions).length;

  return (
    <div className="view">
      <header className="view-header">
        <div>
          <p className="eyebrow">Seguimiento</p>
          <h1>Tu tablero de candidaturas</h1>
          <p className="view-subtitle">
            {total === 0
              ? 'Marca ofertas como guardadas o aplicadas para empezar a moverlas.'
              : `${total} ofertas en seguimiento · arrastra el estado con los botones de cada tarjeta.`}
          </p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn btn-primary" onClick={onGoOffers}>
            <Icon name="compass" size={16} /> Ir a ofertas
          </button>
        </div>
      </header>

      {total === 0 ? (
        <EmptyState
          icon="columns"
          title="Todavía no hay nada en el tablero"
          action={<button type="button" className="btn btn-primary" onClick={onGoOffers}>Ver ofertas</button>}
        >
          Cuando guardes una oferta o marques que has aplicado, aparecerá aquí para que no pierdas el hilo.
        </EmptyState>
      ) : (
        <div className="board">
          {STATE_ORDER.map((state) => (
            <section key={state} className={`board-column board-${state}`}>
              <header>
                <h2>{STATE_LABEL[state]}</h2>
                <span>{grouped[state].length}</span>
              </header>
              <div className="board-cards">
                {grouped[state].length === 0 && <p className="board-empty">Sin ofertas</p>}
                {grouped[state].map(({ job, decision, score }) => (
                  <article key={job.id} className="tracker-card">
                    <div className="tracker-top">
                      <ScoreRing score={score} size={44} />
                      <div>
                        <strong>{job.title}</strong>
                        <span>{job.company}</span>
                      </div>
                    </div>
                    <div className="tracker-meta">
                      <span><Icon name="mapPin" size={12} /> {job.location}</span>
                      <span>{WORK_MODE_LABEL[job.workMode as keyof typeof WORK_MODE_LABEL] ?? '—'}</span>
                      <span>{ORG_LABEL[job.orgType]}</span>
                    </div>
                    <textarea
                      className="tracker-note-input"
                      rows={2}
                      placeholder="Añadir nota…"
                      defaultValue={decision.note}
                      aria-label={`Nota sobre ${job.title}`}
                      onBlur={(event) => {
                        if (event.target.value !== decision.note) {
                          onDecision(job.id, state, event.target.value);
                        }
                      }}
                    />
                    <div className="tracker-actions">
                      <select
                        value={state}
                        aria-label={`Estado de ${job.title}`}
                        onChange={(event) => onDecision(job.id, event.target.value as JobState)}
                      >
                        {STATE_ORDER.map((option) => (
                          <option key={option} value={option}>{STATE_LABEL[option]}</option>
                        ))}
                      </select>
                      {job.url && (
                        <a className="icon-button" href={job.url} target="_blank" rel="noopener noreferrer" title="Ver oferta original" aria-label="Ver oferta original">
                          <Icon name="external" size={14} />
                        </a>
                      )}
                      <button
                        type="button"
                        className="icon-button"
                        title="Quitar del tablero"
                        aria-label="Quitar del tablero"
                        onClick={() => onDecision(job.id, null)}
                      >
                        <Icon name="trash" size={14} />
                      </button>
                    </div>
                    <span className="tracker-date">Actualizado {timeAgo(decision.updatedAt)}</span>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
