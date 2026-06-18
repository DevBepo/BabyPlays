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
from .services import AdminPedidoAcoesService, AgendaAdminService, CarrinhoService


class ItemCarrinhoSerializer(serializers.ModelSerializer):
    imagem_url = serializers.SerializerMethodField()

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
            "imagem_url",
            "preco_unitario_snapshot",
            "subtotal_snapshot",
            "snapshot",
            "criado_em",
            "atualizado_em",
        )
        read_only_fields = fields

    def get_imagem_url(self, obj):
        imagem = None

        if obj.tipo_item == ItemCarrinho.TipoItem.BRINQUEDO and obj.brinquedo_id:
            imagem_principal = (
                obj.brinquedo.imagens.filter(ativo=True)
                .order_by("-principal", "ordem", "id")
                .first()
            )
            if imagem_principal:
                imagem = imagem_principal.imagem
        elif obj.tipo_item == ItemCarrinho.TipoItem.KIT_FESTA and obj.kit_festa_id:
            imagem = obj.kit_festa.imagem

        if not imagem:
            return None

        url = imagem.url
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(url)
        return url


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
    class PeriodoLocacao:
        QUINZE_DIAS = "15_dias"
        TRINTA_DIAS = "30_dias"
        DIARIA = "diaria"

        choices = (
            (QUINZE_DIAS, "15 dias"),
            (TRINTA_DIAS, "30 dias"),
            (DIARIA, "Diaria"),
        )

    tipo_item = serializers.ChoiceField(choices=ItemCarrinho.TipoItem.choices)
    brinquedo_id = serializers.IntegerField(min_value=1, required=False)
    kit_festa_id = serializers.IntegerField(min_value=1, required=False)
    configuracao_id = serializers.IntegerField(min_value=1, required=False)
    quantidade = serializers.IntegerField(min_value=1, required=False, default=1)
    periodo_locacao = serializers.ChoiceField(
        choices=PeriodoLocacao.choices,
        required=False,
    )
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
                "periodo_locacao",
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

        if tipo_item in (
            ItemCarrinho.TipoItem.BRINQUEDO,
            ItemCarrinho.TipoItem.KIT_FESTA,
        ):
            attrs["periodo_locacao"] = attrs.get(
                "periodo_locacao",
                self.PeriodoLocacao.QUINZE_DIAS,
            )
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
    cliente = serializers.IntegerField(source="cliente_id", read_only=True)

    class Meta:
        model = Pedido
        fields = (
            "id",
            "cliente",
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


class ClientePedidoAdminResumoSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    nome = serializers.CharField()
    telefone = serializers.CharField()
    ativo = serializers.BooleanField()


class UsuarioAdminResumoSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    email = serializers.EmailField(allow_blank=True)


class ClienteSnapshotPedidoSerializer(serializers.Serializer):
    nome = serializers.CharField(source="nome_cliente_snapshot")
    email = serializers.EmailField(source="email_cliente_snapshot")
    telefone = serializers.CharField(source="telefone_cliente_snapshot")


class ValoresPedidoAdminSerializer(serializers.Serializer):
    subtotal_itens_snapshot = serializers.DecimalField(max_digits=9, decimal_places=2)
    distancia_ida_km_snapshot = serializers.DecimalField(max_digits=10, decimal_places=2)
    distancia_total_km_snapshot = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
    )
    valor_por_km_snapshot = serializers.DecimalField(max_digits=8, decimal_places=2)
    taxa_entrega_retirada_snapshot = serializers.DecimalField(
        max_digits=10,
        decimal_places=2,
    )
    total_estimado_snapshot = serializers.DecimalField(max_digits=10, decimal_places=2)


class UnidadeBrinquedoAdminResumoSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    codigo = serializers.CharField()
    status = serializers.CharField()


class BrinquedoAdminResumoSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    nome = serializers.CharField()


class AdminAgendaQuerySerializer(serializers.Serializer):
    inicio = serializers.DateField(required=True)
    fim = serializers.DateField(required=True)
    tipo = serializers.CharField(
        required=False,
        allow_blank=True,
        trim_whitespace=True,
    )
    status = serializers.ChoiceField(
        choices=Pedido.Status.choices,
        required=False,
    )

    def validate(self, attrs):
        attrs = super().validate(attrs)
        inicio = attrs.get("inicio")
        fim = attrs.get("fim")

        if inicio and fim:
            if fim < inicio:
                raise serializers.ValidationError(
                    {"fim": "A data final deve ser igual ou posterior ao inicio."}
                )

            quantidade_dias = (fim - inicio).days + 1
            if quantidade_dias > 31:
                raise serializers.ValidationError(
                    {"fim": "O intervalo maximo da agenda e de 31 dias."}
                )

        tipos_raw = attrs.get("tipo", "")
        tipos = []
        if tipos_raw:
            tipos = [
                tipo.strip()
                for tipo in tipos_raw.split(",")
                if tipo.strip()
            ]
            tipos_invalidos = sorted(
                set(tipos) - set(AgendaAdminService.TIPOS_EVENTO)
            )
            if tipos_invalidos:
                raise serializers.ValidationError(
                    {
                        "tipo": (
                            "Tipo(s) de evento invalido(s): "
                            + ", ".join(tipos_invalidos)
                            + "."
                        )
                    }
                )

        attrs["tipos"] = tipos or list(AgendaAdminService.TIPOS_EVENTO)
        return attrs


