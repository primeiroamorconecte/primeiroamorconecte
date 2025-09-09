# Primeiro Amor Conecte — Netlify Fix (Vite + React + Tailwind + Supabase)

**Correções incluídas para evitar "Rollup failed to resolve /src/main.jsx":**
- `index.html` referencia `./src/main.jsx` (caminho relativo)
- `vite.config.js` com `base: ''`
- `netlify.toml` fixa Node 20

## Deploy (GitHub → Netlify)
1. Suba esta pasta na **raiz do repositório** (não em subpastas).
2. Netlify → Add new site → Import from GitHub.
3. Build:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Variáveis (se usar Supabase):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `VITE_ADMIN_EMAILS`

## Local
```bash
npm install
npm run dev
```
