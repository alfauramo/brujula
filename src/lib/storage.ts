import type { AppState } from '../types';
import {
  decryptWithKey,
  deriveKey,
  encryptWithKey,
  fromBase64,
  isEnvelope,
  randomBytes,
  toBase64,
} from './crypto';

const STATE_KEY = 'brujula:v1:state';
const META_KEY = 'brujula:v1:meta';
const JOBS_CACHE_KEY = 'brujula:v1:jobs-cache';

interface Meta {
  locked: boolean;
  salt?: string;
  iterations?: number;
  updatedAt?: number;
}

export function readMeta(): Meta | null {
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Meta;
    return parsed.locked ? parsed : null;
  } catch {
    return null;
  }
}

export function isLocked(): boolean {
  return readMeta() !== null;
}

export function writeMeta(meta: Meta): void {
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}

export function clearMeta(): void {
  localStorage.removeItem(META_KEY);
}

export function readPlainState(): AppState | null {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (isEnvelope(parsed)) return null;
    return parsed as AppState;
  } catch {
    return null;
  }
}

export async function savePlainState(state: AppState): Promise<void> {
  localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

export async function saveEncryptedState(
  state: AppState,
  key: CryptoKey,
  saltBase64: string,
  iterations: number,
): Promise<void> {
  const envelope = await encryptWithKey(state, key, fromBase64(saltBase64), iterations);
  localStorage.setItem(STATE_KEY, JSON.stringify(envelope));
  writeMeta({ locked: true, salt: saltBase64, iterations, updatedAt: Date.now() });
}

export async function unlockState(passphrase: string): Promise<{ state: AppState; key: CryptoKey; salt: string; iterations: number }> {
  const meta = readMeta();
  const raw = localStorage.getItem(STATE_KEY);
  if (!meta || !meta.salt || !raw) {
    throw new Error('No hay datos cifrados en este navegador.');
  }
  const parsed = JSON.parse(raw) as unknown;
  if (!isEnvelope(parsed)) {
    throw new Error('Los datos guardados no tienen el formato esperado.');
  }
  const iterations = meta.iterations ?? parsed.iterations;
  const key = await deriveKey(passphrase, fromBase64(meta.salt), iterations);
  try {
    const state = await decryptWithKey<AppState>(parsed, key);
    return { state, key, salt: meta.salt, iterations };
  } catch {
    throw new Error('Contraseña incorrecta. Inténtalo de nuevo.');
  }
}

export async function enableLock(
  passphrase: string,
  state: AppState,
): Promise<{ key: CryptoKey; salt: string; iterations: number }> {
  const saltBytes = randomBytes(16);
  const salt = toBase64(saltBytes);
  const key = await deriveKey(passphrase, saltBytes);
  await saveEncryptedState(state, key, salt, 310_000);
  return { key, salt, iterations: 310_000 };
}

export async function disableLock(state: AppState): Promise<void> {
  await savePlainState(state);
  clearMeta();
}

export function hasPlainData(): boolean {
  return localStorage.getItem(STATE_KEY) !== null && !isLocked();
}

export function wipeAll(): void {
  localStorage.removeItem(STATE_KEY);
  localStorage.removeItem(META_KEY);
  localStorage.removeItem(JOBS_CACHE_KEY);
  sessionStorage.removeItem('brujula:gh_token');
}

export function storageFootprint(): string {
  let bytes = 0;
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    if (!key) continue;
    bytes += key.length + (localStorage.getItem(key)?.length ?? 0);
  }
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface JobsCache {
  fetchedAt: number;
  jobs: unknown;
  sources: string[];
}

export function readJobsCache(): JobsCache | null {
  try {
    const raw = localStorage.getItem(JOBS_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<JobsCache>;
    if (!Array.isArray(parsed.sources)) return null;
    return parsed as JobsCache;
  } catch {
    return null;
  }
}

export function writeJobsCache(fetchedAt: number, jobs: unknown, sources: string[]): void {
  try {
    localStorage.setItem(JOBS_CACHE_KEY, JSON.stringify({ fetchedAt, jobs, sources }));
  } catch {
    // Sin espacio: la caché es prescindible, no rompemos la app.
  }
}

/**
 * Valida de forma defensiva un estado importado antes de tocar nada.
 * Evita que un JSON corrupto o malicioso deje la app inutilizable.
 */
export function validateState(value: unknown): AppState {
  if (!value || typeof value !== 'object') throw new Error('El archivo no contiene un perfil válido.');
  const state = value as Partial<AppState>;
  if (state.version !== 1) throw new Error('Versión de datos no compatible.');
  if (!state.profile || typeof state.profile !== 'object') throw new Error('Falta el perfil.');
  if (!state.criteria || typeof state.criteria !== 'object') throw new Error('Faltan los criterios.');
  if (!Array.isArray(state.profile.skills)) throw new Error('El perfil está incompleto.');
  const decisions = state.decisions && typeof state.decisions === 'object' ? state.decisions : {};
  const customJobs = Array.isArray(state.customJobs) ? state.customJobs : [];
  return {
    ...(state as AppState),
    decisions,
    customJobs,
    settings: {
      onboarded: true,
      hideApplied: true,
      theme: 'auto',
      sources: ['demo'],
      lastSyncAt: null,
      gistId: null,
      ...(state.settings ?? {}),
    },
    updatedAt: Date.now(),
  };
}
