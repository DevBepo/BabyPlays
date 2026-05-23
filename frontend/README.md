# Frontend BABYPLAYS.BRINQUEDOS

## Ambiente local oficial

Este projeto usa autenticação por Django sessions, CSRF e cookies. Em desenvolvimento, use sempre `127.0.0.1` para frontend e backend. Não alterne entre `localhost` e `127.0.0.1` no mesmo fluxo, pois isso pode quebrar sessão, cookies, CSRF e login/admin.

Configure o frontend com:

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

Acesse o site em:

[http://127.0.0.1:3000](http://127.0.0.1:3000)

Se existir `frontend/.env.local`, mantenha esse padrão nele. Esse arquivo é local e não deve ser commitado quando estiver ignorado pelo Git.

## Observações

- `frontend/.env.example` deve apontar para `NEXT_PUBLIC_API_BASE_URL=http://127.0.0.1:8000`.
- O backend deve aceitar as origens locais `http://127.0.0.1:3000` e `http://localhost:3000` para CSRF/CORS de desenvolvimento.
- Produção deve usar variáveis de ambiente próprias e domínios reais.
