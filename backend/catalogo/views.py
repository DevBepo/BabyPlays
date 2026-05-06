from rest_framework import viewsets
from .models import Brinquedo
from .serializers import BrinquedoSerializer

class BrinquedoViewSet(viewsets.ModelViewSet):
    # Pega todos os brinquedos do banco
    queryset = Brinquedo.objects.all()
    # Usa o tradutor que acabamos de criar
    serializer_class = BrinquedoSerializer