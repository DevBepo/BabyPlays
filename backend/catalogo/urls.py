from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import BrinquedoViewSet

router = DefaultRouter()
router.register(r'brinquedos', BrinquedoViewSet, basename ='brinquedos')

urlpatterns = [
    path('', include(router.urls)),
]