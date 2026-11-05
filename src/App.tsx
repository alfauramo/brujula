import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { AppState, Criteria, Decision, Job, JobState, Profile, Settings, SourceError, SourceId } from './types';
import { DEMO_CV_TEXT } from './data/demo';
import { defaultCriteria, emptyState } from './lib/defaults';
import { analyzeCv, profileFromAnalysis } from './lib/cv';
import { dedupeJobs, demoJobsFor, fetchRemoteJobs } from './lib/sources';
import { decryptJson, encryptJson, encryptWithKey, fromBase64, isEnvelope } from './lib/crypto';
import {
  disableLock,
  enableLock,
  isLocked,
  readPlainState,
  saveEncryptedState,
  savePlainState,
  storageFootprint,
  unlockState,
  validateState,
  wipeAll,
} from './lib/storage';
import {
  clearToken,
  consumeOAuthResult,
  fetchGitHubUser,
  findGist,
  getProxyUrl,
  readGist,
  readToken,
  saveGist,
  startGitHubLogin,
  storeToken,
} from './lib/github';
import type { GitHubUser } from './lib/github';
import { uid } from './lib/id';
import { loadCloudState, saveCloudState, deleteCloudState } from './lib/supabase-data';
import { supabase } from './lib/supabase';
import { AuthScreen } from './components/AuthScreen';
import { Onboarding } from './components/Onboarding';
import { Dashboard } from './components/Dashboard';
import { OffersView } from './components/OffersView';
import { TrackerView } from './components/TrackerView';
import { ProfileView } from './components/ProfileView';
import { CriteriaView } from './components/CriteriaView';
import { SettingsView } from './components/SettingsView';
import { UnlockScreen } from './components/Unlock';
import { Icon, ToastHost } from './components/ui';
import type { ToastItem } from './components/ui';

type Route = 'inicio' | 'ofertas' | 'seguimiento' | 'perfil' | 'criterios' | 'ajustes';
type Phase = 'loading' | 'auth' | 'locked' | 'ready';

const ROUTES: Route[] = ['inicio', 'ofertas', 'seguimiento', 'perfil', 'criterios', 'ajustes'];

const NAV: Array<{ id: Route; label: string; icon: 'target' | 'briefcase' | 'columns' | 'user' | 'sliders' | 'settings' }> = [
  { id: 'inicio', label: 'Inicio', icon: 'target' },
  { id: 'ofertas', label: 'Ofertas', icon: 'briefcase' },
  { id: 'seguimiento', label: 'Seguimiento', icon: 'columns' },
  { id: 'perfil', label: 'Perfil', icon: 'user' },
  { id: 'criterios', label: 'Criterios', icon: 'sliders' },
  { id: 'ajustes', label: 'Ajustes', icon: 'settings' },
];

