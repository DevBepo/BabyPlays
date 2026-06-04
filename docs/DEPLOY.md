# Deploy, Ambientes e Variaveis

Este documento separa ambiente local, Railway/homologacao e dominio final. Use-o antes de qualquer tarefa sobre deploy, Railway, producao, homologacao, DNS, dominio ou variaveis de ambiente.

## Ambientes

### Ambiente local

Use apenas para desenvolvimento e testes locais.

- Backend: http://127.0.0.1:8000
- Frontend: http://127.0.0.1:3000
- `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000`
- `DEBUG=True` permitido apenas localmente.
- Comando backend: `python manage.py runserver 127.0.0.1:8000`
- Comando frontend: `npm.cmd run dev -- -H 127.0.0.1`

Nao misture `localhost` e `127.0.0.1` no mesmo fluxo local, porque autenticacao por Django sessions, CSRF e cookies depende do host.

### Ambiente Railway/homologacao

Railway e o ambiente online atual de homologacao.

- Frontend: https://babyplays.up.railway.app
- Backend/API: https://api-babyplays.up.railway.app
- `NEXT_PUBLIC_API_BASE_URL=https://api-babyplays.up.railway.app`
- `DEBUG=False`
- O backend deve liberar `https://babyplays.up.railway.app` em `CSRF_TRUSTED_ORIGINS`.
- O backend deve liberar `https://babyplays.up.railway.app` em `CORS_ALLOWED_ORIGINS`.
- Variaveis sensiveis devem vir de Railway Variables.
- Nao colocar URLs locais em configuracao de Railway/homologacao.

### Dominio final planejado

Use depois da validacao DNS.

- Frontend: https://www.babyplays.com.br
- API: https://api.babyplays.com.br
- `NEXT_PUBLIC_API_BASE_URL=https://api.babyplays.com.br`
- O backend deve liberar `https://www.babyplays.com.br` e `https://babyplays.com.br` em `CSRF_TRUSTED_ORIGINS`.
- O backend deve liberar `https://www.babyplays.com.br` e `https://babyplays.com.br` em `CORS_ALLOWED_ORIGINS`.

## Regras para o Codex

- Se a tarefa mencionar Railway, deploy, producao, homologacao, DNS ou dominio, nao usar `127.0.0.1` como URL principal.
- `127.0.0.1` deve ser usado apenas para testes locais.
- Nunca mudar `DEBUG` para `True` em ambiente Railway/homologacao/producao.
- Nunca hardcodar secrets, `DATABASE_URL`, `SECRET_KEY` ou URLs de producao no codigo.
- Variaveis de ambiente de producao devem ser configuradas no Railway Variables.
- Nao commitar `.env`, `.env.local` ou secrets.
- Nao colocar URLs locais em configuracao de producao.
- `NEXT_PUBLIC_API_BASE_URL` no frontend precisa de redeploy quando alterado.
- Mudancas em env de backend normalmente precisam restart/redeploy.
- `ALLOWED_HOSTS` nao usa `https://`.
- `CSRF_TRUSTED_ORIGINS` usa `https://`.
- `CORS_ALLOWED_ORIGINS` usa `https://`.

## Variaveis Railway

### Backend

Configure no Railway Variables do servico de backend:

```env
SECRET_KEY=<secret-key-segura>
DEBUG=False
DATABASE_URL=<database-url-do-railway>
ALLOWED_HOSTS=api-babyplays.up.railway.app,api.babyplays.com.br
CSRF_TRUSTED_ORIGINS=https://babyplays.up.railway.app,https://www.babyplays.com.br,https://babyplays.com.br
CORS_ALLOWED_ORIGINS=https://babyplays.up.railway.app,https://www.babyplays.com.br,https://babyplays.com.br
CORS_ALLOW_CREDENTIALS=True
SESSION_COOKIE_SECURE=True
CSRF_COOKIE_SECURE=True
SESSION_COOKIE_SAMESITE=None
CSRF_COOKIE_SAMESITE=None
MEDIA_ROOT=/app/media
```

Notas:
- `SECRET_KEY` e `DATABASE_URL` acima sao placeholders; nunca documentar ou commitar valores reais.
- `ALLOWED_HOSTS` recebe apenas hosts, sem `https://`.
- `CSRF_TRUSTED_ORIGINS` e `CORS_ALLOWED_ORIGINS` recebem origens completas com `https://`.
- Enquanto o dominio final nao estiver validado, mantenha as URLs Railway necessarias para homologacao.
- `MEDIA_ROOT` deve apontar para o caminho onde o volume persistente do backend esta montado.

### Media uploads no Railway

Uploads de imagens de brinquedos e Kits Festa usam o storage de filesystem do Django. No Railway, o filesystem do container e efemero, entao o servico de backend precisa de um volume persistente montado em:

```text
/app/media
```

Configure tambem `MEDIA_ROOT=/app/media` no Railway Variables do backend. A aplicacao serve URLs `/media/...` pelo backend mesmo com `DEBUG=False`, lendo somente arquivos existentes dentro de `MEDIA_ROOT`, sem listar diretorios.

Arquivos antigos que aparecem no banco mas nao existem mais no volume ou no container nao podem ser reconstruidos pela aplicacao. Essas imagens precisam ser reenviadas pelo admin depois que o volume estiver configurado.

### Frontend

Configure no Railway Variables do servico de frontend:

```env
NEXT_PUBLIC_API_BASE_URL=https://api-babyplays.up.railway.app
```

Quando migrar para o dominio final:

```env
NEXT_PUBLIC_API_BASE_URL=https://api.babyplays.com.br
```

Alterar `NEXT_PUBLIC_API_BASE_URL` exige novo build/redeploy do frontend, porque a variavel e embutida no build Next.js.

## Comandos Railway

### Backend

- Build Command: `python manage.py collectstatic --noinput`
- Pre-deploy Command: `python manage.py migrate`
- Start Command: `gunicorn setup.wsgi:application --bind 0.0.0.0:8000`

### Frontend

- Build Command: `npm run build`
- Start Command: `npm run start -- -H 0.0.0.0 -p $PORT`

## Cuidados com arquivos locais

- Nao alterar `.env` real para documentar exemplos.
- Nao commitar `.env` nem `.env.local`.
- Use `.env.example` para exemplos sem secrets.
- Exemplo local pode usar `127.0.0.1`.
- Exemplo Railway deve usar placeholders e `DEBUG=False`.
