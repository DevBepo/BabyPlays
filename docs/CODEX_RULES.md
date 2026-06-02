# Regras de Engenharia para Codex

## Ambientes

### Local

- Usar `127.0.0.1` somente no ambiente local oficial.
- Frontend local: `http://127.0.0.1:3000`.
- Backend local: `http://127.0.0.1:8000`.
- `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000`.
- Rodar backend local com `python manage.py runserver 127.0.0.1:8000`.
- Rodar frontend local com `npm.cmd run dev -- -H 127.0.0.1`.
- Evitar alternar `localhost` e `127.0.0.1` em fluxos de sessao/CSRF/cookies.
- `DEBUG=True` so pode ser usado localmente.

### Railway/homologacao

- Frontend Railway: `https://babyplays.up.railway.app`.
- Backend/API Railway: `https://api-babyplays.up.railway.app`.
- `NEXT_PUBLIC_API_BASE_URL=https://api-babyplays.up.railway.app`.
- Railway/homologacao deve usar `DEBUG=False`.
- Backend deve liberar `https://babyplays.up.railway.app` em `CSRF_TRUSTED_ORIGINS` e `CORS_ALLOWED_ORIGINS`.
- Variaveis sensiveis devem ficar em Railway Variables.

### Dominio final

- Frontend final: `https://www.babyplays.com.br`.
- API final: `https://api.babyplays.com.br`.
- `NEXT_PUBLIC_API_BASE_URL=https://api.babyplays.com.br`.
- Backend deve liberar `https://www.babyplays.com.br` e `https://babyplays.com.br` em `CSRF_TRUSTED_ORIGINS` e `CORS_ALLOWED_ORIGINS`.
- `ALLOWED_HOSTS` deve usar hosts sem `https://`, por exemplo `api.babyplays.com.br`.

## Regras para tarefas

Sempre:
- Fazer mudancas pequenas.
- Criar ou atualizar testes quando houver regra critica ou codigo de aplicacao.
- Usar `127.0.0.1` apenas para testes locais.
- Se a tarefa mencionar Railway, deploy, producao, homologacao, DNS ou dominio, nao usar `127.0.0.1` como URL principal.
- Preservar SessionAuthentication como autenticacao oficial.
- Respeitar CSRF em fluxos autenticados por sessao.
- Proteger endpoints com autenticacao e permissao.
- Usar `IsAuthenticated` nos fluxos que exigem login.
- Garantir que cliente so acesse seus proprios dados.
- Garantir que admin acesse rotas administrativas.
- Manter carrinho anonimo por sessao preservado ate autenticacao.
- Usar variaveis de ambiente para segredos.
- Evitar dados sensiveis em logs.
- Configurar variaveis de producao/homologacao no Railway Variables.
- Relembrar que `NEXT_PUBLIC_API_BASE_URL` no frontend precisa de redeploy quando alterado.
- Relembrar que mudancas em env de backend normalmente precisam restart/redeploy.

Nunca:
- Confirmar pedido sem contrato aceito.
- Permitir overbooking.
- Voltar item devolvido automaticamente para disponivel.
- Criar endpoint administrativo sem permissao.
- Criar endpoint JWT sem pedido explicito.
- Confiar em preco, frete ou disponibilidade enviados pelo frontend.
- Refatorar arquivos nao relacionados sem autorizacao.
- Mudar `DEBUG` para `True` em Railway/homologacao/producao.
- Hardcodar secrets, `DATABASE_URL`, `SECRET_KEY` ou URLs de producao no codigo.
- Commitar `.env`, `.env.local` ou secrets.
- Colocar URLs locais em configuracao de Railway/homologacao/producao.
- Usar `https://` em `ALLOWED_HOSTS`.
- Omitir `https://` em `CSRF_TRUSTED_ORIGINS` ou `CORS_ALLOWED_ORIGINS`.

## Regras de negocio

- Usar services para regra de negocio pesada.
- Usar serializers/forms para validacao de entrada.
- Usar `transaction.atomic` em reservas, confirmacao e baixa de estoque.
- Estoque e por unidade fisica.
- Item devolvido vai para higienizacao/standby e nao volta automaticamente para disponivel.
- Pedido nao confirma sem contrato aceito.
- Preco, frete e disponibilidade sao calculados no backend.
