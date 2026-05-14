from rest_framework import serializers
from django.utils import timezone

from .models import Carrinho, ItemCarrinho, ItemPedido, Pedido
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


class ItemPedidoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemPedido
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
        )
        read_only_fields = fields


class PedidoSerializer(serializers.ModelSerializer):
    itens = ItemPedidoSerializer(many=True, read_only=True)

    class Meta:
        model = Pedido
        fields = (
            "id",
            "status",
            "nome_cliente_snapshot",
            "telefone_cliente_snapshot",
            "email_cliente_snapshot",
            "observacoes_cliente",
            "data_evento_pretendida",
            "subtotal_itens_snapshot",
            "itens",
            "criado_em",
            "atualizado_em",
        )
        read_only_fields = fields


class ConverterCarrinhoPedidoSerializer(serializers.Serializer):
    nome = serializers.CharField(max_length=200, trim_whitespace=True)
    telefone = serializers.CharField(max_length=30, trim_whitespace=True)
    email = serializers.EmailField(max_length=254)
    data_evento_pretendida = serializers.DateField()
    observacoes = serializers.CharField(
        required=False,
        allow_blank=True,
        trim_whitespace=True,
    )

    def validate_data_evento_pretendida(self, value):
        if value < timezone.localdate():
            raise serializers.ValidationError(
                "A data pretendida do evento nao pode estar no passado."
            )
        return value

    def dados_para_pedido(self):
        return {
            "nome_cliente_snapshot": self.validated_data["nome"],
            "telefone_cliente_snapshot": self.validated_data["telefone"],
            "email_cliente_snapshot": self.validated_data["email"],
            "observacoes_cliente": self.validated_data.get("observacoes", ""),
            "data_evento_pretendida": self.validated_data[
                "data_evento_pretendida"
            ],
        }
