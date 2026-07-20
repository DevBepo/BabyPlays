# Auditoria estrutural - 2026-07-16

Escopo: reduzir poluicao e complexidade acidental sem alterar regras de negocio, banco, infraestrutura, deploy ou APIs. Nenhum arquivo local foi apagado.

## Inventario de artefatos locais

| Caminho | Tamanho aproximado | Estado Git | Classificacao | Evidencia e decisao |
|---|---:|---|---|---|
| `tmp/nicolas-only/` | 126,9 MiB, 420 arquivos | nao versionado; antes nao ignorado | precisa de confirmacao humana | Copia do projeto: entre 228 arquivos rastreados, 189 copias sao identicas, 35 divergem e 4 nao existem na copia. Preservado. |
| demais itens em `tmp/` | ~0,8 MiB | nao versionados; antes nao ignorados | adicionar ao `.gitignore` | Logs, PDFs e diretorios de execucao local. Preservados; `/tmp/` foi ignorado na raiz. |
| `output/` | ~0,03 MiB, 6 arquivos | nao versionado; antes nao ignorado | adicionar ao `.gitignore` e manter | Contem logs e arquivos pessoais `output/pdf/curriculo_backend_jonas.{pdf,tex}`. Preservado; `/output/` foi ignorado. |
| `frontend/.next/` | 873,6 MiB | ignorado | manter ignorado | Build/cache recriavel do Next.js. |
| `frontend/node_modules/` | 418,2 MiB | ignorado | manter ignorado | Dependencias reinstalaveis pelo lockfile. |
| `backend/venv/` | 78,0 MiB | ignorado | manter ignorado | Ambiente Python local. |
| `backend/media/` | 50,6 MiB | ignorado | manter | Uploads locais podem ser dados de trabalho; nao apagar automaticamente. |
| `backend/db.sqlite3` | 0,49 MiB | ignorado | manter | Banco local; pode conter dados de desenvolvimento. |
| `.env` e `.env.local` | pequenos | ignorados | manter ignorados | Configuracoes e possiveis segredos locais. |
| logs e caches | variavel | ignorados | manter ignorados | Regras `*.log`, `__pycache__/`, `.mypy_cache/` e caches de build ja cobrem os artefatos encontrados. |
| `screenshots-cliente/` | 1,79 MiB | ignorado | manter | Evidencias visuais locais de QA. |
| `docs/responsividade/` | 0,27 MiB | 3 arquivos versionados | manter | Plano, preview HTML e evidencia visual representam trabalho de design; nao ha prova de obsolescencia. |
| `docs/architecture/` | ~20 KiB | ignorado em `.git/info/exclude` local | precisa de confirmacao humana | Sete documentos pessoais de arquitetura. Avaliar separadamente se devem virar documentacao oficial. |

## Codigo morto e duplicacao

Evidencias coletadas:

- O ESLint nao encontrou imports ou variaveis nao utilizados; ha apenas avisos de `<img>`.
- Todos os modulos `.ts`/`.tsx` em `frontend/src` possuem importacao interna ou sao entradas convencionais do Next (`page`, `layout` etc.). Nenhum arquivo fonte foi classificado como morto.
- Todas as views importadas pelas URLconfs Django permanecem acessiveis; admins, migrations e testes foram tratados como entradas dinamicas/conventionais.
- Helpers `isApiError` e `erroCampo` estavam repetidos em paginas administrativas de catalogo. Eles podem ser centralizados sem mudar payloads.
- Formatadores de moeda/data e badges de status se repetem, mas nem todos possuem a mesma politica de `null`, valor invalido ou fuso horario. Nao devem ser unificados mecanicamente.

Candidatos sem referencias internas alem da propria declaracao:

- `uploadImagemBrinquedo`, `uploadImagemAdminKitFesta`, `uploadImagensKitFesta`, `removerImagemKitFesta` e `definirImagemPrincipalKitFesta` no frontend;
- `limparCarrinho` no frontend;
- alias `BrinquedoSerializer = BrinquedoAdminSerializer` no backend.

Eles foram mantidos porque sao exports/aliases publicos internos e a busca estatica nao prova ausencia de consumidores externos, scripts locais ou uso planejado. Remocao exige confirmacao humana e uma rodada de regressao especifica.

## Arquivos monoliticos

### `backend/pedidos/services.py` - 2.142 linhas

Responsabilidades atuais:

- `CarrinhoService` (462 linhas): sessao, snapshots e mutacoes do carrinho;
- `PedidoService` (478): revalidacao do checkout, frete, snapshots e conversao;
- `ContratoService` (96): contrato vigente e auditoria do aceite;
- `ReservaPedidoService` (306): demandas, locks, conflitos e criacao de reservas;
- dashboard (66), agenda (248) e acoes administrativas (28);
- gestao do pedido (185), confirmacao (71) e operacao da locacao (135).

Plano de divisao, mantendo `pedidos.services` como fachada de compatibilidade:

| Modulo proposto | Conteudo | Risco | Protecao minima |
|---|---|---|---|
| `services_admin_dashboard.py` | dashboard | baixo | `AdminDashboardAPITests` |
| `services_admin_agenda.py` | agenda | baixo | `PedidoAdminAgendaAPITests` |
| `services_cart.py` | `CarrinhoService` | medio | `CarrinhoAPITests` |
| `services_checkout.py` | `PedidoService` | alto | todos os testes de checkout, frete, snapshots e permissao |
| `services_contract.py` | `ContratoService` | alto | testes de aceite, auditoria e imutabilidade |
| `services_reservation.py` | `ReservaPedidoService` | alto | reserva, rollback, idempotencia e overbooking |
| `services_order_admin.py` | gestao e confirmacao | alto | status, renovacao, confirmacao e historico |
| `services_rental_operation.py` | inicio e retirada | alto | locks, rollback, status e higienizacao |