class AdminAgendaPeriodoSerializer(serializers.Serializer):
    inicio = serializers.DateField()
    fim = serializers.DateField()


class AdminAgendaPedidoSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    status = serializers.CharField()
    cliente_nome = serializers.CharField()
    cliente_telefone = serializers.CharField(allow_blank=True)
    data_inicio_locacao = serializers.DateField()
    data_fim_locacao = serializers.DateField()
    tem_aceite_contrato = serializers.BooleanField()
    tem_kit_festa = serializers.BooleanField()


class AdminAgendaUnidadeSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    codigo = serializers.CharField()
    brinquedo = serializers.CharField()
    status = serializers.CharField()


class AdminAgendaEventoSerializer(serializers.Serializer):
    id = serializers.CharField()
    tipo = serializers.ChoiceField(choices=AgendaAdminService.TIPOS_EVENTO)
    label = serializers.CharField()
    data = serializers.DateField()
    hora_inicio = serializers.TimeField(allow_null=True)
    pedido = AdminAgendaPedidoSerializer()
    unidades = AdminAgendaUnidadeSerializer(many=True)


class AdminAgendaResumoSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    por_tipo = serializers.DictField(child=serializers.IntegerField())


class AdminAgendaResponseSerializer(serializers.Serializer):
    periodo = AdminAgendaPeriodoSerializer()
    eventos = AdminAgendaEventoSerializer(many=True)
    resumo = AdminAgendaResumoSerializer()


class ItemPedidoAdminSerializer(serializers.ModelSerializer):
    resumo_composicao = serializers.SerializerMethodField()

    class Meta:
        model = ItemPedido
        fields = (
            "id",
            "tipo_item",
            "quantidade",
            "nome_snapshot",
            "preco_unitario_snapshot",
            "subtotal_snapshot",
            "resumo_composicao",
            "criado_em",
        )
        read_only_fields = fields

    def get_resumo_composicao(self, obj):
        if obj.tipo_item == ItemCarrinho.TipoItem.BRINQUEDO:
            brinquedo = obj.snapshot.get("brinquedo", {})
            return {
                "tipo": obj.tipo_item,
                "brinquedo": {
                    "id": obj.brinquedo_id or brinquedo.get("id"),
                    "nome": brinquedo.get("nome") or obj.nome_snapshot,
                },
            }

        if obj.tipo_item == ItemCarrinho.TipoItem.KIT_FESTA:
            kit = obj.snapshot.get("kit_festa", {})
            return {
                "tipo": obj.tipo_item,
                "kit_festa": {
                    "id": obj.kit_festa_id or kit.get("id"),
                    "nome": kit.get("nome") or obj.nome_snapshot,
                },
                "itens": kit.get("itens", []),
            }

        if obj.tipo_item == ItemCarrinho.TipoItem.KIT_PERSONALIZADO:
            configuracao = obj.snapshot.get("configuracao", {})
            return {
                "tipo": obj.tipo_item,
                "configuracao": {
                    "id": (
                        obj.configuracao_kit_personalizavel_id
                        or configuracao.get("id")
                    ),
                    "nome": configuracao.get("nome") or obj.nome_snapshot,
                },
                "itens": obj.snapshot.get("itens", []),
            }

        return {"tipo": obj.tipo_item}


class AceiteContratoAdminSerializer(serializers.ModelSerializer):
    contrato = serializers.IntegerField(source="contrato_id", read_only=True)
    versao_aceita = serializers.CharField(
        source="contrato_versao_snapshot",
        read_only=True,
    )
    titulo_aceito = serializers.CharField(
        source="contrato_titulo_snapshot",
        read_only=True,
    )
    texto_aceito = serializers.CharField(
        source="contrato_texto_snapshot",
        read_only=True,
    )

    class Meta:
        model = AceiteContrato
        fields = (
            "id",
            "contrato",
            "versao_aceita",
            "titulo_aceito",
            "texto_aceito",
            "aceito_em",
            "nome_cliente_snapshot",
            "email_cliente_snapshot",
            "ip",
            "user_agent",
        )
        read_only_fields = fields


class ReservaUnidadeAdminSerializer(serializers.ModelSerializer):
    item_pedido = serializers.IntegerField(source="item_pedido_id", read_only=True)
    unidade = serializers.SerializerMethodField()
    brinquedo = serializers.SerializerMethodField()

    class Meta:
        model = ReservaUnidade
        fields = (
            "id",
            "item_pedido",
            "unidade",
            "brinquedo",
            "data_inicio",
            "data_fim",
            "status",
        )
        read_only_fields = fields

    def get_unidade(self, obj):
        return UnidadeBrinquedoAdminResumoSerializer(obj.unidade_brinquedo).data

    def get_brinquedo(self, obj):
        return BrinquedoAdminResumoSerializer(obj.unidade_brinquedo.brinquedo).data


