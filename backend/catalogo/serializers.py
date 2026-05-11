from rest_framework import serializers
from .models import Brinquedo, Categoria
from .services import BrinquedoService


class CategoriaResumoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = ("id", "nome", "slug")
        read_only_fields = fields


class CategoriaField(serializers.PrimaryKeyRelatedField):
    def use_pk_only_optimization(self):
        return False

    def to_representation(self, value):
        return CategoriaResumoSerializer(value).data


class BrinquedoSerializer(serializers.ModelSerializer):
    quantidade_disponivel = serializers.SerializerMethodField()
    categoria = CategoriaField(
        queryset=Categoria.objects.all(),
        allow_null=True,
        required=False,
    )

    class Meta:
        model = Brinquedo
        fields = (
            "id",
            "nome",
            "descricao",
            "categoria",
            "preco_aluguel",
            "ativo",
            "data_cadastro",
            "quantidade_disponivel",
        )
        read_only_fields = ("id", "data_cadastro", "quantidade_disponivel")

    def get_quantidade_disponivel(self, obj):
        return BrinquedoService.quantidade_disponivel(obj)
