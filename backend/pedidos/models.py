from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models


class Carrinho(models.Model):
    class Status(models.TextChoices):
        ATIVO = "ativo", "Ativo"
        CONVERTIDO = "convertido", "Convertido"
        ABANDONADO = "abandonado", "Abandonado"

    session_key = models.CharField(
        max_length=40,
        null=True,
        blank=True,
        db_index=True,
        verbose_name="Chave da sessao",
    )
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="carrinhos",
        verbose_name="Usuario",
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ATIVO,
        db_index=True,
        verbose_name="Status",
    )
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    class Meta:
        ordering = ("-atualizado_em", "-id")
        verbose_name = "Carrinho"
        verbose_name_plural = "Carrinhos"

    def __str__(self):
        dono = self.usuario_id or self.session_key or "sem dono"
        return f"Carrinho {self.id} - {dono}"


class ItemCarrinho(models.Model):
    class TipoItem(models.TextChoices):
        BRINQUEDO = "brinquedo", "Brinquedo"
        KIT_FESTA = "kit_festa", "Kit festa"
        KIT_PERSONALIZADO = "kit_personalizado", "Kit personalizado"

    carrinho = models.ForeignKey(
        Carrinho,
        related_name="itens",
        on_delete=models.CASCADE,
        verbose_name="Carrinho",
    )
    tipo_item = models.CharField(
        max_length=30,
        choices=TipoItem.choices,
        verbose_name="Tipo de item",
    )
    brinquedo = models.ForeignKey(
        "catalogo.Brinquedo",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        verbose_name="Brinquedo",
    )
    kit_festa = models.ForeignKey(
        "catalogo.KitFesta",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        verbose_name="Kit festa",
    )
    configuracao_kit_personalizavel = models.ForeignKey(
        "catalogo.ConfiguracaoKitPersonalizavel",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        verbose_name="Configuracao de kit personalizavel",
    )
    quantidade = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        verbose_name="Quantidade",
    )
    nome_snapshot = models.CharField(max_length=200, verbose_name="Nome snapshot")
    preco_unitario_snapshot = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        verbose_name="Preco unitario snapshot",
    )
    subtotal_snapshot = models.DecimalField(
        max_digits=9,
        decimal_places=2,
        verbose_name="Subtotal snapshot",
    )
    snapshot = models.JSONField(default=dict, blank=True, verbose_name="Snapshot")
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    class Meta:
        ordering = ("criado_em", "id")
        verbose_name = "Item do carrinho"
        verbose_name_plural = "Itens do carrinho"

    def clean(self):
        super().clean()

        campos_por_tipo = {
            self.TipoItem.BRINQUEDO: ("brinquedo",),
            self.TipoItem.KIT_FESTA: ("kit_festa",),
            self.TipoItem.KIT_PERSONALIZADO: ("configuracao_kit_personalizavel",),
        }
        campos_exigidos = campos_por_tipo.get(self.tipo_item, ())
        campos_preenchidos = {
            "brinquedo": self.brinquedo_id,
            "kit_festa": self.kit_festa_id,
            "configuracao_kit_personalizavel": self.configuracao_kit_personalizavel_id,
        }

        erros = {}
        for campo, valor in campos_preenchidos.items():
            if campo in campos_exigidos and not valor:
                erros[campo] = "Este campo e obrigatorio para o tipo de item."
            if campo not in campos_exigidos and valor:
                erros[campo] = "Este campo nao combina com o tipo de item."

        if erros:
            raise ValidationError(erros)

    def __str__(self):
        return f"{self.nome_snapshot} ({self.quantidade})"
