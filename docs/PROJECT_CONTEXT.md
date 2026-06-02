# BABYPLAYS.BRINQUEDOS - Contexto do Projeto

Sistema real de producao para locacao de brinquedos e kits de festa.

## Ambientes

### Ambiente local oficial

Use este ambiente somente para desenvolvimento e testes locais.

- Frontend local: http://127.0.0.1:3000
- Backend local: http://127.0.0.1:8000
- `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000`
- Backend: `python manage.py runserver 127.0.0.1:8000`
- Frontend: `npm.cmd run dev -- -H 127.0.0.1`
- `DEBUG=True` e permitido apenas localmente.
- Durante desenvolvimento local, acesse o site em http://127.0.0.1:3000.
- Nao alternar entre `localhost` e `127.0.0.1` no mesmo fluxo. Como a autenticacao usa Django sessions, CSRF e cookies, misturar hosts pode quebrar sessao, CSRF e login/admin.
- Se existir `frontend/.env.local`, ele e arquivo local ignorado pelo Git; use-o apenas para refletir o padrao local acima.

### Ambiente Railway/homologacao

Railway e o ambiente online atual de homologacao. Quando a tarefa mencionar Railway, deploy, homologacao, producao, DNS ou dominio, nao use `127.0.0.1` como URL principal.

- Frontend Railway: https://babyplays.up.railway.app
- Backend/API Railway: https://api-babyplays.up.railway.app
- `NEXT_PUBLIC_API_BASE_URL=https://api-babyplays.up.railway.app`
- `DEBUG=False`
- O backend deve liberar o frontend Railway em `CSRF_TRUSTED_ORIGINS` e `CORS_ALLOWED_ORIGINS`.
- Variaveis sensiveis devem ser configuradas em Railway Variables, nunca hardcoded.
- Mudancas em variaveis do backend normalmente exigem restart/redeploy.
- Mudancas em `NEXT_PUBLIC_API_BASE_URL` no frontend exigem redeploy do frontend.

### Dominio final planejado

Use estes dominios depois da validacao DNS.

- Frontend final: https://www.babyplays.com.br
- API final: https://api.babyplays.com.br
- `NEXT_PUBLIC_API_BASE_URL=https://api.babyplays.com.br`
- O backend deve liberar `https://www.babyplays.com.br` e `https://babyplays.com.br` em `CSRF_TRUSTED_ORIGINS` e `CORS_ALLOWED_ORIGINS`.
- `ALLOWED_HOSTS` deve conter hosts sem protocolo, por exemplo `api.babyplays.com.br`.

## Regras para o Codex

- Se a tarefa mencionar Railway, deploy, producao, homologacao, DNS ou dominio, nao usar `127.0.0.1` como URL principal.
- `127.0.0.1` deve ser usado apenas para testes locais.
- Nunca mudar `DEBUG` para `True` em Railway/homologacao/producao.
- Nunca hardcodar secrets, `DATABASE_URL`, `SECRET_KEY` ou URLs de producao no codigo.
- Variaveis de ambiente de producao devem ser configuradas no Railway Variables.
- Nao commitar `.env`, `.env.local` ou secrets.
- Nao colocar URLs locais em configuracao de producao.
- `NEXT_PUBLIC_API_BASE_URL` no frontend precisa de redeploy quando alterado.
- Mudancas em env de backend normalmente precisam restart/redeploy.
- `ALLOWED_HOSTS` nao usa `https://`.
- `CSRF_TRUSTED_ORIGINS` usa `https://`.
- `CORS_ALLOWED_ORIGINS` usa `https://`.

## Funcionalidades principais

- Site publico com catalogo.
- Area do cliente.
- Painel administrativo.
- Produtos avulsos.
- Kits de festas prontos.
- Kits de festas personalizaveis.
- Carrinho.
- Checkout.
- Reserva via WhatsApp e/ou e-mail.
- Frete por bairro.
- Contrato obrigatorio antes da confirmacao.
- E-mail de confirmacao.
- E-mail de lembrete de carrinho abandonado.

## Autenticacao e carrinho

- Autenticacao oficial usa sessao Django com CSRF, nao JWT.
- Endpoints oficiais: `POST /api/auth/cadastro/`, `POST /api/auth/login/`, `POST /api/auth/logout/`, `GET /api/auth/me/` e `GET /api/auth/csrf/`.
- Visitante anonimo pode navegar e montar carrinho.
- Carrinho anonimo usa `session_key`.
- Apos login, carrinho da sessao e reaproveitado pelo usuario autenticado.
- Login e obrigatorio para fechar pedido.

## Regras de estoque

- Estoque deve ser controlado por unidade fisica.
- Um produto pode ter varias unidades.
- Item devolvido nao volta automaticamente para disponivel.
- Apos devolucao, item deve entrar em higienizacao, manutencao ou standby.
- Admin precisa liberar manualmente para voltar ao estoque disponivel.

## Contrato

- Cliente deve marcar "li e aceito".
- Pedido nao pode ser confirmado sem contrato aceito.
- Registrar versao do contrato, data/hora, IP, user-agent e texto aceito.

## Frete

- Frete calculado por bairro.
- Entrega feita pela propria empresa.
- Bairro nao atendido deve bloquear checkout.

## Prioridades

1. Seguranca.
2. Correcao das regras de estoque e reserva.
3. Codigo limpo.
4. Testes.
5. Design intuitivo.
