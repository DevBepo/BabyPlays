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
- Railway/homologacao: ambiente online atual.
- Dominio final: ambiente planejado apos validacao DNS.

Ambiente local:
- Frontend: http://127.0.0.1:3000
- Backend: http://127.0.0.1:8000
- `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000`
- `DEBUG=True` permitido apenas localmente.

Ambiente Railway/homologacao:
- Frontend: https://babyplays.up.railway.app
- Backend/API: https://api-babyplays.up.railway.app
- `NEXT_PUBLIC_API_BASE_URL=https://api-babyplays.up.railway.app`
- `DEBUG=False`
- Backend deve liberar https://babyplays.up.railway.app em `CSRF_TRUSTED_ORIGINS` e `CORS_ALLOWED_ORIGINS`.

Dominio final planejado:
- Frontend: https://www.babyplays.com.br
- Backend/API: https://api.babyplays.com.br
- `NEXT_PUBLIC_API_BASE_URL=https://api.babyplays.com.br`
- Backend deve liberar https://www.babyplays.com.br e https://babyplays.com.br em `CSRF_TRUSTED_ORIGINS` e `CORS_ALLOWED_ORIGINS`.
- Configuracao detalhada de variaveis e comandos Railway fica em docs/DEPLOY.md.

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
- Se a tarefa mencionar Railway, deploy, producao, homologacao, DNS ou dominio, nao usar `127.0.0.1` como URL principal.
- `127.0.0.1` deve ser usado apenas para testes locais.
- Nunca mudar `DEBUG` para `True` em Railway/homologacao/producao.
- Nunca hardcodar secrets, `DATABASE_URL`, `SECRET_KEY` ou URLs de producao no codigo.
- Variaveis sensiveis devem vir do Railway Variables ou do provedor equivalente.
- Nao commitar `.env`, `.env.local` ou secrets.
- Nao colocar URLs locais em configuracao de Railway/homologacao/producao.
- `NEXT_PUBLIC_API_BASE_URL` no frontend precisa de redeploy quando alterado.
- Mudancas em env de backend normalmente precisam restart/redeploy.
- `ALLOWED_HOSTS` nao usa `https://`.
- `CSRF_TRUSTED_ORIGINS` usa `https://`.
- `CORS_ALLOWED_ORIGINS` usa `https://`.
