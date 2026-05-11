from rest_framework import serializers
from .models import Brinquedo
from .services import BrinquedoService

class BrinquedoSerializer(serializers.ModelSerializer):
    quantidade_disponivel = serializers.SerializerMethodField()

    class Meta:
        model = Brinquedo
        fields = '__all__'  
        read_only_fields = ("id", "data_cadastro", "quantidade_disponivel")

    def get_quantidade_disponivel(self, obj):
        return BrinquedoService.quantidade_disponivel(obj)
