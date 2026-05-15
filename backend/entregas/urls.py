from django.urls import path

from .views import CalcularTaxaEntregaRetiradaView


urlpatterns = [
    path(
        "taxa-entrega-retirada/calcular/",
        CalcularTaxaEntregaRetiradaView.as_view(),
        name="taxa-entrega-retirada-calcular",
    ),
]
