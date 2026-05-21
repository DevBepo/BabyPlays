from django.db.models import Count, Exists, OuterRef, Q
from django.shortcuts import get_object_or_404
from django.utils.dateparse import parse_date
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import AceiteContrato, ItemCarrinho, Pedido, ReservaUnidade
from .serializers import (
    AceitarContratoSerializer,
    AceiteContratoSerializer,
    AdicionarItemCarrinhoSerializer,
    AlterarItemCarrinhoSerializer,
    CarrinhoSerializer,
    ConfirmacaoPedidoSerializer,
    ContratoSerializer,
    ConverterCarrinhoPedidoSerializer,
    ItemCarrinhoSerializer,
    OperacaoLocacaoResultadoSerializer,
    PedidoAdminDetailSerializer,
    PedidoAdminListSerializer,
    PedidoSerializer,
    ReservaPedidoResultadoSerializer,
)
from .services import (
    CarrinhoService,
    ConfirmacaoPedidoService,
    ContratoService,
    ContratoVigenteAusenteError,
    OperacaoLocacaoService,
    PedidoService,
    ReservaPedidoService,
)


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
    permission_classes = [IsAuthenticated]

    def post(self, request):
        carrinho = self.get_carrinho()
        serializer = ConverterCarrinhoPedidoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        pedido = PedidoService.converter_carrinho(
            carrinho,
            serializer.dados_para_pedido(),
            request.user,
        )
        return Response(PedidoSerializer(pedido).data, status=status.HTTP_201_CREATED)


