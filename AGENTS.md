# AGENTS.md

Leia estes arquivos quando forem relevantes:
- docs/PROJECT_CONTEXT.md
- docs/CODEX_RULES.md
- docs/SECURITY_CHECKLIST.md
- docs/DEPLOY.md

Projeto BABYPLAYS.BRINQUEDOS.

Stack:
- Backend: Django + Django REST Framework
- Frontend: Next.js + TypeScript
- Banco: PostgreSQL

Ambientes:
- Local: `127.0.0.1` apenas para desenvolvimento e testes locais.
- Producao: VPS Ubuntu com Docker Compose, Nginx e Cloudflare.

Ambiente local:
- Frontend: http://127.0.0.1:3000
- Backend: http://127.0.0.1:8000
- `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000`
- `DEBUG=True` permitido apenas localmente.

Ambiente de producao na VPS:
- Frontend: https://www.babyplays.com.br
- Backend/API: https://api.babyplays.com.br
- `NEXT_PUBLIC_API_BASE_URL=https://api.babyplays.com.br`
- `DEBUG=False`
- Backend deve liberar https://www.babyplays.com.br e https://babyplays.com.br em `CSRF_TRUSTED_ORIGINS` e `CORS_ALLOWED_ORIGINS`.
- O arquivo principal e `docker-compose.vps.yml`, com PostgreSQL, Django/DRF via Gunicorn, Next.js e Nginx.
- Cloudflare fornece DNS/proxy e o Origin Certificate fica instalado somente na VPS.
- Deploy e manual por SSH na branch `main`; nao existe CI/CD atualmente.
- Configuracao detalhada e comandos ficam em docs/DEPLOY.md.

Regras:
- Trabalhe em mudancas pequenas.
- Nao implemente funcionalidades futuras sem pedido.
- Nao refatore partes fora do escopo.
- Autenticacao oficial usa Django sessions + CSRF.
- Nao introduza JWT sem solicitacao explicita.
- Valide regras criticas no backend.
- Toda regra critica precisa de teste.
- Cliente so acessa os proprios dados.
- Admin tem rotas proprias protegidas.
- Estoque e por unidade fisica.
- Item devolvido vai para higienizacao/standby e nao volta automaticamente para disponivel.
- Pedido nao confirma sem contrato aceito.
- Preco, frete e disponibilidade sao calculados no backend.

Regras para Codex:
- Se a tarefa mencionar deploy, producao, DNS ou dominio, nao usar `127.0.0.1` como URL principal.
- `127.0.0.1` deve ser usado apenas para testes locais.
- Nunca mudar `DEBUG` para `True` em producao.
- Nunca hardcodar secrets, `DATABASE_URL`, `SECRET_KEY` ou URLs de producao no codigo.
- Variaveis sensiveis devem vir dos arquivos protegidos da VPS.
- Nao commitar `.env`, `.env.local` ou secrets.
- Nao colocar URLs locais em configuracao publica de producao.
- `NEXT_PUBLIC_API_BASE_URL` no frontend precisa de redeploy quando alterado.
- Mudancas em env de backend normalmente precisam restart/redeploy.
- `ALLOWED_HOSTS` nao usa `https://`.
- `CSRF_TRUSTED_ORIGINS` usa `https://`.
- `CORS_ALLOWED_ORIGINS` usa `https://`.
