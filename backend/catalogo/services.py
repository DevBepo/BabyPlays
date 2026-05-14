from django.db.models import Count, Prefetch, Q

from .models import (
    Brinquedo,
    ConfiguracaoKitPersonalizavel,
    ImagemBrinquedo,
    ItemKitFesta,
    KitFesta,
    UnidadeBrinquedo,
)

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
        imagens_publicas = ImagemBrinquedo.objects.filter(ativo=True).order_by(
            "-principal",
            "ordem",
            "id",
        )
        return (
            Brinquedo.objects.select_related("categoria")
            .prefetch_related(
                Prefetch(
                    "imagens",
                    queryset=imagens_publicas,
                    to_attr="imagens_publicas",
                )
            )
            .filter(ativo=True)
        )

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


class KitFestaService:
    @staticmethod
    def _itens_otimizados():
        return ItemKitFesta.objects.select_related(
            "brinquedo",
            "brinquedo__categoria",
        ).prefetch_related(
            Prefetch(
                "brinquedo__imagens",
                queryset=ImagemBrinquedo.objects.filter(ativo=True).order_by(
                    "-principal",
                    "ordem",
                    "id",
                ),
                to_attr="imagens_publicas",
            )
        )

    @staticmethod
    def list_all():
        return KitFesta.objects.prefetch_related(
            Prefetch("itens", queryset=KitFestaService._itens_otimizados())
        )

    @staticmethod
    def list_public_catalog():
        return KitFestaService.list_all().filter(ativo=True)


class KitPersonalizavelService:
    @staticmethod
    def _imagens_publicas():
        return ImagemBrinquedo.objects.filter(ativo=True).order_by(
            "-principal",
            "ordem",
            "id",
        )

    @staticmethod
    def list_all():
        return ConfiguracaoKitPersonalizavel.objects.prefetch_related(
            "categorias_permitidas",
            "brinquedos_permitidos",
            "regras_categoria__categoria",
        )

    @staticmethod
    def list_public_catalog():
        return KitPersonalizavelService.list_all().filter(ativo=True)

    @staticmethod
    def brinquedos_elegiveis(configuracao):
        modo = configuracao.modo_elegibilidade
        filtros = Q()

        if modo in [
            ConfiguracaoKitPersonalizavel.ModoElegibilidade.CATEGORIAS,
            ConfiguracaoKitPersonalizavel.ModoElegibilidade.CATEGORIAS_E_BRINQUEDOS,
        ]:
            filtros |= Q(categoria__in=configuracao.categorias_permitidas.all())

        if modo in [
            ConfiguracaoKitPersonalizavel.ModoElegibilidade.BRINQUEDOS,
            ConfiguracaoKitPersonalizavel.ModoElegibilidade.CATEGORIAS_E_BRINQUEDOS,
        ]:
            filtros |= Q(id__in=configuracao.brinquedos_permitidos.values("id"))

        return (
            Brinquedo.objects.filter(filtros, ativo=True)
            .select_related("categoria")
            .annotate(
                quantidade_disponivel_anotada=Count(
                    "unidades",
                    filter=Q(unidades__status=UnidadeBrinquedo.Status.DISPONIVEL),
                )
            )
            .prefetch_related(
                Prefetch(
                    "imagens",
                    queryset=KitPersonalizavelService._imagens_publicas(),
                    to_attr="imagens_publicas",
                )
            )
            .distinct()
            .order_by("nome", "id")
        )
