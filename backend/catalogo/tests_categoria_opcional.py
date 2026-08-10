from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Brinquedo, Categoria


class CategoriaOpcionalBrinquedoAPITests(APITestCase):
    def setUp(self):
        self.admin = get_user_model().objects.create_user(
            username="admin-categorias",
            password="senha-teste",
            is_staff=True,
        )
        self.categoria_a = Categoria.objects.create(nome="Cadeiras", slug="cadeiras")
        self.categoria_b = Categoria.objects.create(nome="Montessori", slug="montessori")
        self.client.force_authenticate(self.admin)

    def payload_brinquedo(self, **dados):
        payload = {
            "nome": "Mamaroo",
            "descricao": "Cadeira para bebes.",
            "preco_15_dias": "169.00",
            "ativo": True,
        }
        payload.update(dados)
        return payload

    def criar_brinquedo(self, categoria=None):
        return Brinquedo.objects.create(
            nome="Triangulo articulado",
            descricao="Brinquedo de escalada.",
            categoria=categoria,
            preco_aluguel="109.00",
            preco_15_dias="109.00",
        )

    def test_admin_cria_brinquedo_sem_categoria(self):
        response = self.client.post(
            "/api/brinquedos/",
            self.payload_brinquedo(),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(response.data["categoria"])
        self.assertIsNone(Brinquedo.objects.get(pk=response.data["id"]).categoria_id)

    def test_admin_adiciona_e_remove_categoria_posteriormente(self):
        brinquedo = self.criar_brinquedo()
        url = f"/api/brinquedos/{brinquedo.id}/"

        response = self.client.patch(
            url,
            {"categoria": self.categoria_a.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["categoria"]["id"], self.categoria_a.id)

        response = self.client.patch(url, {"categoria": None}, format="json")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["categoria"])

        brinquedo.refresh_from_db()
        self.assertIsNone(brinquedo.categoria_id)

    def test_admin_move_brinquedo_entre_categorias_e_alteracao_persiste(self):
        brinquedo = self.criar_brinquedo(self.categoria_a)
        url = f"/api/brinquedos/{brinquedo.id}/"

        response = self.client.patch(
            url,
            {"categoria": self.categoria_b.id},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["categoria"]["id"], self.categoria_b.id)

        brinquedo.refresh_from_db()
        self.assertEqual(brinquedo.categoria_id, self.categoria_b.id)

    def test_catalogo_e_detalhe_publicos_aceitam_brinquedo_sem_categoria(self):
        sem_categoria = self.criar_brinquedo()
        com_categoria = Brinquedo.objects.create(
            nome="Cadeira de descanso",
            descricao="Cadeira infantil.",
            categoria=self.categoria_a,
            preco_aluguel="120.00",
            preco_15_dias="120.00",
        )
        self.client.force_authenticate(user=None)

        response = self.client.get("/api/brinquedos/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        itens = {item["id"]: item for item in response.data}
        self.assertIsNone(itens[sem_categoria.id]["categoria"])
        self.assertEqual(itens[com_categoria.id]["categoria"]["id"], self.categoria_a.id)

        response = self.client.get(f"/api/brinquedos/{sem_categoria.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["categoria"])

    def test_usuario_comum_nao_pode_mover_brinquedo(self):
        usuario = get_user_model().objects.create_user(
            username="cliente-categorias",
            password="senha-teste",
        )
        brinquedo = self.criar_brinquedo()
        self.client.force_authenticate(usuario)

        response = self.client.patch(
            f"/api/brinquedos/{brinquedo.id}/",
            {"categoria": self.categoria_a.id},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        brinquedo.refresh_from_db()
        self.assertIsNone(brinquedo.categoria_id)
