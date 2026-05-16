from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch
from rest_framework import status
from rest_framework.test import APIClient, APITestCase
from rest_framework.serializers import ValidationError as DRFValidationError

from catalogo.models import (
    Brinquedo,
    Categoria,
    ConfiguracaoKitPersonalizavel,
    ItemKitFesta,
    KitFesta,
    RegraCategoriaKitPersonalizavel,
    UnidadeBrinquedo,
)
from entregas.providers import RotaProviderError

from .models import (
    AceiteContrato,
    Carrinho,
    Contrato,
    ItemCarrinho,
    ItemPedido,
    Pedido,
    ReservaUnidade,
)
from .services import PedidoService


class FakeTaxaEntregaRetiradaService:
    def __init__(self, erro=None):
        self.erro = erro

    def calcular(self, cep, numero, complemento=""):
        if self.erro:
            raise self.erro
        return {
            "nome": "Taxa de entrega e retirada",
            "endereco_interpretado": {
                "cep": cep,
                "logradouro": "Praca da Se",
                "numero": numero,
                "complemento": complemento,
                "bairro": "Se",
                "cidade": "Sao Paulo",
                "uf": "SP",
            },
            "distancia_ida_km": Decimal("8.00"),
            "distancia_total_km": Decimal("16.00"),
            "valor_por_km": Decimal("3.00"),
            "taxa": Decimal("48.00"),
        }


