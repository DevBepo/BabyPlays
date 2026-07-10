# Rollback da Migracao VPS

O Railway continua sendo o ambiente de rollback ate a VPS ser validada em producao real. Nao desative servicos, volumes ou banco do Railway antes de uma janela operacional aprovada.

## Antes de aceitar dados reais na VPS

Enquanto a VPS ainda nao recebeu dados novos de clientes, o rollback mais simples e manter ou devolver o DNS para o Railway:

- frontend: `https://babyplays.up.railway.app`
- backend/API: `https://api-babyplays.up.railway.app`

No provedor de DNS, restaure os registros que apontavam para Railway e aguarde a propagacao conforme o TTL configurado.

## Depois de aceitar dados reais na VPS

Se clientes criarem pedidos, cadastros, uploads ou alteracoes na VPS, existe risco de divergencia entre o banco da VPS e o banco do Railway. Antes de voltar DNS para Railway, decida como tratar esses dados:

- pausar escrita na VPS;
- exportar dados novos, quando houver procedimento seguro;
- comunicar janela de instabilidade se necessario;
- preservar backups da VPS antes de qualquer tentativa de reconciliacao.

Nao faca rollback destrutivo sem backup recente de PostgreSQL, media e envs.

## Criterios minimos para considerar VPS pronta

- `docker compose -f docker-compose.vps.yml ps` saudavel.
- `python manage.py check --deploy` revisado.
- Migrations aplicadas.
- `collectstatic` executado e `/static/` servido corretamente.
- `/media/` servido sem listagem de diretorio.
- Login, CSRF, carrinho, checkout, contrato e admin validados.
- HTTPS valido com renovacao testada.
- Backups e restore testados.
- Logs revisados sem segredos.
- Railway ainda acessivel durante a janela de validacao.

## Regra operacional

Nao remova Railway do plano ate pelo menos uma validacao completa do fluxo real, incluindo catalogo, carrinho, pedido, aceite de contrato, administracao, uploads e backups.
