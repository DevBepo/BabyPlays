from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AdminLiberarDisponibilidadeUnidadeView,
    BrinquedoViewSet,
    CategoriaViewSet,
    KitFestaViewSet,
    KitPersonalizavelViewSet,
)

router = DefaultRouter()
router.register(r'categorias', CategoriaViewSet, basename='categorias')
router.register(r'brinquedos', BrinquedoViewSet, basename ='brinquedos')
router.register(r'kits-festa', KitFestaViewSet, basename='kits-festa')
router.register(
    r'kits-personalizaveis',
    KitPersonalizavelViewSet,
    basename='kits-personalizaveis',
)

urlpatterns = [
    path(
        'admin/unidades/<int:unidade_id>/liberar-disponibilidade/',
        AdminLiberarDisponibilidadeUnidadeView.as_view(),
        name='admin-unidade-liberar-disponibilidade',
    ),
    path('', include(router.urls)),
]
