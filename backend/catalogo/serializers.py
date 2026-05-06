from rest_framework import serializers
from .models import Brinquedo

class BrinquedoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Brinquedo
        fields = '__all__'  