Dependencias mais sensiveis: models de `catalogo`, `clientes`, `entregas`, transacoes Django, locks `select_for_update`, serializers de validacao de kits e chamadas cruzadas entre services. Nenhuma extracao backend foi executada nesta auditoria devido a regra de parada dos fluxos criticos.

### `backend/pedidos/serializers.py` - 925 linhas

Agrupa carrinho/publico, pedido do cliente, agenda, dashboard, detalhe admin, contrato, reserva e operacao. Divisao sugerida:

- `serializers_cart.py` e `serializers_checkout.py` — risco alto;
- `serializers_public_orders.py` — medio;
- `serializers_admin_orders.py` — medio;
- `serializers_admin_agenda.py` e `serializers_admin_dashboard.py` — baixo;
- `serializers_contract.py` e `serializers_reservation.py` — alto.

Manter reexports em `pedidos.serializers` durante a migracao evita quebrar imports. Testes relevantes estao em `CarrinhoAPITests`, `PedidoAdminAPITests`, `PedidoAdminAgendaAPITests` e `ReservaUnidadesPedidoAdminTests`.

### `backend/catalogo/serializers.py` - 906 linhas

Agrupa categorias, imagens, brinquedos publicos/admin, unidades, kits, interesses, kits personalizaveis e disponibilidade. Divisao sugerida:

- `serializers_categories.py` e `serializers_interests.py` — baixo;
- `serializers_toys.py` e `serializers_media.py` — medio;
- `serializers_kits.py` — medio/alto pela escrita transacional da composicao;
- `serializers_custom_kits.py` — alto pela validacao de selecao e preco;
- `serializers_availability.py` — alto por disponibilidade.

Os testes de `CategoriaAPITests`, `BrinquedoAPITests`, `KitFestaAPITests`, `KitPersonalizavelAPITests` e `DisponibilidadePeriodoAPITests` protegem as fronteiras principais.

### Frontend administrativo

| Arquivo | Linhas iniciais | Responsabilidades | Extracoes sugeridas | Risco |
|---|---:|---|---|---|
| `admin/brinquedos/page.tsx` | 1.272 | carga, filtros, CRUD, upload/galeria, unidades, formulario e cards | card visual, filtros, galeria, secoes de preco/unidades e hook de mutacao | baixo para componentes visuais; medio para hooks/mutacoes |
| `admin/agenda/page.tsx` | 850 | datas, geometria do calendario, cards, painel e fetch | `agenda-date-utils`, `AgendaEventCard`, `EventDetailsPanel`, hook de consulta | baixo/medio |
| `admin/pedidos/[id]/page.tsx` | 731 | formatacao, detalhe, datas e todas as acoes | secoes visuais primeiro; hook de acoes depois | medio/alto |
| `admin/kits/page.tsx` | 619 | CRUD, composicao, imagens e formulario | card, galeria e formulario | medio |
| `admin/page.tsx` | 389 | formatacao, indicadores e ultimos pedidos | formatadores e cards de indicador | baixo |
| `admin/brinquedos/novo/page.tsx` | 413 | formulario, categorias, payload e upload | formulario visual e galeria | medio |
| `admin/categorias/page.tsx` | 373 | CRUD, formulario e listagem | formulario e linha de categoria | baixo |

## Refatoracoes executadas

- Criado `frontend/src/lib/api-error.ts` para o type guard e a leitura de erros de campo que estavam identicos em seis arquivos do catalogo administrativo.
- Criado `BrinquedoAdminCard`, componente puramente visual. A pagina continua dona de carregamento, estado, confirmacoes e mutacoes.
- Criado `BrinquedoAdminFilters`, componente puramente visual. A pagina continua dona dos filtros e da paginacao.
- Criado `frontend/src/lib/admin-brinquedos.ts` para o tipo de filtro, classificacao administrativa e formatacao usada pelo card.
- `admin/brinquedos/page.tsx` caiu de 1.272 para 1.074 linhas (menos 198), sem mover payloads ou chamadas HTTP.
- As seis paginas/componentes que continham os helpers repetidos perderam entre 12 e 13 linhas cada.

O total do frontend nao foi reduzido na mesma proporcao porque JSX e utilitarios foram movidos para modulos nomeados. O objetivo foi reduzir a carga cognitiva do arquivo principal, nao maximizar uma contagem global.

## Documentacao

- `README.md`, `PROJECT_CONTEXT.md` e `CODEX_RULES.md` repetem algumas regras de ambiente, mas atendem publicos diferentes: entrada, dominio e regras de engenharia. Foram preservados.
- A trilha de estudo e seus PDFs duplicam conteudo por formato deliberadamente. Foram preservados.
- `ONBOARDING.md` fornece a rota curta que faltava.
- `FLUXO_LOCACAO.md` registra a sequencia real e aponta models, services, fronteiras e testes.

## Plano futuro seguro

1. Extrair componentes visuais restantes de `admin/brinquedos` sem mover chamadas HTTP.
2. Extrair utilitarios puros de agenda e seus componentes visuais.
3. Adicionar testes de frontend em tarefa separada antes de mover hooks de mutacao.
4. Separar dashboard e agenda do `pedidos/services.py`, mantendo reexports.
5. Separar serializers administrativos de leitura.
6. Somente depois planejar checkout, contrato, reserva e operacao, um fluxo por vez, com suite dirigida e completa.
7. Revisar manualmente as 35 divergencias de `tmp/nicolas-only` antes de qualquer exclusao local.
