# Brújula · empleo que encaja

Buscador de empleo **local-first**: subes tu CV, defines qué buscas y la app puntúa cada oferta
explicándote por qué encaja o por qué no. Puedes guardar, aplicar, descartar y llevar un tablero de
seguimiento. Sin cuenta obligatoria, sin backend y sin que tu CV salga de tu navegador.

Pensada inicialmente para perfiles de **psicología** (clínica, educativa, social, asociaciones y
fundaciones), pero con plantillas para **tecnología** y **generalista**. El motor de coincidencia es
genérico: puntúa roles, competencias, ubicación, modalidad, tipo de entidad, nivel, salario, frescura e
idioma.

---

## Qué incluye

- **Onboarding en 4 pasos**: nombre, CV (PDF, DOCX, DOC, imagen con OCR o TXT) o pegar texto, criterios y resumen.
- **Análisis de CV en el dispositivo** con PDF.js y Mammoth: extrae contacto, competencias, idiomas,
  formación, años de experiencia, roles probables y sector.
- **Motor de encaje explicable** (0–100) con razones a favor y en contra, coincidencias y ausencias.
- **Filtros duros**: palabras excluidas, empresas bloqueadas, antigüedad máxima y filtrado estricto por
  modalidad/ubicación/tipo de entidad.
- **Estados**: guardada, aplicada, entrevista, oferta y descartada. Las aplicadas y descartadas
  desaparecen de la lista principal (configurable).
- **Tablero de seguimiento** con notas privadas por oferta.
- **Búsqueda externa**: enlaces ya construidos a InfoJobs, LinkedIn, Indeed, Google Empleo, Milanuncios,
  Empléate, COP Madrid, Remote OK, We Work Remotely y EURES.
- **Ofertas reales opcionales** desde APIs públicas con CORS: Arbeitnow, Remotive y Jobicy.
- **Oferta manual**: para asociaciones, colegios o portales sin API.
- **Cifrado opcional AES-256-GCM** con contraseña (PBKDF2-SHA256, 310 000 iteraciones) y pantalla de
  desbloqueo.
- **Exportación/importación** de copia de seguridad, cifrada o no.
- **GitHub opcional**: login vía proxy OAuth y copia cifrada en un Gist privado.
- **Cuenta opcional con Supabase** (email/contraseña, enlace mágico o GitHub): cada persona tiene sus datos separados
  en Postgres con RLS. Sin configurar, la app funciona en modo local.
- **Tema blanco accesible** (WCAG AA) y oscuro, diseño responsive.

## Lo que **no** hace

- No es un agregador completo de ofertas locales: las APIs públicas son sobre todo remotas o
  internacionales. Para el mercado local se usan los enlaces a portales.
- No rellena solicitudes automáticamente ni envía tu CV a nadie.
- No hay servidor propio ni base de datos: los datos viven en `localStorage`.
- No hay OCR: un PDF escaneado como imagen no se puede leer; pega el texto a mano.

---

## Desarrollo

Requisitos: **Node.js 20+** (probado con 22) y npm.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # Vitest
npm run build    # tsc --noEmit + vite build → dist/
npm run preview  # sirve dist/ localmente
```

### Estructura

```
src/
  App.tsx                 arranque, rutas por hash, persistencia, GitHub/cloud/export
  components/             onboarding, dashboard, ofertas, seguimiento, perfil, criterios, ajustes
  components/ui.tsx       iconos, chips, modal (portal al body), toasts, inputs de etiquetas
  lib/
    cv.ts                 extracción de texto y heurísticas de análisis del CV
    match.ts              motor de encaje, filtros y ordenación
    text.ts               normalización, coincidencia morfológica y salarios
    crypto.ts             AES-GCM + PBKDF2
    storage.ts            localStorage, bloqueo, validación de importaciones
    sources.ts            conectores Arbeitnow/Remotive/Jobicy y ofertas manuales
    github.ts             OAuth, usuario y Gist
  data/                   demo, plantillas de sector, léxico de competencias y portales
worker/                   proxy OAuth para Cloudflare Workers
.github/workflows/        despliegue en GitHub Pages
```

### Tests

```bash
npm test
```

Cubren puntuación, penalizaciones, filtros, estados, inferencia de entidad/modalidad/idioma,
normalización de texto, salarios y cifrado/descifrado (13 tests).

---

## Despliegue en GitHub Pages

El proyecto ya incluye `.github/workflows/deploy.yml` y `base: './'`, así que funciona tanto en
`https://usuario.github.io/repo/` como en un dominio propio.

1. Crea un repositorio y sube el proyecto a la rama `main`.
2. En GitHub: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. El workflow ejecuta tests, compila y publica `dist/`.
4. Si quieres el login de GitHub, define la variable de repositorio
   **Settings → Secrets and variables → Actions → Variables → `VITE_GITHUB_PROXY_URL`** con la URL del
   Worker (ver abajo). Sin ella, la app funciona en modo local y el botón de GitHub muestra las
   instrucciones.

