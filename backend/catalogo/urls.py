from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    AdminLiberarDisponibilidadeUnidadeView,
    AdminAtualizarStatusUnidadeView,
    BrinquedoViewSet,
    CategoriaViewSet,
    KitFestaViewSet,
    KitPersonalizavelViewSet,
    InteresseDisponibilidadeView,
    InteresseDisponibilidadeDetailView,
    AdminInteresseDisponibilidadeView,
    AdminInteresseDisponibilidadeDetailView,
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
        'admin/unidades/<int:unidade_id>/status/',
        AdminAtualizarStatusUnidadeView.as_view(),
        name='admin-unidade-atualizar-status',
    ),
    path('interesses-disponibilidade/', InteresseDisponibilidadeView.as_view(), name='interesses-disponibilidade'),
    path('interesses-disponibilidade/<int:interesse_id>/', InteresseDisponibilidadeDetailView.as_view(), name='interesse-disponibilidade-detalhe'),
    path('admin/interesses-disponibilidade/', AdminInteresseDisponibilidadeView.as_view(), name='admin-interesses-disponibilidade'),
    path('admin/interesses-disponibilidade/<int:interesse_id>/', AdminInteresseDisponibilidadeDetailView.as_view(), name='admin-interesse-disponibilidade-detalhe'),
    path(
        'admin/unidades/<int:unidade_id>/liberar-disponibilidade/',
        AdminLiberarDisponibilidadeUnidadeView.as_view(),
        name='admin-unidade-liberar-disponibilidade',
    ),
    path('', include(router.urls)),
]
