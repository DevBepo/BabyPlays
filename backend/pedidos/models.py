from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q


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


def validar_relacoes_por_tipo(instance):
    campos_por_tipo = {
        ItemCarrinho.TipoItem.BRINQUEDO: ("brinquedo",),
        ItemCarrinho.TipoItem.KIT_FESTA: ("kit_festa",),
        ItemCarrinho.TipoItem.KIT_PERSONALIZADO: (
            "configuracao_kit_personalizavel",
        ),
    }
    campos_exigidos = campos_por_tipo.get(instance.tipo_item, ())
    campos_preenchidos = {
        "brinquedo": instance.brinquedo_id,
        "kit_festa": instance.kit_festa_id,
        "configuracao_kit_personalizavel": (
            instance.configuracao_kit_personalizavel_id
        ),
    }

    erros = {}
    for campo, valor in campos_preenchidos.items():
        if campo in campos_exigidos and not valor:
            erros[campo] = "Este campo e obrigatorio para o tipo de item."
        if campo not in campos_exigidos and valor:
            erros[campo] = "Este campo nao combina com o tipo de item."

    if erros:
        raise ValidationError(erros)


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
        validar_relacoes_por_tipo(self)

    def __str__(self):
        return f"{self.nome_snapshot} ({self.quantidade})"


class Pedido(models.Model):
    class Status(models.TextChoices):
        AGUARDANDO_ANALISE = "aguardando_analise", "Aguardando analise"
        RESERVADO = "reservado", "Reservado"
        CANCELADO = "cancelado", "Cancelado"

    carrinho_origem = models.ForeignKey(
        Carrinho,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="pedidos",
        verbose_name="Carrinho de origem",
    )
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="pedidos",
        verbose_name="Usuario",
    )
    session_key_snapshot = models.CharField(
        max_length=40,
        null=True,
        blank=True,
        db_index=True,
        verbose_name="Chave da sessao snapshot",
    )
    status = models.CharField(
        max_length=30,
        choices=Status.choices,
        default=Status.AGUARDANDO_ANALISE,
        db_index=True,
        verbose_name="Status",
    )
    nome_cliente_snapshot = models.CharField(
        max_length=200,
        verbose_name="Nome do cliente snapshot",
    )
    telefone_cliente_snapshot = models.CharField(
        max_length=30,
        verbose_name="Telefone do cliente snapshot",
    )
    email_cliente_snapshot = models.EmailField(
        max_length=254,
        verbose_name="E-mail do cliente snapshot",
    )
    observacoes_cliente = models.TextField(
        blank=True,
        verbose_name="Observacoes do cliente",
    )
    data_evento_pretendida = models.DateField(
        verbose_name="Data pretendida do evento",
    )
    data_inicio_locacao = models.DateField(
        null=True,
        blank=True,
        verbose_name="Data de inicio da locacao",
    )
    data_fim_locacao = models.DateField(
        null=True,
        blank=True,
        verbose_name="Data de fim da locacao",
    )
    subtotal_itens_snapshot = models.DecimalField(
        max_digits=9,
        decimal_places=2,
        verbose_name="Subtotal dos itens snapshot",
    )
    endereco_entrega_snapshot = models.JSONField(
        default=dict,
        blank=True,
        verbose_name="Endereco de entrega snapshot",
    )
    distancia_ida_km_snapshot = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        verbose_name="Distancia de ida em km snapshot",
    )
    distancia_total_km_snapshot = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        verbose_name="Distancia total em km snapshot",
    )
    valor_por_km_snapshot = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=Decimal("0.00"),
        verbose_name="Valor por km snapshot",
    )
    taxa_entrega_retirada_snapshot = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        verbose_name="Taxa de entrega e retirada snapshot",
    )
    total_estimado_snapshot = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
        verbose_name="Total estimado snapshot",
    )
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    class Meta:
        ordering = ("-criado_em", "-id")
        verbose_name = "Pedido"
        verbose_name_plural = "Pedidos"

    def __str__(self):
        return f"Pedido {self.id} - {self.nome_cliente_snapshot}"


