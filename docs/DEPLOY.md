# Deploy de producao na VPS

Este e o documento principal da operacao de producao do BabyPlays. O ambiente atual roda em uma VPS Ubuntu com Docker Compose, usa a branch `main` e recebe deploy manual por SSH. Nao existe CI/CD atualmente.

Railway nao faz parte do fluxo atual nem e o destino recomendado de deploy. O historico da migracao inicial foi preservado em [VPS_DEPLOY.md](VPS_DEPLOY.md).

## Arquitetura de producao

```text
Usuario
  -> Cloudflare (DNS e proxy)
  -> Nginx na VPS
     -> Next.js (site e painel)
     -> Django/DRF com Gunicorn (API)
        -> PostgreSQL
```

O arquivo principal da infraestrutura e `docker-compose.vps.yml`, na raiz do repositorio. Ele define quatro servicos:

- `db`: PostgreSQL 17;
- `backend`: Django/DRF servido por Gunicorn;
- `frontend`: Next.js;
- `nginx`: reverse proxy e ponto de entrada HTTP/HTTPS.

Os servicos compartilham a rede interna `babyplays_internal`. Somente o Nginx publica as portas `80` e `443`; o PostgreSQL nao e exposto publicamente.

## Enderecos e HTTPS

- Site: `https://www.babyplays.com.br`;
- raiz: `https://babyplays.com.br`;
- API: `https://api.babyplays.com.br`.

A Cloudflare gerencia DNS e proxy. Os registros publicos devem permanecer como `Proxied`, com SSL/TLS no modo `Full (strict)`. O Nginx usa um Cloudflare Origin Certificate instalado apenas na VPS e montado como somente leitura no container.

O Origin Certificate nao deve ser versionado nem exposto. Ele nao e um certificado publico para acesso direto ao IP ou para registros em modo `DNS only`.

## Arquivos e caminhos usados

Os caminhos abaixo ja sao referenciados por `docker-compose.vps.yml` e pelos exemplos versionados:

- repositorio: `/opt/babyplays/app`;
- variaveis do backend: `/srv/babyplays/env/backend.env`;
- variaveis do frontend: `/srv/babyplays/env/frontend.env`;
- variaveis do PostgreSQL: `/srv/babyplays/env/postgres.env`;
- dados do PostgreSQL: `/srv/babyplays/postgres`;
- uploads: `/srv/babyplays/media`;
- arquivos estaticos: `/srv/babyplays/static`;
- certificados de origem: `/srv/babyplays/certs`;
- backups: `/srv/babyplays/backups`;
- logs: `/var/log/babyplays`.

Os arquivos reais de ambiente, certificados, chaves e backups existem somente na VPS. Use `backend/.env.vps.example` e `frontend/.env.vps.example` como referencia sem copiar valores reais para o Git.

## Regras de producao

- Use sempre `DEBUG=False` e PostgreSQL.
- Segredos devem vir dos arquivos protegidos em `/srv/babyplays/env`, nunca do codigo ou da documentacao.
- `ALLOWED_HOSTS` recebe hosts sem protocolo.
- `CSRF_TRUSTED_ORIGINS` e `CORS_ALLOWED_ORIGINS` recebem origens completas com `https://`.
- `NEXT_PUBLIC_API_BASE_URL` deve apontar para `https://api.babyplays.com.br`.
- Variaveis `NEXT_PUBLIC_*` sao incorporadas no build; alteracoes exigem reconstruir o frontend.
- Alteracoes nas variaveis do backend exigem recriar ou reiniciar o container correspondente.
- Nao use `127.0.0.1` como URL publica. Enderecos locais aparecem apenas em healthchecks internos e desenvolvimento local.

## Deploy manual por SSH

Antes de iniciar, confirme a janela operacional, o backup quando houver mudanca de banco e quais servicos foram alterados. O deploy nao e automatizado.

Na VPS:

```bash
cd /opt/babyplays/app
git status --short
git fetch origin main
git switch main
git pull --ff-only origin main
```

Se `git status --short` mostrar alteracoes locais inesperadas, interrompa o deploy e investigue. Nao descarte arquivos da VPS automaticamente.

Reconstrua apenas o necessario:

```bash
# Backend alterado
docker compose -f docker-compose.vps.yml build backend

# Frontend alterado; o arquivo fornece os build args NEXT_PUBLIC_*
docker compose --env-file /srv/babyplays/env/frontend.env -f docker-compose.vps.yml build frontend
```

O Nginx usa uma imagem pronta e monta `infra/nginx/babyplays.conf`; uma mudanca somente nessa configuracao nao exige build. Depois de subir o Compose, valide a configuracao com o comando listado na secao de validacao.

Suba ou recrie os servicos afetados:

```bash
docker compose -f docker-compose.vps.yml up -d
```

Quando o backend incluir migrations novas, aplique-as de forma controlada:

```bash
docker compose -f docker-compose.vps.yml exec backend python manage.py migrate
```

Quando houver mudanca de arquivos estaticos do Django, execute:

```bash
docker compose -f docker-compose.vps.yml exec backend python manage.py collectstatic --noinput
```

Nao coloque `migrate` ou `collectstatic` automaticamente no start dos containers.

## Validacao depois do deploy

Confira o estado dos quatro servicos:

```bash
docker compose -f docker-compose.vps.yml ps
docker compose -f docker-compose.vps.yml exec backend python manage.py check
docker compose -f docker-compose.vps.yml exec backend python manage.py check --deploy
docker compose -f docker-compose.vps.yml exec nginx nginx -t
```

Valide tambem pelo acesso publico via Cloudflare:

```bash
curl -I https://www.babyplays.com.br/
curl -I https://api.babyplays.com.br/api/auth/csrf/
```

Depois dos checks tecnicos, teste login, CSRF, catalogo, imagens, carrinho, checkout, contrato e painel administrativo conforme o escopo da mudanca.

## Logs e diagnostico

```bash
docker compose -f docker-compose.vps.yml logs --tail=200 nginx
docker compose -f docker-compose.vps.yml logs --tail=200 backend
docker compose -f docker-compose.vps.yml logs --tail=200 frontend
docker compose -f docker-compose.vps.yml logs --tail=200 db
```

Use `-f` somente quando precisar acompanhar os logs em tempo real. Nao copie para tickets ou documentacao linhas que contenham dados pessoais, cookies, tokens ou outros segredos.

## Rollback e backups

O rollback atual ocorre na propria VPS, voltando a uma revisao anterior conhecida e reconstruindo somente os servicos afetados. Railway nao e destino de rollback. Antes de qualquer rollback com mudanca de schema ou dados, preserve um backup e avalie a compatibilidade das migrations.

Consulte [ROLLBACK.md](ROLLBACK.md) para o procedimento e [BACKUP_RESTORE.md](BACKUP_RESTORE.md) para backup e restauracao.

## Ambiente local

O ambiente local continua separado da producao:

- frontend: `http://127.0.0.1:3000`;
- backend: `http://127.0.0.1:8000`;
- `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000`;
- `DEBUG=True` permitido somente localmente.

Nao misture `localhost` e `127.0.0.1` no mesmo fluxo local, pois sessao, cookies e CSRF dependem do host.

## Legado

O projeto ja foi hospedado na Railway. URLs, variaveis e comandos daquele provedor nao descrevem a operacao atual e nao devem ser usados para novos deploys. Informacoes da fase de migracao que ainda ajudam a entender a preparacao original da VPS ficam isoladas em [VPS_DEPLOY.md](VPS_DEPLOY.md).
