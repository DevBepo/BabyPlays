from rest_framework import serializers
from .models import (
    Brinquedo,
    Categoria,
    ConfiguracaoKitPersonalizavel,
    ImagemBrinquedo,
    ItemKitFesta,
    KitFesta,
    RegraCategoriaKitPersonalizavel,
    UnidadeBrinquedo,
    periodos_locacao_disponiveis,
    preco_periodo_valido,
)
from .services import BrinquedoService, KitPersonalizavelService


PRECO_PERIODO_FIELDS = ("preco_diaria", "preco_15_dias", "preco_30_dias")


def primeiro_preco_disponivel(attrs, instance=None):
    for campo in PRECO_PERIODO_FIELDS:
        valor = attrs.get(campo, getattr(instance, campo, None) if instance else None)
        if preco_periodo_valido(valor):
            return valor
    return None


def validar_precos_por_periodo(attrs, instance=None):
    if (
        instance is None
        and attrs.get("preco_aluguel") is not None
        and not any(attrs.get(campo) is not None for campo in PRECO_PERIODO_FIELDS)
    ):
        attrs["preco_15_dias"] = attrs["preco_aluguel"]

    if primeiro_preco_disponivel(attrs, instance) is None:
        raise serializers.ValidationError(
            {
                "preco_15_dias": (
                    "Informe ao menos um preco de periodo para locacao."
                )
            }
        )


def sincronizar_preco_legado(attrs, instance=None):
    preco = primeiro_preco_disponivel(attrs, instance)
    if preco is not None:
        attrs["preco_aluguel"] = preco
    return attrs


class CategoriaResumoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = ("id", "nome", "slug")
        read_only_fields = fields


class CategoriaAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Categoria
        fields = (
            "id",
            "nome",
            "slug",
            "descricao",
            "ativo",
            "ordem",
            "criado_em",
            "atualizado_em",
        )
        read_only_fields = ("id", "criado_em", "atualizado_em")


class CategoriaField(serializers.PrimaryKeyRelatedField):
    def use_pk_only_optimization(self):
        return False

    def to_representation(self, value):
        return CategoriaResumoSerializer(value).data


class ImagemBrinquedoPublicSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    class Meta:
        model = ImagemBrinquedo
        fields = ("id", "url", "alt_text", "principal", "ordem")
        read_only_fields = fields

    def get_url(self, obj):
        if not obj.imagem:
            return None

        url = obj.imagem.url
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(url)
        return url


class BrinquedoPublicSerializer(serializers.ModelSerializer):
    quantidade_disponivel = serializers.SerializerMethodField()
    categoria = CategoriaResumoSerializer(read_only=True)
    imagem_principal = serializers.SerializerMethodField()
    imagens = serializers.SerializerMethodField()
    periodos_disponiveis = serializers.SerializerMethodField()

    class Meta:
        model = Brinquedo
        fields = (
            "id",
            "nome",
            "descricao",
            "preco_aluguel",
            "preco_diaria",
            "preco_15_dias",
            "preco_30_dias",
            "permite_diaria",
            "periodos_disponiveis",
            "categoria",
            "quantidade_disponivel",
            "imagem_principal",
            "imagens",
        )
        read_only_fields = fields

    def get_quantidade_disponivel(self, obj):
        quantidade_anotada = getattr(obj, "quantidade_disponivel_anotada", None)
        if quantidade_anotada is not None:
            return quantidade_anotada
        return BrinquedoService.quantidade_disponivel(obj)

    def get_periodos_disponiveis(self, obj):
        return periodos_locacao_disponiveis(obj)

    def get_imagens_ativas(self, obj):
        imagens = getattr(obj, "imagens_publicas", None)
        if imagens is not None:
            return imagens
        return obj.imagens.filter(ativo=True).order_by("-principal", "ordem", "id")

    def get_imagem_principal(self, obj):
        imagens = self.get_imagens_ativas(obj)
        for imagem in imagens:
            if imagem.principal:
                return ImagemBrinquedoPublicSerializer(
                    imagem,
                    context=self.context,
                ).data
        if imagens:
            return ImagemBrinquedoPublicSerializer(
                imagens[0],
                context=self.context,
            ).data
        return None

    def get_imagens(self, obj):
        return ImagemBrinquedoPublicSerializer(
            self.get_imagens_ativas(obj),
            many=True,
            context=self.context,
        ).data


