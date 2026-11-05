import { useRef, useState } from 'react';
import type { Profile } from '../types';
import { analyzeCv, extractTextFromFile, profileFromAnalysis } from '../lib/cv';
import { formatDate } from '../lib/dates';
import { Icon, TagInput } from './ui';

export function ProfileView({
  profile,
  onUpdate,
  notify,
}: {
  profile: Profile;
  onUpdate: (next: Profile) => void;
  notify: (message: string, kind?: 'success' | 'error' | 'info') => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [showCv, setShowCv] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const set = <K extends keyof Profile>(key: K, value: Profile[K]) =>
    onUpdate({ ...profile, [key]: value });

  const handleFile = async (file: File) => {
    setBusy(true);
    setError('');
    try {
      const { text } = await extractTextFromFile(file);
      if (!text.trim()) throw new Error('No se pudo extraer texto del archivo.');
      const analysis = analyzeCv(text);
      onUpdate({
        ...profileFromAnalysis(analysis),
        name: profile.name || analysis.name,
        cvText: text,
        cvFileName: file.name,
        cvUpdatedAt: Date.now(),
      });
      notify('CV actualizado y perfil recalculado.', 'success');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo leer el archivo.');
    } finally {
      setBusy(false);
    }
  };

  const reanalyze = () => {
    if (!profile.cvText.trim()) {
      notify('Primero sube o pega tu CV.', 'error');
      return;
    }
    const analysis = analyzeCv(profile.cvText);
    onUpdate({
      ...profile,
      skills: [...new Set([...profile.skills, ...analysis.skills])].slice(0, 30),
      languages: [...new Set([...profile.languages, ...analysis.languages])],
      titles: [...new Set([...profile.titles, ...analysis.titles])],
      education: [...new Set([...profile.education, ...analysis.education])],
      yearsExperience: profile.yearsExperience ?? analysis.yearsExperience,
    });
    notify('Perfil contrastado con el CV. Se han añadido las competencias nuevas.', 'success');
  };

  return (
    <div className="view">
      <header className="view-header">
        <div>
          <p className="eyebrow">Perfil</p>
          <h1>Tu CV, en datos que la app entiende</h1>
          <p className="view-subtitle">
            Estos datos solo viven en tu navegador. Se usan para puntuar ofertas, nunca para enviarte publicidad.
          </p>
        </div>
        <div className="header-actions">
          <button type="button" className="btn btn-ghost" onClick={() => setShowCv((value) => !value)}>
            <Icon name="file" size={16} /> {showCv ? 'Ocultar texto del CV' : 'Ver texto del CV'}
          </button>
          <button type="button" className="btn btn-primary" onClick={() => fileInput.current?.click()} disabled={busy}>
            <Icon name={busy ? 'refresh' : 'upload'} size={16} className={busy ? 'spin' : ''} />
            {busy ? 'Leyendo…' : 'Subir nuevo CV'}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".pdf,.docx,.doc,.txt,.md,.png,.jpg,.jpeg,.webp,.bmp,.tif,.tiff,application/pdf,application/msword,image/*"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
              event.target.value = '';
            }}
          />
        </div>
      </header>

      {error && <p className="form-error"><Icon name="alert" size={15} /> {error}</p>}

      <div className="profile-layout">
        <section className="card">
          <div className="card-header">
            <h2>Datos de contacto</h2>
            <span className="chip chip-neutral">
              <Icon name="check" size={12} />
              {profile.cvUpdatedAt ? `CV actualizado ${formatDate(profile.cvUpdatedAt)}` : 'Sin CV todavía'}
            </span>
          </div>
          <div className="field-grid">
            <label className="field">
              <span>Nombre</span>
              <input value={profile.name} onChange={(event) => set('name', event.target.value)} />
            </label>
            <label className="field">
              <span>Titular profesional</span>
              <input
                value={profile.headline}
                onChange={(event) => set('headline', event.target.value)}
                placeholder="Ej. Psicóloga sanitaria · intervención familiar"
              />
            </label>
            <label className="field">
              <span>Email</span>
              <input type="email" value={profile.email} onChange={(event) => set('email', event.target.value)} />
            </label>
            <label className="field">
              <span>Teléfono</span>
              <input value={profile.phone} onChange={(event) => set('phone', event.target.value)} />
            </label>
            <label className="field">
              <span>Ubicación</span>
              <input value={profile.location} onChange={(event) => set('location', event.target.value)} />
            </label>
            <label className="field">
              <span>Años de experiencia</span>
              <input
                type="number"
                min={0}
                max={50}
                value={profile.yearsExperience ?? ''}
                onChange={(event) =>
                  set('yearsExperience', event.target.value === '' ? null : Number(event.target.value))
                }
              />
            </label>
          </div>
          <label className="field">
            <span>Enlaces</span>
            <input
              value={profile.links}
              onChange={(event) => set('links', event.target.value)}
              placeholder="LinkedIn, portfolio, web…"
            />
          </label>
          <label className="field">
            <span>Resumen profesional</span>
            <textarea rows={4} value={profile.summary} onChange={(event) => set('summary', event.target.value)} />
          </label>
        </section>

        <section className="card">
          <div className="card-header">
            <h2>Competencias e idiomas</h2>
            <button type="button" className="btn btn-ghost btn-sm" onClick={reanalyze}>
              <Icon name="refresh" size={14} /> Recalcular desde el CV
            </button>
          </div>
          <label className="field">
            <span>Competencias</span>
            <TagInput
              values={profile.skills}
              onChange={(skills) => set('skills', skills)}
              placeholder="Añade una competencia y pulsa Enter"
              ariaLabel="Competencias del perfil"
            />
          </label>
          <div className="field-grid">
            <label className="field">
              <span>Idiomas</span>
              <TagInput
                values={profile.languages}
                onChange={(languages) => set('languages', languages)}
                placeholder="Ej. Inglés (B2)"
                ariaLabel="Idiomas del perfil"
              />
            </label>
            <label className="field">
              <span>Roles</span>
              <TagInput
                values={profile.titles}
                onChange={(titles) => set('titles', titles)}
                placeholder="Ej. psicólogo/a educativo/a"
                ariaLabel="Roles del perfil"
              />
            </label>
          </div>
          <label className="field">
            <span>Formación</span>
            <TagInput
              values={profile.education}
              onChange={(education) => set('education', education)}
              placeholder="Ej. Máster en Psicología General Sanitaria"
              ariaLabel="Formación"
            />
          </label>
        </section>

        {showCv && (
          <section className="card card-wide">
            <div className="card-header">
              <h2>Texto del CV</h2>
              <span className="fine-print">{profile.cvFileName || 'sin archivo'}</span>
            </div>
            <label className="field">
              <span>Puedes corregir el texto extraído; se usará para el análisis.</span>
              <textarea
                rows={16}
                value={profile.cvText}
                onChange={(event) => set('cvText', event.target.value)}
                className="mono"
              />
            </label>
          </section>
        )}
      </div>

      <p className="fine-print privacy-line">
        <Icon name="shield" size={14} /> El CV se procesa con librerías que se ejecutan en tu dispositivo (PDF.js y Mammoth).
        No hay servidor que reciba el archivo.
      </p>
    </div>
  );
}
