import { describe, expect, it } from 'vitest';
import { decryptJson, encryptJson, isEnvelope } from './crypto';

describe('cifrado de datos', () => {
  it('cifra y descifra un estado completo', async () => {
    const payload = {
      version: 1,
      profile: { name: 'Lucía', cvText: 'texto privado del CV' },
      notes: ['entrevista el lunes'],
    };
    const envelope = await encryptJson(payload, 'contraseña-segura');
    expect(isEnvelope(envelope)).toBe(true);
    expect(envelope.data).not.toContain('Lucía');

    const decrypted = await decryptJson<typeof payload>(envelope, 'contraseña-segura');
    expect(decrypted).toEqual(payload);
  });

  it('rechaza una contraseña incorrecta', async () => {
    const envelope = await encryptJson({ secret: true }, 'contraseña-correcta');
    await expect(decryptJson(envelope, 'contraseña-incorrecta')).rejects.toBeTruthy();
  });

  it('exige una longitud mínima de contraseña', async () => {
    await expect(encryptJson({}, 'corta')).rejects.toThrow(/al menos 8/);
  });

  it('no confunde datos arbitrarios con un sobre cifrado', () => {
    expect(isEnvelope({ profile: {} })).toBe(false);
    expect(isEnvelope(null)).toBe(false);
    expect(isEnvelope({ v: 1, alg: 'AES-GCM', salt: 'x', iv: 'y', data: 'z' })).toBe(true);
  });
});
