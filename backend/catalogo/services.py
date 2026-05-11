from .models import Brinquedo, UnidadeBrinquedo

class BrinquedoService:
    """
    Camada de serviço para isolar a lógica de negócio e acesso a dados
    do modelo Brinquedo.
    """
    @staticmethod
    def list_all():
        """Retorna um queryset com todos os brinquedos."""
        return Brinquedo.objects.select_related("categoria")

    @staticmethod
    def list_public_catalog():
        """Retorna brinquedos ativos para exibicao no catalogo publico."""
        return Brinquedo.objects.select_related("categoria").filter(ativo=True)

    @staticmethod
    def unidades_disponiveis(brinquedo):
        """Retorna as unidades fisicas disponiveis para locacao."""
        return UnidadeBrinquedo.objects.filter(
            brinquedo=brinquedo,
            status=UnidadeBrinquedo.Status.DISPONIVEL,
        )

    @staticmethod
    def quantidade_disponivel(brinquedo):
        """Retorna a quantidade de unidades fisicas disponiveis."""
        return BrinquedoService.unidades_disponiveis(brinquedo).count()