class ContratoVigenteView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        try:
            contrato = ContratoService.obter_contrato_vigente()
        except ContratoVigenteAusenteError:
            return Response(
                {"detail": "Contrato vigente indisponivel."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response(ContratoSerializer(contrato).data)


class PedidoContratoView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pedido_id):
        try:
            contrato = ContratoService.obter_contrato_do_pedido(request, pedido_id)
        except ContratoVigenteAusenteError:
            return Response(
                {"detail": "Contrato vigente indisponivel."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response(ContratoSerializer(contrato).data)


class AceitarContratoPedidoView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pedido_id):
        serializer = AceitarContratoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            aceite = ContratoService.registrar_aceite(
                request,
                pedido_id,
                serializer.validated_data,
            )
        except ContratoVigenteAusenteError:
            return Response(
                {"detail": "Contrato vigente indisponivel."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response(
            AceiteContratoSerializer(aceite).data,
            status=status.HTTP_201_CREATED,
        )


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


class AdminPedidoPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "page_size"
    max_page_size = 100


class AdminPedidoQuerysetMixin:
    ordering_padrao = "-criado_em"
    ordering_permitido = {
        "id",
        "-id",
        "status",
        "-status",
        "criado_em",
        "-criado_em",
        "atualizado_em",
        "-atualizado_em",
        "data_evento_pretendida",
        "-data_evento_pretendida",
        "data_inicio_locacao",
        "-data_inicio_locacao",
        "data_fim_locacao",
        "-data_fim_locacao",
        "total_estimado_snapshot",
        "-total_estimado_snapshot",
    }

    def queryset_base(self):
        return Pedido.objects.select_related(
            "cliente",
            "cliente__user",
            "usuario",
        )

    def queryset_listagem(self):
        aceite = AceiteContrato.objects.filter(pedido_id=OuterRef("pk"))
        reservas_ativas = ReservaUnidade.objects.filter(
            pedido_id=OuterRef("pk"),
            status=ReservaUnidade.Status.ATIVA,
        )
        return self.queryset_base().annotate(
            tem_aceite_contrato=Exists(aceite),
            possui_reservas_ativas=Exists(reservas_ativas),
            quantidade_itens=Count("itens", distinct=True),
        )

    def queryset_detalhe(self):
        return (
            self.queryset_base()
            .select_related(
                "confirmado_por",
                "aceite_contrato",
                "aceite_contrato__contrato",
            )
            .prefetch_related(
                "itens",
                "reservas_unidades__item_pedido",
                "reservas_unidades__unidade_brinquedo",
                "reservas_unidades__unidade_brinquedo__brinquedo",
            )
        )

    def aplicar_filtros(self, queryset, params):
        status_pedido = params.get("status")
        if status_pedido:
            queryset = queryset.filter(status=status_pedido)

        cliente_id = params.get("cliente")
        if cliente_id:
            if not cliente_id.isdigit():
                return None, {"cliente": "Informe um id de cliente valido."}
            queryset = queryset.filter(cliente_id=int(cliente_id))

        filtros_data = (
            ("data_evento_de", "data_evento_pretendida__gte"),
            ("data_evento_ate", "data_evento_pretendida__lte"),
            ("criado_de", "criado_em__date__gte"),
            ("criado_ate", "criado_em__date__lte"),
        )
        for nome_parametro, lookup in filtros_data:
            valor = params.get(nome_parametro)
            if not valor:
                continue
            data = parse_date(valor)
            if data is None:
                return None, {nome_parametro: "Informe uma data valida."}
            queryset = queryset.filter(**{lookup: data})

        busca = str(params.get("busca", "")).strip()
        if busca:
            filtros_busca = (
                Q(nome_cliente_snapshot__icontains=busca)
                | Q(email_cliente_snapshot__icontains=busca)
                | Q(telefone_cliente_snapshot__icontains=busca)
                | Q(cliente__nome__icontains=busca)
                | Q(cliente__telefone__icontains=busca)
                | Q(cliente__user__email__icontains=busca)
            )
            if busca.isdigit():
                filtros_busca |= Q(id=int(busca))
            queryset = queryset.filter(filtros_busca)

        ordering = params.get("ordering") or self.ordering_padrao
        if ordering not in self.ordering_permitido:
            return None, {"ordering": "Ordenacao nao permitida."}
        return queryset.order_by(ordering, "-id"), None


class AdminPedidoListView(AdminPedidoQuerysetMixin, APIView):
    permission_classes = [IsAdminUser]
    pagination_class = AdminPedidoPagination

    def get(self, request):
        queryset, erros = self.aplicar_filtros(
            self.queryset_listagem(),
            request.query_params,
        )
        if erros:
            return Response(erros, status=status.HTTP_400_BAD_REQUEST)

        paginator = self.pagination_class()
        page = paginator.paginate_queryset(queryset, request, view=self)
        serializer = PedidoAdminListSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)


class AdminPedidoDetailView(AdminPedidoQuerysetMixin, APIView):
    permission_classes = [IsAdminUser]

    def get(self, request, pedido_id):
        pedido = get_object_or_404(self.queryset_detalhe(), id=pedido_id)
        return Response(PedidoAdminDetailSerializer(pedido).data)


class AdminReservarUnidadesPedidoView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pedido_id):
        pedido = get_object_or_404(Pedido, id=pedido_id)
        resultado = ReservaPedidoService.reservar_unidades(pedido)
        return Response(ReservaPedidoResultadoSerializer(resultado).data)


class AdminConfirmarPedidoView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pedido_id):
        pedido = get_object_or_404(Pedido, id=pedido_id)
        pedido = ConfirmacaoPedidoService.confirmar(pedido, request.user)
        return Response(ConfirmacaoPedidoSerializer(pedido).data)


class AdminIniciarLocacaoPedidoView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pedido_id):
        pedido = get_object_or_404(Pedido, id=pedido_id)
        resultado = OperacaoLocacaoService.iniciar_locacao(pedido, request.user)
        return Response(OperacaoLocacaoResultadoSerializer(resultado).data)


class AdminRegistrarRetiradaPedidoView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, pedido_id):
        pedido = get_object_or_404(Pedido, id=pedido_id)
        resultado = OperacaoLocacaoService.registrar_retirada(pedido, request.user)
        return Response(OperacaoLocacaoResultadoSerializer(resultado).data)
