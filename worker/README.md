# Proxy OAuth de Brújula

Worker de Cloudflare que completa el intercambio de código de GitHub. Es la única
pieza que necesita un servidor, y solo se usa si quieres el botón «Entrar con GitHub».

## Desplegarlo

```bash
cd worker
npx wrangler login
npx wrangler secret put GITHUB_CLIENT_SECRET   # secreto de tu OAuth App
npx wrangler secret put STATE_SECRET           # inventa una cadena larga y aleatoria
npx wrangler deploy
```

Antes de desplegar, edita `wrangler.toml`:

- `GITHUB_CLIENT_ID`: el Client ID de tu OAuth App.
- `ALLOWED_ORIGINS`: por ejemplo `https://tuusuario.github.io,http://localhost:5173`.

En la OAuth App de GitHub configura la callback como:

```
https://brujula-oauth.TU-SUBDOMINIO.workers.dev/callback
```

Después, en la raíz del proyecto, crea `.env` con:

```
VITE_GITHUB_PROXY_URL=https://brujula-oauth.TU-SUBDOMINIO.workers.dev
```

y vuelve a compilar. Sin esta variable, la app funciona igualmente en modo local
(que es el modo recomendado por defecto).
