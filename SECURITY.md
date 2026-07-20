# Politica de Seguranca

## Escopo

Este repositorio contem o codigo da aplicacao BabyPlays, incluindo backend Django, API Django REST Framework e frontend Next.js.

## Como reportar vulnerabilidades

Nao abra uma issue publica com detalhes exploraveis, dados pessoais, credenciais, tokens, cookies, session ids, chaves privadas ou dumps.

Reporte vulnerabilidades de forma privada ao mantenedor do projeto pelo canal operacional definido antes da publicacao do repositorio. Inclua:

- resumo do problema;
- arquivo, endpoint ou fluxo afetado;
- impacto esperado;
- passos de reproducao em ambiente local ou de homologacao;
- evidencias sem expor segredos completos ou dados reais de clientes.

## Segredos e dados sensiveis

Nunca publique:

- arquivos `.env`, `.env.local`, `.env.production` ou equivalentes;
- `SECRET_KEY`, `DATABASE_URL`, senhas, tokens, cookies, chaves de API ou credenciais SMTP;
- chaves privadas, certificados ou arquivos de service account;
- bancos locais, dumps, backups, logs ou exports;
- uploads reais, imagens de clientes ou dados pessoais.

Se um segredo real for encontrado no historico ou no codigo, trate como comprometido: remova a exposicao, rotacione o segredo no provedor, invalide sessoes/tokens quando aplicavel e revise logs/backups relacionados.

## Dependencias

Antes de publicar ou fazer deploy, execute os checks do projeto e revise vulnerabilidades de dependencias. Nao use `npm audit fix --force` sem revisao humana, pois ele pode introduzir upgrades ou downgrades arriscados.

## Ambientes

`DEBUG=True` e SQLite sao permitidos apenas no ambiente local. A producao na VPS deve usar `DEBUG=False`, PostgreSQL, variaveis protegidas fora do repositorio e cookies seguros.
