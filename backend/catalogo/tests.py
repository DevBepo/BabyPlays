from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Brinquedo


class BrinquedoAPITests(APITestCase):
    brinquedos_url = "/api/brinquedos/"

    def setUp(self):
        self.brinquedo = Brinquedo.objects.create(
            nome="Piscina de bolinhas",
            descricao="Brinquedo para festas infantis.",
            preco_aluguel="150.00",
        )
        self.usuario_comum = get_user_model().objects.create_user(
            username="cliente",
            password="senha-segura-123",
        )
        self.usuario_admin = get_user_model().objects.create_user(
            username="admin",
            password="senha-segura-123",
            is_staff=True,
        )

    def payload_valido(self):
        return {
            "nome": "Cama elastica",
            "descricao": "Cama elastica infantil.",
            "preco_aluguel": "220.00",
            "disponivel": True,
        }

    def test_usuario_anonimo_consegue_listar_brinquedos(self):
        response = self.client.get(self.brinquedos_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["nome"], self.brinquedo.nome)

    def test_usuario_anonimo_consegue_visualizar_detalhe_de_brinquedo(self):
        response = self.client.get(f"{self.brinquedos_url}{self.brinquedo.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.brinquedo.id)
        self.assertEqual(response.data["nome"], self.brinquedo.nome)

    def test_usuario_anonimo_nao_consegue_criar_brinquedo(self):
        response = self.client.post(
            self.brinquedos_url,
            self.payload_valido(),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Brinquedo.objects.count(), 1)

    def test_usuario_comum_autenticado_nao_consegue_criar_brinquedo(self):
        self.client.force_authenticate(user=self.usuario_comum)

        response = self.client.post(
            self.brinquedos_url,
            self.payload_valido(),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Brinquedo.objects.count(), 1)

    def test_usuario_admin_consegue_criar_brinquedo(self):
        self.client.force_authenticate(user=self.usuario_admin)

        response = self.client.post(
            self.brinquedos_url,
            self.payload_valido(),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Brinquedo.objects.count(), 2)
        self.assertEqual(response.data["nome"], "Cama elastica")

    def test_criacao_de_brinquedo_valida_campos_obrigatorios(self):
        self.client.force_authenticate(user=self.usuario_admin)

        response = self.client.post(self.brinquedos_url, {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("nome", response.data)
        self.assertIn("descricao", response.data)
        self.assertIn("preco_aluguel", response.data)

    def test_api_ignora_campos_somente_leitura_na_criacao(self):
        self.client.force_authenticate(user=self.usuario_admin)
        payload = self.payload_valido()
        payload["id"] = 999
        payload["data_cadastro"] = "2000-01-01T00:00:00Z"

        response = self.client.post(self.brinquedos_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        brinquedo_criado = Brinquedo.objects.get(nome="Cama elastica")
        self.assertNotEqual(brinquedo_criado.id, 999)
        self.assertNotEqual(
            brinquedo_criado.data_cadastro.isoformat(),
            "2000-01-01T00:00:00+00:00",
        )
