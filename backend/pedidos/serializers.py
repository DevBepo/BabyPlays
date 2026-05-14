from rest_framework import serializers

from .models import Carrinho, ItemCarrinho
from .services import CarrinhoService


class ItemCarrinhoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemCarrinho
        fields = (
            "id",
            "tipo_item",
            "brinquedo",
            "kit_festa",
            "configuracao_kit_personalizavel",
            "quantidade",
            "nome_snapshot",
            "preco_unitario_snapshot",
            "subtotal_snapshot",
            "snapshot",
            "criado_em",
            "atualizado_em",
        )
        read_only_fields = fields


class CarrinhoSerializer(serializers.ModelSerializer):
    itens = ItemCarrinhoSerializer(many=True, read_only=True)
    subtotal = serializers.SerializerMethodField()
    total_parcial = serializers.SerializerMethodField()

    class Meta:
        model = Carrinho
        fields = (
            "id",
            "status",
            "itens",
            "subtotal",
            "total_parcial",
            "criado_em",
            "atualizado_em",
        )
        read_only_fields = fields

    def get_subtotal(self, obj):
        return f"{CarrinhoService.subtotal(obj):.2f}"

    def get_total_parcial(self, obj):
        return self.get_subtotal(obj)


class ItemSelecaoKitPersonalizadoCarrinhoSerializer(serializers.Serializer):
    brinquedo_id = serializers.IntegerField(min_value=1)
    quantidade = serializers.IntegerField(min_value=1)


class AdicionarItemCarrinhoSerializer(serializers.Serializer):
    tipo_item = serializers.ChoiceField(choices=ItemCarrinho.TipoItem.choices)
    brinquedo_id = serializers.IntegerField(min_value=1, required=False)
    kit_festa_id = serializers.IntegerField(min_value=1, required=False)
    configuracao_id = serializers.IntegerField(min_value=1, required=False)
    quantidade = serializers.IntegerField(min_value=1, required=False, default=1)
    itens = ItemSelecaoKitPersonalizadoCarrinhoSerializer(
        many=True,
        required=False,
        allow_empty=False,
    )

    def validate(self, attrs):
        attrs = super().validate(attrs)
        tipo_item = attrs["tipo_item"]

        exigidos_por_tipo = {
            ItemCarrinho.TipoItem.BRINQUEDO: ("brinquedo_id",),
            ItemCarrinho.TipoItem.KIT_FESTA: ("kit_festa_id",),
            ItemCarrinho.TipoItem.KIT_PERSONALIZADO: ("configuracao_id", "itens"),
        }
        proibidos_por_tipo = {
            ItemCarrinho.TipoItem.BRINQUEDO: (
                "kit_festa_id",
                "configuracao_id",
                "itens",
            ),
            ItemCarrinho.TipoItem.KIT_FESTA: (
                "brinquedo_id",
                "configuracao_id",
                "itens",
            ),
            ItemCarrinho.TipoItem.KIT_PERSONALIZADO: (
                "brinquedo_id",
                "kit_festa_id",
            ),
        }

        erros = {}
        for campo in exigidos_por_tipo[tipo_item]:
            if campo not in attrs:
                erros[campo] = "Este campo e obrigatorio para o tipo de item."
        for campo in proibidos_por_tipo[tipo_item]:
            if campo in attrs:
                erros[campo] = "Este campo nao combina com o tipo de item."

        if erros:
            raise serializers.ValidationError(erros)
        return attrs


class AlterarItemCarrinhoSerializer(serializers.Serializer):
    quantidade = serializers.IntegerField(min_value=1)
