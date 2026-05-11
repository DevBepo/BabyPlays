from django.db import models

class Brinquedo(models.Model):
    nome = models.CharField(max_length=200, verbose_name="Nome")
    descricao = models.TextField(verbose_name="Descrição")
    preco_aluguel = models.DecimalField(
        max_digits=6, 
        decimal_places=2, 
        verbose_name="Preço do Aluguel",
        help_text="Preço do aluguel por período (ex: diária)."
    )
    ativo = models.BooleanField(
        default=True,
        verbose_name="Ativo no catálogo",
        help_text="Indica se o produto está habilitado para publicação no catálogo; não representa estoque físico disponível.",
    )
    data_cadastro = models.DateTimeField(auto_now_add=True, verbose_name="Data de Cadastro")

    def __str__(self):
        return self.nome


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
