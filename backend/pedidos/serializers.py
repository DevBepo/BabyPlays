from rest_framework import serializers
from django.utils import timezone

from .models import (
    AceiteContrato,
    Carrinho,
    Contrato,
    ItemCarrinho,
    ItemPedido,
    Pedido,
    ReservaUnidade,
)
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
            "data_inicio_locacao",
            "data_fim_locacao",
            "subtotal_itens_snapshot",
            "endereco_entrega_snapshot",
            "distancia_ida_km_snapshot",
            "distancia_total_km_snapshot",
            "valor_por_km_snapshot",
            "taxa_entrega_retirada_snapshot",
            "total_estimado_snapshot",
            "itens",
            "criado_em",
            "atualizado_em",
        )
        read_only_fields = fields


class ReservaUnidadePedidoSerializer(serializers.ModelSerializer):
    unidade_brinquedo = serializers.IntegerField(
        source="unidade_brinquedo_id",
        read_only=True,
    )
    brinquedo = serializers.IntegerField(
        source="unidade_brinquedo.brinquedo_id",
        read_only=True,
    )
    item_pedido = serializers.IntegerField(source="item_pedido_id", read_only=True)

    class Meta:
        model = ReservaUnidade
        fields = (
            "id",
            "item_pedido",
            "unidade_brinquedo",
            "brinquedo",
            "data_inicio",
            "data_fim",
            "status",
        )
        read_only_fields = fields


class ReservaPedidoResultadoSerializer(serializers.Serializer):
    pedido_id = serializers.IntegerField()
    status = serializers.CharField()
    reservas_criadas = ReservaUnidadePedidoSerializer(many=True)
    reservas = ReservaUnidadePedidoSerializer(many=True)


class ConfirmacaoPedidoSerializer(serializers.ModelSerializer):
    confirmado_por = serializers.IntegerField(
        source="confirmado_por_id",
        read_only=True,
    )

    class Meta:
        model = Pedido
        fields = (
            "id",
            "status",
            "confirmado_em",
            "confirmado_por",
        )
        read_only_fields = fields


class UnidadeOperacaoLocacaoSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    status = serializers.CharField()


class ReservaOperacaoLocacaoSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    status = serializers.CharField()


class OperacaoLocacaoResultadoSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    status = serializers.CharField()
    reservas_encerradas = ReservaOperacaoLocacaoSerializer(
        many=True,
        required=False,
    )
    unidades_atualizadas = UnidadeOperacaoLocacaoSerializer(many=True)


class ContratoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contrato
        fields = (
            "id",
            "versao",
            "titulo",
            "texto",
        )
        read_only_fields = fields


class AceitarContratoSerializer(serializers.Serializer):
    aceito = serializers.BooleanField()
    contrato_id = serializers.IntegerField(min_value=1)
    contrato_versao = serializers.CharField(max_length=50, trim_whitespace=True)

    campos_proibidos = {
        "contrato_texto_snapshot",
        "contrato_versao_snapshot",
        "nome_cliente_snapshot",
        "email_cliente_snapshot",
        "aceito_em",
        "ip",
        "user_agent",
        "pedido",
        "pedido_id",
        "contrato",
    }

    def validate(self, attrs):
        attrs = super().validate(attrs)
        campos_enviados = set(getattr(self, "initial_data", {}).keys())
        campos_forjados = sorted(campos_enviados.intersection(self.campos_proibidos))
        if campos_forjados:
            raise serializers.ValidationError(
                {
                    "detail": (
                        "Dados de auditoria do aceite sao registrados pelo backend."
                    )
                }
            )

        if attrs["aceito"] is not True:
            raise serializers.ValidationError(
                {"aceito": "O contrato precisa ser aceito explicitamente."}
            )

        return attrs


class AceiteContratoSerializer(serializers.ModelSerializer):
    pedido = serializers.IntegerField(source="pedido_id", read_only=True)
    contrato = serializers.IntegerField(source="contrato_id", read_only=True)
    versao_aceita = serializers.CharField(
        source="contrato_versao_snapshot",
        read_only=True,
    )

    class Meta:
        model = AceiteContrato
        fields = (
            "id",
            "pedido",
            "contrato",
            "versao_aceita",
            "aceito_em",
        )
        read_only_fields = fields


class ConverterCarrinhoPedidoSerializer(serializers.Serializer):
    nome = serializers.CharField(max_length=200, trim_whitespace=True)
    telefone = serializers.CharField(max_length=30, trim_whitespace=True)
    email = serializers.EmailField(max_length=254)
    data_evento_pretendida = serializers.DateField()
    data_inicio_locacao = serializers.DateField()
    data_fim_locacao = serializers.DateField()
    cep = serializers.CharField(max_length=9)
    numero = serializers.CharField(max_length=20, trim_whitespace=True)
    complemento = serializers.CharField(
        max_length=100,
        required=False,
        allow_blank=True,
        trim_whitespace=True,
    )
    observacoes = serializers.CharField(
        required=False,
        allow_blank=True,
        trim_whitespace=True,
    )

    campos_proibidos = {
        "distancia_km",
        "distancia_ida_km",
        "distancia_total_km",
        "distancia_ida_km_snapshot",
        "distancia_total_km_snapshot",
        "valor_por_km",
        "valor_por_km_snapshot",
        "taxa",
        "frete",
        "taxa_entrega_retirada_snapshot",
        "total",
        "total_estimado",
        "total_estimado_snapshot",
    }

    def validate(self, attrs):
        attrs = super().validate(attrs)
        campos_enviados = set(getattr(self, "initial_data", {}).keys())
        campos_forjados = sorted(campos_enviados.intersection(self.campos_proibidos))
        if campos_forjados:
            raise serializers.ValidationError(
                {
                    "detail": (
                        "Taxa, distancia, valor por km e total sao calculados "
                        "no backend."
                    )
                }
            )
        data_inicio = attrs.get("data_inicio_locacao")
        data_fim = attrs.get("data_fim_locacao")
        if data_inicio and data_fim and data_fim <= data_inicio:
            raise serializers.ValidationError(
                {
                    "data_fim_locacao": (
                        "A data final da locacao deve ser posterior a data "
                        "inicial da locacao."
                    )
                }
            )
        return attrs

    def validate_data_evento_pretendida(self, value):
        if value < timezone.localdate():
            raise serializers.ValidationError(
                "A data pretendida do evento nao pode estar no passado."
            )
        return value

    def validate_cep(self, value):
        cep = "".join(caractere for caractere in str(value) if caractere.isdigit())
        if len(cep) != 8:
            raise serializers.ValidationError("CEP invalido.")
        return cep

    def validate_numero(self, value):
        numero = str(value or "").strip()
        if not numero:
            raise serializers.ValidationError("Numero e obrigatorio.")
        return numero

    def dados_para_pedido(self):
        return {
            "nome_cliente_snapshot": self.validated_data["nome"],
            "telefone_cliente_snapshot": self.validated_data["telefone"],
            "email_cliente_snapshot": self.validated_data["email"],
            "observacoes_cliente": self.validated_data.get("observacoes", ""),
            "data_evento_pretendida": self.validated_data[
                "data_evento_pretendida"
            ],
            "data_inicio_locacao": self.validated_data["data_inicio_locacao"],
            "data_fim_locacao": self.validated_data["data_fim_locacao"],
            "cep": self.validated_data["cep"],
            "numero": self.validated_data["numero"],
            "complemento": self.validated_data.get("complemento", ""),
        }
