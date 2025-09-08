# Primeiro Amor Conecte — PRO (Branding + Membros/Voluntários/Cursos + PIX QR)

## 1) Supabase
Execute em **SQL Editor**:
- `supabase/schema.sql`
- `supabase/policies.sql`

## 2) Variáveis (Netlify → Site settings → Environment Variables)
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `VITE_ADMIN_EMAILS` (ex.: `pastor@igreja.com,admin@igreja.com`)

## 3) Deploy
- Import from Git → Build: `npm run build` → Publish: `dist`

## 4) Domínio personalizado
No Netlify: **Domain settings → Add custom domain** (ex.: `app.primeiroamor.com.br`).
Aponte o **CNAME** para o subdomínio Netlify gerado. Se o domínio for .com.br e gerenciado no Registro.br, crie o CNAME lá.

## 5) PIX
Na aba **Configurações** do painel admin:
- Salve a **Chave PIX**.
- Use **Gerar QR (texto)** para criar um QR simples (baseado no texto da chave). Para QR **EMV-Pix oficial** (com valor/descrição), personalize comigo.

## 6) Páginas extras
Incluídas: **Membros**, **Voluntários**, **Cursos** — com CRUD no painel.

## Dica de segurança
Crie perfis admin no Supabase e, se desejar, troque as policies para só admins (via tabela profiles) poderem escrever.
