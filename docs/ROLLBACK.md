# Rollback de producao na VPS

O rollback atual acontece na propria VPS. Railway e as antigas URLs `*.railway.app` nao fazem parte do plano operacional atual.

## Principios

- Identifique a ultima revisao conhecida como estavel antes de alterar o servidor.
- Preserve logs e faca backup antes de qualquer acao que possa afetar banco, uploads ou arquivos de ambiente.
- Nao use `git reset --hard`, nao apague volumes e nao execute `docker compose down -v`.
- Trate rollback de codigo e rollback de banco como operacoes diferentes.
- Se a versao com problema aceitou dados reais, preserve esses dados antes de voltar a aplicacao.

## Procedimento preferencial

Reverta a mudanca com problema na branch `main` por meio de uma alteracao Git revisada. Depois que `main` voltar a representar uma versao segura, aplique o fluxo manual descrito em [DEPLOY.md](DEPLOY.md):

```bash
cd /opt/babyplays/app
git status --short
git fetch origin main
git switch main
git pull --ff-only origin main
```

Reconstrua apenas os containers afetados e suba novamente o Compose:

```bash
# Se o backend foi revertido
docker compose -f docker-compose.vps.yml build backend

# Se o frontend foi revertido
docker compose --env-file /srv/babyplays/env/frontend.env -f docker-compose.vps.yml build frontend

docker compose -f docker-compose.vps.yml up -d
```

Se houver alteracao somente em `infra/nginx/babyplays.conf`, recrie o servico com `up -d` e valide com `nginx -t`; nao ha imagem local do Nginx para reconstruir.

## Banco de dados

Nao reverta migrations cegamente. Antes de qualquer mudanca de schema:

1. confira se a versao anterior do codigo e compativel com o schema atual;
2. gere e proteja um backup do PostgreSQL e de `media`;
3. use uma migration reversa somente se ela tiver sido revisada e for segura para os dados atuais;
4. use restore apenas como operacao planejada, sabendo que ele pode descartar dados criados depois do backup.

O procedimento de backup e restore fica em [BACKUP_RESTORE.md](BACKUP_RESTORE.md).

## Validacao

```bash
docker compose -f docker-compose.vps.yml ps
docker compose -f docker-compose.vps.yml exec backend python manage.py check
docker compose -f docker-compose.vps.yml exec backend python manage.py check --deploy
docker compose -f docker-compose.vps.yml exec nginx nginx -t
curl -I https://www.babyplays.com.br/
curl -I https://api.babyplays.com.br/api/auth/csrf/
```

Valide tambem login, CSRF, catalogo, imagens, carrinho, checkout, contrato e admin conforme o impacto da mudanca. Revise os logs dos quatro servicos sem copiar segredos ou dados pessoais.

## Legado

Durante a migracao inicial, a Railway foi considerada um rollback temporario antes de a VPS aceitar dados reais. Essa estrategia encerrou quando a VPS se tornou o ambiente oficial de producao; voltar o DNS para a Railway nao e uma instrucao valida hoje.
