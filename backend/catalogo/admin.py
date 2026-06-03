from django.contrib import admin, messages
from rest_framework import serializers

from .models import (
    Brinquedo,
    Categoria,
    ConfiguracaoKitPersonalizavel,
    ImagemBrinquedo,
    ItemKitFesta,
    KitFesta,
    RegraCategoriaKitPersonalizavel,
    UnidadeBrinquedo,
)
from .services import BrinquedoService, UnidadeBrinquedoOperacaoService


def _mensagem_erro_admin(exc):
    detail = getattr(exc, "detail", None)
    if isinstance(detail, dict):
        partes = []
        for campo, mensagens in detail.items():
            if isinstance(mensagens, (list, tuple)):
                texto = "; ".join(str(mensagem) for mensagem in mensagens)
            else:
                texto = str(mensagens)
            partes.append(f"{campo}: {texto}")
        return " | ".join(partes)
    if isinstance(detail, (list, tuple)):
        return "; ".join(str(mensagem) for mensagem in detail)
    return str(detail or exc)


@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ("nome", "slug", "ativo", "ordem", "criado_em", "atualizado_em")
    list_filter = ("ativo", "criado_em", "atualizado_em")
    search_fields = ("nome", "slug", "descricao")
    prepopulated_fields = {"slug": ("nome",)}
    readonly_fields = ("criado_em", "atualizado_em")
    ordering = ("ordem", "nome")


class ImagemBrinquedoInline(admin.TabularInline):
    model = ImagemBrinquedo
    extra = 1
    fields = ("imagem", "alt_text", "principal", "ordem", "ativo", "atualizado_em")
    readonly_fields = ("atualizado_em",)


@admin.register(Brinquedo)
class BrinquedoAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "nome",
        "categoria",
        "preco_aluguel",
        "preco_diaria",
        "preco_15_dias",
        "preco_30_dias",
        "ativo",
        "quantidade_disponivel",
        "total_unidades",
        "data_cadastro",
    )
    list_filter = ("ativo", "categoria", "data_cadastro")
    search_fields = ("nome", "descricao", "categoria__nome")
    readonly_fields = ("data_cadastro", "quantidade_disponivel", "total_unidades")
    ordering = ("nome",)
    list_select_related = ("categoria",)
    inlines = (ImagemBrinquedoInline,)

    @admin.display(description="Quantidade disponivel")
    def quantidade_disponivel(self, obj):
        return BrinquedoService.quantidade_disponivel(obj)

    @admin.display(description="Total de unidades")
    def total_unidades(self, obj):
        return obj.unidades.count()


@admin.register(UnidadeBrinquedo)
class UnidadeBrinquedoAdmin(admin.ModelAdmin):
    list_display = (
        "codigo",
        "brinquedo",
        "categoria_do_brinquedo",
        "status",
        "data_cadastro",
        "atualizado_em",
    )
    list_filter = ("status", "brinquedo__categoria", "brinquedo", "data_cadastro")
    search_fields = ("codigo", "brinquedo__nome", "brinquedo__categoria__nome")
    readonly_fields = ("data_cadastro", "atualizado_em")
    ordering = ("status", "codigo")
    list_select_related = ("brinquedo", "brinquedo__categoria")
    actions = ("liberar_disponibilidade",)

    @admin.display(description="Categoria", ordering="brinquedo__categoria__nome")
    def categoria_do_brinquedo(self, obj):
        return obj.brinquedo.categoria

    @admin.action(description="Liberar unidades selecionadas para disponivel")
    def liberar_disponibilidade(self, request, queryset):
        sucessos = 0
        falhas = []

        for unidade in queryset:
            if unidade.status not in UnidadeBrinquedoOperacaoService.STATUS_LIBERAVEIS:
                falhas.append(
                    f"{unidade.codigo}: status atual nao permite liberacao."
                )
                continue

            try:
                UnidadeBrinquedoOperacaoService.liberar_disponibilidade(
                    unidade,
                    request.user,
                )
                sucessos += 1
            except serializers.ValidationError as exc:
                falhas.append(f"{unidade.codigo}: {_mensagem_erro_admin(exc)}")
            except Exception as exc:
                falhas.append(f"{unidade.codigo}: {exc}")

        if sucessos:
            self.message_user(
                request,
                f"{sucessos} unidade(s) liberada(s) para disponivel.",
                messages.SUCCESS,
            )
        if falhas:
            self.message_user(
                request,
                f"{len(falhas)} unidade(s) falharam: {'; '.join(falhas)}",
                messages.ERROR,
            )


