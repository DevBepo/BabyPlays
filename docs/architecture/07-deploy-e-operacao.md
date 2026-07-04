# Deploy e operação

## Topologia Railway

O ambiente online atual é a homologação Railway:

- frontend: `https://babyplays.up.railway.app`;
- backend/API: `https://api-babyplays.up.railway.app`;
- PostgreSQL gerenciado e ligado ao backend;
- volume persistente montado no serviço backend para mídia.

O domínio final planejado é `https://www.babyplays.com.br` para o frontend e `https://api.babyplays.com.br` para a API, após validação de DNS.

## Backend

O serviço Django coleta arquivos estáticos no build, executa migrations no pre-deploy e inicia Gunicorn em `0.0.0.0:8000`:

```text
Build:      python manage.py collectstatic --noinput
Pre-deploy: python manage.py migrate
Start:      gunicorn setup.wsgi:application --bind 0.0.0.0:8000
```

`DEBUG` deve permanecer `False` na homologação e produção. Mudanças nas variáveis do backend normalmente exigem restart/redeploy.

## Frontend

O serviço Next.js executa `npm run build` e inicia com `npm run start -- -H 0.0.0.0 -p $PORT`. `NEXT_PUBLIC_API_BASE_URL` é embutida no build; mudar a API ou o domínio exige novo build/redeploy do frontend.

## Banco e migrations

`DATABASE_URL` vem das Railway Variables. Migrations devem ser revisadas, versionadas e aplicadas antes da nova aplicação atender tráfego. Alterações destrutivas exigem estratégia compatível entre versões e backup. Produção/homologação não devem usar SQLite.

## Volume de mídia

O volume do backend deve estar montado em `/app/media`, com `MEDIA_ROOT=/app/media`. Sem ele, uploads desaparecem quando o container é substituído. O volume também precisa de política de backup; uma linha no banco não permite reconstruir um arquivo perdido.

## Variáveis de ambiente

Principais variáveis do backend incluem `SECRET_KEY`, `DATABASE_URL`, `DEBUG=False`, `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`, `CORS_ALLOWED_ORIGINS`, opções seguras de cookies e `MEDIA_ROOT`. A chave Google é opcional e deve vir de `GOOGLE_ROUTES_API_KEY` quando o provider for utilizado.

No frontend, `NEXT_PUBLIC_API_BASE_URL`, número do WhatsApp e URL do Instagram são configurações públicas. Valores reais sensíveis nunca devem ser commitados; `.env` e `.env.local` são arquivos locais, e Railway Variables é a fonte da configuração online.

Regras de formato:

- `ALLOWED_HOSTS` recebe hosts sem `https://`;
- CSRF e CORS recebem origens completas com `https://`;
- URLs locais não pertencem à configuração Railway;
- `127.0.0.1` é exclusivo de desenvolvimento e testes locais.

## Cuidados de deploy

Antes de publicar, conferir migrations e backup, executar testes e `python manage.py check --deploy` quando houver mudança funcional/configuracional, validar `DEBUG=False`, HTTPS, cookies, hosts, CSRF/CORS, conexão PostgreSQL e montagem do volume. Depois do deploy, fazer um smoke test de catálogo, login/sessão, carrinho, endereço/frete, contrato e criação de pedido, sem usar dados reais desnecessários.

Mudanças somente nesta documentação não exigem build da aplicação.
