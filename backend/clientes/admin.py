from django.contrib import admin

from .models import Cliente


@admin.register(Cliente)
class ClienteAdmin(admin.ModelAdmin):
    list_display = (
        "nome",
        "user",
        "email_do_user",
        "telefone",
        "ativo",
        "criado_em",
    )
    search_fields = ("=id", "nome", "telefone", "user__email", "user__username")
    list_filter = ("ativo", "criado_em", "atualizado_em")
    readonly_fields = ("criado_em", "atualizado_em")
    date_hierarchy = "criado_em"
    list_select_related = ("user",)
    ordering = ("nome", "id")

    @admin.display(description="E-mail do usuario", ordering="user__email")
    def email_do_user(self, obj):
        return obj.user.email