class BrinquedoAdminSerializer(serializers.ModelSerializer):
    quantidade_disponivel = serializers.SerializerMethodField()
    imagem_principal = serializers.SerializerMethodField()
    imagens = serializers.SerializerMethodField()
    periodos_disponiveis = serializers.SerializerMethodField()
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
            "preco_diaria",
            "preco_15_dias",
            "preco_30_dias",
            "permite_diaria",
            "periodos_disponiveis",
            "ativo",
            "data_cadastro",
            "quantidade_disponivel",
            "imagem_principal",
            "imagens",
        )
        read_only_fields = (
            "id",
            "data_cadastro",
            "quantidade_disponivel",
            "imagem_principal",
            "imagens",
        )
        extra_kwargs = {"preco_aluguel": {"required": False}}

    def validate(self, attrs):
        attrs = super().validate(attrs)
        validar_precos_por_periodo(attrs, self.instance)
        return sincronizar_preco_legado(attrs, self.instance)

    def get_quantidade_disponivel(self, obj):
        quantidade_anotada = getattr(obj, "quantidade_disponivel_anotada", None)
        if quantidade_anotada is not None:
            return quantidade_anotada
        return BrinquedoService.quantidade_disponivel(obj)

    def get_periodos_disponiveis(self, obj):
        return periodos_locacao_disponiveis(obj)

    def get_imagens_ativas(self, obj):
        imagens = getattr(obj, "imagens_publicas", None)
        if imagens is not None:
            return imagens
        return obj.imagens.filter(ativo=True).order_by("-principal", "ordem", "id")

    def get_imagem_principal(self, obj):
        imagens = self.get_imagens_ativas(obj)
        for imagem in imagens:
            if imagem.principal:
                return ImagemBrinquedoPublicSerializer(
                    imagem,
                    context=self.context,
                ).data
        if imagens:
            return ImagemBrinquedoPublicSerializer(
                imagens[0],
                context=self.context,
            ).data
        return None

    def get_imagens(self, obj):
        return ImagemBrinquedoPublicSerializer(
            self.get_imagens_ativas(obj),
            many=True,
            context=self.context,
        ).data


BrinquedoSerializer = BrinquedoAdminSerializer


class UnidadeBrinquedoOperacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = UnidadeBrinquedo
        fields = ("id", "codigo", "status")
        read_only_fields = fields


class UnidadeBrinquedoAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = UnidadeBrinquedo
        fields = ("id", "codigo", "status")
        read_only_fields = ("id", "status")


class BrinquedoKitResumoSerializer(serializers.ModelSerializer):
    categoria = CategoriaResumoSerializer(read_only=True)
    imagem_principal = serializers.SerializerMethodField()

    class Meta:
        model = Brinquedo
        fields = ("id", "nome", "categoria", "imagem_principal")
        read_only_fields = fields

    def get_imagem_principal(self, obj):
        imagens = getattr(obj, "imagens_publicas", None)
        if imagens is None:
            imagens = obj.imagens.filter(ativo=True).order_by("-principal", "ordem", "id")

        for imagem in imagens:
            if imagem.principal:
                return ImagemBrinquedoPublicSerializer(
                    imagem,
                    context=self.context,
                ).data
        return None


class BrinquedoElegivelKitPersonalizavelSerializer(BrinquedoKitResumoSerializer):
    quantidade_disponivel = serializers.SerializerMethodField()

    class Meta:
        model = Brinquedo
        fields = (
            "id",
            "nome",
            "categoria",
            "preco_aluguel",
            "preco_diaria",
            "preco_15_dias",
            "preco_30_dias",
            "permite_diaria",
            "imagem_principal",
            "quantidade_disponivel",
        )
        read_only_fields = fields

    def get_quantidade_disponivel(self, obj):
        quantidade_anotada = getattr(obj, "quantidade_disponivel_anotada", None)
        if quantidade_anotada is not None:
            return quantidade_anotada
        return BrinquedoService.quantidade_disponivel(obj)


class ItemKitFestaPublicSerializer(serializers.ModelSerializer):
    brinquedo = BrinquedoKitResumoSerializer(read_only=True)

    class Meta:
        model = ItemKitFesta
        fields = ("id", "quantidade", "ordem", "brinquedo")
        read_only_fields = fields


class KitFestaPublicSerializer(serializers.ModelSerializer):
    itens = ItemKitFestaPublicSerializer(many=True, read_only=True)
    periodos_disponiveis = serializers.SerializerMethodField()
    imagem_url = serializers.SerializerMethodField()

    class Meta:
        model = KitFesta
        fields = (
            "id",
            "nome",
            "descricao",
            "imagem_url",
            "preco_aluguel",
            "preco_diaria",
            "preco_15_dias",
            "preco_30_dias",
            "permite_diaria",
            "periodos_disponiveis",
            "itens",
        )
        read_only_fields = fields

    def get_periodos_disponiveis(self, obj):
        return periodos_locacao_disponiveis(obj)

    def get_imagem_url(self, obj):
        if not obj.imagem:
            return None

        url = obj.imagem.url
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(url)
        return url


