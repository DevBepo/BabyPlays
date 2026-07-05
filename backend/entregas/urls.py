from django.urls import path
from rest_framework.routers import SimpleRouter

from .views import CalcularTaxaEntregaRetiradaView, RegraFreteBairroAdminViewSet


router = SimpleRouter()
router.register(
    "admin/regras-frete-bairro",
    RegraFreteBairroAdminViewSet,
    basename="admin-regras-frete-bairro",
)


urlpatterns = [
    path(
        "taxa-entrega-retirada/calcular/",
        CalcularTaxaEntregaRetiradaView.as_view(),
        name="taxa-entrega-retirada-calcular",
    ),
] + router.urls