class PedidoAdminListSerializer(serializers.ModelSerializer):
    cliente = ClientePedidoAdminResumoSerializer(read_only=True)
    cliente_snapshot = ClienteSnapshotPedidoSerializer(source="*", read_only=True)
    tem_aceite_contrato = serializers.BooleanField(read_only=True)
    possui_reservas_ativas = serializers.BooleanField(read_only=True)
    quantidade_itens = serializers.IntegerField(read_only=True)

    class Meta:
        model = Pedido
        fields = (
            "id",
            "status",
            "cliente",
            "cliente_snapshot",
            "data_evento_pretendida",
            "data_inicio_locacao",
            "data_fim_locacao",
            "total_estimado_snapshot",
            "criado_em",
            "atualizado_em",
            "tem_aceite_contrato",
            "possui_reservas_ativas",
            "quantidade_itens",
        )
        read_only_fields = fields


class PedidoAdminDetailSerializer(serializers.ModelSerializer):
    cliente = ClientePedidoAdminResumoSerializer(read_only=True)
    usuario = UsuarioAdminResumoSerializer(read_only=True)
    confirmado_por = UsuarioAdminResumoSerializer(read_only=True)
    cliente_snapshot = ClienteSnapshotPedidoSerializer(source="*", read_only=True)
    endereco_entrega = serializers.JSONField(source="endereco_entrega_snapshot")
    valores = ValoresPedidoAdminSerializer(source="*", read_only=True)
    itens = ItemPedidoAdminSerializer(many=True, read_only=True)
    aceite_contrato = AceiteContratoAdminSerializer(read_only=True)
    reservas = serializers.SerializerMethodField()
    unidades_reservadas = serializers.SerializerMethodField()
    tem_aceite_contrato = serializers.SerializerMethodField()
    possui_reservas_ativas = serializers.SerializerMethodField()
    acoes_disponiveis = serializers.SerializerMethodField()

    class Meta:
        model = Pedido
        fields = (
            "id",
            "status",
            "usuario",
            "cliente",
            "cliente_snapshot",
            "data_evento_pretendida",
            "data_inicio_locacao",
            "data_fim_locacao",
            "observacoes_cliente",
            "endereco_entrega",
            "valores",
            "itens",
            "aceite_contrato",
            "reservas",
            "unidades_reservadas",
            "tem_aceite_contrato",
            "possui_reservas_ativas",
            "confirmado_em",
            "confirmado_por",
            "acoes_disponiveis",
            "criado_em",
            "atualizado_em",
        )
        read_only_fields = fields

    def get_reservas(self, obj):
        return ReservaUnidadeAdminSerializer(obj.reservas_unidades.all(), many=True).data

    def get_unidades_reservadas(self, obj):
        unidades = []
        ids_vistos = set()
        for reserva in obj.reservas_unidades.all():
            unidade = reserva.unidade_brinquedo
            if unidade.id in ids_vistos:
                continue
            ids_vistos.add(unidade.id)
            unidades.append(unidade)
        return UnidadeBrinquedoAdminResumoSerializer(unidades, many=True).data

    def get_tem_aceite_contrato(self, obj):
        return hasattr(obj, "aceite_contrato")

    def get_possui_reservas_ativas(self, obj):
        return any(
            reserva.status == ReservaUnidade.Status.ATIVA
            for reserva in obj.reservas_unidades.all()
        )

    def get_acoes_disponiveis(self, obj):
        return AdminPedidoAcoesService.acoes_disponiveis(obj)


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
            "ativo",
            "criado_em",
            "atualizado_em",
        )
        read_only_fields = fields


class AdminContratoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Contrato
        fields = (
            "id",
            "titulo",
            "versao",
            "texto",
            "ativo",
            "criado_em",
            "atualizado_em",
        )
        read_only_fields = ("id", "ativo", "criado_em", "atualizado_em")
        extra_kwargs = {
            "versao": {"required": False},
        }

    def validate_titulo(self, value):
        value = str(value or "").strip()
        if not value:
            raise serializers.ValidationError("Titulo do contrato e obrigatorio.")
        return value

    def validate_versao(self, value):
        value = str(value or "").strip()
        if not value:
            raise serializers.ValidationError("Versao do contrato e obrigatoria.")
        return value

    def validate_texto(self, value):
        value = str(value or "").strip()
        if not value:
            raise serializers.ValidationError("Texto do contrato e obrigatorio.")
        return value


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
    contrato_aceito = serializers.BooleanField()
    contrato_id = serializers.IntegerField(min_value=1)
    contrato_versao = serializers.CharField(max_length=50, trim_whitespace=True)

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
        "contrato_texto_snapshot",
        "contrato_titulo_snapshot",
        "contrato_versao_snapshot",
        "aceito_em",
        "ip",
        "user_agent",
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
        if attrs.get("contrato_aceito") is not True:
            raise serializers.ValidationError(
                {"contrato_aceito": "O contrato precisa ser aceito para finalizar o pedido."}
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
            "contrato_aceito": self.validated_data["contrato_aceito"],
            "contrato_id": self.validated_data["contrato_id"],
            "contrato_versao": self.validated_data["contrato_versao"],
        }
