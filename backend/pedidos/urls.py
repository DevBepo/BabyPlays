from django.urls import path

from .views import (
    CarrinhoAtualView,
    ConverterCarrinhoPedidoView,
    ItemCarrinhoDetalheView,
    ItemCarrinhoView,
    LimparCarrinhoView,
    PedidoDetalheView,
    PedidoListView,
)


urlpatterns = [
    path("carrinho/atual/", CarrinhoAtualView.as_view(), name="carrinho-atual"),
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
]
