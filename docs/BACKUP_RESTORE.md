# Backup e Restore

Backups devem ficar fora do Git, protegidos por permissao restrita e, quando copiados para armazenamento externo, criptografados ou protegidos pelo provedor.

## Backup do PostgreSQL

Crie um dump em `/srv/babyplays/backups`:

```bash
cd /opt/babyplays/app
mkdir -p /srv/babyplays/backups
docker compose -f docker-compose.vps.yml exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-privileges' > /srv/babyplays/backups/babyplays-$(date +%Y%m%d-%H%M%S).dump
chmod 600 /srv/babyplays/backups/*.dump
```

Se as variaveis nao estiverem disponiveis no shell, leia os nomes de banco e usuario em `/srv/babyplays/env/postgres.env` sem imprimir a senha em logs.

## Backup de media

```bash
tar -C /srv/babyplays -czf /srv/babyplays/backups/media-$(date +%Y%m%d-%H%M%S).tar.gz media
chmod 600 /srv/babyplays/backups/media-*.tar.gz
```

## Backup de envs

Os envs contem segredos. Se precisar guardar uma copia, use armazenamento criptografado e acesso restrito:

```bash
tar -C /srv/babyplays -czf /srv/babyplays/backups/env-$(date +%Y%m%d-%H%M%S).tar.gz env
chmod 600 /srv/babyplays/backups/env-*.tar.gz
```

Nunca commite backups de env, dumps, logs ou media.

## Restore do PostgreSQL

Pare os servicos que escrevem no banco:

```bash
cd /opt/babyplays/app
docker compose -f docker-compose.vps.yml stop backend frontend nginx
```

Mantenha o servico `db` rodando durante o restore; o `pg_restore` abaixo conecta no container do PostgreSQL em execucao. Atenção: `--clean` e destrutivo, pois remove objetos existentes antes de recria-los a partir do dump.

Restaure em um banco vazio ou recriado:

```bash
docker compose -f docker-compose.vps.yml exec -T db pg_restore -U <user> -d <db> --clean --if-exists --no-owner --no-privileges < /srv/babyplays/backups/<arquivo>.dump
```

Depois rode checks:

```bash
docker compose -f docker-compose.vps.yml start backend frontend nginx
docker compose -f docker-compose.vps.yml exec backend python manage.py check
```

## Restore de media

```bash
docker compose -f docker-compose.vps.yml stop backend nginx
tar -C /srv/babyplays -xzf /srv/babyplays/backups/<media>.tar.gz
sudo chown -R babyplays:babyplays /srv/babyplays/media
docker compose -f docker-compose.vps.yml start backend nginx
```

## Teste de restore

Teste restore periodicamente em ambiente isolado antes de confiar no processo. Valide login admin, catalogo, imagens, pedidos e arquivos enviados. Nao use dados reais em ambientes inseguros.
