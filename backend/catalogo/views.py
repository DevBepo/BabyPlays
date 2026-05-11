from rest_framework import viewsets
from rest_framework.permissions import AllowAny, IsAdminUser
from .serializers import BrinquedoAdminSerializer, BrinquedoPublicSerializer
from .services import BrinquedoService

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
        if self.action in ["list", "retrieve"]:
            return BrinquedoPublicSerializer
        return BrinquedoAdminSerializer

    def get_queryset(self):
        """
        Retorna o queryset de brinquedos consumindo a camada de serviço.
        Isso centraliza a lógica de consulta no BrinquedoService.
        """
        if self.action in ['list', 'retrieve']:
            return BrinquedoService.list_public_catalog()
        return BrinquedoService.list_all()

    def get_permissions(self):
        """
        Implementa a diretriz de Zero Trust, aplicando permissões granulares
        com base no tipo de ação (request method).
        """
        if self.action in ['list', 'retrieve']:
            permission_classes = [AllowAny]
        else:
            permission_classes = [IsAdminUser]
        return [permission() for permission in permission_classes]
