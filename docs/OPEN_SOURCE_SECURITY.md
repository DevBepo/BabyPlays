# Preparacao Open Source - Seguranca

Este checklist deve ser executado antes de tornar o repositorio publico.

## Arquivos que nunca devem ir para o GitHub

- `.env`, `.env.local`, `.env.production` e variantes reais;
- `SECRET_KEY`, `DATABASE_URL`, senhas, tokens, cookies e chaves de API;
- chaves privadas, certificados, arquivos `.pem`, `.key`, `.p12`, `.pfx`;
- bancos locais, `.sqlite3`, dumps, backups e exports;
- logs de desenvolvimento, erro, build ou servidor;
- `media/`, uploads reais, imagens operacionais e dados de clientes;
- dados pessoais de clientes, pedidos, enderecos, IPs, user-agents e contratos reais.

## Checklist antes de publicar

1. Rodar busca por arquivos sensiveis no workspace.
2. Confirmar que `git status --short` nao inclui arquivos locais sensiveis.
3. Confirmar que `git ls-files` nao lista logs, bancos, dumps, uploads ou envs reais.
4. Rodar busca textual por padroes como `SECRET_KEY`, `DATABASE_URL`, `TOKEN`, `API_KEY`, `PRIVATE KEY`, `COOKIE` e `session_key`.
5. Revisar `.env.example` e garantir que contem apenas placeholders.
6. Revisar `README.md`, `SECURITY.md`, `docs/DEPLOY.md` e `docs/PRIVACY_LGPD.md`.
7. Executar testes e builds do backend/frontend.
8. Revisar historico Git se houver suspeita de segredo versionado anteriormente.

## Rotacao se houver vazamento

Se qualquer segredo real tiver sido exposto:

1. Nao imprima o valor completo em logs, issues ou commits.
2. Identifique arquivo, tipo de segredo, ambiente e periodo de exposicao.
3. Rotacione o segredo no provedor responsavel.
4. Revogue tokens, cookies ou sessoes associados quando aplicavel.
5. Atualize Railway Variables ou provedor equivalente.
6. Rode os checks novamente.
7. Documente internamente o incidente sem publicar detalhes exploraveis.

## Status defensivo dos achados conhecidos

- Session key como dado de negocio: deve permanecer fora de `Pedido`, serializers e admins.
- Checkout: deve revalidar preco, status e composicao antes de criar pedido.
- LGPD: politica tecnica preliminar existe neste repositorio, mas precisa revisao juridica/operacional antes de producao real.
- Dependencias: `npm audit` deve ser acompanhado de atualizacao controlada, sem `--force`.
- Rate limiting: endpoints criticos usam throttling DRF escopado e podem receber limites mais restritivos por variaveis de ambiente em producao.
