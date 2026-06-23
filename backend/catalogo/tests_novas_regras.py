from decimal import Decimal

from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from clientes.models import Cliente
from .models import (
    Brinquedo,
    DedicacaoUnidadeKit,
    InteresseDisponibilidade,
    UnidadeBrinquedo,
)
from .serializers import KitFestaAdminSerializer
from .services import BrinquedoService


class EstoqueDedicadoKitTests(TestCase):
    def setUp(self):
        self.brinquedo = Brinquedo.objects.create(
            nome="Piscina",
            descricao="Piscina de bolinhas",
            preco_aluguel=Decimal("100.00"),
            preco_15_dias=Decimal("100.00"),
        )
        self.unidade_avulsa = UnidadeBrinquedo.objects.create(
            brinquedo=self.brinquedo, codigo="P-01"
        )
        self.unidade_kit = UnidadeBrinquedo.objects.create(
            brinquedo=self.brinquedo, codigo="P-02"
        )

    def test_serializer_dedica_unidade_e_remove_do_estoque_avulso(self):
        serializer = KitFestaAdminSerializer(
            data={
                "nome": "Kit festa",
                "descricao": "Kit completo",
                "preco_15_dias": "250.00",
                "ativo": True,
                "ordem": 0,
                "itens_enviados": [
                    {
                        "brinquedo_id": self.brinquedo.id,
                        "quantidade": 1,
                        "unidade_ids": [self.unidade_kit.id],
                    }
                ],
            }
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        kit = serializer.save()

        self.assertTrue(
            DedicacaoUnidadeKit.objects.filter(
                item_kit__kit=kit, unidade=self.unidade_kit
            ).exists()
        )
        self.assertEqual(BrinquedoService.quantidade_disponivel(self.brinquedo), 1)

    def test_nao_permite_unidade_de_outro_brinquedo(self):
        outro = Brinquedo.objects.create(
            nome="Escorregador",
            descricao="Escorregador",
            preco_aluguel=Decimal("80.00"),
            preco_15_dias=Decimal("80.00"),
        )
        unidade_errada = UnidadeBrinquedo.objects.create(brinquedo=outro, codigo="E-01")
        serializer = KitFestaAdminSerializer(
            data={
                "nome": "Kit invalido",
                "descricao": "Teste",
                "preco_15_dias": "200.00",
                "ativo": True,
                "itens_enviados": [
                    {
                        "brinquedo_id": self.brinquedo.id,
                        "quantidade": 1,
                        "unidade_ids": [unidade_errada.id],
                    }
                ],
            }
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("itens_enviados", serializer.errors)


class InteresseDisponibilidadeModelTests(TestCase):
    def test_interesse_pendente_e_unico_por_cliente_e_brinquedo(self):
        from django.contrib.auth import get_user_model
        from django.db import IntegrityError, transaction

        user = get_user_model().objects.create_user(username="cliente", password="teste")
        cliente = Cliente.objects.create(user=user, nome="Cliente", telefone="5511999999999")
        brinquedo = Brinquedo.objects.create(
            nome="Cama elastica",
            descricao="Cama elastica",
            preco_aluguel=Decimal("100.00"),
            preco_15_dias=Decimal("100.00"),
        )
        InteresseDisponibilidade.objects.create(cliente=cliente, brinquedo=brinquedo)
        with self.assertRaises(IntegrityError), transaction.atomic():
            InteresseDisponibilidade.objects.create(cliente=cliente, brinquedo=brinquedo)


class InteresseDisponibilidadeAPITests(APITestCase):
    def setUp(self):
        from django.contrib.auth import get_user_model

        self.user = get_user_model().objects.create_user(username="interessado", password="teste")
        self.outro_user = get_user_model().objects.create_user(username="outro", password="teste")
        self.cliente = Cliente.objects.create(user=self.user, nome="Interessado", telefone="5511999999999")
        Cliente.objects.create(user=self.outro_user, nome="Outro", telefone="5511888888888")
        self.brinquedo = Brinquedo.objects.create(
            nome="Tombo legal", descricao="Tombo legal", preco_aluguel="100.00", preco_15_dias="100.00"
        )

    def test_cliente_cria_interesse_e_outro_cliente_nao_cancela(self):
        self.client.force_authenticate(self.user)
        response = self.client.post(
            "/api/interesses-disponibilidade/", {"brinquedo": self.brinquedo.id}, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

        self.client.force_authenticate(self.outro_user)
        response = self.client.delete(
            f"/api/interesses-disponibilidade/{response.data['id']}/"
        )
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_cliente_comum_nao_acessa_fila_admin(self):
        self.client.force_authenticate(self.user)
        response = self.client.get("/api/admin/interesses-disponibilidade/")
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
