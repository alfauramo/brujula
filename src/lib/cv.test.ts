import { describe, expect, it } from 'vitest';
import { analyzeCv } from './cv';

const CV = [
  'Lucia Martin Ruiz',
  'Psicologa sanitaria - Madrid',
  'lucia.martin@example.com - +34 600 123 456',
  'PERFIL',
  'Psicologa sanitaria con 6 anos de experiencia en intervencion con infancia,',
  'adolescencia y familias. Terapia cognitivo-conductual y evaluacion psicologica.',
  'EXPERIENCIA',
  'Asociacion Punto de Encuentro - Psicologa (2021 - actualidad)',
  'FORMACION',
  'Master en Psicologia General Sanitaria - Universidad Complutense de Madrid (2019)',
  'IDIOMAS',
  'Ingles C1 - Frances B1',
].join('\n');

describe('análisis de CV', () => {
  const analysis = analyzeCv(CV);

  it('extrae el teléfono con separadores 3-3-3', () => {
    expect(analysis.phone).toBe('+34 600 123 456');
  });

  it('asigna a cada idioma su propio nivel', () => {
    expect(analysis.languages).toEqual(['Inglés (C1)', 'Francés (B1)']);
  });

  it('extrae contacto, experiencia y formación', () => {
    expect(analysis.email).toBe('lucia.martin@example.com');
    expect(analysis.yearsExperience).toBe(6);
    expect(analysis.education.join(' ')).toMatch(/Psicolog[ií]a General Sanitaria/i);
  });
});
