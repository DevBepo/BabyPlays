# Frontend BABYPLAYS.BRINQUEDOS

Este projeto usa autenticacao por Django sessions, CSRF e cookies. Consulte tambem [docs/DEPLOY.md](../docs/DEPLOY.md) antes de tarefas sobre Railway, deploy, homologacao, producao, DNS, dominio ou variaveis de ambiente.

## Ambientes

### Ambiente local oficial

Use `127.0.0.1` apenas para desenvolvimento e testes locais.

```env
NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000
```

Rode o backend a partir de `backend/`:

```bash
python manage.py runserver 127.0.0.1:8000
```

Rode o frontend a partir de `frontend/`:

```bash
npm.cmd run dev -- -H 127.0.0.1
```

Acesse o site local em:

[http://127.0.0.1:3000](http://127.0.0.1:3000)

Nao alterne entre `localhost` e `127.0.0.1` no mesmo fluxo local, pois isso pode quebrar sessao, cookies, CSRF e login/admin.

### Railway/homologacao

- Frontend: https://babyplays.up.railway.app
- Backend/API: https://api-babyplays.up.railway.app
- `NEXT_PUBLIC_API_BASE_URL=https://api-babyplays.up.railway.app`
- `NEXT_PUBLIC_BABYPLAYS_WHATSAPP=<numero-internacional-somente-digitos>`
- `NEXT_PUBLIC_BABYPLAYS_INSTAGRAM_URL=<url-completa-do-instagram>`
- `DEBUG=False` no backend.
- O backend deve liberar `https://babyplays.up.railway.app` em CSRF/CORS.
- Configure `NEXT_PUBLIC_API_BASE_URL` no Railway Variables do frontend.
- Build Command: `npm run build`
- Start Command: `npm run start -- -H 0.0.0.0 -p $PORT`

### Dominio final planejado

- Frontend: https://www.babyplays.com.br
- API: https://api.babyplays.com.br
- `NEXT_PUBLIC_API_BASE_URL=https://api.babyplays.com.br`
- `NEXT_PUBLIC_BABYPLAYS_WHATSAPP=<numero-internacional-somente-digitos>`
- `NEXT_PUBLIC_BABYPLAYS_INSTAGRAM_URL=<url-completa-do-instagram>`
- O backend deve liberar `https://www.babyplays.com.br` e `https://babyplays.com.br` em CSRF/CORS.

## Observacoes

- `frontend/.env.example` documenta exemplo local e exemplo Railway sem secrets.
- Se existir `frontend/.env.local`, mantenha-o como arquivo local e nao commite.
- Producao/homologacao usa variaveis do Railway, nao valores hardcoded.
- Alterar `NEXT_PUBLIC_API_BASE_URL` exige novo build/redeploy do frontend.
- `127.0.0.1` nao deve ser usado como URL principal em tarefas sobre Railway, deploy, producao, homologacao, DNS ou dominio.
- Nao coloque URLs locais em configuracao de Railway/homologacao/producao.