function readRoute(): Route {
  const value = location.hash.replace(/^#\/?/, '').split('?')[0] as Route;
  return ROUTES.includes(value) ? value : 'inicio';
}

function download(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [guestMode, setGuestMode] = useState(false);
  const [route, setRoute] = useState<Route>(readRoute);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [remoteJobs, setRemoteJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [errors, setErrors] = useState<SourceError[]>([]);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [token, setToken] = useState<string | null>(readToken());
  const [ghUser, setGhUser] = useState<GitHubUser | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [cloudBusy, setCloudBusy] = useState(false);

  const keyRef = useRef<{ key: CryptoKey; salt: string; iterations: number } | null>(null);
  const sourcesRef = useRef<SourceId[]>([]);
  const scope = user?.id ?? '';

  const notify = useCallback((message: string, kind: 'success' | 'error' | 'info' = 'info') => {
    const id = uid('toast');
    setToasts((current) => [...current, { id, kind, message }]);
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 5200);
  }, []);

  // Arranque: sesión Supabase (si está configurado), OAuth de GitHub, estado cifrado o plano.
  useEffect(() => {
    const oauth = consumeOAuthResult();
    if (oauth) {
      if ('error' in oauth) notify(oauth.error, 'error');
      else {
        storeToken(oauth.token);
        setToken(oauth.token);
        notify('Sesión de GitHub iniciada.', 'success');
      }
    }

    if (!supabase || guestMode) {
      if (isLocked()) {
        setPhase('locked');
        return;
      }
      const stored = readPlainState();
      setState(stored ?? emptyState());
      setPhase('ready');
      return;
    }

    let cancelled = false;
    const loadForUser = async (userId: string) => {
      if (isLocked(userId)) {
        setPhase('locked');
        return;
      }
      let stored = readPlainState(userId);
      if (!stored) {
        try {
          const cloud = await loadCloudState(userId);
          if (cloud) {
            stored = cloud;
            await savePlainState(cloud, userId);
          }
        } catch {
          // Sin conexión: seguimos con estado vacío.
        }
      }
      if (cancelled) return;
      setState(stored ?? emptyState());
      setPhase('ready');
    };

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session?.user) {
        setUser(data.session.user);
        void loadForUser(data.session.user.id);
      } else {
        setPhase('auth');
      }
    });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (session?.user) {
        setUser(session.user);
        void loadForUser(session.user.id);
      } else {
        setUser(null);
        setState(null);
        setRemoteJobs([]);
        setErrors([]);
        setFetchedAt(null);
        setPhase('auth');
      }
    });

    return () => {
      cancelled = true;
      subscription.subscription.unsubscribe();
    };
  }, [notify, guestMode]);

  useEffect(() => {
    sourcesRef.current = state?.settings.sources ?? [];
  }, [state?.settings.sources]);

  useEffect(() => {
    const onHash = () => setRoute(readRoute());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [route]);

  useEffect(() => {
    const theme = state?.settings.theme ?? 'auto';
    document.documentElement.dataset.theme = theme;
  }, [state?.settings.theme]);

  useEffect(() => {
    if (!token) {
      setGhUser(null);
      return;
    }
    let cancelled = false;
    fetchGitHubUser(token)
      .then((user) => {
        if (!cancelled) setGhUser(user);
      })
      .catch(() => {
        if (cancelled) return;
        clearToken();
        setToken(null);
        notify('La sesión de GitHub ha caducado. Vuelve a conectar tu cuenta.', 'error');
      });
    return () => {
      cancelled = true;
    };
  }, [token, notify]);

  // Guardado con debounce; cifrado si el bloqueo está activo.
  useEffect(() => {
    if (!state || phase !== 'ready') return;
    const timer = setTimeout(() => {
      const task = keyRef.current
        ? saveEncryptedState(state, keyRef.current.key, keyRef.current.salt, keyRef.current.iterations, scope)
        : savePlainState(state, scope);
      task
        .then(() => {
          if (user) void saveCloudState(user.id, state).catch(() => {});
        })
        .catch(() => notify('No se han podido guardar los cambios en este navegador.', 'error'));
    }, 250);
    return () => clearTimeout(timer);
  }, [state, phase, notify]);

  const loadJobs = useCallback(async (force = false) => {
    const sources = sourcesRef.current.filter((source) => source !== 'demo' && source !== 'manual');
    if (!sources.length) {
      setRemoteJobs([]);
      setErrors([]);
      return;
    }
    setLoadingJobs(true);
    try {
      const result = await fetchRemoteJobs(sources, { force });
      setRemoteJobs(result.jobs);
      setErrors(result.errors);
      setFetchedAt(result.fetchedAt);
    } catch {
      setErrors([{ source: 'remotive', message: 'No se pudo conectar con las fuentes de empleo.' }]);
    } finally {
      setLoadingJobs(false);
    }
  }, []);

  const sourceKey = state?.settings.sources.join(',') ?? '';
  const onboarded = state?.settings.onboarded ?? false;

  useEffect(() => {
    if (phase !== 'ready' || !onboarded) return;
    // loadJobs también vacía las ofertas remotas si ya no queda ninguna fuente activa.
    void loadJobs(false);
  }, [phase, onboarded, sourceKey, loadJobs]);

  const navigate = useCallback((view: string) => {
    if (!ROUTES.includes(view as Route)) return;
    location.hash = `#/${view}`;
    setRoute(view as Route);
  }, []);

  const update = useCallback((recipe: (current: AppState) => AppState) => {
    setState((current) => (current ? recipe(current) : current));
  }, []);

  const setDecision = useCallback(
    (jobId: string, nextState: JobState | null, note?: string) => {
      update((current) => {
        const decisions: Record<string, Decision> = { ...current.decisions };
        if (nextState === null) {
          delete decisions[jobId];
        } else {
          decisions[jobId] = {
            state: nextState,
            note: note ?? decisions[jobId]?.note ?? '',
            updatedAt: Date.now(),
          };
        }
        return { ...current, decisions };
      });
    },
    [update],
  );

  const updateProfile = useCallback(
    (profile: Profile) => update((current) => ({ ...current, profile })),
    [update],
  );

  const updateCriteria = useCallback(
    (criteria: Criteria) => update((current) => ({ ...current, criteria })),
    [update],
  );

  const updateSettings = useCallback(
    (patch: Partial<Settings>) =>
      update((current) => ({ ...current, settings: { ...current.settings, ...patch } })),
    [update],
  );

  const finishOnboarding = useCallback(
    (profile: Profile, criteria: Criteria) => {
      update((current) => ({
        ...current,
        profile,
        criteria,
        settings: { ...current.settings, onboarded: true },
      }));
      navigate('ofertas');
      notify('Perfil listo. Estas son tus coincidencias.', 'success');
    },
    [update, navigate, notify],
  );

  const loadDemo = useCallback(() => {
    const analysis = analyzeCv(DEMO_CV_TEXT);
    const profile = profileFromAnalysis(analysis, {
      cvText: DEMO_CV_TEXT,
      cvFileName: 'cv-de-ejemplo.txt',
      cvUpdatedAt: Date.now(),
      name: 'Lucía Martín',
    });
    const criteria = defaultCriteria('psicologia');
    update((current) => ({
      ...current,
      profile,
      criteria,
      settings: { ...current.settings, onboarded: true },
    }));
    navigate('ofertas');
    notify('Perfil de ejemplo cargado. Explora sin miedo: no se envía nada.', 'info');
  }, [update, navigate, notify]);

  const handleUnlock = useCallback(
    async (passphrase: string) => {
      const result = await unlockState(passphrase, scope);
      keyRef.current = { key: result.key, salt: result.salt, iterations: result.iterations };
      setState(result.state);
      setPhase('ready');
      notify('Datos desbloqueados.', 'success');
    },
    [notify, scope],
  );

  const handleWipe = useCallback(() => {
    wipeAll(scope);
    keyRef.current = null;
    clearToken();
    setToken(null);
    setGhUser(null);
    setRemoteJobs([]);
    setErrors([]);
    setFetchedAt(null);
    if (user) void deleteCloudState(user.id).catch(() => {});
    const fresh = emptyState();
    setState(fresh);
    setPhase('ready');
    navigate('inicio');
    notify('Datos borrados de este navegador.', 'info');
  }, [navigate, notify, scope, user]);

  const handleEnableLock = useCallback(
    async (passphrase: string) => {
      if (!state) return;
      const context = await enableLock(passphrase, state, scope);
      keyRef.current = context;
      setState((current) => (current ? { ...current, updatedAt: Date.now() } : current));
    },
    [state, scope],
  );

  const handleDisableLock = useCallback(async () => {
    if (!state) return;
    await disableLock(state, scope);
    keyRef.current = null;
    setState((current) => (current ? { ...current, updatedAt: Date.now() } : current));
  }, [state, scope]);

  const handleExport = useCallback(
    async (passphrase: string | null) => {
      if (!state) return;
      let payload: unknown = state;
      if (keyRef.current) {
        payload = await encryptWithKey(
          state,
          keyRef.current.key,
          fromBase64(keyRef.current.salt),
          keyRef.current.iterations,
        );
      } else if (passphrase) {
        payload = await encryptJson(state, passphrase);
      }
      const stamp = new Date().toISOString().slice(0, 10);
      download(`brujula-${stamp}.json`, JSON.stringify(payload, null, 2));
    },
    [state],
  );

  const handleImport = useCallback(
    async (file: File, passphrase: string) => {
      if (file.size > 10 * 1024 * 1024) throw new Error('El archivo es demasiado grande.');
      const parsed = JSON.parse(await file.text()) as unknown;
      let value: unknown = parsed;
      if (isEnvelope(parsed)) {
        if (!passphrase) throw new Error('El archivo está cifrado: introduce su contraseña.');
        value = await decryptJson(parsed, passphrase);
      }
      const next = validateState(value);
      setState(next);
      notify(`Copia importada: ${next.profile.name || 'perfil sin nombre'}.`, 'success');
    },
    [notify],
  );

  const handleUseToken = useCallback(
    async (pat: string) => {
      setAuthBusy(true);
      try {
        const user = await fetchGitHubUser(pat);
        storeToken(pat);
        setToken(pat);
        setGhUser(user);
        notify(`Conectado como @${user.login}.`, 'success');
      } finally {
        setAuthBusy(false);
      }
    },
    [notify],
  );

  const handleLogin = useCallback(() => {
    try {
      startGitHubLogin();
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : 'No se pudo iniciar el login.', 'error');
    }
  }, [notify]);

  const handleLogout = useCallback(() => {
    clearToken();
    setToken(null);
    setGhUser(null);
    if (supabase) void supabase.auth.signOut();
    notify('Sesión cerrada. Tus datos locales siguen aquí.', 'info');
  }, [notify]);

  const handleCloudSave = useCallback(
    async (passphrase: string) => {
      if (!state || !token) throw new Error('Conecta GitHub para sincronizar.');
      setCloudBusy(true);
      try {
        let content: string;
        if (keyRef.current) {
          content = JSON.stringify(
            await encryptWithKey(
              state,
              keyRef.current.key,
              fromBase64(keyRef.current.salt),
              keyRef.current.iterations,
            ),
          );
        } else if (passphrase) {
          content = JSON.stringify(await encryptJson(state, passphrase));
        } else {
          content = JSON.stringify(state);
        }
        const gistId = await saveGist(token, state.settings.gistId, content);
        update((current) => ({
          ...current,
          settings: { ...current.settings, gistId, lastSyncAt: Date.now() },
        }));
      } finally {
        setCloudBusy(false);
      }
    },
    [state, token, update],
  );

  const handleCloudLoad = useCallback(
    async (passphrase: string) => {
      if (!state || !token) throw new Error('Conecta GitHub para sincronizar.');
      setCloudBusy(true);
      try {
        const gistId = state.settings.gistId ?? (await findGist(token));
        if (!gistId) throw new Error('No se ha encontrado ninguna copia de Brújula en tu cuenta.');
        const raw = await readGist(token, gistId);
        if (!raw) throw new Error('La copia está vacía o no se puede leer.');
        const parsed = JSON.parse(raw) as unknown;
        let value: unknown = parsed;
        if (isEnvelope(parsed)) {
          if (!passphrase) throw new Error('La copia está cifrada: introduce la contraseña.');
          value = await decryptJson(parsed, passphrase);
        }
        const next = validateState(value);
        setState({ ...next, settings: { ...next.settings, gistId } });
        notify('Datos restaurados desde GitHub.', 'success');
      } finally {
        setCloudBusy(false);
      }
    },
    [state, token, notify],
  );

  const allJobs = useMemo(() => {
    const demo = demoJobsFor({ includeDemo: state?.criteria.includeDemo ?? true });
    return dedupeJobs([...demo, ...remoteJobs, ...(state?.customJobs ?? [])]);
  }, [state?.criteria.includeDemo, state?.customJobs, remoteJobs]);

  if (phase === 'loading') {
    return (
      <div className="boot-screen">
        <span className="brand-mark"><Icon name="compass" size={26} /></span>
        <p>Preparando tu brújula…</p>
      </div>
    );
  }

  if (phase === 'auth') {
    return (
      <>
        <AuthScreen notify={notify} onGuest={() => setGuestMode(true)} />
        <ToastHost toasts={toasts} onDismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} />
      </>
    );
  }

  if (phase === 'locked') {
    return (
      <>
        <UnlockScreen onUnlock={handleUnlock} onWipe={handleWipe} />
        <ToastHost toasts={toasts} onDismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} />
      </>
    );
  }

  if (!state) return null;

  if (!state.settings.onboarded) {
    return (
      <>
        <Onboarding
          initialProfile={state.profile}
          initialCriteria={state.criteria}
          onFinish={finishOnboarding}
          onDemo={loadDemo}
          notify={notify}
        />
        <ToastHost toasts={toasts} onDismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} />
      </>
    );
  }

  const decisions = state.decisions;
  const lockEnabled = isLocked(scope);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button type="button" className="brand" onClick={() => navigate('inicio')}>
          <span className="brand-mark"><Icon name="compass" size={20} /></span>
          <span className="brand-name">Brújula</span>
        </button>
        <p className="sidebar-tagline">Empleo que encaja, no ruido.</p>

        <nav className="sidebar-nav" aria-label="Secciones">
          {NAV.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`nav-item${route === item.id ? ' is-active' : ''}`}
              onClick={() => navigate(item.id)}
              aria-current={route === item.id ? 'page' : undefined}
            >
              <Icon name={item.icon} size={18} />
              <span>{item.label}</span>
              {item.id === 'ofertas' && (
                <span className="nav-badge">
                  {allJobs.filter((job) => !decisions[job.id] || decisions[job.id].state === 'guardada').length}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button type="button" className="account-chip" onClick={() => navigate('ajustes')}>
            {ghUser ? (
              <img src={ghUser.avatar_url} alt="" width={32} height={32} className="avatar avatar-sm" />
            ) : (
              <span className="avatar avatar-sm avatar-fallback"><Icon name="user" size={15} /></span>
            )}
            <span className="account-text">
              <strong>{ghUser ? `@${ghUser.login}` : user ? (user.email ?? 'Cuenta') : (state.profile.name || 'Modo local')}</strong>
              <small>{ghUser ? 'GitHub conectado' : user ? 'Cuenta Supabase' : 'Datos en este navegador'}</small>
            </span>
            {lockEnabled && <Icon name="lock" size={14} />}
          </button>
          <p className="sidebar-privacy"><Icon name="shield" size={12} /> Sin rastreo ni cookies</p>
        </div>
      </aside>

      <header className="mobile-bar">
        <button type="button" className="brand" onClick={() => navigate('inicio')}>
          <span className="brand-mark"><Icon name="compass" size={18} /></span>
          <span className="brand-name">Brújula</span>
        </button>
        <button type="button" className="icon-button" onClick={() => navigate('ajustes')} aria-label="Ajustes">
          <Icon name="settings" size={18} />
        </button>
      </header>

      <main className="app-main">
        {route === 'inicio' && (
          <Dashboard
            state={state}
            jobs={allJobs}
            decisions={decisions}
            onDecision={setDecision}
            onNavigate={navigate}
            onRefresh={() => void loadJobs(true)}
            loading={loadingJobs}
            errors={errors}
            fetchedAt={fetchedAt}
          />
        )}

        {route === 'ofertas' && (
          <OffersView
            jobs={allJobs}
            profile={state.profile}
            criteria={state.criteria}
            decisions={decisions}
            hideApplied={state.settings.hideApplied}
            onDecision={setDecision}
            onAddJob={(job) => update((current) => ({ ...current, customJobs: [job, ...current.customJobs] }))}
            onRefresh={() => void loadJobs(true)}
            onGoCriteria={() => navigate('criterios')}
            loading={loadingJobs}
            errors={errors}
            fetchedAt={fetchedAt}
            notify={notify}
          />
        )}

        {route === 'seguimiento' && (
          <TrackerView
            jobs={allJobs}
            profile={state.profile}
            criteria={state.criteria}
            decisions={decisions}
            onDecision={setDecision}
            onGoOffers={() => navigate('ofertas')}
          />
        )}

        {route === 'perfil' && (
          <ProfileView profile={state.profile} onUpdate={updateProfile} notify={notify} />
        )}

        {route === 'criterios' && (
          <CriteriaView
            criteria={state.criteria}
            profile={state.profile}
            jobs={allJobs}
            decisions={decisions}
            onUpdate={updateCriteria}
            onGoOffers={() => navigate('ofertas')}
            notify={notify}
          />
        )}

        {route === 'ajustes' && (
          <SettingsView
            state={state}
            onSettings={updateSettings}
            onToggleDemo={(includeDemo) =>
              update((current) => ({ ...current, criteria: { ...current.criteria, includeDemo } }))
            }
            notify={notify}
            account={{
              token,
              user: ghUser,
              proxyConfigured: Boolean(getProxyUrl()),
              busy: authBusy,
              onLogin: handleLogin,
              onUseToken: handleUseToken,
              onLogout: handleLogout,
            }}
            cloud={{ busy: cloudBusy, onSave: handleCloudSave, onLoad: handleCloudLoad }}
            security={{ locked: lockEnabled, onEnable: handleEnableLock, onDisable: handleDisableLock }}
            data={{
              footprint: storageFootprint(),
              onExport: handleExport,
              onImport: handleImport,
              onWipe: handleWipe,
            }}
          />
        )}
      </main>

      <nav className="bottom-nav" aria-label="Navegación principal">
        {NAV.filter((item) => ['inicio', 'ofertas', 'seguimiento', 'perfil', 'ajustes'].includes(item.id)).map((item) => (
          <button
            key={item.id}
            type="button"
            className={`bottom-item${route === item.id ? ' is-active' : ''}`}
            onClick={() => navigate(item.id)}
            aria-current={route === item.id ? 'page' : undefined}
          >
            <Icon name={item.icon} size={19} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <ToastHost toasts={toasts} onDismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} />
    </div>
  );
}
