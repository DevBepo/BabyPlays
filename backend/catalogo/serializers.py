from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from .models import (
    Brinquedo,
    Categoria,
    ConfiguracaoKitPersonalizavel,
    DedicacaoUnidadeKit,
    ImagemBrinquedo,
    InteresseDisponibilidade,
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
    exibir_no_catalogo = serializers.BooleanField(source="ativo", read_only=True)
    disponivel_para_carrinho = serializers.SerializerMethodField()
    status_catalogo = serializers.SerializerMethodField()
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
            "exibir_no_catalogo",
            "disponivel_para_carrinho",
            "status_catalogo",
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

    def get_disponivel_para_carrinho(self, obj):
        return BrinquedoService.disponivel_para_locacao_avulsa(obj)

    def get_status_catalogo(self, obj):
        return BrinquedoService.status_catalogo(obj)

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
    disponivel_para_carrinho = serializers.SerializerMethodField()
    status_catalogo = serializers.SerializerMethodField()
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
            "indisponivel_catalogo",
            "disponivel_para_carrinho",
            "status_catalogo",
            "data_cadastro",
            "quantidade_disponivel",
            "imagem_principal",
            "imagens",
        )
        read_only_fields = (
            "id",
            "data_cadastro",
            "quantidade_disponivel",
            "disponivel_para_carrinho",
            "status_catalogo",
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

    def get_disponivel_para_carrinho(self, obj):
        return BrinquedoService.disponivel_para_locacao_avulsa(obj)

    def get_status_catalogo(self, obj):
        return BrinquedoService.status_catalogo(obj)

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
    unidades_dedicadas = serializers.SerializerMethodField()

    class Meta:
        model = ItemKitFesta
        fields = ("id", "quantidade", "ordem", "brinquedo", "unidades_dedicadas")
        read_only_fields = fields

    def get_unidades_dedicadas(self, obj):
        request = self.context.get("request")
        if not request or not request.user.is_authenticated or not request.user.is_staff:
            return []
        return [
            {"id": dedicacao.unidade_id, "codigo": dedicacao.unidade.codigo}
            for dedicacao in obj.unidades_dedicadas.select_related("unidade").all()
        ]


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

class ItemKitFestaWriteSerializer(serializers.Serializer):
    brinquedo_id = serializers.IntegerField(min_value=1)
    quantidade = serializers.IntegerField(min_value=1)
    unidade_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        allow_empty=False,
    )

    def validate(self, attrs):
        if len(attrs["unidade_ids"]) != attrs["quantidade"]:
            raise serializers.ValidationError(
                "Selecione exatamente uma unidade fisica para cada item do kit."
            )
        if len(attrs["unidade_ids"]) != len(set(attrs["unidade_ids"])):
            raise serializers.ValidationError("Nao repita a mesma unidade no item.")
        return attrs

