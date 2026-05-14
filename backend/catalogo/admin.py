from django.contrib import admin
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
from .services import BrinquedoService


@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ("nome", "slug", "ativo", "ordem", "atualizado_em")
    list_filter = ("ativo",)
    search_fields = ("nome", "slug", "descricao")
    prepopulated_fields = {"slug": ("nome",)}
    ordering = ("ordem", "nome")


class ImagemBrinquedoInline(admin.TabularInline):
    model = ImagemBrinquedo
    extra = 1
    fields = ("imagem", "alt_text", "principal", "ordem", "ativo")


@admin.register(Brinquedo)
class BrinquedoAdmin(admin.ModelAdmin):
    list_display = (
        "nome",
        "categoria",
        "preco_aluguel",
        "ativo",
        "quantidade_disponivel",
    )
    list_filter = ("ativo", "categoria")
    search_fields = ("nome", "descricao", "categoria__nome")
    ordering = ("nome",)
    inlines = (ImagemBrinquedoInline,)

    @admin.display(description="Quantidade disponivel")
    def quantidade_disponivel(self, obj):
        return BrinquedoService.quantidade_disponivel(obj)


@admin.register(UnidadeBrinquedo)
class UnidadeBrinquedoAdmin(admin.ModelAdmin):
    list_display = ("codigo", "brinquedo", "status", "atualizado_em")
    list_filter = ("status", "brinquedo")
    search_fields = ("codigo", "brinquedo__nome")


@admin.register(ImagemBrinquedo)
class ImagemBrinquedoAdmin(admin.ModelAdmin):
    list_display = ("brinquedo", "principal", "ordem", "ativo", "atualizado_em")
    list_filter = ("ativo", "principal")
    search_fields = ("brinquedo__nome", "alt_text")
    ordering = ("brinquedo__nome", "-principal", "ordem", "id")


class ItemKitFestaInline(admin.TabularInline):
    model = ItemKitFesta
    extra = 1
    fields = ("brinquedo", "quantidade", "ordem")
    autocomplete_fields = ("brinquedo",)
    ordering = ("ordem", "id")


@admin.register(KitFesta)
class KitFestaAdmin(admin.ModelAdmin):
    list_display = ("nome", "preco_aluguel", "ativo", "ordem", "atualizado_em")
    list_filter = ("ativo",)
    search_fields = ("nome", "descricao", "itens__brinquedo__nome")
    ordering = ("ordem", "nome")
    fields = ("nome", "descricao", "preco_aluguel", "ativo", "ordem")
    inlines = (ItemKitFestaInline,)


class RegraCategoriaKitPersonalizavelInline(admin.TabularInline):
    model = RegraCategoriaKitPersonalizavel
    extra = 1
    fields = ("categoria", "quantidade_minima", "quantidade_maxima", "ordem")
    autocomplete_fields = ("categoria",)
    ordering = ("ordem", "id")


@admin.register(ConfiguracaoKitPersonalizavel)
class ConfiguracaoKitPersonalizavelAdmin(admin.ModelAdmin):
    list_display = (
        "nome",
        "modo_elegibilidade",
        "preco_base",
        "quantidade_minima_brinquedos",
        "quantidade_maxima_brinquedos",
        "ativo",
        "ordem",
        "atualizado_em",
    )
    list_filter = ("ativo", "modo_elegibilidade")
    search_fields = (
        "nome",
        "descricao",
        "categorias_permitidas__nome",
        "brinquedos_permitidos__nome",
    )
    ordering = ("ordem", "nome")
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
    )
    filter_horizontal = ("categorias_permitidas", "brinquedos_permitidos")
    inlines = (RegraCategoriaKitPersonalizavelInline,)
