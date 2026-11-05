import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Icon } from './ui';

export function AuthScreen({
  notify,
  onGuest,
}: {
  notify: (message: string, kind?: 'success' | 'error' | 'info') => void;
  onGuest?: () => void;
}) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        notify('Sesión iniciada.', 'success');
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        notify('Cuenta creada. Revisa tu email si se requiere confirmación.', 'success');
      }
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : 'No se pudo autenticar.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const sendMagic = async () => {
    if (!supabase || !email) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      setMagicSent(true);
      notify('Te hemos enviado un enlace para entrar sin contraseña.', 'success');
    } catch (reason) {
      notify(reason instanceof Error ? reason.message : 'No se pudo enviar el enlace.', 'error');
    } finally {
      setBusy(false);
    }
  };

  const github = async () => {
    if (!supabase) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'github', options: { redirectTo: window.location.origin } });
      if (error) throw error;
    } catch (reason) {
      notify(
        reason instanceof Error
          ? `${reason.message}. Activa el proveedor GitHub en Supabase (Authentication → Providers) o usa email.`
          : 'No se pudo iniciar GitHub.',
        'error',
      );
      setBusy(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <span className="brand-mark"><Icon name="compass" size={26} /></span>
        <h1>Brújula</h1>
        <p className="auth-copy">
          Inicia sesión para que cada persona tenga sus datos separados. Todo lo que subas (CV, criterios,
          seguimiento) se guarda asociado a tu cuenta.
        </p>
        <form className="auth-form" onSubmit={submit}>
          <label className="field">
            <span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label className="field">
            <span>Contraseña</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          </label>
          <div className="auth-actions">
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? '…' : mode === 'signin' ? 'Entrar' : 'Crear cuenta'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
              {mode === 'signin' ? 'Crear cuenta' : 'Ya tengo cuenta'}
            </button>
          </div>
        </form>
        <div className="auth-alt">
          <button type="button" className="btn btn-ghost btn-sm" onClick={sendMagic} disabled={busy || !email}>
            <Icon name="mail" size={14} /> Enlace mágico sin contraseña
          </button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={github} disabled={busy}>
            <Icon name="github" size={14} /> GitHub
          </button>
        </div>
        {onGuest && (
          <button type="button" className="btn btn-ghost btn-block" onClick={onGuest}>
            Continuar sin cuenta (solo este navegador)
          </button>
        )}
        {magicSent && <p className="form-success">Revisa tu bandeja de entrada y haz clic en el enlace.</p>}
        <p className="fine-print">
          Si Supabase no está configurado, la app funciona en modo local sin cuenta. Tus datos no se comparten entre usuarios.
        </p>
      </div>
    </div>
  );
}