class KitFestaAdminSerializer(serializers.ModelSerializer):
    itens = ItemKitFestaPublicSerializer(many=True, read_only=True)
    itens_enviados = ItemKitFestaWriteSerializer(many=True, write_only=True, required=False)
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
            "itens_enviados", 
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
        itens = attrs.get("itens_enviados")
        ativo = attrs.get("ativo", getattr(self.instance, "ativo", True))
        if self.instance is None and ativo and not itens:
            raise serializers.ValidationError(
                {"itens_enviados": "Kit ativo deve possuir itens e unidades dedicadas."}
            )
        if self.instance is not None and ativo and itens is None:
            dedicacoes_validas = all(
                item.unidades_dedicadas.count() == item.quantidade
                for item in self.instance.itens.all()
            )
            if not self.instance.itens.exists() or not dedicacoes_validas:
                raise serializers.ValidationError(
                    {"itens_enviados": "Selecione as unidades fisicas antes de ativar o kit."}
                )
        if itens is not None:
            brinquedos = [item["brinquedo_id"] for item in itens]
            unidades = [uid for item in itens for uid in item["unidade_ids"]]
            if len(brinquedos) != len(set(brinquedos)):
                raise serializers.ValidationError(
                    {"itens_enviados": "Nao envie o mesmo brinquedo mais de uma vez."}
                )
            if len(unidades) != len(set(unidades)):
                raise serializers.ValidationError(
                    {"itens_enviados": "Uma unidade fisica so pode aparecer uma vez no kit."}
                )

            unidades_qs = UnidadeBrinquedo.objects.filter(id__in=unidades)
            unidades_por_id = {unidade.id: unidade for unidade in unidades_qs}
            dedicacoes_por_unidade = {
                dedicacao.unidade_id: dedicacao
                for dedicacao in DedicacaoUnidadeKit.objects.filter(
                    unidade_id__in=unidades
                ).select_related("item_kit")
            }
            if len(unidades_por_id) != len(unidades):
                raise serializers.ValidationError(
                    {"itens_enviados": "Uma ou mais unidades nao existem."}
                )
            for item in itens:
                for unidade_id in item["unidade_ids"]:
                    unidade = unidades_por_id[unidade_id]
                    if unidade.brinquedo_id != item["brinquedo_id"]:
                        raise serializers.ValidationError(
                            {"itens_enviados": "Unidade selecionada pertence a outro brinquedo."}
                        )
                    dedicacao = dedicacoes_por_unidade.get(unidade_id)
                    if dedicacao and (
                        self.instance is None or dedicacao.item_kit.kit_id != self.instance.id
                    ):
                        raise serializers.ValidationError(
                            {"itens_enviados": f"A unidade {unidade.codigo} ja pertence a outro kit."}
                        )
                    if not dedicacao and unidade.status != UnidadeBrinquedo.Status.DISPONIVEL:
                        raise serializers.ValidationError(
                            {"itens_enviados": f"A unidade {unidade.codigo} nao esta disponivel."}
                        )
        return sincronizar_preco_legado(attrs, self.instance)

    @transaction.atomic
    def create(self, validated_data):
        itens_data = validated_data.pop('itens_enviados', [])
        kit_festa = super().create(validated_data)
        self._salvar_itens(kit_festa, itens_data)
        return kit_festa

    @transaction.atomic
    def update(self, instance, validated_data):
        itens_data = validated_data.pop('itens_enviados', None)
        kit_festa = super().update(instance, validated_data)
        if itens_data is not None:
            self._salvar_itens(kit_festa, itens_data)
        elif not kit_festa.ativo:
            DedicacaoUnidadeKit.objects.filter(item_kit__kit=kit_festa).delete()
        return kit_festa

    def _salvar_itens(self, kit_festa, itens_data):
        from .models import ItemKitFesta
        kit_festa.itens.all().delete()
        for index, item in enumerate(itens_data):
            item_kit = ItemKitFesta.objects.create(
                kit=kit_festa,
                brinquedo_id=item['brinquedo_id'],
                quantidade=item['quantidade'],
                ordem=index
            )
            if kit_festa.ativo:
                for unidade_id in item["unidade_ids"]:
                    dedicacao = DedicacaoUnidadeKit(item_kit=item_kit, unidade_id=unidade_id)
                    dedicacao.full_clean()
                    dedicacao.save()


class InteresseDisponibilidadeSerializer(serializers.ModelSerializer):
    brinquedo_nome = serializers.CharField(source="brinquedo.nome", read_only=True)
    cliente_nome = serializers.CharField(source="cliente.nome", read_only=True)
    cliente_telefone = serializers.CharField(source="cliente.telefone", read_only=True)

    class Meta:
        model = InteresseDisponibilidade
        fields = (
            "id", "brinquedo", "brinquedo_nome", "cliente_nome",
            "cliente_telefone", "status", "disponibilidade_destacada",
            "criado_em", "atualizado_em", "contatado_em",
        )
        read_only_fields = (
            "id", "brinquedo_nome", "cliente_nome", "cliente_telefone",
            "status", "disponibilidade_destacada", "criado_em",
            "atualizado_em", "contatado_em",
        )


class AtualizarInteresseAdminSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=(
            InteresseDisponibilidade.Status.CONTATADO,
            InteresseDisponibilidade.Status.CANCELADO,
        )
    )

    def update(self, instance, validated_data):
        instance.status = validated_data["status"]
        instance.contatado_em = (
            timezone.now()
            if instance.status == InteresseDisponibilidade.Status.CONTATADO
            else None
        )
        instance.save(update_fields=["status", "contatado_em", "atualizado_em"])
        return instance



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
