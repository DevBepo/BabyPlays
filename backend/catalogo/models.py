from pathlib import Path
from uuid import uuid4

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q

from .validators import validar_imagem_brinquedo


def caminho_imagem_brinquedo(instance, filename):
    extensao = Path(filename).suffix.lower()
    return f"catalogo/brinquedos/{instance.brinquedo_id}/{uuid4()}{extensao}"


class Categoria(models.Model):
    nome = models.CharField(max_length=120, verbose_name="Nome")
    slug = models.SlugField(max_length=140, unique=True, verbose_name="Slug")
    descricao = models.TextField(blank=True, verbose_name="Descricao")
    ativo = models.BooleanField(default=True, verbose_name="Ativa")
    ordem = models.PositiveIntegerField(default=0, verbose_name="Ordem de exibicao")
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    class Meta:
        ordering = ("ordem", "nome")
        verbose_name = "Categoria"
        verbose_name_plural = "Categorias"

    def __str__(self):
        return self.nome


class Brinquedo(models.Model):
    nome = models.CharField(max_length=200, verbose_name="Nome")
    descricao = models.TextField(verbose_name="Descrição")
    categoria = models.ForeignKey(
        Categoria,
        related_name="brinquedos",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        verbose_name="Categoria",
    )
    preco_aluguel = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        verbose_name="Preço do Aluguel",
        help_text="Preço do aluguel por período (ex: diária).",
    )
    ativo = models.BooleanField(
        default=True,
        verbose_name="Ativo no catálogo",
        help_text="Indica se o produto está habilitado para publicação no catálogo; não representa estoque físico disponível.",
    )
    data_cadastro = models.DateTimeField(auto_now_add=True, verbose_name="Data de Cadastro")

    def __str__(self):
        return self.nome


class ImagemBrinquedo(models.Model):
    brinquedo = models.ForeignKey(
        Brinquedo,
        related_name="imagens",
        on_delete=models.CASCADE,
        verbose_name="Brinquedo",
    )
    imagem = models.ImageField(
        upload_to=caminho_imagem_brinquedo,
        validators=[validar_imagem_brinquedo],
        verbose_name="Imagem",
    )
    alt_text = models.CharField(
        max_length=150,
        blank=True,
        verbose_name="Texto alternativo",
    )
    principal = models.BooleanField(default=False, verbose_name="Principal")
    ordem = models.PositiveIntegerField(default=0, verbose_name="Ordem")
    ativo = models.BooleanField(default=True, verbose_name="Ativa")
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    class Meta:
        ordering = ("-principal", "ordem", "id")
        constraints = [
            models.UniqueConstraint(
                fields=["brinquedo"],
                condition=Q(principal=True),
                name="catalogo_uma_imagem_principal_por_brinquedo",
            )
        ]
        verbose_name = "Imagem do brinquedo"
        verbose_name_plural = "Imagens dos brinquedos"

    def __str__(self):
        return f"Imagem de {self.brinquedo.nome}"


class UnidadeBrinquedo(models.Model):
    class Status(models.TextChoices):
        DISPONIVEL = "disponivel", "Disponivel"
        RESERVADA = "reservada", "Reservada"
        EM_LOCACAO = "em_locacao", "Em locacao"
        HIGIENIZACAO = "higienizacao", "Higienizacao"
        MANUTENCAO = "manutencao", "Manutencao"
        STANDBY = "standby", "Standby"
        BAIXADA = "baixada", "Baixada"

    brinquedo = models.ForeignKey(
        Brinquedo,
        related_name="unidades",
        on_delete=models.PROTECT,
        verbose_name="Brinquedo",
    )
    codigo = models.CharField(max_length=50, unique=True, verbose_name="Codigo")
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.DISPONIVEL,
        verbose_name="Status",
    )
    observacoes = models.TextField(blank=True, verbose_name="Observacoes")
    data_cadastro = models.DateTimeField(
        auto_now_add=True,
        verbose_name="Data de Cadastro",
    )
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    def __str__(self):
        return f"{self.codigo} - {self.brinquedo.nome}"


class KitFesta(models.Model):
    nome = models.CharField(max_length=200, verbose_name="Nome")
    descricao = models.TextField(verbose_name="Descricao")
    preco_aluguel = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        verbose_name="Preco do aluguel",
    )
    ativo = models.BooleanField(default=True, verbose_name="Ativo no catalogo")
    ordem = models.PositiveIntegerField(default=0, verbose_name="Ordem de exibicao")
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    class Meta:
        ordering = ("ordem", "nome")
        verbose_name = "Kit festa"
        verbose_name_plural = "Kits festa"

    def __str__(self):
        return self.nome