class KitFestaAdminSerializer(serializers.ModelSerializer):
    itens = ItemKitFestaPublicSerializer(many=True, read_only=True)
    periodos_disponiveis = serializers.SerializerMethodField()
    imagem_url = serializers.SerializerMethodField()

    class Meta:
        model = KitFesta
        fields = (
            "id",
            "nome",
            "descricao",
            "imagem_url",
            "preco_aluguel",
            "preco_diaria",
            "preco_15_dias",
            "preco_30_dias",
            "permite_diaria",
            "periodos_disponiveis",
            "ativo",
            "ordem",
            "itens",
            "criado_em",
            "atualizado_em",
        )
        read_only_fields = ("id", "periodos_disponiveis", "criado_em", "atualizado_em")
        extra_kwargs = {"preco_aluguel": {"required": False}}

    def get_periodos_disponiveis(self, obj):
        return periodos_locacao_disponiveis(obj)

    def get_imagem_url(self, obj):
        if not obj.imagem:
            return None

        url = obj.imagem.url
        request = self.context.get("request")
        if request:
            return request.build_absolute_uri(url)
        return url

    def validate(self, attrs):
        attrs = super().validate(attrs)
        validar_precos_por_periodo(attrs, self.instance)
        return sincronizar_preco_legado(attrs, self.instance)


class RegraCategoriaKitPersonalizavelPublicSerializer(serializers.ModelSerializer):
    categoria = CategoriaResumoSerializer(read_only=True)

    class Meta:
        model = RegraCategoriaKitPersonalizavel
        fields = (
            "id",
            "categoria",
            "quantidade_minima",
            "quantidade_maxima",
            "ordem",
        )
        read_only_fields = fields


class ConfiguracaoKitPersonalizavelPublicSerializer(serializers.ModelSerializer):
    categorias_permitidas = CategoriaResumoSerializer(many=True, read_only=True)
    regras_categoria = RegraCategoriaKitPersonalizavelPublicSerializer(
        many=True,
        read_only=True,
    )
    brinquedos_elegiveis = serializers.SerializerMethodField()

    class Meta:
        model = ConfiguracaoKitPersonalizavel
        fields = (
            "id",
            "nome",
            "descricao",
            "preco_base",
            "quantidade_minima_brinquedos",
            "quantidade_maxima_brinquedos",
            "modo_elegibilidade",
            "categorias_permitidas",
            "regras_categoria",
            "brinquedos_elegiveis",
        )
        read_only_fields = fields

    def get_brinquedos_elegiveis(self, obj):
        return BrinquedoElegivelKitPersonalizavelSerializer(
            KitPersonalizavelService.brinquedos_elegiveis(obj),
            many=True,
            context=self.context,
        ).data


class ConfiguracaoKitPersonalizavelAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = ConfiguracaoKitPersonalizavel
        fields = (
            "id",
            "nome",
            "descricao",
            "ativo",
            "ordem",
            "preco_base",
            "quantidade_minima_brinquedos",
            "quantidade_maxima_brinquedos",
            "modo_elegibilidade",
            "categorias_permitidas",
            "brinquedos_permitidos",
            "criado_em",
            "atualizado_em",
        )
        read_only_fields = ("id", "criado_em", "atualizado_em")

    def validate(self, attrs):
        attrs = super().validate(attrs)
        quantidade_minima = attrs.get(
            "quantidade_minima_brinquedos",
            getattr(self.instance, "quantidade_minima_brinquedos", None),
        )
        quantidade_maxima = attrs.get(
            "quantidade_maxima_brinquedos",
            getattr(self.instance, "quantidade_maxima_brinquedos", None),
        )
        if (
            quantidade_minima is not None
            and quantidade_maxima is not None
            and quantidade_minima > quantidade_maxima
        ):
            raise serializers.ValidationError(
                {
                    "quantidade_minima_brinquedos": (
                        "A quantidade minima nao pode ser maior que a maxima."
                    )
                }
            )
        return attrs


class ItemSelecaoKitPersonalizavelSerializer(serializers.Serializer):
    brinquedo_id = serializers.IntegerField(min_value=1)
    quantidade = serializers.IntegerField(min_value=1)


class ValidarSelecaoKitPersonalizavelSerializer(serializers.Serializer):
    itens = ItemSelecaoKitPersonalizavelSerializer(many=True, allow_empty=False)

    def validate_itens(self, itens):
        brinquedos_ids = [item["brinquedo_id"] for item in itens]
        if len(brinquedos_ids) != len(set(brinquedos_ids)):
            raise serializers.ValidationError(
                "Nao envie o mesmo brinquedo mais de uma vez."
            )
        return itens


class DisponibilidadePeriodoSerializer(serializers.Serializer):
    data_inicio = serializers.DateField(required=True)
    data_fim = serializers.DateField(required=True)
    quantidade = serializers.IntegerField(min_value=1, required=False, default=1)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        data_inicio = attrs.get("data_inicio")
        data_fim = attrs.get("data_fim")

        if data_inicio and data_fim and data_fim <= data_inicio:
            raise serializers.ValidationError(
                {"data_fim": "A data final deve ser posterior a data inicial."}
            )

        return attrs


class DisponibilidadeKitPersonalizavelSerializer(DisponibilidadePeriodoSerializer):
    itens = ItemSelecaoKitPersonalizavelSerializer(many=True, allow_empty=False)

    def validate_itens(self, itens):
        return ValidarSelecaoKitPersonalizavelSerializer().validate_itens(itens)
