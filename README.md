# BabyPlays Brinquedos

Plataforma web para locacao de brinquedos e kits de festa. O projeto reune catalogo publico, area do cliente, carrinho, pedidos e operacao administrativa em um monorepositorio.

## Stack

- Backend: Python, Django e Django REST Framework.
- Frontend: Next.js, React e TypeScript.
- Banco de dados: PostgreSQL em ambientes online e SQLite como alternativa local.
- Autenticacao: sessoes do Django com protecao CSRF.

## Funcionalidades principais

- Catalogo de brinquedos e kits de festa.
- Carrinho para visitantes e clientes autenticados.
- Cadastro, login e area do cliente.
- Solicitacao de locacao com aceite de contrato.
- Calculo de entrega e validacao de disponibilidade no backend.
- Controle de estoque por unidade fisica.
- Painel administrativo para catalogo, pedidos, agenda e operacao.

## Arquitetura

O diretorio `backend/` contem a API Django e os modulos de catalogo, clientes, pedidos e entregas. O diretorio `frontend/` contem a aplicacao Next.js. O frontend consome a API por HTTP e envia cookies de sessao; regras criticas de preco, frete, contrato e disponibilidade permanecem no backend.

## Requisitos locais

- Python compativel com Django 6.
- Node.js e npm.
- PostgreSQL, caso nao queira usar o SQLite local.

## Backend

No PowerShell:

```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
python manage.py migrate
python manage.py runserver 127.0.0.1:8000
```

O backend local fica disponivel em `http://127.0.0.1:8000`.

## Frontend

Em outro terminal PowerShell:

```powershell
cd frontend
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run dev -- -H 127.0.0.1
```

O frontend local fica disponivel em `http://127.0.0.1:3000`.

## Variaveis de ambiente

Os exemplos seguros ficam em [`backend/.env.example`](backend/.env.example) e [`frontend/.env.example`](frontend/.env.example).

Backend:

- `SECRET_KEY`: chave exclusiva de cada ambiente; substitua o placeholder.
- `DEBUG`: use `True` somente localmente e `False` em ambientes online.
- `DATABASE_URL`: conexao PostgreSQL; vazia permite o SQLite local.
- `ALLOWED_HOSTS`: hosts aceitos pelo Django, sem protocolo.
- `CSRF_TRUSTED_ORIGINS` e `CORS_ALLOWED_ORIGINS`: origens completas autorizadas.
- `GOOGLE_ROUTES_API_KEY`: chave opcional para o provedor de rotas.

Frontend:

- `NEXT_PUBLIC_API_BASE_URL`: URL base da API do ambiente.
- `NEXT_PUBLIC_BABYPLAYS_WHATSAPP`: numero comercial publico.
- `NEXT_PUBLIC_BABYPLAYS_INSTAGRAM_URL`: perfil comercial publico.

Variaveis com prefixo `NEXT_PUBLIC_` sao incorporadas ao build do frontend e nao devem conter segredos.

## Comandos uteis

```powershell
# Backend
cd backend
.\venv\Scripts\python.exe manage.py check
.\venv\Scripts\python.exe manage.py test

# Frontend
cd frontend
npm.cmd run lint
npm.cmd run build
```

## Seguranca e dados

Segredos, arquivos `.env`, bancos locais, logs, uploads e artefatos de build nao sao versionados. Use variaveis protegidas do provedor para homologacao e producao. Dados reais de clientes e exports de producao nao fazem parte deste repositorio.

Consulte [`docs/DEPLOY.md`](docs/DEPLOY.md) para configuracao de ambientes e [`docs/SECURITY_CHECKLIST.md`](docs/SECURITY_CHECKLIST.md) para controles de seguranca.

## Status

Projeto em desenvolvimento e homologacao. Antes de qualquer publicacao, execute os checks do projeto e revise a configuracao do ambiente de destino.

## Licenca

Este repositorio ainda nao possui uma licenca definida. A disponibilizacao do codigo nao concede permissao automatica de uso, modificacao ou redistribuicao.
