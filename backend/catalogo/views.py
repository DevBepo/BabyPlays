from django.shortcuts import get_object_or_404
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import UnidadeBrinquedo, ImagemBrinquedo

from .models import UnidadeBrinquedo
from .serializers import (
    BrinquedoAdminSerializer,
    BrinquedoPublicSerializer,
    ConfiguracaoKitPersonalizavelAdminSerializer,
    ConfiguracaoKitPersonalizavelPublicSerializer,
    DisponibilidadeKitPersonalizavelSerializer,
    DisponibilidadePeriodoSerializer,
    KitFestaAdminSerializer,
    KitFestaPublicSerializer,
    UnidadeBrinquedoOperacaoSerializer,
    ValidarSelecaoKitPersonalizavelSerializer,
)
from .services import (
    BrinquedoService,
    DisponibilidadeService,
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

    def get_serializer_class(self):
        if self.action in ["list", "retrieve", "disponibilidade"]:
            return BrinquedoPublicSerializer
        return BrinquedoAdminSerializer

    def get_queryset(self):
        """
        Retorna o queryset de brinquedos consumindo a camada de serviço.
        Isso centraliza a lógica de consulta no BrinquedoService.
        """
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
    
    # Criação do endpoint para o upload de imagem na criação de um brinquedo
    
    @action(detail=True, methods=["post"], url_path="imagens")
    def upload_imagem(self, request, pk=None):
        brinquedo = self.get_object()
        imagem_arquivo = request.FILES.get('imagem')

        if not imagem_arquivo:
            return Response({"erro": "Nenhuma imagem foi enviada."}, status=400)

        # Se for a primeira imagem, marca como principal automaticamente
        is_principal = not brinquedo.imagens.exists()

        nova_imagem = ImagemBrinquedo.objects.create(
            brinquedo=brinquedo,
            imagem=imagem_arquivo,
            principal=is_principal
        )

        return Response({
            "mensagem": "Imagem salva com sucesso!",
            "id": nova_imagem.id,
            "url": request.build_absolute_uri(nova_imagem.imagem.url)
        })


class AdminLiberarDisponibilidadeUnidadeView(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request, unidade_id):
        unidade = get_object_or_404(UnidadeBrinquedo, id=unidade_id)
        unidade = UnidadeBrinquedoOperacaoService.liberar_disponibilidade(
            unidade,
            request.user,
        )
        return Response(UnidadeBrinquedoOperacaoSerializer(unidade).data)


class KitFestaViewSet(viewsets.ModelViewSet):
    serializer_class = KitFestaAdminSerializer

    def get_serializer_class(self):
        if self.action in ["list", "retrieve", "disponibilidade"]:
            return KitFestaPublicSerializer
        return KitFestaAdminSerializer

    def get_queryset(self):
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
