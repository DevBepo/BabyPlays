from django.core.exceptions import ValidationError as DjangoValidationError
from django.db.models import ProtectedError
from django.shortcuts import get_object_or_404
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import (
    Categoria,
    ImagemBrinquedo,
    ImagemKitFesta,
    InteresseDisponibilidade,
    UnidadeBrinquedo,
)
from .serializers import (
    BrinquedoAdminSerializer,
    BrinquedoPublicSerializer,
    ImagemBrinquedoPublicSerializer,
    ImagemKitFestaPublicSerializer,
    CategoriaAdminSerializer,
    CategoriaResumoSerializer,
    ConfiguracaoKitPersonalizavelAdminSerializer,
    ConfiguracaoKitPersonalizavelPublicSerializer,
    DisponibilidadeKitPersonalizavelSerializer,
    DisponibilidadePeriodoSerializer,
    KitFestaAdminSerializer,
    KitFestaPublicSerializer,
    InteresseDisponibilidadeSerializer,
    AtualizarInteresseAdminSerializer,
    AtualizarStatusUnidadeAdminSerializer,
    UnidadeBrinquedoAdminSerializer,
    UnidadeBrinquedoOperacaoSerializer,
    ValidarSelecaoKitPersonalizavelSerializer,
)
from .services import (
    BrinquedoService,
    DisponibilidadeService,
    ImagemBrinquedoService,
    ImagemKitFestaService,
    KitFestaService,
    KitPersonalizavelService,
    UnidadeBrinquedoOperacaoService,
)

class BrinquedoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para o modelo Brinquedo que utiliza uma camada de serviço
    e permissões dinâmicas.
    """
    # O queryset é gerenciado pelo método get_queryset para desacoplar a view
    # da lógica de banco de dados.
    # Usa o tradutor que acabamos de criar
    serializer_class = BrinquedoAdminSerializer

    def is_admin_request(self):
        user = self.request.user
        return bool(user and user.is_authenticated and user.is_staff)

    def get_serializer_class(self):
        if self.action in ["list", "retrieve"] and not self.is_admin_request():
            return BrinquedoPublicSerializer
        if self.action == "disponibilidade":
            return BrinquedoPublicSerializer
        return BrinquedoAdminSerializer

    def get_queryset(self):
        """
        Retorna o queryset de brinquedos consumindo a camada de serviço.
        Isso centraliza a lógica de consulta no BrinquedoService.
        """
        if self.action in ["list", "retrieve"] and self.is_admin_request():
            return BrinquedoService.list_all()
        if self.action in ["list", "retrieve", "disponibilidade"]:
            return BrinquedoService.list_public_catalog()
        return BrinquedoService.list_all()

    def get_permissions(self):
        """
        Implementa a diretriz de Zero Trust, aplicando permissões granulares
        com base no tipo de ação (request method).
        """
        if self.action in ["list", "retrieve", "disponibilidade"]:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsAdminUser]
        return [permission() for permission in permission_classes]

    @action(detail=True, methods=["get"], url_path="disponibilidade")
    def disponibilidade(self, request, pk=None):
        brinquedo = self.get_object()
        serializer = DisponibilidadePeriodoSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        resultado = DisponibilidadeService.verificar_brinquedo(
            brinquedo,
            serializer.validated_data["data_inicio"],
            serializer.validated_data["data_fim"],
            serializer.validated_data["quantidade"],
        )
        return Response(resultado)

    @action(detail=True, methods=["get", "post"], url_path="unidades")
    def unidades(self, request, pk=None):
        brinquedo = self.get_object()

        if request.method == "POST":
            serializer = UnidadeBrinquedoAdminSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(brinquedo=brinquedo)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        unidades = UnidadeBrinquedo.objects.filter(brinquedo=brinquedo).select_related(
            "dedicacao_kit__item_kit__kit"
        ).order_by("codigo")
        serializer = UnidadeBrinquedoAdminSerializer(unidades, many=True)
        return Response(serializer.data)

    # Criação do endpoint para o upload de imagem na criação de um brinquedo
    
    @action(
        detail=True,
        methods=["post"],
        parser_classes=[MultiPartParser, FormParser],
        url_path="imagens",
    )
    def upload_imagem(self, request, pk=None):
        brinquedo = self.get_object()
        arquivos = request.FILES.getlist("imagens") or request.FILES.getlist("imagem")
        definir_principal = str(request.data.get("principal", "")).lower() in {
            "1", "true", "yes", "on",
        }
        try:
            imagens = ImagemBrinquedoService.criar_imagens(
                brinquedo,
                arquivos,
                definir_primeira_como_principal=definir_principal,
            )
        except DjangoValidationError as exc:
            return Response(exc.message_dict if hasattr(exc, "message_dict") else exc.messages, status=400)

        dados = ImagemBrinquedoPublicSerializer(
            imagens,
            many=True,
            context={"request": request},
        ).data
        return Response(
            {
                "mensagem": "Imagens salvas com sucesso!",
                "imagens": dados,
                "id": dados[0]["id"],
                "url": dados[0]["url"],
            },
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["post"],
        url_path=r"imagens/(?P<imagem_id>[^/.]+)/principal",
    )
    def definir_imagem_principal(self, request, pk=None, imagem_id=None):
        brinquedo = self.get_object()
        get_object_or_404(ImagemBrinquedo, pk=imagem_id, brinquedo=brinquedo, ativo=True)
        imagem = ImagemBrinquedoService.definir_principal(brinquedo, imagem_id)
        return Response(
            ImagemBrinquedoPublicSerializer(
                imagem,
                context={"request": request},
            ).data
        )

    @action(
        detail=True,
        methods=["delete"],
        url_path=r"imagens/(?P<imagem_id>[^/.]+)",
    )
    def remover_imagem(self, request, pk=None, imagem_id=None):
        brinquedo = self.get_object()
        get_object_or_404(ImagemBrinquedo, pk=imagem_id, brinquedo=brinquedo)
        ImagemBrinquedoService.remover_imagem(brinquedo, imagem_id)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def destroy(self, request, *args, **kwargs):
        brinquedo = self.get_object()
        resultado = BrinquedoService.remover_ou_desativar(brinquedo)

        if resultado == "desativado":
            return Response(
                {
                    "detail": (
                        "Este item possui historico e foi desativado em vez de apagado."
                    ),
                    "status": "desativado",
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            {"detail": "Item removido do catalogo.", "status": "excluido"},
            status=status.HTTP_200_OK,
        )


class CategoriaViewSet(viewsets.ModelViewSet):
    serializer_class = CategoriaResumoSerializer

    def is_admin_request(self):
        user = self.request.user
        return bool(user and user.is_authenticated and user.is_staff)

    def get_serializer_class(self):
        if self.is_admin_request():
            return CategoriaAdminSerializer
        return CategoriaResumoSerializer

    def get_queryset(self):
        if self.is_admin_request():
            return Categoria.objects.all().order_by("ordem", "nome")
        return Categoria.objects.filter(ativo=True).order_by("ordem", "nome")

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsAdminUser]
        return [permission() for permission in permission_classes]

    def destroy(self, request, *args, **kwargs):
        try:
            return super().destroy(request, *args, **kwargs)
        except ProtectedError:
            return Response(
                {
                    "detail": (
                        "Nao e possivel excluir uma categoria em uso por brinquedos "
                        "ou configuracoes."
                    ),
                },
                status=status.HTTP_400_BAD_REQUEST,
            )


class AdminLiberarDisponibilidadeUnidadeView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, unidade_id):
        unidade = get_object_or_404(UnidadeBrinquedo, id=unidade_id)
        unidade = UnidadeBrinquedoOperacaoService.liberar_disponibilidade(
            unidade,
            request.user,
        )
        return Response(UnidadeBrinquedoOperacaoSerializer(unidade).data)


class AdminAtualizarStatusUnidadeView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, unidade_id):
        unidade = get_object_or_404(UnidadeBrinquedo, id=unidade_id)
        serializer = AtualizarStatusUnidadeAdminSerializer(
            unidade,
            data=request.data,
        )
        serializer.is_valid(raise_exception=True)
        unidade = UnidadeBrinquedoOperacaoService.alterar_status(
            unidade,
            serializer.validated_data["status"],
            request.user,
        )
        return Response(UnidadeBrinquedoOperacaoSerializer(unidade).data)


class InteresseDisponibilidadeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queryset = InteresseDisponibilidade.objects.filter(
            cliente__user=request.user
        ).select_related("brinquedo", "cliente")
        return Response(InteresseDisponibilidadeSerializer(queryset, many=True).data)

    def post(self, request):
        if not hasattr(request.user, "cliente"):
            return Response(
                {"detail": "Complete o cadastro de cliente antes de solicitar o aviso."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = InteresseDisponibilidadeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        brinquedo = serializer.validated_data["brinquedo"]
        if BrinquedoService.quantidade_disponivel(brinquedo) > 0:
            return Response(
                {"brinquedo": "Este brinquedo ja esta disponivel."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        interesse, criado = InteresseDisponibilidade.objects.get_or_create(
            cliente=request.user.cliente,
            brinquedo=brinquedo,
            status=InteresseDisponibilidade.Status.PENDENTE,
        )
        return Response(
            InteresseDisponibilidadeSerializer(interesse).data,
            status=status.HTTP_201_CREATED if criado else status.HTTP_200_OK,
        )


class InteresseDisponibilidadeDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, interesse_id):
        interesse = get_object_or_404(
            InteresseDisponibilidade,
            id=interesse_id,
            cliente__user=request.user,
            status=InteresseDisponibilidade.Status.PENDENTE,
        )
        interesse.status = InteresseDisponibilidade.Status.CANCELADO
        interesse.save(update_fields=["status", "atualizado_em"])
        return Response(status=status.HTTP_204_NO_CONTENT)


class AdminInteresseDisponibilidadeView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        queryset = InteresseDisponibilidade.objects.filter(
            status=InteresseDisponibilidade.Status.PENDENTE
        ).select_related("brinquedo", "cliente")
        return Response(InteresseDisponibilidadeSerializer(queryset, many=True).data)


class AdminInteresseDisponibilidadeDetailView(APIView):
    permission_classes = [IsAdminUser]

    def patch(self, request, interesse_id):
        interesse = get_object_or_404(InteresseDisponibilidade, id=interesse_id)
        serializer = AtualizarInteresseAdminSerializer(
            interesse, data=request.data
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(InteresseDisponibilidadeSerializer(interesse).data)


class KitFestaViewSet(viewsets.ModelViewSet):
    serializer_class = KitFestaAdminSerializer

    def is_admin_request(self):
        user = self.request.user
        return bool(user and user.is_authenticated and user.is_staff)

    def get_serializer_class(self):
        if self.action in ["list", "retrieve"] and not self.is_admin_request():
            return KitFestaPublicSerializer
        if self.action == "disponibilidade":
            return KitFestaPublicSerializer
        return KitFestaAdminSerializer

    def get_queryset(self):
        if self.action in ["list", "retrieve"] and self.is_admin_request():
            return KitFestaService.list_all()
        if self.action in ["list", "retrieve", "disponibilidade"]:
            return KitFestaService.list_public_catalog()
        return KitFestaService.list_all()

    def get_permissions(self):
        if self.action in ["list", "retrieve", "disponibilidade"]:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsAdminUser]
        return [permission() for permission in permission_classes]

    @action(detail=True, methods=["get"], url_path="disponibilidade")
    def disponibilidade(self, request, pk=None):
        kit_festa = self.get_object()
        serializer = DisponibilidadePeriodoSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        resultado = DisponibilidadeService.verificar_kit_festa(
            kit_festa,
            serializer.validated_data["data_inicio"],
            serializer.validated_data["data_fim"],
            serializer.validated_data["quantidade"],
        )
        return Response(resultado)

    @action(
        detail=True,
        methods=["post", "delete"],
        parser_classes=[MultiPartParser, FormParser],
        url_path="imagem",
    )
    def imagem(self, request, pk=None):
        kit_festa = self.get_object()

        if request.method == "DELETE":
            ImagemKitFestaService.remover_todas(kit_festa)
            if kit_festa.imagem:
                kit_festa.imagem.delete(save=False)
                kit_festa.imagem = None
                kit_festa.save(update_fields=["imagem", "atualizado_em"])
            return Response({"detail": "Imagem removida com sucesso."})

        imagem_arquivo = request.FILES.get("imagem")
        if not imagem_arquivo:
            return Response(
                {"erro": "Nenhuma imagem foi enviada."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            imagens = ImagemKitFestaService.criar_imagens(
                kit_festa,
                [imagem_arquivo],
                definir_primeira_como_principal=True,
            )
        except DjangoValidationError as exc:
            return Response(
                exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
                status=status.HTTP_400_BAD_REQUEST,
            )

        dados = ImagemKitFestaPublicSerializer(
            imagens[0],
            context={"request": request},
        ).data
        return Response(
            {
                "mensagem": "Imagem salva com sucesso!",
                "id": dados["id"],
                "url": dados["url"],
            }
        )

    @action(
        detail=True,
        methods=["post"],
        parser_classes=[MultiPartParser, FormParser],
        url_path="imagens",
    )
    def upload_imagens(self, request, pk=None):
        kit_festa = self.get_object()
        arquivos = request.FILES.getlist("imagens") or request.FILES.getlist("imagem")
        definir_principal = str(request.data.get("principal", "")).lower() in {
            "1",
            "true",
            "yes",
            "on",
        }
        try:
            imagens = ImagemKitFestaService.criar_imagens(
                kit_festa,
                arquivos,
                definir_primeira_como_principal=definir_principal,
            )
        except DjangoValidationError as exc:
            return Response(
                exc.message_dict if hasattr(exc, "message_dict") else exc.messages,
                status=status.HTTP_400_BAD_REQUEST,
            )

        dados = ImagemKitFestaPublicSerializer(
            imagens,
            many=True,
            context={"request": request},
        ).data
        return Response(
            {
                "mensagem": "Imagens salvas com sucesso!",
                "imagens": dados,
                "id": dados[0]["id"],
                "url": dados[0]["url"],
            },
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["post"],
        url_path=r"imagens/(?P<imagem_id>[^/.]+)/principal",
    )
    def definir_imagem_principal(self, request, pk=None, imagem_id=None):
        kit_festa = self.get_object()
        get_object_or_404(ImagemKitFesta, pk=imagem_id, kit=kit_festa, ativo=True)
        imagem = ImagemKitFestaService.definir_principal(kit_festa, imagem_id)
        return Response(
            ImagemKitFestaPublicSerializer(
                imagem,
                context={"request": request},
            ).data
        )

    @action(
        detail=True,
        methods=["delete"],
        url_path=r"imagens/(?P<imagem_id>[^/.]+)",
    )
    def remover_imagem(self, request, pk=None, imagem_id=None):
        kit_festa = self.get_object()
        get_object_or_404(ImagemKitFesta, pk=imagem_id, kit=kit_festa)
        ImagemKitFestaService.remover_imagem(kit_festa, imagem_id)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def destroy(self, request, *args, **kwargs):
        kit_festa = self.get_object()
        resultado = KitFestaService.remover_ou_desativar(kit_festa)

        if resultado == "desativado":
            return Response(
                {
                    "detail": (
                        "Este item possui historico e foi desativado em vez de apagado."
                    ),
                    "status": "desativado",
                },
                status=status.HTTP_200_OK,
            )

        return Response(
            {"detail": "Item removido do catalogo.", "status": "excluido"},
            status=status.HTTP_200_OK,
        )


class KitPersonalizavelViewSet(viewsets.ModelViewSet):
    serializer_class = ConfiguracaoKitPersonalizavelAdminSerializer

    def get_serializer_class(self):
        if self.action in ["list", "retrieve", "validar_selecao", "disponibilidade"]:
            return ConfiguracaoKitPersonalizavelPublicSerializer
        return ConfiguracaoKitPersonalizavelAdminSerializer

    def get_queryset(self):
        if self.action in ["list", "retrieve", "validar_selecao", "disponibilidade"]:
            return KitPersonalizavelService.list_public_catalog()
        return KitPersonalizavelService.list_all()

    def get_permissions(self):
        if self.action in ["list", "retrieve", "validar_selecao", "disponibilidade"]:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsAdminUser]
        return [permission() for permission in permission_classes]

    @action(detail=True, methods=["post"], url_path="validar-selecao")
    def validar_selecao(self, request, pk=None):
        configuracao = self.get_object()
        serializer = ValidarSelecaoKitPersonalizavelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        resumo = KitPersonalizavelService.validar_selecao(
            configuracao,
            serializer.validated_data["itens"],
        )
        return Response(resumo)

    @action(detail=True, methods=["post"], url_path="disponibilidade")
    def disponibilidade(self, request, pk=None):
        configuracao = self.get_object()
        serializer = DisponibilidadeKitPersonalizavelSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        resultado = DisponibilidadeService.verificar_kit_personalizavel(
            configuracao,
            serializer.validated_data["data_inicio"],
            serializer.validated_data["data_fim"],
            serializer.validated_data["quantidade"],
            serializer.validated_data["itens"],
        )
        return Response(resultado)
