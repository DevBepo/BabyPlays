from django.contrib import admin

from .models import Carrinho, ItemCarrinho


class ItemCarrinhoInline(admin.TabularInline):
    model = ItemCarrinho
    extra = 0
    readonly_fields = (
        "tipo_item",
        "brinquedo",
        "kit_festa",
        "configuracao_kit_personalizavel",
        "quantidade",
        "nome_snapshot",
        "preco_unitario_snapshot",
        "subtotal_snapshot",
        "snapshot",
        "criado_em",
        "atualizado_em",
    )
    can_delete = False


@admin.register(Carrinho)
class CarrinhoAdmin(admin.ModelAdmin):
    list_display = ("id", "usuario", "session_key", "status", "atualizado_em")
    list_filter = ("status",)
    search_fields = ("session_key", "usuario__username", "usuario__email")
    readonly_fields = ("criado_em", "atualizado_em")
    inlines = (ItemCarrinhoInline,)


@admin.register(ItemCarrinho)
class ItemCarrinhoAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "carrinho",
        "tipo_item",
        "nome_snapshot",
        "quantidade",
        "subtotal_snapshot",
    )
    list_filter = ("tipo_item",)
    search_fields = ("nome_snapshot", "carrinho__session_key", "carrinho__usuario__username")
    readonly_fields = ("criado_em", "atualizado_em")
