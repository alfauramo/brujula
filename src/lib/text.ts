const ACCENTS = /[\u0300-\u036f]/g;

/** Minúsculas, sin acentos y con espacios colapsados. */
export function normalize(value: string): string {
  return value
    .normalize('NFD')
    .replace(ACCENTS, '')
    .replace(/[’'`]/g, ' ')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

const STOP = new Set([
  'de', 'la', 'el', 'los', 'las', 'un', 'una', 'unos', 'unas', 'y', 'o', 'u', 'e', 'en', 'con',
  'para', 'por', 'del', 'al', 'que', 'se', 'su', 'sus', 'como', 'mas', 'muy', 'sin', 'sobre',
  'entre', 'este', 'esta', 'estos', 'estas', 'the', 'and', 'of', 'to', 'in', 'for', 'with', 'a',
  'an', 'on', 'at', 'is', 'are', 'be', 'as', 'or', 'we', 'you', 'our', 'your',
]);

export function words(value: string): string[] {
  return normalize(value)
    .replace(/[^a-z0-9ñü]+/g, ' ')
    .split(' ')
    .filter((word) => word.length > 1 && !STOP.has(word));
}

function stem(word: string): string {
  if (word.length <= 6) return word;
  return word.slice(0, 6);
}

/**
 * Comprueba si un término aparece en un texto ya normalizado.
 * Acepta variantes morfológicas simples (psicólogo / psicóloga / psicología)
 * comparando prefijos de 5-6 letras.
 */
export function termMatches(haystack: string, term: string): boolean {
  const needle = normalize(term);
  if (!needle) return false;
  if (haystack.includes(needle)) return true;

  const parts = words(needle);
  if (parts.length === 0) return false;

  if (parts.length === 1 && parts[0].length >= 5) {
    const prefix = parts[0].slice(0, 5);
    return words(haystack).some((word) => word.startsWith(prefix) && word.length >= 5);
  }

  const haystackStems = new Set(words(haystack).map(stem));
  return parts.filter((part) => part.length > 3).every((part) => haystackStems.has(stem(part)));
}

export function countMatches(haystack: string, terms: string[]): number {
  return terms.reduce((total, term) => (termMatches(haystack, term) ? total + 1 : total), 0);
}

export function unique<T>(items: T[]): T[] {
  return [...new Set(items)];
}

export function truncate(value: string, max: number): string {
  if (value.length <= max) return value;
  return `${value.slice(0, max - 1).trimEnd()}…`;
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function parseSalary(text: string): { min: number | null; max: number | null; currency: string } {
  const clean = normalize(text);
  const currency = /usd|\$|dollar/.test(clean) ? 'USD' : 'EUR';
  // Normaliza separadores de miles: 24.000 -> 24000, 24,000 -> 24000.
  const compact = clean.replace(/(\d)[.,](\d{3})(?!\d)/g, '$1$2');
  const values: number[] = [];
  for (const match of compact.matchAll(/(\d{4,6}|\d{2,3}(?:[.,]\d{1,2})?)\s*(k|mil)?/g)) {
    let value = Number(match[1].replace(',', '.'));
    if (match[2]) value *= 1000;
    if (value >= 12_000 && value <= 300_000) values.push(Math.round(value));
  }
  if (!values.length) return { min: null, max: null, currency };
  return { min: Math.min(...values), max: Math.max(...values), currency };
}