class ItemKitFesta(models.Model):
    kit = models.ForeignKey(
        KitFesta,
        related_name="itens",
        on_delete=models.CASCADE,
        verbose_name="Kit festa",
    )
    brinquedo = models.ForeignKey(
        Brinquedo,
        on_delete=models.PROTECT,
        verbose_name="Brinquedo",
    )
    quantidade = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        verbose_name="Quantidade",
    )
    ordem = models.PositiveIntegerField(default=0, verbose_name="Ordem")

    class Meta:
        ordering = ("ordem", "id")
        constraints = [
            models.UniqueConstraint(
                fields=["kit", "brinquedo"],
                name="catalogo_item_kit_festa_brinquedo_unico",
            )
        ]
        verbose_name = "Item do kit festa"
        verbose_name_plural = "Itens dos kits festa"

    def __str__(self):
        return f"{self.kit.nome} - {self.brinquedo.nome} ({self.quantidade})"


class ConfiguracaoKitPersonalizavel(models.Model):
    class ModoElegibilidade(models.TextChoices):
        CATEGORIAS = "categorias", "Categorias"
        BRINQUEDOS = "brinquedos", "Brinquedos"
        CATEGORIAS_E_BRINQUEDOS = (
            "categorias_e_brinquedos",
            "Categorias e brinquedos",
        )

    nome = models.CharField(max_length=200, verbose_name="Nome")
    descricao = models.TextField(verbose_name="Descricao")
    ativo = models.BooleanField(default=True, verbose_name="Ativo no catalogo")
    ordem = models.PositiveIntegerField(default=0, verbose_name="Ordem de exibicao")
    preco_base = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name="Preco base",
    )
    quantidade_minima_brinquedos = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        verbose_name="Quantidade minima de brinquedos",
    )
    quantidade_maxima_brinquedos = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        verbose_name="Quantidade maxima de brinquedos",
    )
    modo_elegibilidade = models.CharField(
        max_length=30,
        choices=ModoElegibilidade.choices,
        verbose_name="Modo de elegibilidade",
    )
    categorias_permitidas = models.ManyToManyField(
        Categoria,
        blank=True,
        related_name="configuracoes_kits_personalizaveis",
        verbose_name="Categorias permitidas",
    )
    brinquedos_permitidos = models.ManyToManyField(
        Brinquedo,
        blank=True,
        related_name="configuracoes_kits_personalizaveis",
        verbose_name="Brinquedos permitidos",
    )
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    class Meta:
        ordering = ("ordem", "nome")
        verbose_name = "Configuracao de kit personalizavel"
        verbose_name_plural = "Configuracoes de kits personalizaveis"

    def clean(self):
        super().clean()
        if (
            self.quantidade_minima_brinquedos
            and self.quantidade_maxima_brinquedos
            and self.quantidade_minima_brinquedos
            > self.quantidade_maxima_brinquedos
        ):
            raise ValidationError(
                {
                    "quantidade_minima_brinquedos": (
                        "A quantidade minima nao pode ser maior que a maxima."
                    )
                }
            )

    def __str__(self):
        return self.nome


class RegraCategoriaKitPersonalizavel(models.Model):
    configuracao = models.ForeignKey(
        ConfiguracaoKitPersonalizavel,
        related_name="regras_categoria",
        on_delete=models.CASCADE,
        verbose_name="Configuracao",
    )
    categoria = models.ForeignKey(
        Categoria,
        on_delete=models.PROTECT,
        verbose_name="Categoria",
    )
    quantidade_minima = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        verbose_name="Quantidade minima",
    )
    quantidade_maxima = models.PositiveIntegerField(
        validators=[MinValueValidator(1)],
        verbose_name="Quantidade maxima",
    )
    ordem = models.PositiveIntegerField(default=0, verbose_name="Ordem")

    class Meta:
        ordering = ("ordem", "id")
        constraints = [
            models.UniqueConstraint(
                fields=["configuracao", "categoria"],
                name="catalogo_regra_categoria_kit_personalizavel_unica",
            )
        ]
        verbose_name = "Regra por categoria do kit personalizavel"
        verbose_name_plural = "Regras por categoria dos kits personalizaveis"

    def clean(self):
        super().clean()
        if (
            self.quantidade_minima
            and self.quantidade_maxima
            and self.quantidade_minima > self.quantidade_maxima
        ):
            raise ValidationError(
                {
                    "quantidade_minima": (
                        "A quantidade minima nao pode ser maior que a maxima."
                    )
                }
            )

    def __str__(self):
        return f"{self.configuracao.nome} - {self.categoria.nome}"
