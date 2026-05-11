from django.contrib import admin
from .models import Brinquedo, Categoria, UnidadeBrinquedo
from .services import BrinquedoService


@admin.register(Categoria)
class CategoriaAdmin(admin.ModelAdmin):
    list_display = ("nome", "slug", "ativo", "ordem", "atualizado_em")
    list_filter = ("ativo",)
    search_fields = ("nome", "slug", "descricao")
    prepopulated_fields = {"slug": ("nome",)}
    ordering = ("ordem", "nome")


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

    @admin.display(description="Quantidade disponivel")
    def quantidade_disponivel(self, obj):
        return BrinquedoService.quantidade_disponivel(obj)


@admin.register(UnidadeBrinquedo)
class UnidadeBrinquedoAdmin(admin.ModelAdmin):
    list_display = ("codigo", "brinquedo", "status", "atualizado_em")
    list_filter = ("status", "brinquedo")
    search_fields = ("codigo", "brinquedo__nome")
