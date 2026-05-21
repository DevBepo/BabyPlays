from django.contrib import admin

from .models import (
    AceiteContrato,
    Carrinho,
    Contrato,
    ItemCarrinho,
    ItemPedido,
    Pedido,
    ReservaUnidade,
)


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
    list_display = (
        "id",
        "usuario",
        "session_key",
        "status",
        "quantidade_itens",
        "criado_em",
        "atualizado_em",
    )
    list_filter = ("status", "criado_em", "atualizado_em")
    search_fields = ("=id", "session_key", "usuario__username", "usuario__email")
    readonly_fields = ("criado_em", "atualizado_em")
    date_hierarchy = "atualizado_em"
    inlines = (ItemCarrinhoInline,)

    @admin.display(description="Itens")
    def quantidade_itens(self, obj):
        return obj.itens.count()


@admin.register(ItemCarrinho)
class ItemCarrinhoAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "carrinho",
        "tipo_item",
        "nome_snapshot",
        "quantidade",
        "preco_unitario_snapshot",
        "subtotal_snapshot",
        "criado_em",
    )
    list_filter = ("tipo_item", "criado_em", "atualizado_em")
    search_fields = (
        "=id",
        "=carrinho__id",
        "nome_snapshot",
        "carrinho__session_key",
        "carrinho__usuario__username",
        "carrinho__usuario__email",
    )
    readonly_fields = (
        "nome_snapshot",
        "preco_unitario_snapshot",
        "subtotal_snapshot",
        "snapshot",
        "criado_em",
        "atualizado_em",
    )
    date_hierarchy = "criado_em"


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
        "cliente",
        "nome_cliente_snapshot",
        "telefone_cliente_snapshot",
        "email_cliente_snapshot",
        "data_evento_pretendida",
        "data_inicio_locacao",
        "data_fim_locacao",
        "taxa_entrega_retirada_snapshot",
        "total_estimado_snapshot",
        "confirmado_em",
        "confirmado_por",
        "criado_em",
    )
    list_filter = (
        "status",
        "data_evento_pretendida",
        "data_inicio_locacao",
        "data_fim_locacao",
        "confirmado_em",
        "criado_em",
        "atualizado_em",
        "cliente__ativo",
    )
    search_fields = (
        "=id",
        "nome_cliente_snapshot",
        "telefone_cliente_snapshot",
        "email_cliente_snapshot",
        "session_key_snapshot",
        "cliente__nome",
        "cliente__telefone",
        "usuario__username",
        "usuario__email",
    )
    readonly_fields = (
        "carrinho_origem",
        "usuario",
        "cliente",
        "session_key_snapshot",
        "nome_cliente_snapshot",
        "telefone_cliente_snapshot",
        "email_cliente_snapshot",
        "subtotal_itens_snapshot",
        "endereco_entrega_snapshot",
        "distancia_ida_km_snapshot",
        "distancia_total_km_snapshot",
        "valor_por_km_snapshot",
        "taxa_entrega_retirada_snapshot",
        "total_estimado_snapshot",
        "confirmado_em",
        "confirmado_por",
        "criado_em",
        "atualizado_em",
    )
    date_hierarchy = "criado_em"
    list_select_related = ("cliente", "usuario", "confirmado_por")
    inlines = (ItemPedidoInline,)


@admin.register(ItemPedido)
class ItemPedidoAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "pedido",
        "tipo_item",
        "nome_snapshot",
        "quantidade",
        "preco_unitario_snapshot",
        "subtotal_snapshot",
        "criado_em",
    )
    list_filter = ("tipo_item", "pedido__status", "criado_em")
    search_fields = (
        "=id",
        "=pedido__id",
        "nome_snapshot",
        "pedido__nome_cliente_snapshot",
        "pedido__email_cliente_snapshot",
        "pedido__telefone_cliente_snapshot",
    )
    readonly_fields = (
        "tipo_item",
        "brinquedo",
        "kit_festa",
        "configuracao_kit_personalizavel",
        "nome_snapshot",
        "preco_unitario_snapshot",
        "subtotal_snapshot",
        "snapshot",
        "criado_em",
    )
    date_hierarchy = "criado_em"
    list_select_related = (
        "pedido",
        "brinquedo",
        "kit_festa",
        "configuracao_kit_personalizavel",
    )