> El workflow falla si algún test no pasa: es intencionado.

### Probar el build estático

```bash
npm run build
npm run preview
```

---

## Login de GitHub (opcional)

GitHub Pages es estático y los endpoints OAuth de GitHub no envían CORS, así que el intercambio de
código (que requiere `client_secret`) no puede hacerse desde el navegador. El repo incluye un Worker
mínimo en `worker/` que solo hace ese intercambio.

### 1. Crear la OAuth App

GitHub → **Settings → Developer settings → OAuth Apps → New OAuth App**:

- **Homepage URL**: `https://tuusuario.github.io/tu-repo/`
- **Authorization callback URL**: `https://brujula-oauth.TU-SUBDOMINIO.workers.dev/callback`

Anota el **Client ID** y genera un **Client secret**.

### 2. Desplegar el Worker

```bash
cd worker
npx wrangler login
npx wrangler secret put GITHUB_CLIENT_SECRET   # el secret de la OAuth App
npx wrangler secret put STATE_SECRET           # cadena larga y aleatoria
npx wrangler deploy
```

Edita antes `worker/wrangler.toml`:

- `GITHUB_CLIENT_ID`: el Client ID público.
- `ALLOWED_ORIGINS`: `https://tuusuario.github.io,http://localhost:5173`
  (y el dominio real si usas uno propio). El Worker rechaza cualquier `redirect` fuera de esa lista.

### 3. Conectar la app

En la raíz del proyecto crea `.env` (o define la variable en Actions):

```
VITE_GITHUB_PROXY_URL=https://brujula-oauth.TU-SUBDOMINIO.workers.dev
```

Reinicia `npm run dev` o vuelve a compilar. El token se guarda en `sessionStorage`, no en
`localStorage`, y se borra al cerrar la pestaña o al cerrar sesión.

**Alternativa sin Worker**: en Ajustes → usar un token personal (PAT) con permiso `gist` y `read:user`.
Es útil para probar, pero no lo recomendamos como flujo habitual.

### Sincronización

Con GitHub conectado puedes guardar una copia en un **Gist privado**. Si el bloqueo está activo, la copia
se cifra antes de subirla. La app solo crea o actualiza un Gist con descripción `Brújula · copia de
seguridad`.

---

## Privacidad y seguridad

- **Todo se procesa en el navegador.** El CV se lee con PDF.js/Mammoth y nunca se sube a un servidor.
- **Sin cuentas obligatorias, cookies de terceros, analítica ni publicidad.**
- **Cifrado opcional en reposo** con AES-256-GCM y clave derivada por PBKDF2-SHA256 (310 000
  iteraciones, sal aleatoria de 16 bytes, IV de 12 bytes por escritura). La contraseña no se almacena.
- **Exportaciones cifradas** con el mismo esquema cuando indicas contraseña.
- **Importaciones validadas** antes de reemplazar el estado (versión, perfil, criterios, decisiones).
- **CSP** en `index.html` limitando scripts, estilos, imágenes y conexiones a los orígenes necesarios.
- **OAuth**: el `client_secret` solo vive como secreto del Worker; el token se devuelve en el fragmento
  (`#`) de la URL, fuera de cabeceras `Referer` y logs de servidor; el `state` va firmado con HMAC y
  caduca a los 10 minutos.

### Límites honestos

- `localStorage` es accesible por cualquier script que se ejecute en el mismo origen. El cifrado protege
  los datos en disco, no frente a una extensión maliciosa o un XSS (de ahí la CSP y no cargar scripts de
  terceros).
- Si olvidas la contraseña de bloqueo, **los datos no se pueden recuperar**. Exporta copias.
- Borrar los datos del navegador elimina el perfil, el CV y el seguimiento.
- Las ofertas externas pueden cambiar o desaparecer; verifica siempre la fuente original.
- Las APIs públicas pueden limitar peticiones o cambiar su formato sin aviso; la app muestra el error y
  conserva la última caché válida (20 minutos).

---

## Añadir o ajustar el motor

- **Competencias y roles**: `src/data/skills.ts`.
- **Plantillas de sector, roles y portales**: `src/data/packs.ts`.
- **Portales y URLs de búsqueda**: `src/data/portals.ts`.
- **Pesos del encaje**: `src/lib/match.ts` (bloque `parts`, al final de `evaluateJob`).
- **Ofertas de ejemplo**: `src/data/demo.ts`.

El motor normaliza acentos y admite variantes morfológicas simples (psicólogo/psicóloga/psicología),
pero no es un modelo semántico: si una oferta usa un sinónimo muy distinto, añádelo al léxico.

---

## Licencia

Uso libre y personal. Si lo publicas o lo adaptas, se agradece una mención.
