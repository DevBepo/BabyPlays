from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import transaction
from rest_framework import status
from rest_framework.test import APIClient, APITestCase

from catalogo.models import (
    Brinquedo,
    Categoria,
    ConfiguracaoKitPersonalizavel,
    ItemKitFesta,
    KitFesta,
    RegraCategoriaKitPersonalizavel,
    UnidadeBrinquedo,
)

from .models import Carrinho, ItemCarrinho


class CarrinhoAPITests(APITestCase):
    carrinho_url = "/api/carrinho/atual/"
    itens_url = "/api/carrinho/itens/"
    limpar_url = "/api/carrinho/limpar/"

    def setUp(self):
        self.categoria = Categoria.objects.create(
            nome="Brinquedos grandes",
            slug="brinquedos-grandes",
        )
        self.brinquedo = Brinquedo.objects.create(
            nome="Cama elastica",
            descricao="Brinquedo para festas maiores.",
            categoria=self.categoria,
            preco_aluguel="220.00",
        )
        self.outro_brinquedo = Brinquedo.objects.create(
            nome="Piscina de bolinhas",
            descricao="Brinquedo para bebes.",
            categoria=self.categoria,
            preco_aluguel="150.00",
        )
        self.kit_festa = KitFesta.objects.create(
            nome="Kit Diversao",
            descricao="Kit pronto para festa.",
            preco_aluguel="350.00",
        )
        ItemKitFesta.objects.create(
            kit=self.kit_festa,
            brinquedo=self.brinquedo,
            quantidade=1,
        )
        ItemKitFesta.objects.create(
            kit=self.kit_festa,
            brinquedo=self.outro_brinquedo,
            quantidade=2,
            ordem=1,
        )
        self.configuracao = ConfiguracaoKitPersonalizavel.objects.create(
            nome="Monte seu kit",
            descricao="Escolha os brinquedos.",
            preco_base="50.00",
            quantidade_minima_brinquedos=2,
            quantidade_maxima_brinquedos=4,
            modo_elegibilidade=(
                ConfiguracaoKitPersonalizavel.ModoElegibilidade.CATEGORIAS
            ),
        )
        self.configuracao.categorias_permitidas.add(self.categoria)
        RegraCategoriaKitPersonalizavel.objects.create(
            configuracao=self.configuracao,
            categoria=self.categoria,
            quantidade_minima=2,
            quantidade_maxima=4,
        )
        self.usuario = get_user_model().objects.create_user(
            username="cliente",
            password="senha-segura-123",
        )

    def adicionar_brinquedo(self, client=None, quantidade=1, **extra):
        client = client or self.client
        payload = {
            "tipo_item": "brinquedo",
            "brinquedo_id": self.brinquedo.id,
            "quantidade": quantidade,
        }
        payload.update(extra)
        return client.post(self.itens_url, payload, format="json")

    def adicionar_kit_festa(self, client=None, quantidade=1, **extra):
        client = client or self.client
        payload = {
            "tipo_item": "kit_festa",
            "kit_festa_id": self.kit_festa.id,
            "quantidade": quantidade,
        }
        payload.update(extra)
        return client.post(self.itens_url, payload, format="json")

    def adicionar_kit_personalizado(self, client=None, itens=None, **extra):
        client = client or self.client
        payload = {
            "tipo_item": "kit_personalizado",
            "configuracao_id": self.configuracao.id,
            "itens": itens
            or [
                {"brinquedo_id": self.brinquedo.id, "quantidade": 1},
                {"brinquedo_id": self.outro_brinquedo.id, "quantidade": 1},
            ],
        }
        payload.update(extra)
        return client.post(self.itens_url, payload, format="json")

    def test_carrinho_anonimo_e_criado_e_recuperado_por_sessao(self):
        primeira_response = self.client.get(self.carrinho_url)
        segunda_response = self.client.get(self.carrinho_url)

        self.assertEqual(primeira_response.status_code, status.HTTP_200_OK)
        self.assertEqual(segunda_response.status_code, status.HTTP_200_OK)
        self.assertEqual(primeira_response.data["id"], segunda_response.data["id"])
        self.assertEqual(Carrinho.objects.count(), 1)
        carrinho = Carrinho.objects.get()
        self.assertIsNotNone(carrinho.session_key)
        self.assertIsNone(carrinho.usuario)

    def test_usuario_nao_acessa_item_de_carrinho_de_outra_sessao(self):
        response = self.adicionar_brinquedo()
        item_id = response.data["id"]
        outro_cliente = APIClient()

        response = outro_cliente.patch(
            f"{self.itens_url}{item_id}/",
            {"quantidade": 3},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(ItemCarrinho.objects.get(id=item_id).quantidade, 1)

    def test_usuario_autenticado_usa_o_proprio_carrinho(self):
        self.client.force_authenticate(user=self.usuario)

        primeira_response = self.client.get(self.carrinho_url)
        segunda_response = self.adicionar_brinquedo()

        self.assertEqual(primeira_response.status_code, status.HTTP_200_OK)
        self.assertEqual(segunda_response.status_code, status.HTTP_201_CREATED)
        carrinho = Carrinho.objects.get(id=primeira_response.data["id"])
        self.assertEqual(carrinho.usuario, self.usuario)
        self.assertEqual(carrinho.itens.count(), 1)

    def test_brinquedo_inativo_nao_pode_ser_adicionado(self):
        self.brinquedo.ativo = False
        self.brinquedo.save(update_fields=["ativo"])

        response = self.adicionar_brinquedo()

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(ItemCarrinho.objects.count(), 0)

    def test_kit_festa_inativo_nao_pode_ser_adicionado(self):
        self.kit_festa.ativo = False
        self.kit_festa.save(update_fields=["ativo"])

        response = self.adicionar_kit_festa()

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(ItemCarrinho.objects.count(), 0)

    def test_kit_personalizado_invalido_nao_pode_ser_adicionado(self):
        response = self.adicionar_kit_personalizado(
            itens=[{"brinquedo_id": self.brinquedo.id, "quantidade": 1}]
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(ItemCarrinho.objects.count(), 0)

    def test_kit_personalizado_valido_reutiliza_validacao_backend_existente(self):
        response = self.adicionar_kit_personalizado(
            itens=[
                {"brinquedo_id": self.brinquedo.id, "quantidade": 1},
                {"brinquedo_id": self.brinquedo.id, "quantidade": 1},
            ]
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("itens", response.data)

        response = self.adicionar_kit_personalizado()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["nome_snapshot"], "Monte seu kit")
        self.assertEqual(response.data["preco_unitario_snapshot"], "420.00")
        self.assertEqual(response.data["subtotal_snapshot"], "420.00")

    def test_preco_enviado_pelo_frontend_e_ignorado(self):
        response = self.adicionar_brinquedo(
            preco_unitario_snapshot="0.01",
            subtotal_snapshot="0.01",
            snapshot={"nome": "Preco falso"},
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["preco_unitario_snapshot"], "220.00")
        self.assertEqual(response.data["subtotal_snapshot"], "220.00")
        self.assertEqual(response.data["snapshot"]["brinquedo"]["nome"], "Cama elastica")

    def test_subtotal_e_calculado_pelo_backend(self):
        self.adicionar_brinquedo(quantidade=2)
        self.adicionar_kit_festa(quantidade=1)

        response = self.client.get(self.carrinho_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["subtotal"], "790.00")
        self.assertEqual(response.data["total_parcial"], "790.00")

    def test_alterar_quantidade_recalcula_subtotal(self):
        response = self.adicionar_brinquedo(quantidade=1)
        item_id = response.data["id"]

        response = self.client.patch(
            f"{self.itens_url}{item_id}/",
            {"quantidade": 3},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["subtotal_snapshot"], "660.00")
        response = self.client.get(self.carrinho_url)
        self.assertEqual(response.data["subtotal"], "660.00")

    def test_remover_item_recalcula_subtotal(self):
        primeiro = self.adicionar_brinquedo(quantidade=1)
        self.adicionar_kit_festa(quantidade=1)

        response = self.client.delete(f"{self.itens_url}{primeiro.data['id']}/")

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        response = self.client.get(self.carrinho_url)
        self.assertEqual(response.data["subtotal"], "350.00")

    def test_limpar_carrinho_remove_itens(self):
        self.adicionar_brinquedo()
        self.adicionar_kit_festa()

        response = self.client.delete(self.limpar_url)

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertEqual(ItemCarrinho.objects.count(), 0)
        response = self.client.get(self.carrinho_url)
        self.assertEqual(response.data["subtotal"], "0.00")

    def test_snapshot_e_salvo_para_brinquedo(self):
        response = self.adicionar_brinquedo(quantidade=2)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        item = ItemCarrinho.objects.get(id=response.data["id"])
        self.assertEqual(item.snapshot["tipo_item"], "brinquedo")
        self.assertEqual(item.snapshot["brinquedo"]["id"], self.brinquedo.id)
        self.assertEqual(item.snapshot["quantidade"], 2)

    def test_snapshot_e_salvo_para_kit_festa(self):
        response = self.adicionar_kit_festa()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        item = ItemCarrinho.objects.get(id=response.data["id"])
        self.assertEqual(item.snapshot["tipo_item"], "kit_festa")
        self.assertEqual(item.snapshot["kit_festa"]["id"], self.kit_festa.id)
        self.assertEqual(len(item.snapshot["kit_festa"]["itens"]), 2)

    def test_snapshot_e_salvo_para_kit_personalizado(self):
        response = self.adicionar_kit_personalizado()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        item = ItemCarrinho.objects.get(id=response.data["id"])
        self.assertEqual(item.snapshot["tipo_item"], "kit_personalizado")
        self.assertEqual(item.snapshot["configuracao"]["id"], self.configuracao.id)
        self.assertEqual(item.snapshot["configuracao"]["preco_estimado"], "420.00")
        self.assertEqual(len(item.snapshot["itens"]), 2)

    def test_adicionar_item_ao_carrinho_nao_reserva_estoque(self):
        unidade = UnidadeBrinquedo.objects.create(
            brinquedo=self.brinquedo,
            codigo="CAMA-001",
            status=UnidadeBrinquedo.Status.DISPONIVEL,
        )

        response = self.adicionar_brinquedo()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        unidade.refresh_from_db()
        self.assertEqual(unidade.status, UnidadeBrinquedo.Status.DISPONIVEL)


class ItemCarrinhoModelTests(APITestCase):
    def test_item_carrinho_rejeita_combinacao_invalida_de_fks(self):
        carrinho = Carrinho.objects.create(session_key="sessao-teste")
        brinquedo = Brinquedo.objects.create(
            nome="Cama elastica",
            descricao="Brinquedo para festas maiores.",
            preco_aluguel="220.00",
        )
        kit_festa = KitFesta.objects.create(
            nome="Kit Diversao",
            descricao="Kit pronto.",
            preco_aluguel="350.00",
        )
        item = ItemCarrinho(
            carrinho=carrinho,
            tipo_item=ItemCarrinho.TipoItem.BRINQUEDO,
            brinquedo=brinquedo,
            kit_festa=kit_festa,
            quantidade=1,
            nome_snapshot="Cama elastica",
            preco_unitario_snapshot="220.00",
            subtotal_snapshot="220.00",
            snapshot={},
        )

        with self.assertRaises(ValidationError):
            item.full_clean()
