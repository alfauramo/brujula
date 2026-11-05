import { useEffect, useRef, useState } from 'react';
import type { AppState, Settings as SettingsType, SourceId } from '../types';
import type { GitHubUser } from '../lib/github';
import { REMOTE_SOURCES } from '../lib/sources';
import { Icon, Modal, Switch } from './ui';

interface SettingsProps {
  state: AppState;
  onSettings: (patch: Partial<SettingsType>) => void;
  onToggleDemo: (value: boolean) => void;
  notify: (message: string, kind?: 'success' | 'error' | 'info') => void;
  account: {
    token: string | null;
    user: GitHubUser | null;
    proxyConfigured: boolean;
    busy: boolean;
    onLogin: () => void;
    onUseToken: (token: string) => Promise<void>;
    onLogout: () => void;
  };
  cloud: {
    busy: boolean;
    onSave: (passphrase: string) => Promise<void>;
    onLoad: (passphrase: string) => Promise<void>;
  };
  security: {
    locked: boolean;
    onEnable: (passphrase: string) => Promise<void>;
    onDisable: () => Promise<void>;
  };
  data: {
    footprint: string;
    onExport: (passphrase: string | null) => Promise<void>;
    onImport: (file: File, passphrase: string) => Promise<void>;
    onWipe: () => void;
  };
}

