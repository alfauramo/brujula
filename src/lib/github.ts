export interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  email: string | null;
}

const TOKEN_KEY = 'brujula:gh_token';
const API = 'https://api.github.com';

export function readToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function storeToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  sessionStorage.removeItem(TOKEN_KEY);
}

export function getProxyUrl(): string {
  const value = import.meta.env.VITE_GITHUB_PROXY_URL as string | undefined;
  return value ? value.replace(/\/$/, '') : '';
}

/**
 * El login de GitHub no se puede completar desde un sitio estático:
 * el intercambio de código exige un client_secret y GitHub no envía CORS.
 * Por eso usamos un proxy mínimo (incluido en /worker) que devuelve el token
 * en el fragmento de la URL, fuera del alcance de logs y cabeceras Referer.
 */
export function startGitHubLogin(proxyUrl = getProxyUrl()): void {
  if (!proxyUrl) throw new Error('Falta configurar el proxy de GitHub.');
  const redirect = `${location.origin}${location.pathname}`;
  const state = crypto.randomUUID();
  sessionStorage.setItem('brujula:oauth_state', state);
  location.assign(`${proxyUrl}/login?redirect=${encodeURIComponent(redirect)}&state=${state}`);
}

export function consumeOAuthResult(): { token: string } | { error: string } | null {
  const hash = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash;
  if (!hash.includes('gh_')) return null;
  const params = new URLSearchParams(hash);
  const token = params.get('gh_token');
  const error = params.get('gh_error');
  const state = params.get('gh_state');
  const expected = sessionStorage.getItem('brujula:oauth_state');
  history.replaceState(null, '', `${location.pathname}${location.search}`);
  if (error) return { error };
  if (!token) return { error: 'No se recibió ningún token de GitHub.' };
  if (state && expected && state !== expected) {
    return { error: 'La verificación de seguridad del login no coincidió. Inténtalo de nuevo.' };
  }
  return { token };
}

async function api<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init?.headers ?? {}),
    },
  });
  if (!response.ok) {
    const message =
      response.status === 401
        ? 'El token de GitHub no es válido o ha caducado.'
        : `GitHub respondió con un error ${response.status}.`;
    throw new Error(message);
  }
  return (await response.json()) as T;
}

export function fetchGitHubUser(token: string): Promise<GitHubUser> {
  return api<GitHubUser>('/user', token);
}

interface GistFile {
  content?: string;
}

interface Gist {
  id: string;
  description: string;
  files: Record<string, GistFile>;
}

const GIST_DESCRIPTION = 'Brújula · copia de seguridad';
const GIST_FILE = 'brujula.json';

export async function findGist(token: string): Promise<string | null> {
  const gists = await api<Gist[]>('/gists?per_page=100', token);
  const found = gists.find((gist) => gist.description === GIST_DESCRIPTION);
  return found?.id ?? null;
}

export async function readGist(token: string, gistId: string): Promise<string | null> {
  const gist = await api<Gist>(`/gists/${gistId}`, token);
  return gist.files[GIST_FILE]?.content ?? null;
}

export async function saveGist(token: string, gistId: string | null, content: string): Promise<string> {
  const body = JSON.stringify({
    description: GIST_DESCRIPTION,
    public: false,
    files: { [GIST_FILE]: { content } },
  });
  if (gistId) {
    const updated = await api<Gist>(`/gists/${gistId}`, token, { method: 'PATCH', body });
    return updated.id;
  }
  const created = await api<Gist>('/gists', token, { method: 'POST', body });
  return created.id;
}
