import { useState } from 'react';
import { Icon } from './ui';

export function UnlockScreen({
  onUnlock,
  onWipe,
}: {
  onUnlock: (passphrase: string) => Promise<void>;
  onWipe: () => void;
}) {
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmWipe, setConfirmWipe] = useState(false);

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      await onUnlock(passphrase);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo desbloquear.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="unlock-screen">
      <div className="unlock-card">
        <div className="brand brand-center">
          <span className="brand-mark"><Icon name="compass" size={22} /></span>
          <span className="brand-name">Brújula</span>
        </div>
        <h1>Tus datos están cifrados</h1>
        <p className="lead">
          Introduce la contraseña que elegiste para desbloquear tu perfil, tu CV y tu seguimiento.
        </p>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
        >
          <label className="field">
            <span>Contraseña</span>
            <input
              type="password"
              value={passphrase}
              onChange={(event) => setPassphrase(event.target.value)}
              autoFocus
              autoComplete="current-password"
              placeholder="Tu contraseña"
            />
          </label>
          {error && <p className="form-error"><Icon name="alert" size={14} /> {error}</p>}
          <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={busy || !passphrase}>
            <Icon name="unlock" size={16} /> {busy ? 'Descifrando…' : 'Desbloquear'}
          </button>
        </form>
        <p className="fine-print">
          <Icon name="shield" size={13} /> La contraseña no se guarda en ningún sitio. Si la pierdes, los datos
          no se pueden recuperar.
        </p>
        {!confirmWipe ? (
          <button type="button" className="link-button" onClick={() => setConfirmWipe(true)}>
            He olvidado la contraseña
          </button>
        ) : (
          <div className="banner banner-warning">
            <p>Si continúas se borrarán los datos cifrados de este navegador.</p>
            <div className="button-row">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirmWipe(false)}>
                Cancelar
              </button>
              <button type="button" className="btn btn-danger btn-sm" onClick={onWipe}>
                <Icon name="trash" size={14} /> Borrar y empezar de cero
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
