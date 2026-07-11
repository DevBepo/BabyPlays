# Deploy em VPS HostGator

Este guia prepara a migracao do BabyPlays para a VPS Ubuntu 22.04.5 da HostGator sem desativar o Railway. O Railway deve permanecer disponivel como rollback ate a validacao completa da VPS.

## Pre-requisitos ja feitos

- VPS Ubuntu 22.04.5 LTS com 2 vCPU, 4 GB RAM, 2 GB swap e 100 GB NVMe.
- Usuario operacional `babyplays`.
- SSH na porta `22022`.
- UFW permitindo apenas `22022/tcp`, `80/tcp` e `443/tcp`.
- Docker Engine e Docker Compose plugin instalados.
- Repositorio clonado em `/opt/babyplays/app`.
- Diretorios persistentes criados:
  - `/srv/babyplays/postgres`
  - `/srv/babyplays/media`
  - `/srv/babyplays/static`
  - `/srv/babyplays/backups`
  - `/var/log/babyplays`

## Criar diretorio de envs

```bash
sudo install -d -o babyplays -g babyplays -m 700 /srv/babyplays/env
```

Crie os arquivos reais somente na VPS:

```bash
install -m 600 /opt/babyplays/app/backend/.env.vps.example /srv/babyplays/env/backend.env
install -m 600 /opt/babyplays/app/frontend/.env.vps.example /srv/babyplays/env/frontend.env
touch /srv/babyplays/env/postgres.env
chmod 600 /srv/babyplays/env/*.env
```

Edite os placeholders com valores reais usando um editor no servidor. Nao copie esses arquivos para o repositorio.

## Gerar segredos

Gere `SECRET_KEY` na VPS:

```bash
python3 - <<'PY'
from secrets import token_urlsafe
print(token_urlsafe(64))
PY
```

Gere a senha do PostgreSQL:

```bash
openssl rand -base64 32
```

Exemplo de `/srv/babyplays/env/postgres.env`:

```env
POSTGRES_DB=babyplays
POSTGRES_USER=babyplays
POSTGRES_PASSWORD=<senha-forte-gerada-na-vps>
```

Use a mesma senha no `DATABASE_URL` do `/srv/babyplays/env/backend.env`:

```env
DATABASE_URL=postgres://babyplays:<senha-forte-gerada-na-vps>@db:5432/babyplays
```

## Verificar UID/GID dos volumes

O container do backend roda com o usuario nao-root `django`. Para evitar `Permission denied` em `collectstatic`, uploads e logs, o UID/GID desse usuario dentro da imagem deve bater com o dono dos diretorios persistentes da VPS.

Confira o UID/GID do usuario operacional e os donos/permissoes dos bind mounts:

```bash
id -u babyplays
id -g babyplays
stat -c '%u:%g %a %n' /srv/babyplays/media /srv/babyplays/static /var/log/babyplays
```

O build do backend usa `DJANGO_UID` e `DJANGO_GID`, com default `1000:1000`. Se o usuario `babyplays` ou os diretorios persistentes usarem outros IDs, exporte esses valores antes do build do backend:

```bash
export DJANGO_UID=$(id -u babyplays)
export DJANGO_GID=$(id -g babyplays)
docker compose -f docker-compose.vps.yml build backend
```

## Buildar imagens

Os `build.args` `NEXT_PUBLIC_*` do frontend sao embutidos no build do Next.js. Eles nao sao lidos automaticamente do `env_file` do servico `frontend`, porque `env_file` vale para o ambiente do container em runtime, nao para interpolacao de build args.

Use `--env-file` no comando de build do frontend:

```bash
cd /opt/babyplays/app
docker compose -f docker-compose.vps.yml build backend
docker compose --env-file /srv/babyplays/env/frontend.env -f docker-compose.vps.yml build frontend
```

Alternativamente, exporte as variaveis antes do build:

```bash
cd /opt/babyplays/app
set -a
. /srv/babyplays/env/frontend.env
set +a
docker compose -f docker-compose.vps.yml build backend frontend
```

## Subir sem apontar DNS

Antes de mudar DNS, suba os servicos e valide por rede interna ou apontamento temporario de hosts quando aplicavel:

```bash
docker compose -f docker-compose.vps.yml up -d
docker compose -f docker-compose.vps.yml ps
```

## Migrations e static

Nao rode `migrate` nem `collectstatic` automaticamente no start do container. Execute de forma controlada:

