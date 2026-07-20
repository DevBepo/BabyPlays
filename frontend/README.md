# Frontend BABYPLAYS.BRINQUEDOS

Este projeto usa autenticacao por Django sessions, CSRF e cookies. Consulte tambem [docs/DEPLOY.md](../docs/DEPLOY.md) antes de tarefas sobre deploy, producao, DNS, dominio ou variaveis de ambiente.

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

### Producao na VPS

- Frontend: https://www.babyplays.com.br
- API: https://api.babyplays.com.br
- `NEXT_PUBLIC_API_BASE_URL=https://api.babyplays.com.br`
- `NEXT_PUBLIC_BABYPLAYS_WHATSAPP=<numero-internacional-somente-digitos>`
- `NEXT_PUBLIC_BABYPLAYS_INSTAGRAM_URL=<url-completa-do-instagram>`
- O backend deve liberar `https://www.babyplays.com.br` e `https://babyplays.com.br` em CSRF/CORS.
- O frontend roda em container definido por `docker-compose.vps.yml`.
- O deploy e manual pela branch `main`; nao existe CI/CD atualmente.
- As variaveis reais ficam no arquivo protegido `/srv/babyplays/env/frontend.env` na VPS.

## Observacoes

- `frontend/.env.example` documenta o ambiente local; `frontend/.env.vps.example` documenta producao sem secrets.
- Se existir `frontend/.env.local`, mantenha-o como arquivo local e nao commite.
- Producao usa variaveis protegidas na VPS, nao valores hardcoded.
- Alterar `NEXT_PUBLIC_API_BASE_URL` exige novo build/redeploy do frontend.
- `127.0.0.1` nao deve ser usado como URL principal em tarefas sobre deploy, producao, DNS ou dominio.
- Nao coloque URLs locais em configuracao publica de producao.
