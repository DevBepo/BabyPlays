from django.contrib import admin

from .models import ConfiguracaoTaxaEntregaRetirada, RegraFreteBairro


@admin.register(ConfiguracaoTaxaEntregaRetirada)
class ConfiguracaoTaxaEntregaRetiradaAdmin(admin.ModelAdmin):
    list_display = (
        "id",
        "valor_por_km",
        "origem_bairro",
        "origem_cidade",
        "origem_uf",
        "ativo",
        "criado_em",
        "atualizado_em",
    )
    list_filter = ("ativo", "origem_uf", "origem_cidade", "criado_em", "atualizado_em")
    search_fields = (
        "=id",
        "origem_cep",
        "origem_logradouro",
        "origem_numero",
        "origem_bairro",
        "origem_cidade",
        "origem_uf",
    )
    readonly_fields = ("criado_em", "atualizado_em")
    date_hierarchy = "atualizado_em"
    fieldsets = (
        ("Valor", {"fields": ("valor_por_km",)}),
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
        ("Controle", {"fields": ("ativo", "criado_em", "atualizado_em")}),
    )


@admin.register(RegraFreteBairro)
class RegraFreteBairroAdmin(admin.ModelAdmin):
    list_display = (
        "bairro",
        "cidade",
        "uf",
        "valor_taxa",
        "ativo",
        "atualizado_em",
    )
    list_filter = ("ativo", "uf", "cidade")
    search_fields = ("bairro", "cidade", "uf")
    readonly_fields = ("criado_em", "atualizado_em")
    fieldsets = (
        ("Regiao atendida", {"fields": ("uf", "cidade", "bairro")}),
        ("Taxa", {"fields": ("valor_taxa", "ativo", "observacao")}),
        ("Auditoria", {"fields": ("criado_em", "atualizado_em")}),
    )