class CarrinhoAPITests(APITestCase):
    carrinho_url = "/api/carrinho/atual/"
    itens_url = "/api/carrinho/itens/"
    limpar_url = "/api/carrinho/limpar/"
    converter_pedido_url = "/api/pedidos/converter-carrinho/"
    pedidos_url = "/api/pedidos/"
    contrato_vigente_url = "/api/contrato/vigente/"

    def setUp(self):
        self.categoria = Categoria.objects.create(
            nome="Brinquedos grandes",
            slug="brinquedos-grandes",
        )
        self.brinquedo = Brinquedo.objects.create(
            nome="Cama elastica",
            descricao="Brinquedo para festas maiores.",
            categoria=self.categoria,
            preco_aluguel=Decimal("220.00"),
        )
        self.outro_brinquedo = Brinquedo.objects.create(
            nome="Piscina de bolinhas",
            descricao="Brinquedo para bebes.",
            categoria=self.categoria,
            preco_aluguel=Decimal("150.00"),
        )
        self.kit_festa = KitFesta.objects.create(
            nome="Kit Diversao",
            descricao="Kit pronto para festa.",
            preco_aluguel=Decimal("350.00"),
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
        self.outro_usuario = get_user_model().objects.create_user(
            username="outro-cliente",
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

    def payload_pedido(self, **extra):
        data_evento = timezone.localdate() + timedelta(days=30)
        payload = {
            "nome": "Cliente Teste",
            "telefone": "11999999999",
            "email": "cliente@email.com",
            "data_evento_pretendida": str(data_evento),
            "data_inicio_locacao": str(data_evento),
            "data_fim_locacao": str(data_evento + timedelta(days=2)),
            "cep": "01001-000",
            "numero": "123",
            "observacoes": "Preferencia por atendimento no periodo da tarde",
        }
        payload.update(extra)
        return payload

    def converter_carrinho_em_pedido(self, client=None, **extra):
        client = client or self.client
        with patch(
            "pedidos.services.TaxaEntregaRetiradaService",
            return_value=FakeTaxaEntregaRetiradaService(),
        ):
            return client.post(
                self.converter_pedido_url,
                self.payload_pedido(**extra),
                format="json",
            )

    def criar_contrato(self, **extra):
        dados = {
            "titulo": "Contrato de locacao",
            "versao": "2026-05",
            "texto": "Texto vigente do contrato.",
            "ativo": True,
        }
        dados.update(extra)
        contrato = Contrato(**dados)
        contrato.full_clean()
        contrato.save()
        return contrato

    def aceitar_contrato(self, pedido_id, contrato=None, client=None, **extra):
        client = client or self.client
        contrato = contrato or Contrato.objects.get(ativo=True)
        payload = {
            "aceito": True,
            "contrato_id": contrato.id,
            "contrato_versao": contrato.versao,
        }
        payload.update(extra)
        return client.post(
            f"{self.pedidos_url}{pedido_id}/aceitar-contrato/",
            payload,
            format="json",
            REMOTE_ADDR="203.0.113.10",
            HTTP_USER_AGENT="Teste Browser",
        )

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

    def test_converte_carrinho_com_brinquedo_em_pedido(self):
        self.adicionar_brinquedo(quantidade=2)

        response = self.converter_carrinho_em_pedido()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Pedido.objects.count(), 1)
        pedido = Pedido.objects.get()
        self.assertEqual(pedido.status, Pedido.Status.AGUARDANDO_ANALISE)
        self.assertEqual(pedido.nome_cliente_snapshot, "Cliente Teste")
        self.assertEqual(
            pedido.data_inicio_locacao,
            timezone.localdate() + timedelta(days=30),
        )
        self.assertEqual(
            pedido.data_fim_locacao,
            timezone.localdate() + timedelta(days=32),
        )
        self.assertEqual(
            response.data["data_inicio_locacao"],
            str(timezone.localdate() + timedelta(days=30)),
        )
        self.assertEqual(
            response.data["data_fim_locacao"],
            str(timezone.localdate() + timedelta(days=32)),
        )
        self.assertEqual(pedido.itens.count(), 1)
        item = pedido.itens.get()
        self.assertEqual(item.tipo_item, ItemCarrinho.TipoItem.BRINQUEDO)
        self.assertEqual(item.brinquedo, self.brinquedo)
        self.assertEqual(item.snapshot["brinquedo"]["nome"], "Cama elastica")
        self.assertNotIn("snapshot", response.data["itens"][0])
        self.assertEqual(response.data["itens"][0]["nome_snapshot"], "Cama elastica")

    def test_resposta_da_conversao_nao_expoe_snapshot_do_item_pedido(self):
        self.adicionar_brinquedo()

        response = self.converter_carrinho_em_pedido()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        item_response = response.data["itens"][0]
        self.assertNotIn("snapshot", item_response)
        self.assertEqual(item_response["nome_snapshot"], "Cama elastica")
        self.assertEqual(item_response["preco_unitario_snapshot"], "220.00")
        self.assertEqual(item_response["subtotal_snapshot"], "220.00")

    def test_snapshot_do_item_pedido_continua_salvo_no_banco_apos_conversao(self):
        self.adicionar_brinquedo(quantidade=2)

        response = self.converter_carrinho_em_pedido()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        item = ItemPedido.objects.get()
        self.assertEqual(item.snapshot["tipo_item"], "brinquedo")
        self.assertEqual(item.snapshot["brinquedo"]["nome"], "Cama elastica")
        self.assertEqual(item.snapshot["quantidade"], 2)

    def test_converte_carrinho_com_kit_festa_preservando_snapshot(self):
        self.adicionar_kit_festa()

        response = self.converter_carrinho_em_pedido()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        item = ItemPedido.objects.get()
        self.assertEqual(item.tipo_item, ItemCarrinho.TipoItem.KIT_FESTA)
        self.assertEqual(item.snapshot["kit_festa"]["nome"], "Kit Diversao")
        self.assertEqual(len(item.snapshot["kit_festa"]["itens"]), 2)

    def test_converte_carrinho_com_kit_personalizado_preservando_snapshot(self):
        self.adicionar_kit_personalizado()

        response = self.converter_carrinho_em_pedido()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        item = ItemPedido.objects.get()
        self.assertEqual(item.tipo_item, ItemCarrinho.TipoItem.KIT_PERSONALIZADO)
        self.assertEqual(item.snapshot["configuracao"]["nome"], "Monte seu kit")
        self.assertEqual(item.snapshot["configuracao"]["preco_estimado"], "420.00")
        self.assertEqual(len(item.snapshot["itens"]), 2)

    def test_pedido_salva_subtotal_do_backend(self):
        self.adicionar_brinquedo(quantidade=2)
        self.adicionar_kit_festa()

        response = self.converter_carrinho_em_pedido(subtotal_itens_snapshot="0.01")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        pedido = Pedido.objects.get()
        self.assertEqual(str(pedido.subtotal_itens_snapshot), "790.00")
        self.assertEqual(response.data["subtotal_itens_snapshot"], "790.00")

    def test_conversao_com_taxa_valida_cria_pedido(self):
        self.adicionar_brinquedo()

        response = self.converter_carrinho_em_pedido()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Pedido.objects.count(), 1)
        self.assertEqual(response.data["taxa_entrega_retirada_snapshot"], "48.00")

    def test_pedido_salva_endereco_interpretado_em_snapshot(self):
        self.adicionar_brinquedo()

        response = self.converter_carrinho_em_pedido(complemento="Apto 45")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        pedido = Pedido.objects.get()
        self.assertEqual(
            pedido.endereco_entrega_snapshot,
            {
                "cep": "01001000",
                "logradouro": "Praca da Se",
                "numero": "123",
                "complemento": "Apto 45",
                "bairro": "Se",
                "cidade": "Sao Paulo",
                "uf": "SP",
            },
        )
        self.assertEqual(
            response.data["endereco_entrega_snapshot"],
            pedido.endereco_entrega_snapshot,
        )

    def test_pedido_salva_distancia_ida_km_snapshot(self):
        self.adicionar_brinquedo()

        response = self.converter_carrinho_em_pedido()

        pedido = Pedido.objects.get()
        self.assertEqual(pedido.distancia_ida_km_snapshot, Decimal("8.00"))
        self.assertEqual(response.data["distancia_ida_km_snapshot"], "8.00")

    def test_pedido_salva_distancia_total_km_snapshot(self):
        self.adicionar_brinquedo()

        response = self.converter_carrinho_em_pedido()

        pedido = Pedido.objects.get()
        self.assertEqual(pedido.distancia_total_km_snapshot, Decimal("16.00"))
        self.assertEqual(response.data["distancia_total_km_snapshot"], "16.00")

    def test_pedido_salva_valor_por_km_snapshot(self):
        self.adicionar_brinquedo()

        response = self.converter_carrinho_em_pedido()

        pedido = Pedido.objects.get()
        self.assertEqual(pedido.valor_por_km_snapshot, Decimal("3.00"))
        self.assertEqual(response.data["valor_por_km_snapshot"], "3.00")

    def test_pedido_salva_taxa_entrega_retirada_snapshot(self):
        self.adicionar_brinquedo()

        response = self.converter_carrinho_em_pedido()

        pedido = Pedido.objects.get()
        self.assertEqual(pedido.taxa_entrega_retirada_snapshot, Decimal("48.00"))
        self.assertEqual(response.data["taxa_entrega_retirada_snapshot"], "48.00")

    def test_pedido_salva_total_estimado_snapshot_corretamente(self):
        self.adicionar_brinquedo(quantidade=2)

        response = self.converter_carrinho_em_pedido()

        pedido = Pedido.objects.get()
        self.assertEqual(pedido.subtotal_itens_snapshot, Decimal("440.00"))
        self.assertEqual(pedido.total_estimado_snapshot, Decimal("488.00"))
        self.assertEqual(response.data["total_estimado_snapshot"], "488.00")

    def test_frontend_nao_consegue_forjar_taxa_distancia_valor_por_km_ou_total(self):
        self.adicionar_brinquedo()

        response = self.converter_carrinho_em_pedido(
            taxa_entrega_retirada_snapshot="0.01",
            distancia_ida_km_snapshot="1.00",
            distancia_total_km_snapshot="2.00",
            valor_por_km_snapshot="0.01",
            total_estimado_snapshot="0.02",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Pedido.objects.count(), 0)
        self.assertIn("detail", response.data)

    def test_falha_no_calculo_da_taxa_impede_criacao_do_pedido(self):
        self.adicionar_brinquedo()

        with patch(
            "pedidos.services.TaxaEntregaRetiradaService",
            return_value=FakeTaxaEntregaRetiradaService(erro=RotaProviderError()),
        ):
            response = self.client.post(
                self.converter_pedido_url,
                self.payload_pedido(),
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Pedido.objects.count(), 0)
        self.assertIn("taxa_entrega", response.data)

    def test_falha_no_calculo_da_taxa_nao_converte_o_carrinho(self):
        self.adicionar_brinquedo()
        carrinho = Carrinho.objects.get()

        with patch(
            "pedidos.services.TaxaEntregaRetiradaService",
            return_value=FakeTaxaEntregaRetiradaService(erro=RotaProviderError()),
        ):
            response = self.client.post(
                self.converter_pedido_url,
                self.payload_pedido(),
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        carrinho.refresh_from_db()
        self.assertEqual(carrinho.status, Carrinho.Status.ATIVO)

    def test_conversao_exige_cep(self):
        self.adicionar_brinquedo()
        payload = self.payload_pedido()
        payload.pop("cep")

        response = self.client.post(self.converter_pedido_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cep", response.data)

    def test_conversao_exige_numero(self):
        self.adicionar_brinquedo()
        payload = self.payload_pedido()
        payload.pop("numero")

        response = self.client.post(self.converter_pedido_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("numero", response.data)

    def test_complemento_e_opcional_na_conversao(self):
        self.adicionar_brinquedo()
        payload = self.payload_pedido()
        payload.pop("complemento", None)

        with patch(
            "pedidos.services.TaxaEntregaRetiradaService",
            return_value=FakeTaxaEntregaRetiradaService(),
        ):
            response = self.client.post(
                self.converter_pedido_url,
                payload,
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            Pedido.objects.get().endereco_entrega_snapshot["complemento"],
            "",
        )

    def test_carrinho_vazio_nao_converte(self):
        response = self.converter_carrinho_em_pedido()

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Pedido.objects.count(), 0)
        self.assertIn("carrinho", response.data)

    def test_carrinho_convertido_nao_converte_novamente(self):
        self.adicionar_brinquedo()
        carrinho = Carrinho.objects.get()
        self.converter_carrinho_em_pedido()
        carrinho.refresh_from_db()

        with self.assertRaises(DRFValidationError):
            PedidoService.converter_carrinho(carrinho, self.payload_pedido())

        self.assertEqual(Pedido.objects.count(), 1)

    def test_conversao_marca_carrinho_como_convertido(self):
        self.adicionar_brinquedo()
        carrinho = Carrinho.objects.get()

        response = self.converter_carrinho_em_pedido()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        carrinho.refresh_from_db()
        self.assertEqual(carrinho.status, Carrinho.Status.CONVERTIDO)

    def test_conversao_exige_nome(self):
        self.adicionar_brinquedo()
        payload = self.payload_pedido()
        payload.pop("nome")

        response = self.client.post(self.converter_pedido_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("nome", response.data)

    def test_conversao_exige_telefone(self):
        self.adicionar_brinquedo()
        payload = self.payload_pedido()
        payload.pop("telefone")

        response = self.client.post(self.converter_pedido_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("telefone", response.data)

    def test_conversao_exige_email(self):
        self.adicionar_brinquedo()
        payload = self.payload_pedido()
        payload.pop("email")

        response = self.client.post(self.converter_pedido_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_conversao_exige_data_evento_pretendida(self):
        self.adicionar_brinquedo()
        payload = self.payload_pedido()
        payload.pop("data_evento_pretendida")

        response = self.client.post(self.converter_pedido_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("data_evento_pretendida", response.data)

    def test_data_evento_no_passado_e_rejeitada(self):
        self.adicionar_brinquedo()
        data_passada = str(timezone.localdate() - timedelta(days=1))

        response = self.converter_carrinho_em_pedido(
            data_evento_pretendida=data_passada,
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("data_evento_pretendida", response.data)
        self.assertEqual(Pedido.objects.count(), 0)

    def test_conversao_valida_salva_data_inicio_locacao(self):
        self.adicionar_brinquedo()
        data_inicio = timezone.localdate() + timedelta(days=31)

        response = self.converter_carrinho_em_pedido(
            data_inicio_locacao=str(data_inicio),
            data_fim_locacao=str(data_inicio + timedelta(days=2)),
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Pedido.objects.get().data_inicio_locacao, data_inicio)
        self.assertEqual(response.data["data_inicio_locacao"], str(data_inicio))

    def test_conversao_valida_salva_data_fim_locacao(self):
        self.adicionar_brinquedo()
        data_inicio = timezone.localdate() + timedelta(days=31)
        data_fim = data_inicio + timedelta(days=3)

        response = self.converter_carrinho_em_pedido(
            data_inicio_locacao=str(data_inicio),
            data_fim_locacao=str(data_fim),
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Pedido.objects.get().data_fim_locacao, data_fim)
        self.assertEqual(response.data["data_fim_locacao"], str(data_fim))

    def test_conversao_exige_data_inicio_locacao(self):
        self.adicionar_brinquedo()
        payload = self.payload_pedido()
        payload.pop("data_inicio_locacao")

        response = self.client.post(self.converter_pedido_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("data_inicio_locacao", response.data)

    def test_conversao_exige_data_fim_locacao(self):
        self.adicionar_brinquedo()
        payload = self.payload_pedido()
        payload.pop("data_fim_locacao")

        response = self.client.post(self.converter_pedido_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("data_fim_locacao", response.data)

    def test_conversao_rejeita_periodo_locacao_invalido(self):
        self.adicionar_brinquedo()
        data_inicio = timezone.localdate() + timedelta(days=30)

        response = self.converter_carrinho_em_pedido(
            data_inicio_locacao=str(data_inicio),
            data_fim_locacao=str(data_inicio),
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("data_fim_locacao", response.data)

    def test_erro_de_periodo_invalido_nao_cria_pedido(self):
        self.adicionar_brinquedo()
        data_inicio = timezone.localdate() + timedelta(days=30)

        response = self.converter_carrinho_em_pedido(
            data_inicio_locacao=str(data_inicio),
            data_fim_locacao=str(data_inicio),
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(Pedido.objects.count(), 0)

    def test_erro_de_periodo_invalido_nao_converte_carrinho(self):
        self.adicionar_brinquedo()
        carrinho = Carrinho.objects.get()
        data_inicio = timezone.localdate() + timedelta(days=30)

        response = self.converter_carrinho_em_pedido(
            data_inicio_locacao=str(data_inicio),
            data_fim_locacao=str(data_inicio),
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        carrinho.refresh_from_db()
        self.assertEqual(carrinho.status, Carrinho.Status.ATIVO)

    def test_criacao_de_pedido_nao_reserva_unidade_fisica(self):
        unidade = UnidadeBrinquedo.objects.create(
            brinquedo=self.brinquedo,
            codigo="CAMA-002",
            status=UnidadeBrinquedo.Status.DISPONIVEL,
        )
        self.adicionar_brinquedo()

        response = self.converter_carrinho_em_pedido()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        unidade.refresh_from_db()
        self.assertEqual(unidade.status, UnidadeBrinquedo.Status.DISPONIVEL)

    def test_criacao_de_pedido_nao_exige_contrato(self):
        self.adicionar_brinquedo()

        response = self.converter_carrinho_em_pedido()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertNotIn("contrato", response.data)

    def test_pedido_nasce_com_status_aguardando_analise(self):
        self.adicionar_brinquedo()

        response = self.converter_carrinho_em_pedido()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data["status"], Pedido.Status.AGUARDANDO_ANALISE)
        self.assertEqual(Pedido.objects.get().status, Pedido.Status.AGUARDANDO_ANALISE)

    def test_status_reservado_existe_mas_nao_e_usado_automaticamente(self):
        self.adicionar_brinquedo()

        response = self.converter_carrinho_em_pedido()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Pedido.Status.RESERVADO, "reservado")
        self.assertEqual(Pedido.objects.get().status, Pedido.Status.AGUARDANDO_ANALISE)

    def test_usuario_autenticado_lista_apenas_os_proprios_pedidos(self):
        self.client.force_authenticate(user=self.usuario)
        self.adicionar_brinquedo()
        response = self.converter_carrinho_em_pedido()
        pedido_id = response.data["id"]

        outro_cliente = APIClient()
        outro_cliente.force_authenticate(user=self.outro_usuario)

        detalhe_response = outro_cliente.get(f"{self.pedidos_url}{pedido_id}/")
        lista_response = outro_cliente.get(self.pedidos_url)

        self.assertEqual(detalhe_response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(lista_response.status_code, status.HTTP_200_OK)
        self.assertEqual(lista_response.data, [])

    def test_leitura_de_pedido_nao_expoe_snapshot_do_item_pedido(self):
        self.client.force_authenticate(user=self.usuario)
        self.adicionar_brinquedo()
        pedido_id = self.converter_carrinho_em_pedido().data["id"]

        lista_response = self.client.get(self.pedidos_url)
        detalhe_response = self.client.get(f"{self.pedidos_url}{pedido_id}/")

        self.assertEqual(lista_response.status_code, status.HTTP_200_OK)
        self.assertEqual(detalhe_response.status_code, status.HTTP_200_OK)
        self.assertNotIn("snapshot", lista_response.data[0]["itens"][0])
        self.assertNotIn("snapshot", detalhe_response.data["itens"][0])

    def test_usuario_anonimo_nao_acessa_lista_de_pedidos(self):
        response = self.client.get(self.pedidos_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_get_contrato_vigente_retorna_apenas_contrato_ativo(self):
        Contrato.objects.create(
            titulo="Contrato antigo",
            versao="2026-04",
            texto="Texto antigo.",
            ativo=False,
        )
        contrato = self.criar_contrato()

        response = self.client.get(self.contrato_vigente_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], contrato.id)
        self.assertEqual(response.data["versao"], "2026-05")
        self.assertEqual(response.data["titulo"], "Contrato de locacao")
        self.assertEqual(response.data["texto"], "Texto vigente do contrato.")

    def test_get_contrato_vigente_sem_contrato_ativo_retorna_erro_seguro(self):
        response = self.client.get(self.contrato_vigente_url)

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(response.data["detail"], "Contrato vigente indisponivel.")

    def test_nao_permite_mais_de_um_contrato_ativo(self):
        self.criar_contrato()
        outro = Contrato(
            titulo="Contrato novo",
            versao="2026-06",
            texto="Novo texto.",
            ativo=True,
        )

        with self.assertRaises(ValidationError):
            outro.full_clean()

    def test_cliente_autenticado_acessa_contrato_do_proprio_pedido(self):
        contrato = self.criar_contrato()
        self.client.force_authenticate(user=self.usuario)
        self.adicionar_brinquedo()
        pedido_id = self.converter_carrinho_em_pedido().data["id"]

        response = self.client.get(f"{self.pedidos_url}{pedido_id}/contrato/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], contrato.id)

    def test_cliente_autenticado_nao_acessa_contrato_de_pedido_de_outro_usuario(self):
        self.criar_contrato()
        self.client.force_authenticate(user=self.usuario)
        self.adicionar_brinquedo()
        pedido_id = self.converter_carrinho_em_pedido().data["id"]
        outro_cliente = APIClient()
        outro_cliente.force_authenticate(user=self.outro_usuario)

        response = outro_cliente.get(f"{self.pedidos_url}{pedido_id}/contrato/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_anonimo_acessa_contrato_do_proprio_pedido_pela_mesma_sessao(self):
        contrato = self.criar_contrato()
        self.adicionar_brinquedo()
        pedido_id = self.converter_carrinho_em_pedido().data["id"]

        response = self.client.get(f"{self.pedidos_url}{pedido_id}/contrato/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], contrato.id)

    def test_anonimo_nao_acessa_contrato_de_pedido_de_outra_sessao(self):
        self.criar_contrato()
        self.adicionar_brinquedo()
        pedido_id = self.converter_carrinho_em_pedido().data["id"]
        outro_cliente = APIClient()

        response = outro_cliente.get(f"{self.pedidos_url}{pedido_id}/contrato/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_aceite_cria_registro_para_pedido_correto(self):
        contrato = self.criar_contrato()
        self.adicionar_brinquedo()
        pedido_id = self.converter_carrinho_em_pedido().data["id"]

        response = self.aceitar_contrato(pedido_id, contrato=contrato)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        aceite = AceiteContrato.objects.get()
        self.assertEqual(aceite.pedido_id, pedido_id)
        self.assertEqual(aceite.contrato, contrato)
        self.assertEqual(response.data["pedido"], pedido_id)
        self.assertEqual(response.data["contrato"], contrato.id)

    def test_aceite_salva_snapshots_e_auditoria(self):
        contrato = self.criar_contrato()
        self.adicionar_brinquedo()
        pedido_id = self.converter_carrinho_em_pedido().data["id"]

        response = self.aceitar_contrato(pedido_id, contrato=contrato)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        aceite = AceiteContrato.objects.get()
        self.assertEqual(aceite.contrato_versao_snapshot, contrato.versao)
        self.assertEqual(aceite.contrato_texto_snapshot, contrato.texto)
        self.assertEqual(aceite.nome_cliente_snapshot, "Cliente Teste")
        self.assertEqual(aceite.email_cliente_snapshot, "cliente@email.com")
        self.assertIsNotNone(aceite.aceito_em)
        self.assertEqual(aceite.ip, "203.0.113.10")
        self.assertEqual(aceite.user_agent, "Teste Browser")
        self.assertEqual(response.data["versao_aceita"], contrato.versao)
        self.assertNotIn("contrato_texto_snapshot", response.data)
        self.assertNotIn("ip", response.data)

    def test_frontend_nao_consegue_forjar_dados_de_auditoria_do_aceite(self):
        contrato = self.criar_contrato()
        self.adicionar_brinquedo()
        pedido_id = self.converter_carrinho_em_pedido().data["id"]

        response = self.aceitar_contrato(
            pedido_id,
            contrato=contrato,
            contrato_texto_snapshot="Texto forjado",
            aceito_em="2020-01-01T00:00:00Z",
            ip="198.51.100.1",
            user_agent="Forjado",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(AceiteContrato.objects.count(), 0)
        self.assertIn("detail", response.data)

    def test_divergencia_de_contrato_id_ou_versao_e_rejeitada(self):
        contrato = self.criar_contrato()
        contrato_antigo = Contrato.objects.create(
            titulo="Contrato antigo",
            versao="2026-04",
            texto="Texto antigo.",
            ativo=False,
        )
        self.adicionar_brinquedo()
        pedido_id = self.converter_carrinho_em_pedido().data["id"]

        response_id = self.aceitar_contrato(
            pedido_id,
            contrato=contrato,
            contrato_id=contrato_antigo.id,
        )
        response_versao = self.aceitar_contrato(
            pedido_id,
            contrato=contrato,
            contrato_versao="2026-04",
        )

        self.assertEqual(response_id.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response_versao.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(AceiteContrato.objects.count(), 0)

    def test_segundo_aceite_no_mesmo_pedido_e_bloqueado(self):
        contrato = self.criar_contrato()
        self.adicionar_brinquedo()
        pedido_id = self.converter_carrinho_em_pedido().data["id"]
        primeiro = self.aceitar_contrato(pedido_id, contrato=contrato)

        segundo = self.aceitar_contrato(pedido_id, contrato=contrato)

        self.assertEqual(primeiro.status_code, status.HTTP_201_CREATED)
        self.assertEqual(segundo.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(AceiteContrato.objects.count(), 1)
        self.assertEqual(
            segundo.data["detail"],
            "Contrato ja aceito para este pedido.",
        )

    def test_contrato_alterado_depois_nao_altera_snapshot_do_aceite(self):
        contrato = self.criar_contrato()
        self.adicionar_brinquedo()
        pedido_id = self.converter_carrinho_em_pedido().data["id"]
        self.aceitar_contrato(pedido_id, contrato=contrato)

        contrato.titulo = "Titulo atualizado"
        contrato.ativo = False
        contrato.full_clean()
        contrato.save()

        aceite = AceiteContrato.objects.get()
        self.assertEqual(aceite.contrato_versao_snapshot, "2026-05")
        self.assertEqual(aceite.contrato_texto_snapshot, "Texto vigente do contrato.")

    def test_contrato_com_aceite_nao_pode_alterar_texto_ou_versao(self):
        contrato = self.criar_contrato()
        self.adicionar_brinquedo()
        pedido_id = self.converter_carrinho_em_pedido().data["id"]
        self.aceitar_contrato(pedido_id, contrato=contrato)

        contrato.versao = "2026-06"
        with self.assertRaises(ValidationError):
            contrato.full_clean()

        contrato.refresh_from_db()
        contrato.texto = "Texto alterado."
        with self.assertRaises(ValidationError):
            contrato.full_clean()


class ReservaUnidadesPedidoAdminTests(APITestCase):
    def setUp(self):
        self.url_template = "/api/admin/pedidos/{}/reservar-unidades/"
        self.confirmar_url_template = "/api/admin/pedidos/{}/confirmar/"
        self.data_inicio = timezone.localdate() + timedelta(days=30)
        self.data_fim = self.data_inicio + timedelta(days=2)
        self.categoria = Categoria.objects.create(
            nome="Brinquedos grandes",
            slug="brinquedos-grandes-reserva",
        )
        self.brinquedo = Brinquedo.objects.create(
            nome="Cama elastica",
            descricao="Brinquedo para festas maiores.",
            categoria=self.categoria,
            preco_aluguel=Decimal("220.00"),
        )
        self.outro_brinquedo = Brinquedo.objects.create(
            nome="Piscina de bolinhas",
            descricao="Brinquedo para bebes.",
            categoria=self.categoria,
            preco_aluguel=Decimal("150.00"),
        )
        self.kit_festa = KitFesta.objects.create(
            nome="Kit Diversao",
            descricao="Kit pronto para festa.",
            preco_aluguel=Decimal("350.00"),
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
            preco_base=Decimal("50.00"),
            quantidade_minima_brinquedos=1,
            quantidade_maxima_brinquedos=4,
            modo_elegibilidade=(
                ConfiguracaoKitPersonalizavel.ModoElegibilidade.CATEGORIAS
            ),
        )
        self.configuracao.categorias_permitidas.add(self.categoria)
        self.admin = get_user_model().objects.create_user(
            username="admin-reserva",
            password="senha-segura-123",
            is_staff=True,
        )
        self.usuario = get_user_model().objects.create_user(
            username="cliente-reserva",
            password="senha-segura-123",
        )
        self.contrato = Contrato.objects.create(
            titulo="Contrato de locacao",
            versao="2026-05-reserva",
            texto="Texto vigente do contrato.",
            ativo=True,
        )

    def url(self, pedido=None):
        pedido = pedido or self.pedido
        return self.url_template.format(pedido.id)

    def confirmar_url(self, pedido=None):
        pedido = pedido or self.pedido
        return self.confirmar_url_template.format(pedido.id)

    def autenticar_admin(self):
        self.client.force_authenticate(user=self.admin)

    def criar_unidade(self, brinquedo=None, status_unidade=None, codigo=None):
        brinquedo = brinquedo or self.brinquedo
        codigo = codigo or f"UNI-{UnidadeBrinquedo.objects.count() + 1:03d}"
        return UnidadeBrinquedo.objects.create(
            brinquedo=brinquedo,
            codigo=codigo,
            status=status_unidade or UnidadeBrinquedo.Status.DISPONIVEL,
        )

    def criar_pedido(self, status_pedido=None, aceitar=True, periodo=True):
        data_inicio = self.data_inicio if periodo else None
        data_fim = self.data_fim if periodo else None
        pedido = Pedido.objects.create(
            usuario=self.usuario,
            nome_cliente_snapshot="Cliente Teste",
            telefone_cliente_snapshot="11999999999",
            email_cliente_snapshot="cliente@email.com",
            data_evento_pretendida=self.data_inicio,
            data_inicio_locacao=data_inicio,
            data_fim_locacao=data_fim,
            subtotal_itens_snapshot="220.00",
            status=status_pedido or Pedido.Status.AGUARDANDO_ANALISE,
        )
        if aceitar:
            AceiteContrato.objects.create(
                pedido=pedido,
                contrato=self.contrato,
                contrato_versao_snapshot=self.contrato.versao,
                contrato_texto_snapshot=self.contrato.texto,
                nome_cliente_snapshot=pedido.nome_cliente_snapshot,
                email_cliente_snapshot=pedido.email_cliente_snapshot,
                aceito_em=timezone.now(),
            )
        return pedido

    def criar_item_brinquedo(self, pedido=None, brinquedo=None, quantidade=1):
        pedido = pedido or self.pedido
        brinquedo = brinquedo or self.brinquedo
        return ItemPedido.objects.create(
            pedido=pedido,
            tipo_item=ItemCarrinho.TipoItem.BRINQUEDO,
            brinquedo=brinquedo,
            quantidade=quantidade,
            nome_snapshot=brinquedo.nome,
            preco_unitario_snapshot=brinquedo.preco_aluguel,
            subtotal_snapshot=brinquedo.preco_aluguel * quantidade,
            snapshot={
                "tipo_item": "brinquedo",
                "brinquedo": {"id": brinquedo.id, "nome": brinquedo.nome},
                "quantidade": quantidade,
            },
        )

    def criar_item_kit_festa(self, pedido=None, quantidade=1):
        pedido = pedido or self.pedido
        return ItemPedido.objects.create(
            pedido=pedido,
            tipo_item=ItemCarrinho.TipoItem.KIT_FESTA,
            kit_festa=self.kit_festa,
            quantidade=quantidade,
            nome_snapshot=self.kit_festa.nome,
            preco_unitario_snapshot=self.kit_festa.preco_aluguel,
            subtotal_snapshot=self.kit_festa.preco_aluguel * quantidade,
            snapshot={
                "tipo_item": "kit_festa",
                "kit_festa": {
                    "id": self.kit_festa.id,
                    "nome": self.kit_festa.nome,
                    "itens": [
                        {
                            "brinquedo_id": self.brinquedo.id,
                            "nome": self.brinquedo.nome,
                            "quantidade": 1,
                        },
                        {
                            "brinquedo_id": self.outro_brinquedo.id,
                            "nome": self.outro_brinquedo.nome,
                            "quantidade": 2,
                        },
                    ],
                },
                "quantidade": quantidade,
            },
        )

    def criar_item_kit_personalizado(self, pedido=None, quantidade=1):
        pedido = pedido or self.pedido
        return ItemPedido.objects.create(
            pedido=pedido,
            tipo_item=ItemCarrinho.TipoItem.KIT_PERSONALIZADO,
            configuracao_kit_personalizavel=self.configuracao,
            quantidade=quantidade,
            nome_snapshot=self.configuracao.nome,
            preco_unitario_snapshot=Decimal("50.00"),
            subtotal_snapshot=Decimal("50.00"),
            snapshot={
                "tipo_item": "kit_personalizado",
                "configuracao": {
                    "id": self.configuracao.id,
                    "nome": self.configuracao.nome,
                },
                "itens": [
                    {"brinquedo_id": self.brinquedo.id, "quantidade": 2},
                    {"brinquedo_id": self.outro_brinquedo.id, "quantidade": 1},
                ],
                "quantidade": quantidade,
            },
        )

    def criar_reserva(self, unidade, pedido=None, item=None, status_reserva=None):
        pedido = pedido or self.pedido
        return ReservaUnidade.objects.create(
            pedido=pedido,
            item_pedido=item,
            unidade_brinquedo=unidade,
            data_inicio=self.data_inicio,
            data_fim=self.data_fim,
            status=status_reserva or ReservaUnidade.Status.ATIVA,
        )

    def preparar_pedido_confirmavel(self):
        self.pedido = self.criar_pedido(status_pedido=Pedido.Status.RESERVADO)
        item = self.criar_item_brinquedo()
        unidade = self.criar_unidade()
        reserva = self.criar_reserva(unidade, item=item)
        return item, unidade, reserva

    def test_admin_reserva_unidades_de_pedido_com_brinquedo_avulso(self):
        self.autenticar_admin()
        self.pedido = self.criar_pedido()
        item = self.criar_item_brinquedo(quantidade=2)
        self.criar_unidade(codigo="CAMA-001")
        self.criar_unidade(codigo="CAMA-002")

        response = self.client.post(self.url(), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["pedido_id"], self.pedido.id)
        self.assertEqual(len(response.data["reservas_criadas"]), 2)
        self.assertEqual(ReservaUnidade.objects.count(), 2)
        self.assertTrue(
            ReservaUnidade.objects.filter(item_pedido=item).count(),
        )

    def test_admin_reserva_unidades_de_pedido_com_kit_festa_pronto(self):
        self.autenticar_admin()
        self.pedido = self.criar_pedido()
        self.criar_item_kit_festa()
        self.criar_unidade(brinquedo=self.brinquedo, codigo="CAMA-001")
        self.criar_unidade(brinquedo=self.outro_brinquedo, codigo="PISC-001")
        self.criar_unidade(brinquedo=self.outro_brinquedo, codigo="PISC-002")

        response = self.client.post(self.url(), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        brinquedos_reservados = list(
            ReservaUnidade.objects.order_by(
                "unidade_brinquedo__brinquedo_id",
                "id",
            ).values_list("unidade_brinquedo__brinquedo_id", flat=True)
        )
        self.assertEqual(
            brinquedos_reservados,
            [self.brinquedo.id, self.outro_brinquedo.id, self.outro_brinquedo.id],
        )

    def test_reserva_kit_festa_usa_snapshot_se_catalogo_for_alterado(self):
        self.autenticar_admin()
        self.pedido = self.criar_pedido()
        self.criar_item_kit_festa()
        self.kit_festa.itens.filter(brinquedo=self.outro_brinquedo).delete()
        item_kit = self.kit_festa.itens.get(brinquedo=self.brinquedo)
        item_kit.quantidade = 3
        item_kit.save(update_fields=["quantidade"])
        self.criar_unidade(brinquedo=self.brinquedo, codigo="CAMA-001")
        self.criar_unidade(brinquedo=self.outro_brinquedo, codigo="PISC-001")
        self.criar_unidade(brinquedo=self.outro_brinquedo, codigo="PISC-002")

        response = self.client.post(self.url(), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        reservas_por_brinquedo = list(
            ReservaUnidade.objects.order_by(
                "unidade_brinquedo__brinquedo_id",
                "id",
            ).values_list("unidade_brinquedo__brinquedo_id", flat=True)
        )
        self.assertEqual(
            reservas_por_brinquedo,
            [self.brinquedo.id, self.outro_brinquedo.id, self.outro_brinquedo.id],
        )

    def test_admin_reserva_kit_personalizado_usando_snapshot(self):
        self.autenticar_admin()
        self.pedido = self.criar_pedido()
        self.criar_item_kit_personalizado()
        self.criar_unidade(brinquedo=self.brinquedo, codigo="CAMA-001")
        self.criar_unidade(brinquedo=self.brinquedo, codigo="CAMA-002")
        self.criar_unidade(brinquedo=self.outro_brinquedo, codigo="PISC-001")

        response = self.client.post(self.url(), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(ReservaUnidade.objects.count(), 3)

    def test_reserva_cria_status_ativa_e_muda_pedido_para_reservado(self):
        self.autenticar_admin()
        self.pedido = self.criar_pedido()
        self.criar_item_brinquedo()
        self.criar_unidade()

        response = self.client.post(self.url(), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        reserva = ReservaUnidade.objects.get()
        self.assertEqual(reserva.status, ReservaUnidade.Status.ATIVA)
        self.pedido.refresh_from_db()
        self.assertEqual(self.pedido.status, Pedido.Status.RESERVADO)
        self.assertEqual(response.data["status"], Pedido.Status.RESERVADO)

    def test_reserva_exige_contrato_aceito(self):
        self.autenticar_admin()
        self.pedido = self.criar_pedido(aceitar=False)
        self.criar_item_brinquedo()
        self.criar_unidade()

        response = self.client.post(self.url(), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("contrato", response.data)
        self.assertEqual(ReservaUnidade.objects.count(), 0)

    def test_reserva_exige_status_aguardando_analise(self):
        self.autenticar_admin()
        self.pedido = self.criar_pedido(status_pedido=Pedido.Status.CANCELADO)
        self.criar_item_brinquedo()
        self.criar_unidade()

        response = self.client.post(self.url(), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("status", response.data)

    def test_reserva_exige_periodo_valido(self):
        self.autenticar_admin()
        self.pedido = self.criar_pedido(periodo=False)
        self.criar_item_brinquedo()
        self.criar_unidade()

        response = self.client.post(self.url(), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("periodo", response.data)

        self.pedido.data_inicio_locacao = self.data_inicio
        self.pedido.data_fim_locacao = self.data_inicio
        self.pedido.save(update_fields=["data_inicio_locacao", "data_fim_locacao"])

        response = self.client.post(self.url(), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("data_fim_locacao", response.data)

    def test_pedido_sem_itens_nao_pode_ser_reservado(self):
        self.autenticar_admin()
        self.pedido = self.criar_pedido()

        response = self.client.post(self.url(), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("itens", response.data)

    def test_unidade_com_reserva_ativa_conflitante_nao_pode_ser_reutilizada(self):
        self.autenticar_admin()
        outro_pedido = self.criar_pedido()
        unidade = self.criar_unidade()
        self.pedido = self.criar_pedido()
        item = self.criar_item_brinquedo()
        self.criar_reserva(unidade, pedido=outro_pedido, item=item)

        response = self.client.post(self.url(), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("disponibilidade", response.data)
        self.assertEqual(ReservaUnidade.objects.count(), 1)

    def test_reserva_cancelada_nao_bloqueia_nova_reserva(self):
        self.autenticar_admin()
        outro_pedido = self.criar_pedido()
        unidade = self.criar_unidade()
        self.pedido = self.criar_pedido()
        item = self.criar_item_brinquedo()
        self.criar_reserva(
            unidade,
            pedido=outro_pedido,
            item=item,
            status_reserva=ReservaUnidade.Status.CANCELADA,
        )

        response = self.client.post(self.url(), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            ReservaUnidade.objects.filter(status=ReservaUnidade.Status.ATIVA).count(),
            1,
        )

    def test_unidade_com_status_diferente_de_disponivel_nao_pode_ser_reservada(self):
        self.autenticar_admin()
        self.pedido = self.criar_pedido()
        self.criar_item_brinquedo()
        self.criar_unidade(status_unidade=UnidadeBrinquedo.Status.HIGIENIZACAO)

        response = self.client.post(self.url(), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("disponibilidade", response.data)

    def test_falta_de_estoque_gera_rollback_total_sem_reserva_parcial(self):
        self.autenticar_admin()
        self.pedido = self.criar_pedido()
        self.criar_item_brinquedo(brinquedo=self.brinquedo, quantidade=1)
        self.criar_item_brinquedo(brinquedo=self.outro_brinquedo, quantidade=1)
        self.criar_unidade(brinquedo=self.brinquedo, codigo="CAMA-001")

        response = self.client.post(self.url(), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(ReservaUnidade.objects.count(), 0)
        self.pedido.refresh_from_db()
        self.assertEqual(self.pedido.status, Pedido.Status.AGUARDANDO_ANALISE)

    def test_segunda_chamada_idempotente_nao_cria_reservas_duplicadas(self):
        self.autenticar_admin()
        self.pedido = self.criar_pedido()
        self.criar_item_brinquedo()
        self.criar_unidade()

        primeira = self.client.post(self.url(), {}, format="json")
        segunda = self.client.post(self.url(), {}, format="json")

        self.assertEqual(primeira.status_code, status.HTTP_200_OK)
        self.assertEqual(segunda.status_code, status.HTTP_200_OK)
        self.assertEqual(ReservaUnidade.objects.count(), 1)
        self.assertEqual(segunda.data["reservas_criadas"], [])
        self.assertEqual(len(segunda.data["reservas"]), 1)

    def test_pedido_reservado_com_reservas_divergentes_retorna_erro(self):
        self.autenticar_admin()
        self.pedido = self.criar_pedido(status_pedido=Pedido.Status.RESERVADO)
        self.criar_item_brinquedo()

        response = self.client.post(self.url(), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)

    def test_usuario_comum_nao_acessa_endpoint_admin(self):
        self.client.force_authenticate(user=self.usuario)
        self.pedido = self.criar_pedido()
        self.criar_item_brinquedo()

        response = self.client.post(self.url(), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonimo_nao_acessa_endpoint_admin(self):
        self.pedido = self.criar_pedido()
        self.criar_item_brinquedo()

        response = self.client.post(self.url(), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_bloqueia_overbooking_por_reserva_conflitante_revalidada(self):
        self.autenticar_admin()
        unidade = self.criar_unidade()
        pedido_original = self.criar_pedido()
        item_original = self.criar_item_brinquedo(
            pedido=pedido_original,
            quantidade=1,
        )
        self.criar_reserva(unidade, pedido=pedido_original, item=item_original)
        self.pedido = self.criar_pedido()
        self.criar_item_brinquedo()

        response = self.client.post(self.url(), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("disponibilidade", response.data)
        self.assertEqual(
            ReservaUnidade.objects.filter(unidade_brinquedo=unidade).count(),
            1,
        )

    def test_admin_confirma_pedido_reservado_com_contrato_e_reservas_ativas(self):
        self.autenticar_admin()
        self.preparar_pedido_confirmavel()

        response = self.client.post(self.confirmar_url(), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.pedido.refresh_from_db()
        self.assertEqual(self.pedido.status, Pedido.Status.CONFIRMADO)
        self.assertIsNotNone(self.pedido.confirmado_em)
        self.assertEqual(self.pedido.confirmado_por, self.admin)
        self.assertEqual(response.data["id"], self.pedido.id)
        self.assertEqual(response.data["status"], Pedido.Status.CONFIRMADO)
        self.assertIsNotNone(response.data["confirmado_em"])
        self.assertEqual(response.data["confirmado_por"], self.admin.id)

    def test_confirmacao_nao_altera_reservas_unidades_itens_ou_valores(self):
        self.autenticar_admin()
        item, unidade, reserva = self.preparar_pedido_confirmavel()
        total_estimado = self.pedido.total_estimado_snapshot
        taxa = self.pedido.taxa_entrega_retirada_snapshot

        response = self.client.post(self.confirmar_url(), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        reserva.refresh_from_db()
        unidade.refresh_from_db()
        item.refresh_from_db()
        self.pedido.refresh_from_db()
        self.assertEqual(reserva.status, ReservaUnidade.Status.ATIVA)
        self.assertEqual(reserva.pedido, self.pedido)
        self.assertEqual(unidade.status, UnidadeBrinquedo.Status.DISPONIVEL)
        self.assertEqual(item.pedido, self.pedido)
        self.assertEqual(self.pedido.total_estimado_snapshot, total_estimado)
        self.assertEqual(self.pedido.taxa_entrega_retirada_snapshot, taxa)

    def test_usuario_comum_nao_acessa_endpoint_admin_de_confirmacao(self):
        self.client.force_authenticate(user=self.usuario)
        self.preparar_pedido_confirmavel()

        response = self.client.post(self.confirmar_url(), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonimo_nao_acessa_endpoint_admin_de_confirmacao(self):
        self.preparar_pedido_confirmavel()

        response = self.client.post(self.confirmar_url(), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_pedido_aguardando_analise_nao_pode_ser_confirmado(self):
        self.autenticar_admin()
        self.pedido = self.criar_pedido(status_pedido=Pedido.Status.AGUARDANDO_ANALISE)
        item = self.criar_item_brinquedo()
        self.criar_reserva(self.criar_unidade(), item=item)

        response = self.client.post(self.confirmar_url(), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("status", response.data)

    def test_pedido_cancelado_nao_pode_ser_confirmado(self):
        self.autenticar_admin()
        self.pedido = self.criar_pedido(status_pedido=Pedido.Status.CANCELADO)
        item = self.criar_item_brinquedo()
        self.criar_reserva(self.criar_unidade(), item=item)

        response = self.client.post(self.confirmar_url(), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("status", response.data)

    def test_pedido_sem_aceite_de_contrato_nao_pode_ser_confirmado(self):
        self.autenticar_admin()
        self.pedido = self.criar_pedido(
            status_pedido=Pedido.Status.RESERVADO,
            aceitar=False,
        )
        item = self.criar_item_brinquedo()
        self.criar_reserva(self.criar_unidade(), item=item)

        response = self.client.post(self.confirmar_url(), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("contrato", response.data)

    def test_pedido_sem_reservas_ativas_nao_pode_ser_confirmado(self):
        self.autenticar_admin()
        self.pedido = self.criar_pedido(status_pedido=Pedido.Status.RESERVADO)
        self.criar_item_brinquedo()

        response = self.client.post(self.confirmar_url(), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("reservas", response.data)

    def test_reservas_canceladas_nao_bastam_para_confirmar(self):
        self.autenticar_admin()
        self.pedido = self.criar_pedido(status_pedido=Pedido.Status.RESERVADO)
        item = self.criar_item_brinquedo()
        self.criar_reserva(
            self.criar_unidade(),
            item=item,
            status_reserva=ReservaUnidade.Status.CANCELADA,
        )

        response = self.client.post(self.confirmar_url(), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("reservas", response.data)

    def test_reservas_de_outro_pedido_nao_contam_para_confirmacao(self):
        self.autenticar_admin()
        outro_pedido = self.criar_pedido()
        self.pedido = self.criar_pedido(status_pedido=Pedido.Status.RESERVADO)
        self.criar_item_brinquedo()
        item_outro = self.criar_item_brinquedo(pedido=outro_pedido)
        self.criar_reserva(
            self.criar_unidade(),
            pedido=outro_pedido,
            item=item_outro,
        )

        response = self.client.post(self.confirmar_url(), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("reservas", response.data)

    def test_reservas_incompativeis_com_periodo_impedem_confirmacao(self):
        self.autenticar_admin()
        self.preparar_pedido_confirmavel()
        reserva = ReservaUnidade.objects.get(pedido=self.pedido)
        reserva.data_inicio = self.data_inicio + timedelta(days=1)
        reserva.data_fim = self.data_fim + timedelta(days=1)
        reserva.save(update_fields=["data_inicio", "data_fim", "atualizado_em"])

        response = self.client.post(self.confirmar_url(), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("reservas", response.data)

    def test_segunda_confirmacao_nao_altera_auditoria_ja_registrada(self):
        self.autenticar_admin()
        self.preparar_pedido_confirmavel()
        primeira = self.client.post(self.confirmar_url(), {}, format="json")
        self.pedido.refresh_from_db()
        confirmado_em = self.pedido.confirmado_em
        confirmado_por = self.pedido.confirmado_por

        segundo_admin = get_user_model().objects.create_user(
            username="admin-confirmacao-2",
            password="senha-segura-123",
            is_staff=True,
        )
        self.client.force_authenticate(user=segundo_admin)
        segunda = self.client.post(self.confirmar_url(), {}, format="json")

        self.assertEqual(primeira.status_code, status.HTTP_200_OK)
        self.assertEqual(segunda.status_code, status.HTTP_200_OK)
        self.pedido.refresh_from_db()
        self.assertEqual(self.pedido.status, Pedido.Status.CONFIRMADO)
        self.assertEqual(self.pedido.confirmado_em, confirmado_em)
        self.assertEqual(self.pedido.confirmado_por, confirmado_por)
        self.assertEqual(segunda.data["confirmado_por"], self.admin.id)


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

    def test_item_pedido_rejeita_combinacao_invalida_de_fks(self):
        carrinho = Carrinho.objects.create(session_key="sessao-teste")
        pedido = Pedido.objects.create(
            carrinho_origem=carrinho,
            session_key_snapshot=carrinho.session_key,
            nome_cliente_snapshot="Cliente Teste",
            telefone_cliente_snapshot="11999999999",
            email_cliente_snapshot="cliente@email.com",
            data_evento_pretendida=timezone.localdate() + timedelta(days=30),
            data_inicio_locacao=timezone.localdate() + timedelta(days=30),
            data_fim_locacao=timezone.localdate() + timedelta(days=32),
            subtotal_itens_snapshot="220.00",
        )
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
        item = ItemPedido(
            pedido=pedido,
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
