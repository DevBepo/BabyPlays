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
    disponivel = models.BooleanField(default=True, verbose_name="Disponível")
    data_cadastro = models.DateTimeField(auto_now_add=True, verbose_name="Data de Cadastro")

    def __str__(self):
        return self.nome
