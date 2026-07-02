from rest_framework import serializers


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
