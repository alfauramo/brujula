import type { CvAnalysis, Profile, SectorPackId } from '../types';
import { PACKS } from '../data/packs';
import { ROLE_LEXICON, SKILLS, findLanguages } from '../data/skills';
import { normalize, termMatches, truncate, unique } from './text';

const MAX_FILE_BYTES = 15 * 1024 * 1024;

const CITIES = [
  'Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Zaragoza', 'Málaga', 'Murcia', 'Palma',
  'Las Palmas', 'Bilbao', 'Alicante', 'Córdoba', 'Valladolid', 'Vigo', 'Gijón', 'Granada',
  'A Coruña', 'Vitoria', 'Pamplona', 'Santander', 'Salamanca', 'Toledo', 'Cádiz', 'Sevilla',
  'Oviedo', 'Badajoz', 'Logroño', 'Madrid', 'Burgos', 'Albacete', 'Castellón', 'Almería',
  'Huelva', 'Lleida', 'Tarragona', 'Girona', 'Jaén', 'Ourense', 'Lugo', 'Ávila', 'Segovia',
  'Cuenca', 'Teruel', 'Huesca', 'Soria', 'Zamora', 'Palencia', 'León', 'Ceuta', 'Melilla',
];

export async function extractTextFromFile(file: File): Promise<{ text: string; warnings: string[] }> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('El archivo supera los 15 MB. Prueba con un CV más ligero.');
  }
  const name = file.name.toLowerCase();
  const warnings: string[] = [];

  if (name.endsWith('.pdf') || file.type === 'application/pdf') {
    const pdfjs = await import('pdfjs-dist');
    const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const buffer = await file.arrayBuffer();
    const pdfDocument = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
    const pages: string[] = [];
    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) {
      const page = await pdfDocument.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) => ('str' in item ? item.str : ''))
        .join(' ')
        .replace(/\s+/g, ' ');
      pages.push(text);
    }
    let text = pages.join('\n\n').trim();
    if (text.length < 200) {
      warnings.push('El PDF tiene poco texto: se intentará OCR por si está escaneado (puede tardar).');
      try {
        const Tesseract = await import('tesseract.js');
        const worker = await Tesseract.createWorker(['spa', 'eng'], 1, { logger: () => {} });
        const ocrPages: string[] = [];
        const limit = Math.min(pdfDocument.numPages, 5);
        for (let pageNumber = 1; pageNumber <= limit; pageNumber += 1) {
          const page = await pdfDocument.getPage(pageNumber);
          const viewport = page.getViewport({ scale: 2 });
          const canvas = document.createElement('canvas');
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const context = canvas.getContext('2d');
          if (!context) continue;
          await page.render({ canvasContext: context, viewport, canvas }).promise;
          const result = await worker.recognize(canvas);
          ocrPages.push(result?.data?.text ?? '');
        }
        await worker.terminate();
        const ocrText = ocrPages.join('\n\n').trim();
        if (ocrText.length > text.length) text = ocrText;
      } catch {
        warnings.push('No se pudo hacer OCR del PDF. Pega el texto a mano si el archivo es una imagen.');
      }
    }
    if (!text.trim()) {
      throw new Error(
        'No se ha podido extraer texto del PDF. Si es un escaneo, conviértelo a imagen (PNG/JPG) o pega el CV a mano.',
      );
    }
    return { text, warnings };
  }

  if (name.endsWith('.docx')) {
    const mammoth = await import('mammoth');
    const buffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    if (result.messages.length) {
      warnings.push('El DOCX tenía elementos que no se han podido leer; revisa el texto extraído.');
    }
    return { text: result.value.trim(), warnings };
  }

  if (name.endsWith('.doc')) {
    const text = await extractLegacyDoc(file);
    if (!text.trim()) {
      throw new Error('No se ha podido leer el .doc antiguo. Guárdalo como PDF o DOCX y vuelve a subirlo.');
    }
    warnings.push('El formato .doc antiguo se lee de forma aproximada; conviértelo a DOCX si falta texto.');
    return { text, warnings };
  }

  if (file.type.startsWith('image/') || /\\.(png|jpe?g|webp|bmp|tif{1,2})$/.test(name)) {
    const Tesseract = await import('tesseract.js');
    const worker = await Tesseract.createWorker(['spa', 'eng'], 1, { logger: () => {} });
    try {
      const result = await worker.recognize(file);
      const text = (result?.data?.text ?? '').trim();
      if (!text) throw new Error('No se ha detectado texto en la imagen.');
      warnings.push('Texto extraído por OCR (español + inglés). Revisa que sea correcto antes de guardar.');
      return { text, warnings };
    } finally {
      await worker.terminate();
    }
  }

  if (name.endsWith('.txt') || name.endsWith('.md') || file.type.startsWith('text/')) {
    return { text: (await file.text()).trim(), warnings };
  }

  throw new Error('Formato no compatible. Sube un PDF, DOCX, DOC, imagen (PNG/JPG) o TXT.');
}

