# Fluxo da locacao

Este documento descreve o comportamento atual. Ele nao substitui os testes nem autoriza alterar as transicoes de estado.

## Sequencia real

```text
catalogo -> carrinho -> login -> checkout + frete + aceite
         -> pedido aguardando analise -> definicao das datas -> reservas fisicas
         -> confirmacao administrativa -> locacao -> retirada/devolucao
         -> higienizacao ou standby -> liberacao manual -> disponivel
```

O aceite e salvo na mesma transacao que converte o carrinho em pedido. A reserva das unidades ocorre antes da confirmacao administrativa.

| Etapa | Models principais | Services, serializers e views | Testes e invariantes |
|---|---|---|---|
| Catalogo e disponibilidade inicial | `Brinquedo`, `KitFesta`, `ConfiguracaoKitPersonalizavel`, `UnidadeBrinquedo` | `BrinquedoService`, `KitPersonalizavelService`, `DisponibilidadeService`; serializers e viewsets de `catalogo` | `catalogo.tests.DisponibilidadePeriodoAPITests`. Somente unidade fisica `disponivel`, sem conflito no periodo, pode contar. Consulta nao cria reserva. |
| Carrinho anonimo ou autenticado | `Carrinho`, `ItemCarrinho` | `CarrinhoService`; `AdicionarItemCarrinhoSerializer`, `CarrinhoSerializer`; views de `/api/carrinho/*` | `pedidos.tests.CarrinhoAPITests`. Preco e subtotal vem do backend. Adicionar ao carrinho nao reserva estoque. |
| Identificacao e login | `User`, `Cliente`, `Carrinho` | `vincular_carrinho_anonimo_da_sessao`; serializers e views de `clientes` | `clientes.tests.ClienteAuthAPITests`. Sessao Django + CSRF; o carrinho anonimo e vinculado depois do login; cliente nao acessa dados alheios. |
| Checkout, frete e aceite | `Pedido`, `ItemPedido`, `Contrato`, `AceiteContrato` | `PedidoService.converter_carrinho`, `TaxaEntregaRetiradaService`, `ContratoService`; `ConverterCarrinhoPedidoSerializer`; `ConverterCarrinhoPedidoView` | `pedidos.tests.CarrinhoAPITests` e `entregas.tests.TaxaEntregaRetiradaServiceTests`. O backend revalida itens, recalcula valores/frete, cria snapshots e exige contrato aceito. Falha gera rollback. |
| Pedido aguardando analise | `Pedido`, `HistoricoPedido` | `GestaoAdminPedidoService.atualizar_datas`; serializers/views administrativas | `pedidos.tests.PedidoAdminAPITests` e `pedidos.tests_novo_fluxo.CheckoutSemDatasTests`. O checkout nao define o periodo final; o admin registra datas validas antes da reserva. |
| Reserva de unidades | `Pedido`, `ItemPedido`, `ReservaUnidade`, `UnidadeBrinquedo` | `ReservaPedidoService`; `ReservaPedidoResultadoSerializer`; `AdminReservarUnidadesPedidoView` | `pedidos.tests.ReservaUnidadesPedidoAdminTests`. Usa `transaction.atomic`, locks e snapshots; falta de estoque faz rollback total; periodos sobrepostos nao compartilham unidade. O pedido passa a `reservado`. |
| Confirmacao administrativa | `Pedido`, `AceiteContrato`, `ReservaUnidade` | `ConfirmacaoPedidoService`; `ConfirmacaoPedidoSerializer`; `AdminConfirmarPedidoView` | Testes `test_admin_confirma_*`, `test_pedido_sem_aceite_*` e `test_reservas_incompativeis_*`. Exige pedido reservado, aceite, periodo valido e reservas ativas compativeis. Nao altera preco nem itens. |
| Inicio da locacao | `Pedido`, `ReservaUnidade`, `UnidadeBrinquedo` | `OperacaoLocacaoService.iniciar_locacao`; `AdminIniciarLocacaoPedidoView` | Testes `test_admin_inicia_locacao_*` e de rollback. O pedido vai para `em_locacao` e cada unidade reservada vai para `em_locacao` sob lock. |
| Retirada/devolucao | `Pedido`, `ReservaUnidade`, `UnidadeBrinquedo` | `OperacaoLocacaoService.registrar_retirada`; `AdminRegistrarRetiradaPedidoView` | Testes `test_admin_registra_retirada_*` e de rollback. A acao chamada `registrar_retirada` representa o encerramento operacional: reservas viram `encerrada`, pedido vira `retirado` e unidades vao para `higienizacao`. |
| Higienizacao, standby e retorno | `UnidadeBrinquedo` | `UnidadeBrinquedoOperacaoService.liberar_disponibilidade`; endpoint administrativo em `catalogo` | `catalogo.tests.LiberarDisponibilidadeUnidadeAdminTests`. A unidade nao volta automaticamente. Somente `higienizacao` ou `standby` pode ser liberado manualmente para `disponivel`. |

## Estados principais

Pedido:

```text
aguardando_analise -> reservado -> confirmado -> em_locacao -> retirado
                 \-> cancelado
```

Reserva:

```text
ativa -> encerrada
      \-> cancelada
```

Unidade fisica no caminho normal:

```text
disponivel -> em_locacao -> higienizacao/standby -> disponivel (manual)
```

Uma reserva ativa bloqueia a unidade por periodo mesmo enquanto o status fisico ainda e `disponivel`. O status muda para `em_locacao` somente no inicio efetivo da locacao.

## Pontos de alteracao de alto risco

Antes de mudar qualquer item abaixo, leia os services e execute os testes completos de `pedidos` e `catalogo` relacionados:

- `PedidoService.converter_carrinho` e `ConverterCarrinhoPedidoSerializer`;
- `ReservaPedidoService` e consultas de conflito por periodo;
- `ConfirmacaoPedidoService`;
- `OperacaoLocacaoService`;
- `UnidadeBrinquedoOperacaoService`;
- models, constraints ou status de `Pedido`, `ReservaUnidade` e `UnidadeBrinquedo`.
