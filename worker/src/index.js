/**
 * Proxy OAuth mínimo para Brújula.
 *
 * GitHub Pages es estático y el intercambio de código OAuth exige un
 * client_secret, que jamás puede vivir en el navegador. Este Worker hace
 * únicamente ese intercambio y devuelve el token en el fragmento (#) de la URL.
 *
 * Variables:
 *   GITHUB_CLIENT_ID      (var)    id público de la OAuth App
 *   GITHUB_CLIENT_SECRET  (secret) wrangler secret put GITHUB_CLIENT_SECRET
 *   STATE_SECRET          (secret) wrangler secret put STATE_SECRET
 *   ALLOWED_ORIGINS       (var)    orígenes permitidos, separados por comas
 */

const AUTHORIZE = 'https://github.com/login/oauth/authorize';
const TOKEN = 'https://github.com/login/oauth/access_token';
const SCOPES = 'read:user gist';
const STATE_TTL_MS = 10 * 60 * 1000;

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname === '/health') {
        return json({ ok: true, service: 'brujula-oauth' });
      }
      if (url.pathname === '/login') return await login(url, env);
      if (url.pathname === '/callback') return await callback(url, env);
      return new Response('Not found', { status: 404 });
    } catch {
      // Nunca exponemos detalles internos ni secretos en la respuesta.
      return new Response('OAuth error', { status: 500 });
    }
  },
};

function json(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

function allowedOrigins(env) {
  return (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function isAllowedRedirect(value, env) {
  try {
    const target = new URL(value);
    return allowedOrigins(env).includes(target.origin);
  } catch {
    return false;
  }
}

async function login(url, env) {
  const redirect = url.searchParams.get('redirect') || '';
  const appState = url.searchParams.get('state') || '';
  if (!isAllowedRedirect(redirect, env)) {
    return new Response('Origen no autorizado. Revisa ALLOWED_ORIGINS.', { status: 400 });
  }
  if (!env.GITHUB_CLIENT_ID || !env.STATE_SECRET) {
    return new Response('Falta configuración del Worker.', { status: 500 });
  }

  const state = await sign({ redirect, appState, ts: Date.now() }, env.STATE_SECRET);
  const target = new URL(AUTHORIZE);
  target.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
  target.searchParams.set('redirect_uri', `${url.origin}/callback`);
  target.searchParams.set('scope', SCOPES);
  target.searchParams.set('allow_signup', 'true');
  target.searchParams.set('state', state);
  return Response.redirect(target.toString(), 302);
}

async function callback(url, env) {
  const code = url.searchParams.get('code');
  const stateRaw = url.searchParams.get('state');
  const state = await verify(stateRaw, env.STATE_SECRET);
  if (!state) {
    return new Response('Estado de OAuth inválido o caducado. Vuelve a intentarlo desde la app.', {
      status: 400,
    });
  }

  const target = new URL(state.redirect);
  const params = new URLSearchParams();
  if (state.appState) params.set('gh_state', state.appState);

  if (!code) {
    params.set('gh_error', url.searchParams.get('error_description') || 'Autorización cancelada.');
    target.hash = params.toString();
    return Response.redirect(target.toString(), 302);
  }

  const response = await fetch(TOKEN, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'brujula-oauth',
    },
    body: JSON.stringify({
      client_id: env.GITHUB_CLIENT_ID,
      client_secret: env.GITHUB_CLIENT_SECRET,
      code,
      redirect_uri: `${url.origin}/callback`,
    }),
  });

  const data = await response.json();
  if (data.access_token) {
    params.set('gh_token', data.access_token);
  } else {
    params.set('gh_error', data.error_description || data.error || 'No se pudo completar el login.');
  }
  target.hash = params.toString();
  return Response.redirect(target.toString(), 302);
}

function toBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((value.length + 3) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function hmacKey(secret) {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

async function sign(payload, secret) {
  const body = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await hmacKey(secret);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
  return `${body}.${toBase64Url(new Uint8Array(signature))}`;
}

async function verify(token, secret) {
  if (!token || !secret) return null;
  const [body, signature] = token.split('.');
  if (!body || !signature) return null;
  try {
    const key = await hmacKey(secret);
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      fromBase64Url(signature),
      new TextEncoder().encode(body),
    );
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body)));
    if (typeof payload.ts !== 'number' || Date.now() - payload.ts > STATE_TTL_MS) return null;
    return payload;
  } catch {
    return null;
  }
}