```bash
docker compose -f docker-compose.vps.yml exec backend python manage.py migrate
docker compose -f docker-compose.vps.yml exec backend python manage.py collectstatic --noinput
```

## Validacoes internas

O healthcheck do backend usa `GET /api/auth/csrf/` porque nao ha endpoint de health mais leve versionado nesta etapa. Esse endpoint e publico, leve e apropriado para validar que Django esta respondendo, mas depende do `Host` aceito em `ALLOWED_HOSTS`. O compose envia `Host: api.babyplays.com.br`; mantenha esse host no `ALLOWED_HOSTS`. O exemplo de env tambem inclui `localhost` e `127.0.0.1` para debug interno controlado na VPS.

Backend:

```bash
docker compose -f docker-compose.vps.yml exec backend python manage.py check
docker compose -f docker-compose.vps.yml exec backend python manage.py check --deploy
docker compose -f docker-compose.vps.yml exec backend python - <<'PY'
import urllib.request
request = urllib.request.Request(
    "http://127.0.0.1:8000/api/auth/csrf/",
    headers={"Host": "api.babyplays.com.br"},
)
print(urllib.request.urlopen(request, timeout=5).status)
PY
```

Frontend:

```bash
docker compose -f docker-compose.vps.yml exec frontend node -e "fetch('http://127.0.0.1:3000').then(r=>console.log(r.status))"
```

Nginx:

```bash
docker compose -f docker-compose.vps.yml exec nginx nginx -t
curl -I -H 'Host: www.babyplays.com.br' http://127.0.0.1/
curl -I -H 'Host: api.babyplays.com.br' http://127.0.0.1/api/auth/csrf/
```

## Logs

```bash
docker compose -f docker-compose.vps.yml logs -f nginx
docker compose -f docker-compose.vps.yml logs -f backend
docker compose -f docker-compose.vps.yml logs -f frontend
docker compose -f docker-compose.vps.yml logs -f db
```

## Parar servicos

```bash
docker compose -f docker-compose.vps.yml down
```

Nao use `-v` em producao, pois isso pode remover volumes Docker nomeados em outros cenarios. Neste compose, dados importantes usam bind mounts em `/srv/babyplays`.

## Atualizar com novo commit

```bash
cd /opt/babyplays/app
git fetch --all --prune
git status --short
git pull --ff-only
set -a
. /srv/babyplays/env/frontend.env
set +a
docker compose -f docker-compose.vps.yml build backend
docker compose --env-file /srv/babyplays/env/frontend.env -f docker-compose.vps.yml build frontend
docker compose -f docker-compose.vps.yml up -d
docker compose -f docker-compose.vps.yml exec backend python manage.py migrate
docker compose -f docker-compose.vps.yml exec backend python manage.py collectstatic --noinput
docker compose -f docker-compose.vps.yml ps
```

## DNS

Nao aponte DNS antes de validar containers, migrations, static/media, logs, HTTPS e fluxo principal. Enquanto a VPS nao estiver validada, mantenha o Railway ativo para rollback.

Durante a migracao inicial, o redirect de `babyplays.com.br` para `www.babyplays.com.br` fica como `302` temporario para evitar cache permanente nos navegadores e facilitar rollback. Troque para `301` somente depois da validacao completa de DNS, HTTPS, cookies e fluxo principal.

## HTTPS

Esta primeira proposta versiona Nginx HTTP para validacao inicial sem certificados reais. Antes de producao real, configure certificados validos na VPS, teste renovacao automatica e so depois habilite redirecionamento HTTPS/HSTS de forma gradual.

Durante a migracao inicial, mantenha HSTS desligado no frontend com `FRONTEND_HSTS_SECONDS=0` ou sem definir a variavel em `/srv/babyplays/env/frontend.env`. O Next.js so emite `Strict-Transport-Security` quando `FRONTEND_HSTS_SECONDS` e maior que zero. Depois de validar HTTPS, DNS, subdominios e rollback, habilite de forma gradual, por exemplo `FRONTEND_HSTS_SECONDS=31536000`, seguido de novo build/redeploy do frontend.

Login e CSRF em fluxo cross-subdomain (`www.babyplays.com.br` chamando `api.babyplays.com.br`) precisam ser validados com HTTPS. Como os cookies usam `SameSite=None`, os navegadores exigem `Secure=True`; em HTTP puro, esse fluxo nao representa a validacao final.
