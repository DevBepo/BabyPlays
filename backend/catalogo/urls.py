from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BrinquedoViewSet

# O Router cria automaticamente as rotas para GET, POST, PUT, DELETE
router = DefaultRouter()
router.register(r'brinquedos', BrinquedoViewSet)

urlpatterns = [
    path('', include(router.urls)),
]