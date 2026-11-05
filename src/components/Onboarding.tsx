import { useRef, useState } from 'react';
import type { Criteria, Profile, SectorPackId } from '../types';
import { DEMO_CV_TEXT } from '../data/demo';
import { PACK_LIST } from '../data/packs';
import { defaultCriteria, emptyProfile } from '../lib/defaults';
import { analyzeCv, extractTextFromFile, profileFromAnalysis } from '../lib/cv';
import { CriteriaForm } from './CriteriaForm';
import { Icon, TagInput } from './ui';

const STEPS = ['Bienvenida', 'Tu CV', 'Criterios', 'Listo'];

export function Onboarding({
  initialProfile,
  initialCriteria,
  onFinish,
  onDemo,
  notify,
}: {
  initialProfile: Profile;
  initialCriteria: Criteria;
  onFinish: (profile: Profile, criteria: Criteria) => void;
  onDemo: () => void;
  notify: (message: string, kind?: 'success' | 'error' | 'info') => void;
}) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<Profile>(initialProfile.name ? initialProfile : emptyProfile());
  const [pack, setPack] = useState<SectorPackId>(initialCriteria.sectorPack);
  const [criteria, setCriteria] = useState<Criteria>(initialCriteria);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [showPaste, setShowPaste] = useState(false);
  const [paste, setPaste] = useState('');
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const setProfileField = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    setProfile((current) => ({ ...current, [key]: value }));

  const runAnalysis = (text: string, fileName: string, extraWarnings: string[] = []) => {
    const analysis = analyzeCv(text);
    setProfile((current) => ({
      ...profileFromAnalysis(analysis, {
        cvText: text,
        cvFileName: fileName,
        cvUpdatedAt: Date.now(),
        name: current.name || analysis.name,
      }),
    }));
    setWarnings([...extraWarnings, ...analysis.warnings]);
    if (analysis.sectorPack) {
      setPack(analysis.sectorPack);
      setCriteria((current) => ({
        ...defaultCriteria(analysis.sectorPack as SectorPackId),
        locations: current.locations,
        workModes: current.workModes,
        contractTypes: current.contractTypes,
        orgTypes: current.orgTypes,
        minSalary: current.minSalary,
      }));
    }
    setShowPaste(false);
    notify('CV analizado. Revisa que los datos sean correctos.', 'success');
  };

  const onFile = async (file: File) => {
    setBusy(true);
    setError('');
    try {
      const { text, warnings: fileWarnings } = await extractTextFromFile(file);
      if (!text.trim()) throw new Error('No se ha podido extraer texto del archivo.');
      runAnalysis(text, file.name, fileWarnings);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo leer el archivo.');
    } finally {
      setBusy(false);
    }
  };

  const useDemoCv = () => {
    const analysis = analyzeCv(DEMO_CV_TEXT);
    setProfile(
      profileFromAnalysis(analysis, {
        cvText: DEMO_CV_TEXT,
        cvFileName: 'cv-de-ejemplo.txt',
        cvUpdatedAt: Date.now(),
        name: 'Lucía Martín',
      }),
    );
    setWarnings(analysis.warnings);
    setPack('psicologia');
    setCriteria(defaultCriteria('psicologia'));
    setStep(2);
    notify('Perfil de ejemplo cargado.', 'info');
  };

  const finish = () => {
    const finalCriteria: Criteria = {
      ...criteria,
      sectorPack: pack,
      roles: criteria.roles.length ? criteria.roles : defaultCriteria(pack).roles,
      includeDemo: true,
    };
    onFinish(
      {
        ...profile,
        name: profile.name.trim() || 'Tu perfil',
        skills: profile.skills.length ? profile.skills : [],
      },
      finalCriteria,
    );
  };

  return (
    <div className="onboarding">
      <header className="onboarding-header">
        <div className="brand">
          <span className="brand-mark"><Icon name="compass" size={20} /></span>
          <span className="brand-name">Brújula</span>
        </div>
        <ol className="steps" aria-label="Progreso del registro">
          {STEPS.map((label, index) => (
            <li key={label} className={index === step ? 'is-current' : index < step ? 'is-done' : ''}>
              <span className="step-dot">{index < step ? <Icon name="check" size={12} /> : index + 1}</span>
              <span className="step-label">{label}</span>
            </li>
          ))}
        </ol>
      </header>

      <main className="onboarding-main">
        {step === 0 && (
          <div className="onboarding-intro">
            <p className="eyebrow">Buscador de empleo con criterio</p>
            <h1>Deja de leer ofertas que no encajan.</h1>
            <p className="lead">
              Sube tu CV, cuéntanos qué buscas y Brújula puntúa cada oferta. Tú decides qué guardar,
              a qué aplicar y qué descartar. Todo ocurre en tu navegador.
            </p>

            <label className="field field-inline">
              <span>¿Cómo te llamas?</span>
              <input
                value={profile.name}
                onChange={(event) => setProfileField('name', event.target.value)}
                placeholder="Tu nombre"
                autoComplete="name"
              />
            </label>

            <div className="pack-picker">
              <p className="field-label">Elige un punto de partida</p>
              <div className="pack-grid">
                {PACK_LIST.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={`pack-card${pack === item.id ? ' is-active' : ''}`}
                    aria-pressed={pack === item.id}
                    onClick={() => {
                      setPack(item.id);
                      setCriteria(defaultCriteria(item.id));
                    }}
                  >
                    <strong>{item.label}</strong>
                    <span>{item.tagline}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="onboarding-actions">
              <button type="button" className="btn btn-primary btn-lg" onClick={() => setStep(1)}>
                Empezar con mi CV <Icon name="arrowRight" />
              </button>
              <button type="button" className="btn btn-ghost" onClick={onDemo}>
                Explorar con un perfil de ejemplo
              </button>
            </div>
            <p className="fine-print">
              <Icon name="shield" size={14} /> Sin registros, sin cookies de terceros. Puedes borrar todo cuando quieras.
            </p>
          </div>
        )}

        {step === 1 && (
          <div className="onboarding-panel">
            <p className="eyebrow">Paso 2 · Tu CV</p>
            <h1>Sube tu CV o pégalo</h1>
            <p className="lead">
              Extraemos el texto, detectamos competencias y lo usamos para puntuar las ofertas.
              El archivo no se sube a ningún servidor: se lee aquí mismo.
            </p>

            <label
              className={`dropzone${dragging ? ' is-dragging' : ''}${busy ? ' is-busy' : ''}`}
              onDragOver={(event) => {
                event.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setDragging(false);
                const file = event.dataTransfer.files[0];
                if (file) void onFile(file);
              }}
            >
              <input
                ref={fileInput}
                type="file"
                accept=".pdf,.docx,.txt,.md,application/pdf,text/plain"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) void onFile(file);
                }}
              />
              <Icon name={busy ? 'refresh' : 'upload'} size={26} />
              <strong>{busy ? 'Leyendo tu CV…' : 'Arrastra tu CV aquí o haz clic'}</strong>
              <span>PDF, DOCX o TXT · máximo 15 MB</span>
            </label>

            <div className="onboarding-alt-actions">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowPaste((value) => !value)}>
                <Icon name="file" size={14} /> Pegar el texto a mano
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={useDemoCv}>
                <Icon name="sparkles" size={14} /> Usar CV de ejemplo
              </button>
            </div>

            {showPaste && (
              <div className="paste-panel">
                <textarea
                  value={paste}
                  onChange={(event) => setPaste(event.target.value)}
                  rows={8}
                  placeholder="Pega aquí el contenido de tu CV…"
                  aria-label="Texto del CV"
                />
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={paste.trim().length < 80}
                  onClick={() => runAnalysis(paste, 'cv-pegado.txt')}
                >
                  Analizar texto
                </button>
              </div>
            )}

            {error && <p className="form-error"><Icon name="alert" size={15} /> {error}</p>}
            {warnings.map((warning) => (
              <p key={warning} className="form-warning"><Icon name="info" size={15} /> {warning}</p>
            ))}

            {profile.cvText && (
              <div className="analysis-card">
                <div className="analysis-head">
                  <div>
                    <h2>Esto es lo que hemos entendido</h2>
                    <p>Corrige lo que haga falta; se guarda en tu navegador.</p>
                  </div>
                  <span className="chip chip-good"><Icon name="check" size={12} /> {profile.cvFileName}</span>
                </div>

                <div className="field-grid">
                  <label className="field">
                    <span>Nombre</span>
                    <input value={profile.name} onChange={(event) => setProfileField('name', event.target.value)} />
                  </label>
                  <label className="field">
                    <span>Titular profesional</span>
                    <input
                      value={profile.headline}
                      onChange={(event) => setProfileField('headline', event.target.value)}
                      placeholder="Ej. Psicóloga sanitaria"
                    />
                  </label>
                  <label className="field">
                    <span>Email</span>
                    <input type="email" value={profile.email} onChange={(event) => setProfileField('email', event.target.value)} />
                  </label>
                  <label className="field">
                    <span>Ubicación</span>
                    <input value={profile.location} onChange={(event) => setProfileField('location', event.target.value)} />
                  </label>
                  <label className="field">
                    <span>Años de experiencia</span>
                    <input
                      type="number"
                      min={0}
                      max={50}
                      value={profile.yearsExperience ?? ''}
                      onChange={(event) =>
                        setProfileField('yearsExperience', event.target.value === '' ? null : Number(event.target.value))
                      }
                    />
                  </label>
                  <label className="field">
                    <span>Enlaces</span>
                    <input value={profile.links} onChange={(event) => setProfileField('links', event.target.value)} placeholder="LinkedIn, portfolio…" />
                  </label>
                </div>

                <label className="field">
                  <span>Competencias detectadas</span>
                  <TagInput
                    values={profile.skills}
                    onChange={(skills) => setProfileField('skills', skills)}
                    placeholder="Añade una competencia"
                    ariaLabel="Competencias"
                  />
                </label>
                <div className="field-grid">
                  <label className="field">
                    <span>Idiomas</span>
                    <TagInput
                      values={profile.languages}
                      onChange={(languages) => setProfileField('languages', languages)}
                      placeholder="Ej. Inglés (B2)"
                      ariaLabel="Idiomas"
                    />
                  </label>
                  <label className="field">
                    <span>Roles que sugiere tu CV</span>
                    <TagInput
                      values={profile.titles}
                      onChange={(titles) => setProfileField('titles', titles)}
                      placeholder="Ej. psicólogo/a clínico"
                      ariaLabel="Roles del CV"
                    />
                  </label>
                </div>
                <label className="field">
                  <span>Resumen</span>
                  <textarea
                    rows={4}
                    value={profile.summary}
                    onChange={(event) => setProfileField('summary', event.target.value)}
                  />
                </label>
              </div>
            )}

            <div className="wizard-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setStep(0)}>Atrás</button>
              <div className="wizard-footer-right">
                {!profile.cvText && (
                  <button type="button" className="btn btn-ghost" onClick={() => setStep(2)}>
                    Rellenar sin CV
                  </button>
                )}
                <button type="button" className="btn btn-primary" onClick={() => setStep(2)}>
                  Continuar <Icon name="arrowRight" />
                </button>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="onboarding-panel">
            <p className="eyebrow">Paso 3 · Criterios</p>
            <h1>¿Qué estás buscando?</h1>
            <p className="lead">
              Cuanto más concretes, mejor será el filtro. Podrás cambiarlo en cualquier momento.
            </p>
            <CriteriaForm
              value={criteria}
              onChange={(next) => {
                setCriteria(next);
                setPack(next.sectorPack);
              }}
            />
            <div className="wizard-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setStep(1)}>Atrás</button>
              <button type="button" className="btn btn-primary" onClick={() => setStep(3)}>
                Ver resumen <Icon name="arrowRight" />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="onboarding-panel">
            <p className="eyebrow">Paso 4 · Listo</p>
            <h1>Tu brújula está calibrada</h1>
            <p className="lead">
              Esto es lo que usaremos para puntuar cada oferta. No hay respuestas correctas: puedes
              ajustarlo cuando quieras.
            </p>
            <div className="review-grid">
              <article className="review-card">
                <header><Icon name="user" size={16} /> Perfil</header>
                <strong>{profile.name || 'Tu perfil'}</strong>
                <p>{profile.headline || 'Sin titular todavía'}</p>
                <ul>
                  <li>{profile.skills.length} competencias detectadas</li>
                  <li>{profile.yearsExperience ?? '—'} años de experiencia</li>
                  <li>{profile.languages.length ? profile.languages.join(' · ') : 'Sin idiomas indicados'}</li>
                </ul>
              </article>
              <article className="review-card">
                <header><Icon name="target" size={16} /> Búsqueda</header>
                <strong>{criteria.roles.join(' · ') || 'Sin roles'}</strong>
                <p>{criteria.locations.length ? criteria.locations.join(' · ') : 'Cualquier ubicación'}</p>
                <ul>
                  <li>{criteria.keywords.length} palabras clave</li>
                  <li>{criteria.orgTypes.length} tipos de entidad</li>
                  <li>{criteria.workModes.length === 3 ? 'Cualquier modalidad' : criteria.workModes.join(' · ')}</li>
                </ul>
              </article>
              <article className="review-card">
                <header><Icon name="shield" size={16} /> Privacidad</header>
                <strong>Todo local</strong>
                <p>Tu CV se queda en este navegador.</p>
                <ul>
                  <li>Sin cuentas obligatorias</li>
                  <li>Exportación cifrada disponible</li>
                  <li>Puedes borrarlo todo en Ajustes</li>
                </ul>
              </article>
            </div>
            <div className="wizard-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setStep(2)}>Atrás</button>
              <button type="button" className="btn btn-primary btn-lg" onClick={finish}>
                Ver mis ofertas <Icon name="arrowRight" />
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