@admin.register(ImagemBrinquedo)
class ImagemBrinquedoAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "brinquedo",
        "principal",
        "ordem",
        "ativo",
        "criado_em",
        "atualizado_em",
    )
    list_filter = ("ativo", "principal", "brinquedo__categoria", "criado_em")
    search_fields = ("brinquedo__nome", "brinquedo__categoria__nome", "alt_text")
    readonly_fields = ("criado_em", "atualizado_em")
    ordering = ("brinquedo__nome", "-principal", "ordem", "id")
    list_select_related = ("brinquedo", "brinquedo__categoria")


class ItemKitFestaInline(admin.TabularInline):
    model = ItemKitFesta
    extra = 1
    fields = ("brinquedo", "quantidade", "ordem")
    autocomplete_fields = ("brinquedo",)
    ordering = ("ordem", "id")


@admin.register(KitFesta)
class KitFestaAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "nome",
        "preco_aluguel",
        "preco_diaria",
        "preco_15_dias",
        "preco_30_dias",
        "ativo",
        "ordem",
        "quantidade_itens",
        "criado_em",
        "atualizado_em",
    )
    list_filter = ("ativo", "criado_em", "atualizado_em")
    search_fields = ("nome", "descricao", "itens__brinquedo__nome")
    ordering = ("ordem", "nome")
    readonly_fields = ("criado_em", "atualizado_em", "quantidade_itens")
    fields = (
        "nome",
        "descricao",
        "preco_aluguel",
        "preco_diaria",
        "preco_15_dias",
        "preco_30_dias",
        "ativo",
        "ordem",
        "quantidade_itens",
        "criado_em",
        "atualizado_em",
    )
    inlines = (ItemKitFestaInline,)

    @admin.display(description="Itens")
    def quantidade_itens(self, obj):
        return obj.itens.count()


class RegraCategoriaKitPersonalizavelInline(admin.TabularInline):
    model = RegraCategoriaKitPersonalizavel
    extra = 1
    fields = ("categoria", "quantidade_minima", "quantidade_maxima", "ordem")
    autocomplete_fields = ("categoria",)
    ordering = ("ordem", "id")


@admin.register(ConfiguracaoKitPersonalizavel)
class ConfiguracaoKitPersonalizavelAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "nome",
        "modo_elegibilidade",
        "preco_base",
        "quantidade_minima_brinquedos",
        "quantidade_maxima_brinquedos",
        "ativo",
        "ordem",
        "criado_em",
        "atualizado_em",
    )
    list_filter = ("ativo", "modo_elegibilidade", "criado_em", "atualizado_em")
    search_fields = (
        "nome",
        "descricao",
        "categorias_permitidas__nome",
        "brinquedos_permitidos__nome",
    )
    ordering = ("ordem", "nome")
    readonly_fields = ("criado_em", "atualizado_em")
    fields = (
        "nome",
        "descricao",
        "preco_base",
        "ativo",
        "ordem",
        "quantidade_minima_brinquedos",
        "quantidade_maxima_brinquedos",
        "modo_elegibilidade",
        "categorias_permitidas",
        "brinquedos_permitidos",
        "criado_em",
        "atualizado_em",
    )
    filter_horizontal = ("categorias_permitidas", "brinquedos_permitidos")
    inlines = (RegraCategoriaKitPersonalizavelInline,)