@admin.register(Contrato)
class ContratoAdmin(admin.ModelAdmin):
    list_display = ("id", "versao", "titulo", "ativo", "criado_em", "atualizado_em")
    list_filter = ("ativo", "criado_em", "atualizado_em")
    search_fields = ("=id", "versao", "titulo", "texto")
    date_hierarchy = "atualizado_em"
    fieldsets = (
        (
            "Identificacao",
            {
                "fields": (
                    "titulo",
                    "versao",
                    "ativo",
                )
            },
        ),
        (
            "Conteudo",
            {
                "fields": ("texto",),
            },
        ),
        (
            "Auditoria",
            {
                "fields": ("criado_em", "atualizado_em"),
            },
        ),
    )
    readonly_fields = ("criado_em", "atualizado_em")


@admin.register(AceiteContrato)
class AceiteContratoAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "pedido",
        "contrato",
        "contrato_versao_snapshot",
        "nome_cliente_snapshot",
        "email_cliente_snapshot",
        "telefone_cliente",
        "aceito_em",
        "ip",
    )

    list_filter = ("contrato_versao_snapshot", "aceito_em", "contrato")
    search_fields = (
        "=id",
        "=pedido__id",
        "contrato_versao_snapshot",
        "nome_cliente_snapshot",
        "email_cliente_snapshot",
        "pedido__telefone_cliente_snapshot",
        "ip",
    )
    readonly_fields = (
        "pedido",
        "contrato",
        "contrato_versao_snapshot",
        "contrato_texto_snapshot",
        "nome_cliente_snapshot",
        "email_cliente_snapshot",
        "aceito_em",
        "ip",
        "user_agent",
    )
    date_hierarchy = "aceito_em"
    list_select_related = ("pedido", "contrato")
    fieldsets = (
        (
            "Vinculos",
            {
                "fields": ("pedido", "contrato"),
            },
        ),
        (
            "Snapshot aceito",
            {
                "fields": (
                    "contrato_versao_snapshot",
                    "contrato_texto_snapshot",
                    "nome_cliente_snapshot",
                    "email_cliente_snapshot",
                ),
            },
        ),
        (
            "Auditoria",
            {
                "fields": ("aceito_em", "ip", "user_agent"),
            },
        ),
    )

    @admin.display(description="Telefone", ordering="pedido__telefone_cliente_snapshot")
    def telefone_cliente(self, obj):
        return obj.pedido.telefone_cliente_snapshot


@admin.register(ReservaUnidade)
class ReservaUnidadeAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "pedido",
        "status_do_pedido",
        "item_pedido",
        "unidade_brinquedo",
        "brinquedo",
        "status",
        "data_inicio",
        "data_fim",
        "criado_em",
    )
    list_filter = (
        "status",
        "pedido__status",
        "unidade_brinquedo__status",
        "unidade_brinquedo__brinquedo__categoria",
        "data_inicio",
        "data_fim",
        "criado_em",
    )
    search_fields = (
        "=id",
        "=pedido__id",
        "pedido__nome_cliente_snapshot",
        "pedido__telefone_cliente_snapshot",
        "pedido__email_cliente_snapshot",
        "unidade_brinquedo__codigo",
        "unidade_brinquedo__brinquedo__nome",
        "unidade_brinquedo__brinquedo__categoria__nome",
    )
    readonly_fields = ("criado_em", "atualizado_em")
    date_hierarchy = "data_inicio"
    list_select_related = (
        "pedido",
        "item_pedido",
        "unidade_brinquedo",
        "unidade_brinquedo__brinquedo",
        "unidade_brinquedo__brinquedo__categoria",
    )

    @admin.display(description="Status do pedido", ordering="pedido__status")
    def status_do_pedido(self, obj):
        return obj.pedido.status

    @admin.display(description="Brinquedo", ordering="unidade_brinquedo__brinquedo__nome")
    def brinquedo(self, obj):
        return obj.unidade_brinquedo.brinquedo
