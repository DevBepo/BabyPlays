from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BrinquedoViewSet, KitFestaViewSet

router = DefaultRouter()
router.register(r'brinquedos', BrinquedoViewSet, basename ='brinquedos')
router.register(r'kits-festa', KitFestaViewSet, basename='kits-festa')

urlpatterns = [
    path('', include(router.urls)),
]
