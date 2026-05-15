from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q


class ConfiguracaoTaxaEntregaRetirada(models.Model):
    valor_por_km = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name="Valor por km",
    )
    origem_cep = models.CharField(max_length=8, verbose_name="CEP de origem")
    origem_logradouro = models.CharField(max_length=200, verbose_name="Logradouro")
    origem_numero = models.CharField(max_length=20, verbose_name="Numero")
    origem_complemento = models.CharField(
        max_length=100,
        blank=True,
        verbose_name="Complemento",
    )
    origem_bairro = models.CharField(max_length=120, verbose_name="Bairro")
    origem_cidade = models.CharField(max_length=120, verbose_name="Cidade")
    origem_uf = models.CharField(max_length=2, verbose_name="UF")
    origem_latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        verbose_name="Latitude",
    )
    origem_longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        verbose_name="Longitude",
    )
    ativo = models.BooleanField(default=True, verbose_name="Ativo")
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    class Meta:
        ordering = ("-ativo", "-atualizado_em", "-id")
        constraints = [
            models.UniqueConstraint(
                fields=["ativo"],
                condition=Q(ativo=True),
                name="entregas_uma_configuracao_ativa",
            )
        ]
        verbose_name = "Configuracao da taxa de entrega e retirada"
        verbose_name_plural = "Configuracoes da taxa de entrega e retirada"

    def clean(self):
        super().clean()
        if not self.ativo:
            return

        configuracoes_ativas = ConfiguracaoTaxaEntregaRetirada.objects.filter(
            ativo=True,
        )
        if self.pk:
            configuracoes_ativas = configuracoes_ativas.exclude(pk=self.pk)

        if configuracoes_ativas.exists():
            raise ValidationError(
                {
                    "ativo": (
                        "Ja existe uma configuracao ativa para a taxa de entrega "
                        "e retirada. Desative a atual antes de ativar outra."
                    )
                }
            )

    def __str__(self):
        status = "ativa" if self.ativo else "inativa"
        return f"Taxa de entrega e retirada ({status})"
