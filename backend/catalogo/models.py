from django.db import models

class Brinquedo(models.py):
    nome = models.CharField(max_length=200)
    descricao = models.TextField()
    preco_aluguel = models.DecimalField(max_digits=6, decimal_places=2)
    disponivel = models.BooleanField(default=True)
    data_cadastro = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.nome