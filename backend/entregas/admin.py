from django.contrib import admin

from .models import ConfiguracaoTaxaEntregaRetirada


@admin.register(ConfiguracaoTaxaEntregaRetirada)
class ConfiguracaoTaxaEntregaRetiradaAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "valor_por_km",
        "origem_cidade",
        "origem_uf",
        "ativo",
        "atualizado_em",
    )
    list_filter = ("ativo", "origem_uf", "origem_cidade")
    search_fields = (
        "origem_cep",
        "origem_logradouro",
        "origem_bairro",
        "origem_cidade",
    )
    readonly_fields = ("criado_em", "atualizado_em")
    fieldsets = (
        (
            "Valor",
            {
                "fields": ("valor_por_km",),
            },
        ),
        (
            "Endereco de origem",
            {
                "fields": (
                    "origem_cep",
                    "origem_logradouro",
                    "origem_numero",
                    "origem_complemento",
                    "origem_bairro",
                    "origem_cidade",
                    "origem_uf",
                    "origem_latitude",
                    "origem_longitude",
                ),
            },
        ),
        (
            "Controle",
            {
                "fields": ("ativo", "criado_em", "atualizado_em"),
            },
        ),
    )
