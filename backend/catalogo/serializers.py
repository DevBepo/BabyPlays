from rest_framework import serializers
from .models import (
    Brinquedo,
    Categoria,
    ConfiguracaoKitPersonalizavel,
    ImagemBrinquedo,
    ItemKitFesta,
    KitFesta,
    RegraCategoriaKitPersonalizavel,
)
from .services import BrinquedoService, KitPersonalizavelService


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

    class Meta:
        model = Brinquedo
        fields = (
            "id",
            "nome",
            "descricao",
            "preco_aluguel",
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

    def get_imagens_ativas(self, obj):
        imagens = getattr(obj, "imagens_publicas", None)
        if imagens is not None:
            return imagens
        return obj.imagens.filter(ativo=True).order_by("-principal", "ordem", "id")

    def get_imagem_principal(self, obj):
        for imagem in self.get_imagens_ativas(obj):
            if imagem.principal:
                return ImagemBrinquedoPublicSerializer(
                    imagem,
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
        quantidade_anotada = getattr(obj, "quantidade_disponivel_anotada", None)
        if quantidade_anotada is not None:
            return quantidade_anotada
        return BrinquedoService.quantidade_disponivel(obj)


BrinquedoSerializer = BrinquedoAdminSerializer


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

    class Meta:
        model = KitFesta
        fields = ("id", "nome", "descricao", "preco_aluguel", "itens")
        read_only_fields = fields


class KitFestaAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = KitFesta
        fields = (
            "id",
            "nome",
            "descricao",
            "preco_aluguel",
            "ativo",
            "ordem",
            "criado_em",
            "atualizado_em",
        )
        read_only_fields = ("id", "criado_em", "atualizado_em")


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