export function SettingsView({
  state,
  onSettings,
  onToggleDemo,
  notify,
  account,
  cloud,
  security,
  data,
}: SettingsProps) {
  const [lockOpen, setLockOpen] = useState(false);
  const [wipeOpen, setWipeOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [advanced, setAdvanced] = useState(false);
  const [pat, setPat] = useState('');
  const [pass, setPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [cloudPass, setCloudPass] = useState('');
  const [exportPass, setExportPass] = useState('');
  const [importPass, setImportPass] = useState('');
  const [importFile, setImportFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const importInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!lockOpen) {
      setPass('');
      setConfirmPass('');
    }
  }, [lockOpen]);

  const run = async (task: () => Promise<void>, success?: string) => {
    setBusy(true);
    try {
      await task();
      if (success) notify(success, 'success');
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : 'Algo ha fallado.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="view">
      <header className="view-header">
        <div>
          <p className="eyebrow">Ajustes</p>
          <h1>Tu cuenta, tus datos</h1>
          <p className="view-subtitle">
            Brújula funciona sin cuenta. GitHub es opcional y solo sirve para sincronizar entre dispositivos.
          </p>
        </div>
      </header>

      <div className="settings-grid">
        <section className="card">
          <div className="card-header">
            <h2><Icon name="github" size={17} /> Cuenta de GitHub</h2>
            {account.token ? <span className="chip chip-good">Conectada</span> : <span className="chip chip-neutral">Modo local</span>}
          </div>

          {account.token && account.user ? (
            <div className="account-row">
              <img className="avatar" src={account.user.avatar_url} alt="" width={48} height={48} />
              <div>
                <strong>{account.user.name || account.user.login}</strong>
                <a href={account.user.html_url} target="_blank" rel="noopener noreferrer">@{account.user.login}</a>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={account.onLogout}>
                Cerrar sesión
              </button>
            </div>
          ) : (
            <>
              <p className="card-copy">
                Inicia sesión para guardar una copia cifrada de tu perfil, criterios y seguimiento en un
                Gist privado. Sin backend propio y sin compartir tu CV con terceros.
              </p>
              <div className="button-row">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={account.onLogin}
                  disabled={!account.proxyConfigured || account.busy}
                >
                  <Icon name="github" size={16} /> Entrar con GitHub
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAdvanced((value) => !value)}>
                  {advanced ? 'Ocultar acceso avanzado' : 'Usar un token personal'}
                </button>
              </div>
              {!account.proxyConfigured && (
                <div className="banner banner-info">
                  <Icon name="info" size={15} />
                  <p>
                    Falta configurar el proxy OAuth para que el botón funcione en GitHub Pages. Está incluido
                    en la carpeta <code>worker/</code> del proyecto; las instrucciones están en el README.
                    Mientras tanto, puedes usar un token personal.
                  </p>
                </div>
              )}
              {advanced && (
                <div className="inline-form">
                  <label className="field">
                    <span>Token personal (solo se guarda en esta pestaña)</span>
                    <input
                      type="password"
                      value={pat}
                      onChange={(event) => setPat(event.target.value)}
                      placeholder="ghp_… o github_pat_…"
                      autoComplete="off"
                    />
                  </label>
                  <button
                    type="button"
                    className="btn btn-primary btn-sm"
                    disabled={!pat.trim() || account.busy}
                    onClick={() => run(async () => { await account.onUseToken(pat.trim()); setPat(''); })}
                  >
                    Conectar token
                  </button>
                </div>
              )}
            </>
          )}

          {account.token && (
            <div className="cloud-panel">
              <h3>Sincronización con Gist privado</h3>
              <p className="fine-print">
                {state.settings.lastSyncAt
                  ? `Última sincronización: ${new Date(state.settings.lastSyncAt).toLocaleString('es-ES')}`
                  : 'Todavía no has guardado ninguna copia.'}
              </p>
              <label className="field">
                <span>Contraseña de la copia (si tienes el bloqueo activado)</span>
                <input
                  type="password"
                  value={cloudPass}
                  onChange={(event) => setCloudPass(event.target.value)}
                  placeholder="Tu contraseña"
                  autoComplete="off"
                />
              </label>
              <div className="button-row">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  disabled={cloud.busy}
                  onClick={() => run(() => cloud.onSave(cloudPass), 'Copia guardada en tu Gist privado.')}
                >
                  <Icon name="cloud" size={14} /> {cloud.busy ? 'Sincronizando…' : 'Guardar copia'}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  disabled={cloud.busy}
                  onClick={() => run(() => cloud.onLoad(cloudPass))}
                >
                  <Icon name="download" size={14} /> Restaurar copia
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="card">
          <div className="card-header">
            <h2><Icon name="lock" size={17} /> Bloqueo y cifrado</h2>
            {security.locked ? <span className="chip chip-good">Cifrado activo</span> : <span className="chip chip-neutral">Sin cifrar</span>}
          </div>
          <p className="card-copy">
            {security.locked
              ? 'Tus datos se guardan cifrados con AES-256-GCM y una clave derivada de tu contraseña (PBKDF2, 310.000 iteraciones). Se te pedirá al abrir la app.'
              : 'Activa el bloqueo para cifrar el perfil, el CV y las notas en este navegador. La contraseña no se guarda en ningún sitio: si la pierdes, no podremos recuperarla.'}
          </p>
          <div className="button-row">
            {security.locked ? (
              <>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setLockOpen(true)}>
                  Cambiar contraseña
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm danger"
                  disabled={busy}
                  onClick={() => run(() => security.onDisable(), 'Bloqueo desactivado. Los datos vuelven a guardarse sin cifrar.')}
                >
                  <Icon name="unlock" size={14} /> Quitar bloqueo
                </button>
              </>
            ) : (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setLockOpen(true)}>
                <Icon name="lock" size={14} /> Activar bloqueo
              </button>
            )}
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h2><Icon name="download" size={17} /> Copia de seguridad</h2>
            <span className="fine-print">{data.footprint} en este navegador</span>
          </div>
          <p className="card-copy">
            Exporta un archivo con todo tu perfil, criterios y seguimiento. Si indicas una contraseña,
            el archivo se cifra y solo podrá abrirse con ella.
          </p>
          <label className="field">
            <span>Contraseña para exportar <em>(opcional, recomendada)</em></span>
            <input
              type="password"
              value={exportPass}
              onChange={(event) => setExportPass(event.target.value)}
              placeholder="Mínimo 8 caracteres"
              autoComplete="new-password"
            />
          </label>
          <div className="button-row">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={busy}
              onClick={() => run(() => data.onExport(exportPass || null), 'Archivo de copia descargado.')}
            >
              <Icon name="download" size={14} /> Exportar datos
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => importInput.current?.click()}>
              <Icon name="upload" size={14} /> Importar
            </button>
            <input
              ref={importInput}
              type="file"
              accept="application/json,.json"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  setImportFile(file);
                  setImportOpen(true);
                }
                event.target.value = '';
              }}
            />
          </div>
          <p className="fine-print">
            También puedes borrar todo. Esta acción no se puede deshacer.
          </p>
          <button type="button" className="btn btn-ghost btn-sm danger" onClick={() => setWipeOpen(true)}>
            <Icon name="trash" size={14} /> Borrar todos mis datos
          </button>
        </section>

        <section className="card">
          <div className="card-header"><h2><Icon name="compass" size={17} /> Fuentes de ofertas</h2></div>
          <Switch
            checked={state.criteria.includeDemo}
            onChange={onToggleDemo}
            label="Ofertas de ejemplo"
            description="Un conjunto verosímil para probar la app sin conexión."
          />
          <div className="source-toggles">
            {REMOTE_SOURCES.map((source) => (
              <Switch
                key={source.id}
                checked={state.settings.sources.includes(source.id)}
                onChange={(checked) => {
                  const current = new Set<SourceId>(state.settings.sources);
                  if (checked) current.add(source.id);
                  else current.delete(source.id);
                  onSettings({ sources: [...current] });
                }}
                label={source.label}
                description={source.note}
              />
            ))}
          </div>
          <p className="fine-print">
            Estas fuentes son gratuitas y devuelven sobre todo ofertas remotas o internacionales. Para el
            mercado local, usa los portales desde la vista de ofertas. Tu CV no se envía a ninguna de ellas.
          </p>
        </section>

        <section className="card">
          <div className="card-header"><h2><Icon name="settings" size={17} /> Apariencia</h2></div>
          <fieldset className="field">
            <legend>Tema</legend>
            <div className="choice-row">
              {(['auto', 'light', 'dark'] as const).map((theme) => (
                <button
                  key={theme}
                  type="button"
                  className={`choice${state.settings.theme === theme ? ' is-active' : ''}`}
                  onClick={() => onSettings({ theme })}
                >
                  {theme === 'auto' ? 'Sistema' : theme === 'light' ? 'Blanco' : 'Oscuro'}
                </button>
              ))}
            </div>
          </fieldset>
          <Switch
            checked={state.settings.hideApplied}
            onChange={(hideApplied) => onSettings({ hideApplied })}
            label="Ocultar ofertas aplicadas"
            description="Se guardan en el tablero de seguimiento, pero desaparecen de la lista principal."
          />
        </section>

        <section className="card card-wide">
          <div className="card-header"><h2><Icon name="info" size={17} /> Sobre Brújula</h2></div>
          <p className="card-copy">
            Brújula es una aplicación estática: no tiene servidor ni base de datos. El matching se calcula
            en tu navegador y los datos se guardan en <code>localStorage</code>. Eso significa que si borras
            los datos del navegador, desaparecen: exporta una copia de vez en cuando.
          </p>
          <ul className="plain-list">
            <li>Sin cookies de analítica, sin publicidad, sin rastreo.</li>
            <li>El CV no se envía a las APIs de empleo; solo se hace la búsqueda por criterios.</li>
            <li>Las ofertas externas pueden cambiar o desaparecer: verifica siempre la fuente original.</li>
            <li>GitHub Pages sirve la app; el login opcional usa un proxy OAuth mínimo incluido en el repo.</li>
          </ul>
        </section>
      </div>

      <Modal
        open={lockOpen}
        onClose={() => setLockOpen(false)}
        title={security.locked ? 'Cambiar contraseña' : 'Activar bloqueo'}
        subtitle="Mínimo 8 caracteres. No se puede recuperar si la olvidas."
        footer={
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setLockOpen(false)}>Cancelar</button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={pass.length < 8 || pass !== confirmPass || busy}
              onClick={() =>
                run(async () => {
                  await security.onEnable(pass);
                  setLockOpen(false);
                }, 'Bloqueo activado. Tus datos están cifrados.')
              }
            >
              {busy ? 'Cifrando…' : security.locked ? 'Cambiar contraseña' : 'Activar bloqueo'}
            </button>
          </div>
        }
      >
        <label className="field">
          <span>Contraseña</span>
          <input type="password" value={pass} onChange={(event) => setPass(event.target.value)} autoComplete="new-password" />
        </label>
        <label className="field">
          <span>Repite la contraseña</span>
          <input type="password" value={confirmPass} onChange={(event) => setConfirmPass(event.target.value)} autoComplete="new-password" />
        </label>
        {pass.length > 0 && pass.length < 8 && <p className="form-warning">Usa al menos 8 caracteres.</p>}
        {confirmPass.length > 0 && pass !== confirmPass && <p className="form-error">Las contraseñas no coinciden.</p>}
      </Modal>

      <Modal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        title="Importar copia de seguridad"
        subtitle={importFile?.name}
        footer={
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setImportOpen(false)}>Cancelar</button>
            <button
              type="button"
              className="btn btn-primary"
              disabled={!importFile || busy}
              onClick={() =>
                run(async () => {
                  if (!importFile) return;
                  await data.onImport(importFile, importPass);
                  setImportOpen(false);
                  setImportPass('');
                })
              }
            >
              Importar y reemplazar
            </button>
          </div>
        }
      >
        <p className="card-copy">
          La importación reemplaza tu perfil, criterios y seguimiento actuales. Si el archivo está cifrado,
          introduce su contraseña.
        </p>
        <label className="field">
          <span>Contraseña del archivo <em>(si está cifrado)</em></span>
          <input type="password" value={importPass} onChange={(event) => setImportPass(event.target.value)} autoComplete="off" />
        </label>
      </Modal>

      <Modal
        open={wipeOpen}
        onClose={() => setWipeOpen(false)}
        title="Borrar todos los datos"
        subtitle="Esta acción no se puede deshacer."
        footer={
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setWipeOpen(false)}>Cancelar</button>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => {
                data.onWipe();
                setWipeOpen(false);
              }}
            >
              <Icon name="trash" size={14} /> Borrar todo
            </button>
          </div>
        }
      >
        <p className="card-copy">
          Se eliminarán tu CV, tu perfil, tus criterios, tus notas y tu historial de candidaturas de este
          navegador. Si tienes una copia exportada o en GitHub, podrás restaurarla después.
        </p>
      </Modal>
    </div>
  );
}