async function extractLegacyDoc(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  const score = (text: string): number =>
    (text.match(/[A-Za-zÁÉÍÓÚáéíóúñÑüÜ]/g) ?? []).length;

  // Intento UTF-16LE (formato habitual de Word 97-2003).
  let utf16 = '';
  let run16 = '';
  for (let index = 0; index + 1 < bytes.length; index += 2) {
    const code = bytes[index] | (bytes[index + 1] << 8);
    if ((code >= 32 && code !== 127) || code === 10 || code === 13) {
      run16 += String.fromCharCode(code);
    } else {
      if (run16.length >= 6) utf16 += run16 + '\\n';
      run16 = '';
    }
  }
  if (run16.length >= 6) utf16 += run16;

  // Intento Latin-1.
  let latin1 = '';
  let run8 = '';
  for (let index = 0; index < bytes.length; index += 1) {
    const code = bytes[index];
    if ((code >= 32 && code < 127) || code === 10 || code === 13 || (code >= 160 && code <= 255)) {
      run8 += String.fromCharCode(code);
    } else {
      if (run8.length >= 6) latin1 += run8 + '\\n';
      run8 = '';
    }
  }
  if (run8.length >= 6) latin1 += run8;

  return score(utf16) >= score(latin1) ? utf16.trim() : latin1.trim();
}

function findEmail(text: string): string {
  return text.match(/[\w.+-]+@[\w-]+\.[\w.]{2,}/)?.[0] ?? '';
}

function findPhone(text: string): string {
  // Acepta 9 dígitos con separadores libres (600 12 34 56, 600 123 456, 600-123-456)
  // y prefijo internacional opcional.
  const match = text.match(/(?<![\d+])(?:\+\d{1,3}[\s.-]?)?\d(?:[\s.-]?\d){8}(?!\d)/);
  return match?.[0]?.trim() ?? '';
}

function findLinks(text: string): string {
  const links = text.match(/(?:https?:\/\/|www\.)[^\s,;)]+|(?:linkedin\.com|github\.com)\/[^\s,;)]+/gi);
  return unique(links ?? []).slice(0, 3).join(' · ');
}

function findLocation(text: string): string {
  const explicit = text.match(/(?:ubicaci[oó]n|location|residencia|domicilio)\s*[:\-]\s*([^\n]{2,40})/i);
  if (explicit) return explicit[1].trim();
  const normalized = normalize(text);
  for (const city of CITIES) {
    if (termMatches(normalized, city)) return city;
  }
  return '';
}

function findYears(text: string): number | null {
  const explicit = [...text.matchAll(/(\d{1,2})\s*(?:\+)?\s*(?:años|anos|years)/gi)]
    .map((match) => Number(match[1]))
    .filter((value) => value > 0 && value < 45);
  if (explicit.length) return Math.max(...explicit);

  const now = new Date().getFullYear();
  const ranges = [...text.matchAll(/(19|20)\d{2}\s*[-–—]\s*((?:19|20)\d{2}|actualidad|presente|actual)/gi)]
    .map((match) => {
      const start = Number(match[0].slice(0, 4));
      const endRaw = match[2].toLowerCase();
      const end = /actual|presente/.test(endRaw) ? now : Number(endRaw);
      return end - start;
    })
    .filter((value) => value > 0 && value < 45);
  if (ranges.length) return Math.max(...ranges);
  return null;
}

