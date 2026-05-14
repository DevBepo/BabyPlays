from django.urls import path

from .views import (
    CarrinhoAtualView,
    ItemCarrinhoDetalheView,
    ItemCarrinhoView,
    LimparCarrinhoView,
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
]
