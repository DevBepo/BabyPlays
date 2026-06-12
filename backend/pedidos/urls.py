from django.urls import path

from .views import (
    AceitarContratoPedidoView,
    AdminAgendaView,
    AdminContratoView,
    AdminConfirmarPedidoView,
    AdminPedidoDetailView,
    AdminPedidoListView,
    AdminIniciarLocacaoPedidoView,
    AdminRegistrarRetiradaPedidoView,
    AdminReservarUnidadesPedidoView,
    CarrinhoAtualView,
    ContratoVigenteView,
    ConverterCarrinhoPedidoView,
    ItemCarrinhoDetalheView,
    ItemCarrinhoView,
    LimparCarrinhoView,
    PedidoContratoView,
    PedidoDetalheView,
    PedidoListView,
)


urlpatterns = [
    path("carrinho/atual/", CarrinhoAtualView.as_view(), name="carrinho-atual"),
    path("contrato/vigente/", ContratoVigenteView.as_view(), name="contrato-vigente"),
    path("carrinho/itens/", ItemCarrinhoView.as_view(), name="carrinho-itens"),
    path(
        "carrinho/itens/<int:item_id>/",
        ItemCarrinhoDetalheView.as_view(),
        name="carrinho-item-detalhe",
    ),
    path("carrinho/limpar/", LimparCarrinhoView.as_view(), name="carrinho-limpar"),
    path(
        "pedidos/converter-carrinho/",
        ConverterCarrinhoPedidoView.as_view(),
        name="pedido-converter-carrinho",
    ),
    path("pedidos/", PedidoListView.as_view(), name="pedido-lista"),
    path("pedidos/<int:pedido_id>/", PedidoDetalheView.as_view(), name="pedido-detalhe"),
    path(
        "pedidos/<int:pedido_id>/contrato/",
        PedidoContratoView.as_view(),
        name="pedido-contrato",
    ),
    path(
        "pedidos/<int:pedido_id>/aceitar-contrato/",
        AceitarContratoPedidoView.as_view(),
        name="pedido-aceitar-contrato",
    ),
    path(
        "admin/pedidos/",
        AdminPedidoListView.as_view(),
        name="admin-pedido-lista",
    ),
    path(
        "admin/agenda/",
        AdminAgendaView.as_view(),
        name="admin-agenda",
    ),
    path(
        "admin/contrato/",
        AdminContratoView.as_view(),
        name="admin-contrato",
    ),
    path(
        "admin/pedidos/<int:pedido_id>/",
        AdminPedidoDetailView.as_view(),
        name="admin-pedido-detalhe",
    ),
    path(
        "admin/pedidos/<int:pedido_id>/reservar-unidades/",
        AdminReservarUnidadesPedidoView.as_view(),
        name="admin-pedido-reservar-unidades",
    ),
    path(
        "admin/pedidos/<int:pedido_id>/confirmar/",
        AdminConfirmarPedidoView.as_view(),
        name="admin-pedido-confirmar",
    ),
    path(
        "admin/pedidos/<int:pedido_id>/iniciar-locacao/",
        AdminIniciarLocacaoPedidoView.as_view(),
        name="admin-pedido-iniciar-locacao",
    ),
    path(
        "admin/pedidos/<int:pedido_id>/registrar-retirada/",
        AdminRegistrarRetiradaPedidoView.as_view(),
        name="admin-pedido-registrar-retirada",
    ),
]
