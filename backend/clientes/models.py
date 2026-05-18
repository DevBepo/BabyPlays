from django.conf import settings
from django.db import models


class Cliente(models.Model):
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        related_name="cliente",
        on_delete=models.CASCADE,
        verbose_name="Usuario",
    )
    nome = models.CharField(max_length=200, verbose_name="Nome")
    telefone = models.CharField(max_length=30, verbose_name="Telefone")
    ativo = models.BooleanField(default=True, verbose_name="Ativo")
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")

    class Meta:
        ordering = ("nome", "id")
        verbose_name = "Cliente"
        verbose_name_plural = "Clientes"

    def __str__(self):
        return self.nome
