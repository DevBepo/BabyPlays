from django.db.models import Count, Prefetch, Q
from rest_framework import serializers

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

    @staticmethod
    def validar_selecao(configuracao, itens):
        brinquedos_por_id = {
            brinquedo.id: brinquedo
            for brinquedo in KitPersonalizavelService.brinquedos_elegiveis(
                configuracao
            )
        }
        regras_por_categoria_id = {
            regra.categoria_id: regra
            for regra in configuracao.regras_categoria.select_related("categoria")
        }

        quantidade_total = sum(item["quantidade"] for item in itens)
        if quantidade_total < configuracao.quantidade_minima_brinquedos:
            raise serializers.ValidationError(
                {
                    "itens": (
                        "Selecione pelo menos "
                        f"{configuracao.quantidade_minima_brinquedos} brinquedo(s)."
                    )
                }
            )
        if quantidade_total > configuracao.quantidade_maxima_brinquedos:
            raise serializers.ValidationError(
                {
                    "itens": (
                        "Selecione no maximo "
                        f"{configuracao.quantidade_maxima_brinquedos} brinquedo(s)."
                    )
                }
            )

        resumo_itens = []
        quantidades_por_categoria = {}
        preco_itens = configuracao.preco_base * 0

        for item in itens:
            brinquedo_id = item["brinquedo_id"]
            quantidade = item["quantidade"]
            brinquedo = brinquedos_por_id.get(brinquedo_id)

            if brinquedo is None:
                raise serializers.ValidationError(
                    {
                        "itens": (
                            f"O brinquedo {brinquedo_id} nao esta disponivel "
                            "para esta configuracao."
                        )
                    }
                )

            subtotal = brinquedo.preco_aluguel * quantidade
            preco_itens += subtotal
            categoria = brinquedo.categoria
            categoria_id = categoria.id if categoria else None
            if categoria_id:
                quantidades_por_categoria[categoria_id] = (
                    quantidades_por_categoria.get(categoria_id, 0) + quantidade
                )

            resumo_itens.append(
                {
                    "brinquedo_id": brinquedo.id,
                    "nome": brinquedo.nome,
                    "categoria": (
                        {
                            "id": categoria.id,
                            "nome": categoria.nome,
                            "slug": categoria.slug,
                        }
                        if categoria
                        else None
                    ),
                    "quantidade": quantidade,
                    "preco_unitario": brinquedo.preco_aluguel,
                    "subtotal": subtotal,
                }
            )

        for categoria_id, regra in regras_por_categoria_id.items():
            quantidade_categoria = quantidades_por_categoria.get(categoria_id, 0)
            if quantidade_categoria < regra.quantidade_minima:
                raise serializers.ValidationError(
                    {
                        "itens": (
                            f"Selecione pelo menos {regra.quantidade_minima} "
                            f"brinquedo(s) da categoria {regra.categoria.nome}."
                        )
                    }
                )
            if quantidade_categoria > regra.quantidade_maxima:
                raise serializers.ValidationError(
                    {
                        "itens": (
                            f"Selecione no maximo {regra.quantidade_maxima} "
                            f"brinquedo(s) da categoria {regra.categoria.nome}."
                        )
                    }
                )

        return {
            "configuracao_id": configuracao.id,
            "configuracao_nome": configuracao.nome,
            "quantidade_total": quantidade_total,
            "preco_base": configuracao.preco_base,
            "preco_itens": preco_itens,
            "preco_estimado": configuracao.preco_base + preco_itens,
            "itens": resumo_itens,
        }
