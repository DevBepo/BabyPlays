import unicodedata

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q


def normalizar_localidade(valor):
    texto = " ".join(str(valor or "").strip().split()).casefold()
    return "".join(
        caractere
        for caractere in unicodedata.normalize("NFKD", texto)
        if not unicodedata.combining(caractere)
    )


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


class RegraFreteBairro(models.Model):
    uf = models.CharField(max_length=2, verbose_name="UF")
    cidade = models.CharField(max_length=120, verbose_name="Cidade")
    cidade_normalizada = models.CharField(max_length=120, editable=False)
    bairro = models.CharField(max_length=120, verbose_name="Bairro")
    bairro_normalizado = models.CharField(max_length=120, editable=False)
    valor_taxa = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(0)],
        verbose_name="Taxa de entrega e retirada",
        help_text="Deixe vazio ou informe zero para marcar a taxa como a confirmar.",
    )
    ativo = models.BooleanField(default=True, verbose_name="Ativo")
    observacao = models.CharField(
        max_length=255,
        blank=True,
        verbose_name="Observacao",
    )
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    class Meta:
        ordering = ("uf", "cidade_normalizada", "bairro_normalizado")
        constraints = [
            models.UniqueConstraint(
                fields=["uf", "cidade_normalizada", "bairro_normalizado"],
                name="entregas_regra_unica_por_bairro",
            )
        ]
        verbose_name = "Regra de frete por bairro"
        verbose_name_plural = "Regras de frete por bairro"

    def _normalizar_campos(self):
        self.uf = str(self.uf or "").strip().upper()
        self.cidade = " ".join(str(self.cidade or "").strip().split())
        self.bairro = " ".join(str(self.bairro or "").strip().split())
        self.cidade_normalizada = normalizar_localidade(self.cidade)
        self.bairro_normalizado = normalizar_localidade(self.bairro)
        if self.valor_taxa is not None and self.valor_taxa <= 0:
            self.valor_taxa = None

    def clean(self):
        self._normalizar_campos()
        super().clean()

    def save(self, *args, **kwargs):
        self._normalizar_campos()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.bairro} - {self.cidade}/{self.uf}"
