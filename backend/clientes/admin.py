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
    search_fields = ("nome", "telefone", "user__email", "user__username")
    list_filter = ("ativo", "criado_em")
    readonly_fields = ("criado_em", "atualizado_em")
    ordering = ("nome", "id")

    @admin.display(description="E-mail do usuario", ordering="user__email")
    def email_do_user(self, obj):
        return obj.user.email
