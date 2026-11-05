const encoder = new TextEncoder();
const decoder = new TextDecoder();

export const PBKDF2_ITERATIONS = 310_000;

export interface Envelope {
  v: 1;
  alg: 'AES-GCM';
  kdf: 'PBKDF2-SHA256';
  iterations: number;
  salt: string;
  iv: string;
  data: string;
}

export function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return btoa(binary);
}

export function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

export async function deriveKey(
  passphrase: string,
  salt: Uint8Array,
  iterations = PBKDF2_ITERATIONS,
): Promise<CryptoKey> {
  if (passphrase.length < 8) {
    throw new Error('La contraseña debe tener al menos 8 caracteres.');
  }
  const material = await crypto.subtle.importKey('raw', encoder.encode(passphrase), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations, hash: 'SHA-256' },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptWithKey(
  value: unknown,
  key: CryptoKey,
  salt: Uint8Array,
  iterations = PBKDF2_ITERATIONS,
): Promise<Envelope> {
  const iv = randomBytes(12);
  const plaintext = encoder.encode(JSON.stringify(value));
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    plaintext,
  );
  return {
    v: 1,
    alg: 'AES-GCM',
    kdf: 'PBKDF2-SHA256',
    iterations,
    salt: toBase64(salt),
    iv: toBase64(iv),
    data: toBase64(new Uint8Array(cipher)),
  };
}

export async function decryptWithKey<T>(envelope: Envelope, key: CryptoKey): Promise<T> {
  const iv = fromBase64(envelope.iv);
  const cipher = fromBase64(envelope.data);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    cipher as BufferSource,
  );
  return JSON.parse(decoder.decode(plaintext)) as T;
}

export async function encryptJson(value: unknown, passphrase: string): Promise<Envelope> {
  const salt = randomBytes(16);
  const key = await deriveKey(passphrase, salt);
  return encryptWithKey(value, key, salt);
}

export async function decryptJson<T>(envelope: Envelope, passphrase: string): Promise<T> {
  const salt = fromBase64(envelope.salt);
  const key = await deriveKey(passphrase, salt, envelope.iterations);
  return decryptWithKey<T>(envelope, key);
}

export function isEnvelope(value: unknown): value is Envelope {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    candidate.v === 1 &&
    candidate.alg === 'AES-GCM' &&
    typeof candidate.salt === 'string' &&
    typeof candidate.iv === 'string' &&
    typeof candidate.data === 'string'
  );
}
