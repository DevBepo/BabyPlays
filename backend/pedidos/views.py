from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import ItemCarrinho, Pedido
from .serializers import (
    AdicionarItemCarrinhoSerializer,
    AlterarItemCarrinhoSerializer,
    CarrinhoSerializer,
    ConverterCarrinhoPedidoSerializer,
    ItemCarrinhoSerializer,
    PedidoSerializer,
)
from .services import CarrinhoService, PedidoService


class CarrinhoMixin:
    permission_classes = [AllowAny]

    def get_carrinho(self):
        return CarrinhoService.carrinho_atual(self.request)

    def get_item_do_carrinho(self, item_id):
        carrinho = self.get_carrinho()
        return get_object_or_404(ItemCarrinho, id=item_id, carrinho=carrinho)


class CarrinhoAtualView(CarrinhoMixin, APIView):
    def get(self, request):
        carrinho = self.get_carrinho()
        return Response(CarrinhoSerializer(carrinho).data)


class ItemCarrinhoView(CarrinhoMixin, APIView):
    def post(self, request):
        carrinho = self.get_carrinho()
        serializer = AdicionarItemCarrinhoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = CarrinhoService.adicionar_item(carrinho, serializer.validated_data)
        return Response(
            ItemCarrinhoSerializer(item).data,
            status=status.HTTP_201_CREATED,
        )


class ItemCarrinhoDetalheView(CarrinhoMixin, APIView):
    def patch(self, request, item_id):
        item = self.get_item_do_carrinho(item_id)
        serializer = AlterarItemCarrinhoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        item = CarrinhoService.alterar_quantidade(
            item,
            serializer.validated_data["quantidade"],
        )
        return Response(ItemCarrinhoSerializer(item).data)

    def delete(self, request, item_id):
        item = self.get_item_do_carrinho(item_id)
        CarrinhoService.remover_item(item)
        return Response(status=status.HTTP_204_NO_CONTENT)


class LimparCarrinhoView(CarrinhoMixin, APIView):
    def delete(self, request):
        carrinho = self.get_carrinho()
        CarrinhoService.limpar(carrinho)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ConverterCarrinhoPedidoView(CarrinhoMixin, APIView):
    def post(self, request):
        carrinho = self.get_carrinho()
        serializer = ConverterCarrinhoPedidoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        pedido = PedidoService.converter_carrinho(
            carrinho,
            serializer.dados_para_pedido(),
        )
        return Response(PedidoSerializer(pedido).data, status=status.HTTP_201_CREATED)


class PedidoListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        pedidos = Pedido.objects.filter(usuario=request.user).prefetch_related("itens")
        return Response(PedidoSerializer(pedidos, many=True).data)


class PedidoDetalheView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pedido_id):
        pedido = get_object_or_404(
            Pedido.objects.filter(usuario=request.user).prefetch_related("itens"),
            id=pedido_id,
        )
        return Response(PedidoSerializer(pedido).data)
