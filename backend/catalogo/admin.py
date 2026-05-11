from django.contrib import admin
from .models import Brinquedo, UnidadeBrinquedo

# Register your models here.
admin.site.register(Brinquedo)


@admin.register(UnidadeBrinquedo)
class UnidadeBrinquedoAdmin(admin.ModelAdmin):
    list_display = ("codigo", "brinquedo", "status", "atualizado_em")
    list_filter = ("status", "brinquedo")
    search_fields = ("codigo", "brinquedo__nome")
