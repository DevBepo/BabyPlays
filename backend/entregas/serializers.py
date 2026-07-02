from rest_framework import serializers

from .models import RegraFreteBairro, normalizar_localidade


class CalcularTaxaEntregaRetiradaSerializer(serializers.Serializer):
    cep = serializers.CharField(max_length=9)
    numero = serializers.CharField(max_length=20)
    complemento = serializers.CharField(max_length=100, required=False, allow_blank=True)

    campos_proibidos = {
        "distancia_km",
        "distancia_ida_km",
        "distancia_total_km",
        "valor_por_km",
        "taxa",
        "preco",
        "frete",
    }

    def validate(self, attrs):
        attrs = super().validate(attrs)
        campos_enviados = set(getattr(self, "initial_data", {}).keys())
        campos_forjados = sorted(campos_enviados.intersection(self.campos_proibidos))
        if campos_forjados:
            raise serializers.ValidationError(
                {
                    "detail": (
                        "Distancia, valor por km e taxa sao calculados no backend."
                    )
                }
            )
        return attrs

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


class ResultadoTaxaEntregaRetiradaSerializer(serializers.Serializer):
    nome = serializers.CharField()
    endereco_interpretado = serializers.DictField()
    status = serializers.ChoiceField(
        choices=("calculada", "a_confirmar", "sujeita_analise")
    )
    distancia_ida_km = serializers.DecimalField(
        max_digits=10, decimal_places=2, allow_null=True
    )
    distancia_total_km = serializers.DecimalField(
        max_digits=10, decimal_places=2, allow_null=True
    )
    valor_por_km = serializers.DecimalField(
        max_digits=8, decimal_places=2, allow_null=True
    )
    taxa = serializers.DecimalField(
        max_digits=10, decimal_places=2, allow_null=True
    )


class RegraFreteBairroAdminSerializer(serializers.ModelSerializer):
    status_taxa = serializers.SerializerMethodField()

    class Meta:
        model = RegraFreteBairro
        fields = (
            "id",
            "uf",
            "cidade",
            "bairro",
            "valor_taxa",
            "status_taxa",
            "ativo",
            "observacao",
            "criado_em",
            "atualizado_em",
        )
        read_only_fields = ("id", "status_taxa", "criado_em", "atualizado_em")

    def get_status_taxa(self, obj):
        return "calculada" if obj.valor_taxa is not None and obj.valor_taxa > 0 else "a_confirmar"

    def validate_uf(self, value):
        uf = str(value or "").strip().upper()
        if len(uf) != 2 or not uf.isalpha():
            raise serializers.ValidationError("Informe uma UF valida com 2 letras.")
        return uf

    def validate_cidade(self, value):
        cidade = " ".join(str(value or "").strip().split())
        if not cidade:
            raise serializers.ValidationError("Cidade e obrigatoria.")
        return cidade

    def validate_bairro(self, value):
        bairro = " ".join(str(value or "").strip().split())
        if not bairro:
            raise serializers.ValidationError("Bairro e obrigatorio.")
        return bairro

    def validate_valor_taxa(self, value):
        if value is None or value <= 0:
            return None
        return value

    def validate(self, attrs):
        attrs = super().validate(attrs)
        uf = attrs.get("uf", getattr(self.instance, "uf", ""))
        cidade = attrs.get("cidade", getattr(self.instance, "cidade", ""))
        bairro = attrs.get("bairro", getattr(self.instance, "bairro", ""))
        regras_iguais = RegraFreteBairro.objects.filter(
            uf=str(uf).strip().upper(),
            cidade_normalizada=normalizar_localidade(cidade),
            bairro_normalizado=normalizar_localidade(bairro),
        )
        if self.instance:
            regras_iguais = regras_iguais.exclude(pk=self.instance.pk)
        if regras_iguais.exists():
            raise serializers.ValidationError(
                {"bairro": "Ja existe uma regra para esta UF, cidade e bairro."}
            )
        return attrs