function findName(lines: string[]): string {
  for (const raw of lines.slice(0, 6)) {
    const line = raw.trim();
    if (!line || line.length > 55) continue;
    if (/@|https?|www\.|curr[ií]culum|vitae|\bcv\b/i.test(line)) continue;
    if (/\d/.test(line)) continue;
    const wordCount = line.split(/\s+/).length;
    if (wordCount < 2 || wordCount > 5) continue;
    if (!/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s.'-]+$/.test(line)) continue;
    return line;
  }
  return '';
}

function findHeadline(lines: string[], name: string): string {
  for (const raw of lines.slice(0, 10)) {
    const line = raw.trim();
    if (!line || line === name) continue;
    if (line.length > 90) continue;
    if (/(psic[oó]log|terapeuta|orientador|recruiter|developer|diseñador|analista|gestor|t[eé]cnico)/i.test(line)) {
      return line;
    }
  }
  return '';
}

function findEducation(text: string): string[] {
  const lines = text.split(/\n+/).map((line) => line.trim());
  const found = lines.filter((line) =>
    /(grado|licenciatura|m[aá]ster|doctorado|postgrado|especialista|formaci[oó]n profesional|curso de|seminario)/i.test(
      line,
    ),
  );
  return unique(found.map((line) => truncate(line, 140))).slice(0, 6);
}

function findSummary(text: string, name: string, headline: string): string {
  const lines = text.split(/\n+/).map((line) => line.replace(/\s+/g, ' ').trim());
  const start = lines.findIndex((line) =>
    /^(perfil|resumen|sobre m[ií]|presentaci[oó]n|profile|about)/i.test(line),
  );
  if (start >= 0) {
    const collected: string[] = [];
    for (const line of lines.slice(start + 1)) {
      if (!line) {
        if (collected.length) break;
        continue;
      }
      if (/^[A-ZÁÉÍÓÚÑ\s]{5,}$/.test(line) && collected.length) break;
      collected.push(line);
      if (collected.join(' ').length > 420) break;
    }
    const summary = collected.join(' ').trim();
    if (summary) return truncate(summary, 520);
  }
  const body = lines.filter((line) => line && line !== name && line !== headline).join(' ');
  return truncate(body, 420);
}

function detectPack(normalizedText: string): SectorPackId | null {
  let best: { id: SectorPackId; score: number } | null = null;
  for (const pack of Object.values(PACKS)) {
    if (!pack.cvSignals.length) continue;
    const score = pack.cvSignals.reduce(
      (total, signal) => (termMatches(normalizedText, signal) ? total + 1 : total),
      0,
    );
    if (score > 0 && (!best || score > best.score)) best = { id: pack.id, score };
  }
  return best?.id ?? null;
}

export function analyzeCv(rawText: string): CvAnalysis {
  const text = rawText.replace(/\r/g, '').trim();
  const lines = text.split(/\n+/).map((line) => line.trim());
  const normalized = normalize(text);
  const warnings: string[] = [];

  const name = findName(lines);
  const headline = findHeadline(lines, name);
  const skills = SKILLS.filter((skill) =>
    skill.aliases.some((alias) => termMatches(normalized, alias)),
  )
    .map((skill) => skill.label)
    .slice(0, 24);

  const titles = ROLE_LEXICON.filter((role) => termMatches(normalized, role));
  if (!titles.length && termMatches(normalized, 'psicolog')) titles.push('psicólogo/a');

  const location = findLocation(text);
  const education = findEducation(text);
  const languages = findLanguages(text);
  const yearsExperience = findYears(text);
  const summary = findSummary(text, name, headline);
  const email = findEmail(text);
  const phone = findPhone(text);
  const links = findLinks(text);
  const sectorPack = detectPack(normalized);

  if (text.length < 300) warnings.push('El CV parece muy corto. Revisa el texto antes de continuar.');
  if (!email) warnings.push('No se ha detectado un email. Puedes añadirlo a mano.');
  if (!skills.length) warnings.push('No se han detectado competencias reconocibles; añádelas manualmente.');

  return {
    name,
    headline,
    email,
    phone,
    location,
    links,
    summary,
    skills,
    titles,
    languages,
    education,
    yearsExperience,
    sectorPack,
    warnings,
  };
}

export function profileFromAnalysis(analysis: CvAnalysis, extra: Partial<Profile> = {}): Profile {
  return {
    name: analysis.name,
    headline: analysis.headline,
    email: analysis.email,
    phone: analysis.phone,
    location: analysis.location,
    links: analysis.links,
    summary: analysis.summary,
    cvText: '',
    cvFileName: '',
    cvUpdatedAt: null,
    skills: analysis.skills,
    titles: analysis.titles,
    languages: analysis.languages,
    education: analysis.education,
    yearsExperience: analysis.yearsExperience,
    ...extra,
  };
}
