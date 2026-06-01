from io import StringIO

from django.core.management import call_command
from django.test import TestCase

from catalogo.models import Categoria
from pedidos.models import Contrato


class SeedBabyplaysBasicoCommandTests(TestCase):
    def chamar_comando(self):
        stdout = StringIO()
        call_command("seed_babyplays_basico", stdout=stdout)
        return stdout.getvalue()

    def test_cria_categorias_basicas_sem_duplicar(self):
        primeira_saida = self.chamar_comando()
        segunda_saida = self.chamar_comando()

        self.assertEqual(Categoria.objects.count(), 6)
        self.assertIn("Categorias criadas: 6", primeira_saida)
        self.assertIn("Categorias ja existentes: 6", segunda_saida)

    def test_cria_contrato_homologacao_apenas_sem_contrato_ativo(self):
        saida = self.chamar_comando()

        contrato = Contrato.objects.get(ativo=True)
        self.assertEqual(contrato.versao, "homologacao-inicial-v1")
        self.assertIn("Contrato: criado", saida)

    def test_nao_sobrescreve_contrato_ativo_existente(self):
        Contrato.objects.create(
            titulo="Contrato oficial",
            versao="oficial-v1",
            texto="Texto oficial.",
            ativo=True,
        )

        saida = self.chamar_comando()

        self.assertEqual(Contrato.objects.filter(ativo=True).count(), 1)
        self.assertFalse(
            Contrato.objects.filter(versao="homologacao-inicial-v1").exists()
        )
        self.assertIn("ja existe contrato ativo", saida)
