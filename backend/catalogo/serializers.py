from rest_framework import serializers
from .models import Brinquedo, Categoria, ImagemBrinquedo, ItemKitFesta, KitFesta
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