class Contrato(models.Model):
    titulo = models.CharField(
        max_length=200,
        blank=True,
        verbose_name="Titulo",
    )
    versao = models.CharField(
        max_length=50,
        unique=True,
        verbose_name="Versao",
    )
    texto = models.TextField(verbose_name="Texto do contrato")
    ativo = models.BooleanField(default=False, verbose_name="Ativo")
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    class Meta:
        ordering = ("-ativo", "-atualizado_em", "-id")
        constraints = [
            models.UniqueConstraint(
                fields=["ativo"],
                condition=Q(ativo=True),
                name="pedidos_um_contrato_ativo",
            )
        ]
        verbose_name = "Contrato"
        verbose_name_plural = "Contratos"

    def clean(self):
        super().clean()
        erros = {}

        if self.ativo:
            contratos_ativos = Contrato.objects.filter(ativo=True)
            if self.pk:
                contratos_ativos = contratos_ativos.exclude(pk=self.pk)
            if contratos_ativos.exists():
                erros["ativo"] = (
                    "Ja existe um contrato ativo. Desative o contrato vigente antes "
                    "de ativar outra versao."
                )

        if self.pk and AceiteContrato.objects.filter(contrato_id=self.pk).exists():
            contrato_original = Contrato.objects.get(pk=self.pk)
            if self.versao != contrato_original.versao:
                erros["versao"] = (
                    "Contrato com aceite registrado nao pode ter a versao alterada."
                )
            if self.texto != contrato_original.texto:
                erros["texto"] = (
                    "Contrato com aceite registrado nao pode ter o texto alterado."
                )

        if erros:
            raise ValidationError(erros)

    def __str__(self):
        titulo = f" - {self.titulo}" if self.titulo else ""
        return f"Contrato {self.versao}{titulo}"


class AceiteContrato(models.Model):
    pedido = models.OneToOneField(
        Pedido,
        related_name="aceite_contrato",
        on_delete=models.PROTECT,
        verbose_name="Pedido",
    )
    contrato = models.ForeignKey(
        Contrato,
        related_name="aceites",
        on_delete=models.PROTECT,
        verbose_name="Contrato",
    )
    contrato_versao_snapshot = models.CharField(
        max_length=50,
        verbose_name="Versao do contrato snapshot",
    )
    contrato_texto_snapshot = models.TextField(
        verbose_name="Texto do contrato snapshot",
    )
    nome_cliente_snapshot = models.CharField(
        max_length=200,
        verbose_name="Nome do cliente snapshot",
    )
    email_cliente_snapshot = models.EmailField(
        max_length=254,
        verbose_name="E-mail do cliente snapshot",
    )
    aceito_em = models.DateTimeField(verbose_name="Aceito em")
    ip = models.GenericIPAddressField(null=True, blank=True, verbose_name="IP")
    user_agent = models.TextField(blank=True, verbose_name="User-agent")

    class Meta:
        ordering = ("-aceito_em", "-id")
        verbose_name = "Aceite de contrato"
        verbose_name_plural = "Aceites de contrato"

    def __str__(self):
        return f"Aceite do pedido {self.pedido_id} - {self.contrato_versao_snapshot}"


class ItemPedido(models.Model):
    pedido = models.ForeignKey(
        Pedido,
        related_name="itens",
        on_delete=models.CASCADE,
        verbose_name="Pedido",
    )
    tipo_item = models.CharField(
        max_length=30,
        choices=ItemCarrinho.TipoItem.choices,
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

    class Meta:
        ordering = ("criado_em", "id")
        verbose_name = "Item do pedido"
        verbose_name_plural = "Itens do pedido"

    def clean(self):
        super().clean()
        validar_relacoes_por_tipo(self)

    def __str__(self):
        return f"{self.nome_snapshot} ({self.quantidade})"


class ReservaUnidade(models.Model):
    class Status(models.TextChoices):
        ATIVA = "ativa", "Ativa"
        CANCELADA = "cancelada", "Cancelada"

    pedido = models.ForeignKey(
        Pedido,
        related_name="reservas_unidades",
        on_delete=models.PROTECT,
        verbose_name="Pedido",
    )
    item_pedido = models.ForeignKey(
        ItemPedido,
        null=True,
        blank=True,
        related_name="reservas_unidades",
        on_delete=models.PROTECT,
        verbose_name="Item do pedido",
    )
    unidade_brinquedo = models.ForeignKey(
        "catalogo.UnidadeBrinquedo",
        related_name="reservas",
        on_delete=models.PROTECT,
        verbose_name="Unidade do brinquedo",
    )
    data_inicio = models.DateField(verbose_name="Data de inicio")
    data_fim = models.DateField(verbose_name="Data de fim")
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.ATIVA,
        db_index=True,
        verbose_name="Status",
    )
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    class Meta:
        ordering = ("data_inicio", "data_fim", "criado_em")
        constraints = [
            models.CheckConstraint(
                condition=Q(data_fim__gt=models.F("data_inicio")),
                name="pedidos_reserva_unidade_periodo_valido",
            )
        ]
        verbose_name = "Reserva de unidade"
        verbose_name_plural = "Reservas de unidades"

    def __str__(self):
        return (
            f"Reserva {self.id} - pedido {self.pedido_id} - "
            f"{self.unidade_brinquedo_id}"
        )
