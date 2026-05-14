from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BrinquedoViewSet, KitFestaViewSet, KitPersonalizavelViewSet

router = DefaultRouter()
router.register(r'brinquedos', BrinquedoViewSet, basename ='brinquedos')
router.register(r'kits-festa', KitFestaViewSet, basename='kits-festa')
router.register(
    r'kits-personalizaveis',
    KitPersonalizavelViewSet,
    basename='kits-personalizaveis',
)

urlpatterns = [
    path('', include(router.urls)),
]
