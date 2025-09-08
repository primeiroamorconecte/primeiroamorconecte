# Primeiro Amor Conecte — App Web

Aplicativo web oficial da **Igreja Cristã Primeiro Amor**, feito em **React + Vite + Tailwind + Supabase**.

## 🚀 Rodar localmente
```bash
npm install
npm run dev
```

## 🛠️ Build para produção
```bash
npm run build
```
Os arquivos finais ficam em `dist/`.

## 🌐 Deploy no Netlify
- Build command: `npm run build`
- Publish directory: `dist`

### Variáveis de ambiente
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ADMIN_EMAILS` (e-mails separados por vírgula)

## 🔑 Autenticação
Login via Supabase Auth (e-mail/senha). Usuários listados em `VITE_ADMIN_EMAILS` têm acesso ao painel administrativo.

---
