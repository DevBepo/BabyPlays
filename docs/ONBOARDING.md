# Onboarding rapido - BabyPlays

Este guia leva do clone ate uma primeira alteracao pequena. Para regras de negocio e ambientes, consulte os documentos indicados no final.

## Arquitetura em um minuto

O projeto e um monorepositorio com duas aplicacoes:

- `backend/`: Django + Django REST Framework. Concentra autenticacao, validacoes e todas as regras criticas de preco, frete, contrato, estoque e reserva.
- `frontend/`: Next.js + React + TypeScript. Renderiza o catalogo, a area do cliente e o painel administrativo; consome a API usando cookies de sessao e CSRF.
- `docs/`: contexto, seguranca, operacao e trilha de estudo.
- `infra/`, `Dockerfile` e `docker-compose.vps.yml`: infraestrutura. Nao altere sem uma tarefa especifica.

Apps principais do backend:

- `catalogo`: brinquedos, kits, unidades fisicas, imagens e disponibilidade.
- `clientes`: perfil, cadastro, login por sessao e CSRF.
- `pedidos`: carrinho, pedido, contrato, reserva e ciclo da locacao.
- `entregas`: regras de frete por bairro e provedores de rota.

No frontend, comece por `src/app` para rotas, `src/services` para chamadas HTTP, `src/types` para contratos e `src/components` para UI reutilizavel.

## Executar localmente

Requisitos: Python compativel com Django 6, Node.js, npm e PowerShell. PostgreSQL e opcional localmente; sem configuracao de banco o backend usa SQLite quando `DEBUG=True`.

Backend:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

Frontend, em outro terminal:

```powershell
cd frontend
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run dev -- -H 127.0.0.1
```

Acesse `http://127.0.0.1:3000`. Nao misture `localhost` e `127.0.0.1`: sessao, cookies e CSRF dependem do host.

## Variaveis locais

Copie os exemplos; nunca versione os arquivos reais.

- Backend: `SECRET_KEY`, `DEBUG`, `DATABASE_URL` ou variaveis `POSTGRES_*`, `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS`, `CORS_ALLOWED_ORIGINS` e, opcionalmente, `GOOGLE_ROUTES_API_KEY`.
- Frontend: `NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_BABYPLAYS_WHATSAPP` e `NEXT_PUBLIC_BABYPLAYS_INSTAGRAM_URL`.

Variaveis `NEXT_PUBLIC_*` sao visiveis no navegador e nao podem conter segredos. Use os exemplos em `backend/.env.example` e `frontend/.env.example` como fonte dos nomes suportados.

## Validacao minima

Prefira testes direcionados durante a iteracao; a suite completa do backend e extensa.

```powershell
# Backend
cd backend
.\venv\Scripts\python.exe manage.py check
.\venv\Scripts\python.exe manage.py test catalogo.tests.CategoriaAPITests
.\venv\Scripts\python.exe manage.py test clientes.tests.ClienteAuthAPITests
.\venv\Scripts\python.exe manage.py test pedidos.tests.CarrinhoAPITests

# Frontend
cd ..\frontend
npm.cmd run lint
npm.cmd run build

# Raiz
cd ..
git diff --check
```

Escolha o teste direcionado do modulo alterado. Mudancas em pedido, estoque, contrato, autenticacao ou permissao exigem tambem os testes de regressao daquele fluxo.

## Primeira alteracao pequena

1. Leia `AGENTS.md` e localize a rota ou app responsavel.
2. Confirme o comportamento existente em um teste ou chamada de service.
3. Altere o menor conjunto de arquivos possivel; nao mova regra critica para o frontend.
4. Adicione ou ajuste teste quando houver codigo de aplicacao ou regra de negocio.
5. Rode o check, o teste direcionado, lint/build quando aplicavel e `git diff --check`.
6. Revise o diff para garantir que migrations, ambientes e arquivos locais nao entraram por acidente.

Boas primeiras tarefas: texto de uma tela, componente visual isolado, serializer de leitura sem regra critica ou teste de um comportamento ja existente. Evite iniciar por reserva, estoque, contrato ou checkout.

## Regras que nao podem ser esquecidas

- Autenticacao oficial: Django sessions + CSRF; nao JWT.
- Cliente so acessa os proprios dados; rotas administrativas exigem staff.
- Preco, frete e disponibilidade sao calculados no backend.
- Estoque e por unidade fisica e nao pode haver overbooking.
- Pedido nao confirma sem contrato aceito e reservas compativeis.
- Item retirado/devolvido vai para higienizacao ou standby; a volta a disponivel e manual.

## Leitura seguinte

- [Contexto e regras de negocio](PROJECT_CONTEXT.md)
- [Fluxo compacto da locacao](FLUXO_LOCACAO.md)
- [Regras de engenharia](CODEX_RULES.md)
- [Checklist de seguranca](SECURITY_CHECKLIST.md)
- [Trilha de estudo baseada no codigo](trilha-estudo/README.md)
- [Ambientes e deploy](DEPLOY.md) — somente para tarefas de deploy ou configuracao online
