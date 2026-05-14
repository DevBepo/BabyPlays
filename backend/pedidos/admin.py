from django.contrib import admin

from .models import Carrinho, ItemCarrinho, ItemPedido, Pedido


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


class ItemPedidoInline(admin.TabularInline):
    model = ItemPedido
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
    )
    can_delete = False


@admin.register(Pedido)
class PedidoAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "status",
        "nome_cliente_snapshot",
        "telefone_cliente_snapshot",
        "email_cliente_snapshot",
        "data_evento_pretendida",
        "subtotal_itens_snapshot",
        "criado_em",
    )
    list_filter = ("status", "data_evento_pretendida", "criado_em")
    search_fields = (
        "nome_cliente_snapshot",
        "telefone_cliente_snapshot",
        "email_cliente_snapshot",
        "session_key_snapshot",
        "usuario__username",
        "usuario__email",
    )
    readonly_fields = (
        "carrinho_origem",
        "usuario",
        "session_key_snapshot",
        "subtotal_itens_snapshot",
        "criado_em",
        "atualizado_em",
    )
    inlines = (ItemPedidoInline,)


@admin.register(ItemPedido)
class ItemPedidoAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "pedido",
        "tipo_item",
        "nome_snapshot",
        "quantidade",
        "subtotal_snapshot",
    )
    list_filter = ("tipo_item",)
    search_fields = (
        "nome_snapshot",
        "pedido__nome_cliente_snapshot",
        "pedido__email_cliente_snapshot",
    )
    readonly_fields = ("criado_em",)
