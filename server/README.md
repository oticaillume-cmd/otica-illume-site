# Ótica Illume — API inicial (etapa 4)

Protótipo de backend com Node.js, Express e SQLite. **Não está pronto para produção**.

## Executar localmente
1. Instale Node.js 22 e dependências: `cd server && npm install`.
2. Defina as variáveis `ADMIN_PASSWORD` (mínimo 16 caracteres) e `SESSION_SECRET` (mínimo 32 caracteres) no ambiente. O arquivo `.env.example` é apenas referência; o projeto não carrega `.env` automaticamente. Em Node 22 pode executar `node --env-file=.env index.js` após criar um `.env` privado.
3. Execute `npm start` e acesse `http://localhost:3000`.

## Endpoints
- `POST /api/login` — `{ "password": "..." }`, define cookie HttpOnly de sessão.
- `POST /api/logout` — encerra a sessão.
- `GET /api/products` — catálogo público.
- `GET /api/admin/products` — lista completa protegida.
- `POST /api/admin/products` — cadastro protegido.
- `PUT /api/admin/products/:id` — edição protegida.
- `DELETE /api/admin/products/:id` — desativação protegida.
- `GET /api/admin/orders` — listagem protegida (ainda não há checkout).

Formato de produto: `{ "name":"Armação X", "category":"grau", "price_cents":12990, "stock":3, "image":"https://..." }`.

## Pendências antes de publicar
- Conectar `index.html` e `admin.html` à API; hoje continuam usando armazenamento local do navegador.
- Criar interface de login, gestão de pedidos e fluxos de estoque transacionais.
- Usar HTTPS, armazenamento de sessão persistente, proteção CSRF, validação mais rigorosa, backups, logs, testes e revisão de segurança.
- Integrar Mercado Pago somente no servidor com credenciais privadas e validação de webhooks.
- Adequar LGPD e política de privacidade; não coletar receitas médicas no protótipo.
