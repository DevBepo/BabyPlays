from types import SimpleNamespace
from django.contrib import admin
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.db import IntegrityError, transaction
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
    ImagemBrinquedo,
    DedicacaoUnidadeKit,
    ItemKitFesta,
    KitFesta,
    RegraCategoriaKitPersonalizavel,
    UnidadeBrinquedo,
)
from entregas.models import RegraFreteBairro
from entregas.providers import FakeCepProvider, RotaProviderError
from entregas.services import ConfiguracaoTaxaAusenteError, TaxaEntregaRetiradaService
from clientes.models import Cliente

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
    def __init__(self, erro=None, status_taxa="calculada", taxa=Decimal("48.00")):
        self.erro = erro
        self.status_taxa = status_taxa
        self.taxa = taxa

    def calcular(self, cep, numero, complemento=""):
        if self.erro:
            raise self.erro
        return {
            "nome": "Taxa de entrega e retirada",
            "status": self.status_taxa,
            "endereco_interpretado": {
                "cep": cep,
                "logradouro": "Praca da Se",
                "numero": numero,
                "complemento": complemento,
                "bairro": "Se",
                "cidade": "Sao Paulo",
                "uf": "SP",
            },
            "distancia_ida_km": Decimal("8.00") if self.taxa is not None else None,
            "distancia_total_km": Decimal("16.00") if self.taxa is not None else None,
            "valor_por_km": Decimal("3.00") if self.taxa is not None else None,
            "taxa": self.taxa,
        }


class PedidoAdminActionTests(APITestCase):
    def setUp(self):
        self.admin_user = get_user_model().objects.create_user(
            username="admin-actions",
            email="admin-actions@email.com",
            password="senha",
            is_staff=True,
        )
        self.model_admin = admin.site._registry[Pedido]

    def criar_pedido(self, status_pedido=Pedido.Status.AGUARDANDO_ANALISE):
        return Pedido.objects.create(
            status=status_pedido,
            nome_cliente_snapshot="Cliente Admin",
            telefone_cliente_snapshot="51999999999",
            email_cliente_snapshot="cliente-admin@email.com",
            data_evento_pretendida=timezone.localdate() + timedelta(days=10),
            data_inicio_locacao=timezone.localdate() + timedelta(days=10),
            data_fim_locacao=timezone.localdate() + timedelta(days=12),
            subtotal_itens_snapshot=Decimal("100.00"),
            total_estimado_snapshot=Decimal("100.00"),
        )

    def request_admin(self):
        return SimpleNamespace(user=self.admin_user)

    def test_status_criticos_de_pedido_e_reserva_ficam_readonly_no_admin(self):
        reserva_admin = admin.site._registry[ReservaUnidade]

        self.assertIn("status", self.model_admin.readonly_fields)
        self.assertIn("status", reserva_admin.readonly_fields)

    def test_admin_nao_expoe_nem_pesquisa_session_key(self):
        carrinho_admin = admin.site._registry[Carrinho]
        item_carrinho_admin = admin.site._registry[ItemCarrinho]

        configuracoes_admin = (
            carrinho_admin.list_display,
            carrinho_admin.search_fields,
            carrinho_admin.readonly_fields,
            item_carrinho_admin.search_fields,
            self.model_admin.search_fields,
            self.model_admin.readonly_fields,
        )
        for configuracao in configuracoes_admin:
            self.assertFalse(
                any("session_key" in campo for campo in configuracao),
                configuracao,
            )
        self.assertIn("session_key", carrinho_admin.exclude)

        carrinho = Carrinho.objects.create(session_key="sessao-sensivel-teste")
        self.assertNotIn("sessao-sensivel-teste", str(carrinho))

    @patch("pedidos.admin.ReservaPedidoService.reservar_unidades")
    def test_action_reservar_unidades_chama_service_e_reporta_falha_por_status(
        self,
        reservar_unidades,
    ):
        pedido_reservavel = self.criar_pedido()
        pedido_cancelado = self.criar_pedido(status_pedido=Pedido.Status.CANCELADO)
        queryset = Pedido.objects.filter(
            id__in=[pedido_reservavel.id, pedido_cancelado.id]
        ).order_by("id")

        with patch.object(self.model_admin, "message_user") as message_user:
            self.model_admin.reservar_unidades(self.request_admin(), queryset)

        reservar_unidades.assert_called_once()
        self.assertEqual(reservar_unidades.call_args.args[0], pedido_reservavel)
        self.assertEqual(message_user.call_count, 2)
        mensagens = [call.args[1] for call in message_user.call_args_list]
        self.assertTrue(any("1 pedido(s) reservado(s)" in msg for msg in mensagens))
        self.assertTrue(any("Pedido" in msg and "falharam" in msg for msg in mensagens))

    @patch("pedidos.admin.ConfirmacaoPedidoService.confirmar")
    def test_action_confirmar_pedidos_continua_apos_erro_do_service(
        self,
        confirmar,
    ):
        pedido_ok = self.criar_pedido(status_pedido=Pedido.Status.RESERVADO)
        pedido_falha = self.criar_pedido(status_pedido=Pedido.Status.RESERVADO)
        confirmar.side_effect = [
            pedido_ok,
            DRFValidationError({"status": "Pedido em status nao confirmavel."}),
        ]
        queryset = Pedido.objects.filter(id__in=[pedido_ok.id, pedido_falha.id]).order_by(
            "id"
        )

        with patch.object(self.model_admin, "message_user") as message_user:
            self.model_admin.confirmar_pedidos(self.request_admin(), queryset)

        self.assertEqual(confirmar.call_count, 2)
        self.assertEqual(message_user.call_count, 2)
        mensagens = [call.args[1] for call in message_user.call_args_list]
        self.assertTrue(any("1 pedido(s) confirmado(s)" in msg for msg in mensagens))
        self.assertTrue(
            any("Pedido em status nao confirmavel" in msg for msg in mensagens)
        )


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
            preco_15_dias=Decimal("220.00"),
            preco_30_dias=Decimal("330.00"),
        )
        self.outro_brinquedo = Brinquedo.objects.create(
            nome="Piscina de bolinhas",
            descricao="Brinquedo para bebes.",
            categoria=self.categoria,
            preco_aluguel=Decimal("150.00"),
            preco_15_dias=Decimal("150.00"),
        )
        self.kit_festa = KitFesta.objects.create(
            nome="Kit Diversao",
            descricao="Kit pronto para festa.",
            preco_aluguel=Decimal("350.00"),
            preco_15_dias=Decimal("350.00"),
            preco_30_dias=Decimal("520.00"),
        )
        item_kit_brinquedo = ItemKitFesta.objects.create(
            kit=self.kit_festa,
            brinquedo=self.brinquedo,
            quantidade=1,
        )
        item_kit_outro = ItemKitFesta.objects.create(
            kit=self.kit_festa,
            brinquedo=self.outro_brinquedo,
            quantidade=2,
            ordem=1,
        )
        unidade_kit_brinquedo = UnidadeBrinquedo.objects.create(
            brinquedo=self.brinquedo,
            codigo="CAMA-KIT-001",
            status=UnidadeBrinquedo.Status.DISPONIVEL,
        )
        DedicacaoUnidadeKit.objects.create(
            item_kit=item_kit_brinquedo,
            unidade=unidade_kit_brinquedo,
        )
        for indice in range(1, 3):
            unidade_kit_outro = UnidadeBrinquedo.objects.create(
                brinquedo=self.outro_brinquedo,
                codigo=f"PISCINA-KIT-{indice:03d}",
                status=UnidadeBrinquedo.Status.DISPONIVEL,
            )
            DedicacaoUnidadeKit.objects.create(
                item_kit=item_kit_outro,
                unidade=unidade_kit_outro,
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
        for indice in range(1, 4):
            UnidadeBrinquedo.objects.create(
                brinquedo=self.brinquedo,
                codigo=f"CAMA-BASE-{indice:03d}",
                status=UnidadeBrinquedo.Status.DISPONIVEL,
            )
        for indice in range(1, 3):
            UnidadeBrinquedo.objects.create(
                brinquedo=self.outro_brinquedo,
                codigo=f"PISCINA-BASE-{indice:03d}",
                status=UnidadeBrinquedo.Status.DISPONIVEL,
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

    def test_carrinho_aceita_tres_dias_quando_preco_esta_configurado(self):
        self.brinquedo.preco_3_dias = Decimal("90.00")
        self.brinquedo.save(update_fields=["preco_3_dias"])

        response = self.adicionar_brinquedo(periodo_locacao="3_dias")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        item = ItemCarrinho.objects.get(id=response.data["id"])
        self.assertEqual(item.snapshot["periodo_locacao"]["tipo"], "3_dias")
        self.assertEqual(item.snapshot["periodo_locacao"]["dias"], 3)
        self.assertEqual(item.snapshot["periodo_locacao"]["preco"], "90.00")
        self.assertEqual(item.preco_unitario_snapshot, Decimal("90.00"))

        pedido_response = self.converter_carrinho_em_pedido()
        self.assertEqual(pedido_response.status_code, status.HTTP_201_CREATED)
        item_pedido = ItemPedido.objects.get(pedido_id=pedido_response.data["id"])
        self.assertEqual(item_pedido.snapshot["periodo_locacao"]["tipo"], "3_dias")
        self.assertEqual(item_pedido.preco_unitario_snapshot, Decimal("90.00"))

    def test_carrinho_rejeita_tres_dias_sem_preco_configurado(self):
        response = self.adicionar_brinquedo(periodo_locacao="3_dias")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("periodo_locacao", response.data)

    def test_carrinho_rejeita_tres_dias_com_preco_zero(self):
        self.brinquedo.preco_3_dias = Decimal("0.00")
        self.brinquedo.save(update_fields=["preco_3_dias"])

        response = self.adicionar_brinquedo(periodo_locacao="3_dias")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("periodo_locacao", response.data)

    def test_carrinho_rejeita_periodo_invalido(self):
        response = self.adicionar_brinquedo(periodo_locacao="7_dias")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("periodo_locacao", response.data)

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

    def payload_pedido_com_contrato(self, contrato=None, **extra):
        contrato = contrato or Contrato.objects.filter(ativo=True).first()
        if contrato is None:
            contrato = self.criar_contrato()
        payload = self.payload_pedido(
            contrato_aceito=True,
            contrato_id=contrato.id,
            contrato_versao=contrato.versao,
            **extra,
        )
        return payload

    def converter_carrinho_em_pedido(
        self,
        client=None,
        autenticar=True,
        aceitar_contrato=True,
        contrato=None,
        taxa_service=None,
        **extra,
    ):
        client = client or self.client
        if autenticar and client is self.client:
            client.force_authenticate(user=self.usuario)
        payload = self.payload_pedido(**extra)
        if aceitar_contrato:
            contrato = contrato or Contrato.objects.filter(ativo=True).first()
            if contrato is None:
                contrato = self.criar_contrato()
            payload.update(
                {
                    "contrato_aceito": True,
                    "contrato_id": contrato.id,
                    "contrato_versao": contrato.versao,
                }
            )
        with patch(
            "pedidos.services.TaxaEntregaRetiradaService",
            return_value=taxa_service or FakeTaxaEntregaRetiradaService(),
        ):
            return client.post(
                self.converter_pedido_url,
                payload,
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

    def criar_pedido_legado_sem_aceite(self, contrato=None):
        contrato = contrato or self.criar_contrato()
        self.adicionar_brinquedo()
        pedido_id = self.converter_carrinho_em_pedido(contrato=contrato).data["id"]
        AceiteContrato.objects.filter(pedido_id=pedido_id).delete()
        return pedido_id

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
        self.assertIsNone(carrinho.session_key)
        self.assertEqual(carrinho.itens.count(), 1)

    def test_brinquedo_inativo_nao_pode_ser_adicionado(self):
        self.brinquedo.ativo = False
        self.brinquedo.save(update_fields=["ativo"])

        response = self.adicionar_brinquedo()

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(ItemCarrinho.objects.count(), 0)

    def test_brinquedo_indisponivel_no_catalogo_nao_pode_ser_adicionado(self):
        self.brinquedo.indisponivel_catalogo = True
        self.brinquedo.save(update_fields=["indisponivel_catalogo"])

        response = self.adicionar_brinquedo()

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("alugado", str(response.data).lower())
        self.assertEqual(ItemCarrinho.objects.count(), 0)

    def test_brinquedo_sem_unidade_avulsa_nao_pode_ser_adicionado(self):
        self.brinquedo.unidades.update(status=UnidadeBrinquedo.Status.EM_LOCACAO)

        response = self.adicionar_brinquedo()

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("unidades disponiveis", str(response.data).lower())
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

    def test_item_brinquedo_expoe_imagem_principal_no_carrinho(self):
        ImagemBrinquedo.objects.create(
            brinquedo=self.brinquedo,
            imagem="catalogo/brinquedos/cama-elastica.jpg",
            principal=True,
        )

        response = self.adicionar_brinquedo()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            response.data["imagem_url"],
            "http://testserver/media/catalogo/brinquedos/cama-elastica.jpg",
        )
        carrinho_response = self.client.get(self.carrinho_url)
        self.assertEqual(
            carrinho_response.data["itens"][0]["imagem_url"],
            "http://testserver/media/catalogo/brinquedos/cama-elastica.jpg",
        )

    def test_item_kit_festa_expoe_imagem_propria_no_carrinho(self):
        self.kit_festa.imagem = "catalogo/kits-festa/kit-diversao.jpg"
        self.kit_festa.save(update_fields=["imagem"])

        response = self.adicionar_kit_festa()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(
            response.data["imagem_url"],
            "http://testserver/media/catalogo/kits-festa/kit-diversao.jpg",
        )

    def test_item_sem_imagem_expoe_imagem_url_nula(self):
        response = self.adicionar_brinquedo()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(response.data["imagem_url"])

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
        self.assertEqual(item.snapshot["periodo_locacao"]["tipo"], "15_dias")
        self.assertEqual(item.snapshot["periodo_locacao"]["dias"], 15)
        self.assertEqual(item.snapshot["quantidade"], 2)

    def test_snapshot_salva_periodo_de_30_dias_para_brinquedo(self):
        response = self.adicionar_brinquedo(periodo_locacao="30_dias")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        item = ItemCarrinho.objects.get(id=response.data["id"])
        self.assertEqual(item.snapshot["periodo_locacao"]["tipo"], "30_dias")
        self.assertEqual(item.snapshot["periodo_locacao"]["dias"], 30)

    def test_diaria_exige_brinquedo_com_suporte(self):
        response = self.adicionar_brinquedo(periodo_locacao="diaria")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(ItemCarrinho.objects.count(), 0)

        self.brinquedo.preco_diaria = Decimal("120.00")
        self.brinquedo.save(update_fields=["preco_diaria"])

        response = self.adicionar_brinquedo(periodo_locacao="diaria")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        item = ItemCarrinho.objects.get(id=response.data["id"])
        self.assertEqual(item.snapshot["periodo_locacao"]["tipo"], "diaria")
        self.assertEqual(item.snapshot["periodo_locacao"]["dias"], 1)
        self.assertEqual(item.snapshot["periodo_locacao"]["preco"], "120.00")
        self.assertEqual(item.preco_unitario_snapshot, Decimal("120.00"))

    def test_snapshot_salva_periodo_para_kit_festa(self):
        response = self.adicionar_kit_festa(periodo_locacao="30_dias")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        item = ItemCarrinho.objects.get(id=response.data["id"])
        self.assertEqual(item.snapshot["periodo_locacao"]["tipo"], "30_dias")
        self.assertEqual(item.snapshot["periodo_locacao"]["dias"], 30)

    def test_diaria_exige_kit_festa_com_suporte(self):
        response = self.adicionar_kit_festa(periodo_locacao="diaria")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(ItemCarrinho.objects.count(), 0)

        self.kit_festa.preco_diaria = Decimal("180.00")
        self.kit_festa.save(update_fields=["preco_diaria"])

        response = self.adicionar_kit_festa(periodo_locacao="diaria")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        item = ItemCarrinho.objects.get(id=response.data["id"])
        self.assertEqual(item.snapshot["periodo_locacao"]["tipo"], "diaria")
        self.assertEqual(item.snapshot["periodo_locacao"]["dias"], 1)
        self.assertEqual(item.snapshot["periodo_locacao"]["preco"], "180.00")
        self.assertEqual(item.preco_unitario_snapshot, Decimal("180.00"))

    def test_snapshot_e_salvo_para_kit_festa(self):
        response = self.adicionar_kit_festa()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        item = ItemCarrinho.objects.get(id=response.data["id"])
        self.assertEqual(item.snapshot["tipo_item"], "kit_festa")
        self.assertEqual(item.snapshot["kit_festa"]["id"], self.kit_festa.id)
        self.assertEqual(item.snapshot["periodo_locacao"]["tipo"], "15_dias")
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
        self.assertEqual(pedido.usuario, self.usuario)
        self.assertEqual(pedido.cliente, self.usuario.cliente)
        self.assertEqual(response.data["cliente"], pedido.cliente_id)
        self.assertEqual(pedido.nome_cliente_snapshot, "Cliente Teste")
        self.assertIsNone(pedido.data_inicio_locacao)
        self.assertIsNone(pedido.data_fim_locacao)
        self.assertIsNone(response.data["data_inicio_locacao"])
        self.assertIsNone(response.data["data_fim_locacao"])
        resumo_whatsapp = response.data["whatsapp_resumo"]
        self.assertIn("solicitacao de locacao", resumo_whatsapp)
        self.assertIn(f"Pedido: #{pedido.id}", resumo_whatsapp)
        self.assertIn("Contrato aceito no site: Sim", resumo_whatsapp)
        self.assertIn("Taxa de entrega e retirada: R$ 48,00", resumo_whatsapp)
        self.assertIn(
            (
                "Gostaria de confirmar a disponibilidade da data de entrega "
                "e retirada, o período da locação e os detalhes finais do pedido."
            ),
            resumo_whatsapp,
        )
        self.assertNotIn("reserva confirmada", resumo_whatsapp.lower())
        self.assertEqual(pedido.itens.count(), 1)
        item = pedido.itens.get()
        self.assertEqual(item.tipo_item, ItemCarrinho.TipoItem.BRINQUEDO)
        self.assertEqual(item.brinquedo, self.brinquedo)
        self.assertEqual(item.snapshot["brinquedo"]["nome"], "Cama elastica")
        self.assertNotIn("snapshot", response.data["itens"][0])
        self.assertEqual(response.data["itens"][0]["nome_snapshot"], "Cama elastica")

    def test_pedido_salva_frete_a_confirmar_e_informa_whatsapp(self):
        self.adicionar_brinquedo()

        response = self.converter_carrinho_em_pedido(
            taxa_service=FakeTaxaEntregaRetiradaService(
                status_taxa="a_confirmar",
                taxa=None,
            )
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        pedido = Pedido.objects.get()
        self.assertIsNone(pedido.taxa_entrega_retirada_snapshot)
        self.assertEqual(
            pedido.taxa_entrega_status_snapshot,
            Pedido.StatusTaxaEntrega.A_CONFIRMAR,
        )
        self.assertIn(
            "Taxa de entrega e retirada: a confirmar pela BabyPlays.",
            response.data["whatsapp_resumo"],
        )
        self.assertNotIn("R$ 0,00", response.data["whatsapp_resumo"])

    def test_checkout_usa_valor_cadastrado_para_o_bairro(self):
        self.adicionar_brinquedo()
        RegraFreteBairro.objects.create(
            uf="SP",
            cidade="São Paulo",
            bairro="Sé",
            valor_taxa=Decimal("31.50"),
        )
        taxa_service = TaxaEntregaRetiradaService(
            cep_provider=FakeCepProvider(
                {
                    "cep": "01001000",
                    "logradouro": "Praca da Se",
                    "bairro": "Se",
                    "cidade": "Sao Paulo",
                    "uf": "SP",
                }
            )
        )

        response = self.converter_carrinho_em_pedido(taxa_service=taxa_service)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        pedido = Pedido.objects.get()
        self.assertEqual(pedido.taxa_entrega_retirada_snapshot, Decimal("31.50"))
        self.assertEqual(
            pedido.taxa_entrega_status_snapshot,
            Pedido.StatusTaxaEntrega.CALCULADA,
        )
        self.assertIn(
            "Taxa de entrega e retirada: R$ 31,50",
            response.data["whatsapp_resumo"],
        )

    def test_brinquedo_que_ficou_indisponivel_nao_converte_carrinho(self):
        self.adicionar_brinquedo()
        self.brinquedo.indisponivel_catalogo = True
        self.brinquedo.save(update_fields=["indisponivel_catalogo"])

        response = self.converter_carrinho_em_pedido()

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("alugado", str(response.data).lower())
        self.assertEqual(Pedido.objects.count(), 0)
        self.assertEqual(Carrinho.objects.get().status, Carrinho.Status.ATIVO)

    def test_brinquedo_sem_estoque_avulso_nao_converte_carrinho(self):
        self.adicionar_brinquedo()
        self.brinquedo.unidades.update(status=UnidadeBrinquedo.Status.EM_LOCACAO)

        response = self.converter_carrinho_em_pedido()

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("unidades disponiveis", str(response.data).lower())
        self.assertIn("remova-o", str(response.data).lower())
        self.assertEqual(Pedido.objects.count(), 0)

    def test_checkout_recalcula_preco_do_brinquedo_antes_de_criar_pedido(self):
        self.adicionar_brinquedo()
        self.brinquedo.preco_15_dias = Decimal("250.00")
        self.brinquedo.save(update_fields=["preco_15_dias"])

        response = self.converter_carrinho_em_pedido()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        pedido = Pedido.objects.get()
        item_pedido = pedido.itens.get()
        self.assertEqual(pedido.subtotal_itens_snapshot, Decimal("250.00"))
        self.assertEqual(item_pedido.preco_unitario_snapshot, Decimal("250.00"))
        self.assertEqual(item_pedido.subtotal_snapshot, Decimal("250.00"))

    def test_checkout_rejeita_kit_festa_inativo_no_carrinho(self):
        self.adicionar_kit_festa()
        self.kit_festa.ativo = False
        self.kit_festa.save(update_fields=["ativo"])

        response = self.converter_carrinho_em_pedido()

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("kit", str(response.data).lower())
        self.assertEqual(Pedido.objects.count(), 0)
        self.assertEqual(Carrinho.objects.get().status, Carrinho.Status.ATIVO)

    def test_checkout_recalcula_preco_do_kit_festa_antes_de_criar_pedido(self):
        self.adicionar_kit_festa()
        self.kit_festa.preco_15_dias = Decimal("390.00")
        self.kit_festa.save(update_fields=["preco_15_dias"])

        response = self.converter_carrinho_em_pedido()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        pedido = Pedido.objects.get()
        item_pedido = pedido.itens.get()
        self.assertEqual(pedido.subtotal_itens_snapshot, Decimal("390.00"))
        self.assertEqual(item_pedido.preco_unitario_snapshot, Decimal("390.00"))
        self.assertEqual(
            item_pedido.snapshot["kit_festa"]["preco_periodo"],
            "390.00",
        )

    def test_checkout_rejeita_kit_festa_com_reserva_conflitante_no_periodo(self):
        self.adicionar_kit_festa()
        data_inicio = timezone.localdate() + timedelta(days=30)
        data_fim = data_inicio + timedelta(days=2)
        unidade_dedicada = DedicacaoUnidadeKit.objects.get(
            item_kit__kit=self.kit_festa,
            item_kit__brinquedo=self.brinquedo,
        ).unidade
        pedido_existente = Pedido.objects.create(
            nome_cliente_snapshot="Cliente Existente",
            telefone_cliente_snapshot="11988888888",
            email_cliente_snapshot="existente@email.com",
            data_inicio_locacao=data_inicio,
            data_fim_locacao=data_fim,
            subtotal_itens_snapshot=Decimal("350.00"),
            total_estimado_snapshot=Decimal("350.00"),
        )
        ReservaUnidade.objects.create(
            pedido=pedido_existente,
            unidade_brinquedo=unidade_dedicada,
            data_inicio=data_inicio,
            data_fim=data_fim,
            status=ReservaUnidade.Status.ATIVA,
        )

        response = self.converter_carrinho_em_pedido(
            data_inicio_locacao=str(data_inicio),
            data_fim_locacao=str(data_fim),
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("unidades disponiveis", str(response.data).lower())
        self.assertEqual(
            Pedido.objects.filter(carrinho_origem__isnull=False).count(),
            0,
        )

    def test_checkout_rejeita_configuracao_kit_personalizado_inativa(self):
        self.adicionar_kit_personalizado()
        self.configuracao.ativo = False
        self.configuracao.save(update_fields=["ativo"])

        response = self.converter_carrinho_em_pedido()

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("kit personalizado", str(response.data).lower())
        self.assertEqual(Pedido.objects.count(), 0)

    def test_checkout_revalida_composicao_atual_do_kit_personalizado(self):
        self.adicionar_kit_personalizado()
        self.configuracao.modo_elegibilidade = (
            ConfiguracaoKitPersonalizavel.ModoElegibilidade.BRINQUEDOS
        )
        self.configuracao.save(update_fields=["modo_elegibilidade"])
        self.configuracao.categorias_permitidas.clear()
        self.configuracao.brinquedos_permitidos.set([self.outro_brinquedo])

        response = self.converter_carrinho_em_pedido()

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn(
            "nao esta disponivel para esta configuracao",
            str(response.data).lower(),
        )
        self.assertEqual(Pedido.objects.count(), 0)

    def test_anonimo_nao_consegue_converter_carrinho_em_pedido(self):
        self.adicionar_brinquedo()

        response = self.converter_carrinho_em_pedido(autenticar=False)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Pedido.objects.count(), 0)

    def test_carrinho_anonimo_da_sessao_e_reaproveitado_apos_autenticacao(self):
        self.adicionar_brinquedo()
        carrinho = Carrinho.objects.get()
        self.assertIsNone(carrinho.usuario)

        response = self.converter_carrinho_em_pedido()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        carrinho.refresh_from_db()
        pedido = Pedido.objects.get()
        self.assertEqual(carrinho.usuario, self.usuario)
        self.assertIsNone(carrinho.session_key)
        self.assertEqual(pedido.carrinho_origem, carrinho)
        self.assertEqual(pedido.usuario, self.usuario)
        self.assertNotIn(
            "session_key_snapshot",
            {field.name for field in Pedido._meta.get_fields()},
        )

    def test_cria_cliente_automaticamente_na_conversao_quando_user_nao_tem_cliente(self):
        self.adicionar_brinquedo()

        response = self.converter_carrinho_em_pedido()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        cliente = Cliente.objects.get(user=self.usuario)
        pedido = Pedido.objects.get()
        self.assertEqual(cliente.nome, "Cliente Teste")
        self.assertEqual(cliente.telefone, "11999999999")
        self.assertEqual(pedido.cliente, cliente)

    def test_staff_sem_cliente_converte_kit_em_solicitacao(self):
        self.usuario.is_staff = True
        self.usuario.save(update_fields=["is_staff"])
        self.adicionar_kit_festa()

        response = self.converter_carrinho_em_pedido()

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        pedido = Pedido.objects.get()
        self.assertEqual(pedido.usuario, self.usuario)
        self.assertEqual(pedido.cliente.user, self.usuario)
        self.assertEqual(
            pedido.itens.get().tipo_item,
            ItemCarrinho.TipoItem.KIT_FESTA,
        )
        self.assertIn("solicitacao de locacao", response.data["whatsapp_resumo"])

    def test_reaproveita_cliente_existente_na_conversao(self):
        cliente = Cliente.objects.create(
            user=self.usuario,
            nome="Nome cadastrado",
            telefone="11888888888",
        )
        self.adicionar_brinquedo()

        response = self.converter_carrinho_em_pedido(
            nome="Nome do checkout",
            telefone="11777777777",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        pedido = Pedido.objects.get()
        cliente.refresh_from_db()
        self.assertEqual(pedido.cliente, cliente)
        self.assertEqual(Cliente.objects.filter(user=self.usuario).count(), 1)
        self.assertEqual(cliente.nome, "Nome cadastrado")
        self.assertEqual(cliente.telefone, "11888888888")

    def test_nao_cria_dois_clientes_para_o_mesmo_user(self):
        self.adicionar_brinquedo()
        primeira_response = self.converter_carrinho_em_pedido()
        self.adicionar_brinquedo()

        segunda_response = self.converter_carrinho_em_pedido()

        self.assertEqual(primeira_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(segunda_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Cliente.objects.filter(user=self.usuario).count(), 1)

    def test_snapshots_do_pedido_usam_dados_do_momento_da_conversao(self):
        Cliente.objects.create(
            user=self.usuario,
            nome="Nome cadastrado",
            telefone="11888888888",
        )
        self.adicionar_brinquedo()

        response = self.converter_carrinho_em_pedido(
            nome="Nome checkout",
            telefone="11777777777",
            email="checkout@example.com",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        pedido = Pedido.objects.get()
        self.assertEqual(pedido.nome_cliente_snapshot, "Nome checkout")
        self.assertEqual(pedido.telefone_cliente_snapshot, "11777777777")
        self.assertEqual(pedido.email_cliente_snapshot, "checkout@example.com")

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

    def test_google_routes_403_nao_bloqueia_checkout(self):
        self.adicionar_brinquedo()
        self.client.force_authenticate(user=self.usuario)

        with patch(
            "pedidos.services.TaxaEntregaRetiradaService",
            return_value=FakeTaxaEntregaRetiradaService(erro=RotaProviderError()),
        ):
            response = self.client.post(
                self.converter_pedido_url,
                self.payload_pedido_com_contrato(),
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        pedido = Pedido.objects.get()
        self.assertIsNone(pedido.taxa_entrega_retirada_snapshot)
        self.assertEqual(
            pedido.taxa_entrega_status_snapshot,
            Pedido.StatusTaxaEntrega.SUJEITA_ANALISE,
        )
        self.assertIn(
            "Taxa de entrega e retirada: sujeita à análise para este endereço.",
            response.data["whatsapp_resumo"],
        )

    def test_google_routes_sem_chave_nao_bloqueia_checkout(self):
        self.adicionar_brinquedo()
        self.client.force_authenticate(user=self.usuario)

        with patch(
            "pedidos.services.TaxaEntregaRetiradaService",
            return_value=FakeTaxaEntregaRetiradaService(
                erro=ConfiguracaoTaxaAusenteError()
            ),
        ):
            response = self.client.post(
                self.converter_pedido_url,
                self.payload_pedido_com_contrato(),
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        pedido = Pedido.objects.get()
        self.assertIsNone(pedido.taxa_entrega_retirada_snapshot)
        self.assertEqual(
            pedido.taxa_entrega_status_snapshot,
            Pedido.StatusTaxaEntrega.SUJEITA_ANALISE,
        )

    def test_falha_externa_de_rota_converte_carrinho_uma_unica_vez(self):
        self.adicionar_brinquedo()
        carrinho = Carrinho.objects.get()
        self.client.force_authenticate(user=self.usuario)

        with patch(
            "pedidos.services.TaxaEntregaRetiradaService",
            return_value=FakeTaxaEntregaRetiradaService(erro=RotaProviderError()),
        ):
            response = self.client.post(
                self.converter_pedido_url,
                self.payload_pedido_com_contrato(),
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        carrinho.refresh_from_db()
        self.assertEqual(carrinho.status, Carrinho.Status.CONVERTIDO)
        self.assertEqual(Pedido.objects.count(), 1)

    def test_conversao_exige_cep(self):
        self.adicionar_brinquedo()
        self.client.force_authenticate(user=self.usuario)
        payload = self.payload_pedido()
        payload.pop("cep")

        response = self.client.post(self.converter_pedido_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cep", response.data)

    def test_conversao_exige_numero(self):
        self.adicionar_brinquedo()
        self.client.force_authenticate(user=self.usuario)
        payload = self.payload_pedido()
        payload.pop("numero")

        response = self.client.post(self.converter_pedido_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("numero", response.data)

    def test_complemento_e_opcional_na_conversao(self):
        self.adicionar_brinquedo()
        self.client.force_authenticate(user=self.usuario)
        payload = self.payload_pedido_com_contrato()
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
        contrato = self.criar_contrato()
        self.converter_carrinho_em_pedido(contrato=contrato)
        carrinho.refresh_from_db()
        payload = self.payload_pedido(
            contrato_aceito=True,
            contrato_id=contrato.id,
            contrato_versao=contrato.versao,
        )

        with self.assertRaises(DRFValidationError):
            PedidoService.converter_carrinho(
                carrinho,
                payload,
                self.usuario,
            )

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
        self.client.force_authenticate(user=self.usuario)
        payload = self.payload_pedido()
        payload.pop("nome")

        response = self.client.post(self.converter_pedido_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("nome", response.data)

    def test_conversao_exige_telefone(self):
        self.adicionar_brinquedo()
        self.client.force_authenticate(user=self.usuario)
        payload = self.payload_pedido()
        payload.pop("telefone")

        response = self.client.post(self.converter_pedido_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("telefone", response.data)

    def test_conversao_exige_email(self):
        self.adicionar_brinquedo()
        self.client.force_authenticate(user=self.usuario)
        payload = self.payload_pedido()
        payload.pop("email")

        response = self.client.post(self.converter_pedido_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)

    def test_conversao_nao_exige_data_evento_pretendida(self):
        self.adicionar_brinquedo()
        self.client.force_authenticate(user=self.usuario)
        payload = self.payload_pedido_com_contrato()
        payload.pop("data_evento_pretendida")

        with patch(
            "pedidos.services.TaxaEntregaRetiradaService",
            return_value=FakeTaxaEntregaRetiradaService(),
        ):
            response = self.client.post(self.converter_pedido_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertIsNone(Pedido.objects.get().data_evento_pretendida)

    def test_datas_enviadas_no_checkout_sao_ignoradas(self):
        self.adicionar_brinquedo()
        data_passada = str(timezone.localdate() - timedelta(days=1))

        response = self.converter_carrinho_em_pedido(
            data_evento_pretendida=data_passada,
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertIsNone(Pedido.objects.get().data_evento_pretendida)

    def test_conversao_deixa_data_inicio_para_o_admin(self):
        self.adicionar_brinquedo()
        data_inicio = timezone.localdate() + timedelta(days=31)

        response = self.converter_carrinho_em_pedido(
            data_inicio_locacao=str(data_inicio),
            data_fim_locacao=str(data_inicio + timedelta(days=2)),
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(Pedido.objects.get().data_inicio_locacao)
        self.assertIsNone(response.data["data_inicio_locacao"])

    def test_conversao_deixa_data_fim_para_o_admin(self):
        self.adicionar_brinquedo()
        data_inicio = timezone.localdate() + timedelta(days=31)
        data_fim = data_inicio + timedelta(days=3)

        response = self.converter_carrinho_em_pedido(
            data_inicio_locacao=str(data_inicio),
            data_fim_locacao=str(data_fim),
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(Pedido.objects.get().data_fim_locacao)
        self.assertIsNone(response.data["data_fim_locacao"])

    def test_conversao_nao_exige_data_inicio_locacao(self):
        self.adicionar_brinquedo()
        self.client.force_authenticate(user=self.usuario)
        payload = self.payload_pedido_com_contrato()
        payload.pop("data_inicio_locacao")

        with patch(
            "pedidos.services.TaxaEntregaRetiradaService",
            return_value=FakeTaxaEntregaRetiradaService(),
        ):
            response = self.client.post(self.converter_pedido_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertIsNone(Pedido.objects.get().data_inicio_locacao)

    def test_conversao_nao_exige_data_fim_locacao(self):
        self.adicionar_brinquedo()
        self.client.force_authenticate(user=self.usuario)
        payload = self.payload_pedido_com_contrato()
        payload.pop("data_fim_locacao")

        with patch(
            "pedidos.services.TaxaEntregaRetiradaService",
            return_value=FakeTaxaEntregaRetiradaService(),
        ):
            response = self.client.post(self.converter_pedido_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED, response.data)
        self.assertIsNone(Pedido.objects.get().data_fim_locacao)

    def test_conversao_ignora_periodo_exato_enviado(self):
        self.adicionar_brinquedo()
        data_inicio = timezone.localdate() + timedelta(days=30)

        response = self.converter_carrinho_em_pedido(
            data_inicio_locacao=str(data_inicio),
            data_fim_locacao=str(data_inicio),
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIsNone(Pedido.objects.get().data_inicio_locacao)

    def test_periodo_exato_nao_impede_criacao_do_pedido(self):
        self.adicionar_brinquedo()
        data_inicio = timezone.localdate() + timedelta(days=30)

        response = self.converter_carrinho_em_pedido(
            data_inicio_locacao=str(data_inicio),
            data_fim_locacao=str(data_inicio),
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Pedido.objects.count(), 1)

    def test_periodo_exato_nao_impede_conversao_do_carrinho(self):
        self.adicionar_brinquedo()
        carrinho = Carrinho.objects.get()
        data_inicio = timezone.localdate() + timedelta(days=30)

        response = self.converter_carrinho_em_pedido(
            data_inicio_locacao=str(data_inicio),
            data_fim_locacao=str(data_inicio),
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        carrinho.refresh_from_db()
        self.assertEqual(carrinho.status, Carrinho.Status.CONVERTIDO)

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

    def test_criacao_de_pedido_exige_aceite_de_contrato(self):
        self.adicionar_brinquedo()
        self.criar_contrato()

        response = self.converter_carrinho_em_pedido(aceitar_contrato=False)

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("contrato_aceito", response.data)
        self.assertEqual(Pedido.objects.count(), 0)

    def test_criacao_de_pedido_com_aceite_salva_snapshot_do_contrato(self):
        contrato = self.criar_contrato()
        self.adicionar_brinquedo()

        response = self.converter_carrinho_em_pedido(contrato=contrato)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        pedido = Pedido.objects.get()
        aceite = pedido.aceite_contrato
        self.assertEqual(aceite.contrato, contrato)
        self.assertEqual(aceite.contrato_titulo_snapshot, contrato.titulo)
        self.assertEqual(aceite.contrato_versao_snapshot, contrato.versao)
        self.assertEqual(aceite.contrato_texto_snapshot, contrato.texto)

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

    def test_anonimo_nao_acessa_contrato_do_pedido_mesmo_com_mesma_sessao(self):
        self.criar_contrato()
        self.adicionar_brinquedo()
        pedido_id = self.converter_carrinho_em_pedido().data["id"]
        self.client.force_authenticate(user=None)

        response = self.client.get(f"{self.pedidos_url}{pedido_id}/contrato/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonimo_nao_acessa_contrato_de_pedido(self):
        self.criar_contrato()
        self.adicionar_brinquedo()
        pedido_id = self.converter_carrinho_em_pedido().data["id"]
        outro_cliente = APIClient()

        response = outro_cliente.get(f"{self.pedidos_url}{pedido_id}/contrato/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_aceite_cria_registro_para_pedido_correto(self):
        contrato = self.criar_contrato()
        pedido_id = self.criar_pedido_legado_sem_aceite(contrato)

        response = self.aceitar_contrato(pedido_id, contrato=contrato)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        aceite = AceiteContrato.objects.get()
        self.assertEqual(aceite.pedido_id, pedido_id)
        self.assertEqual(aceite.contrato, contrato)
        self.assertEqual(response.data["pedido"], pedido_id)
        self.assertEqual(response.data["contrato"], contrato.id)

    def test_outro_usuario_nao_aceita_contrato_de_pedido_alheio(self):
        contrato = self.criar_contrato()
        pedido_id = self.criar_pedido_legado_sem_aceite(contrato)
        outro_cliente = APIClient()
        outro_cliente.force_authenticate(user=self.outro_usuario)

        response = self.aceitar_contrato(
            pedido_id,
            contrato=contrato,
            client=outro_cliente,
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertEqual(AceiteContrato.objects.count(), 0)

    def test_anonimo_nao_aceita_contrato_de_pedido(self):
        contrato = self.criar_contrato()
        pedido_id = self.criar_pedido_legado_sem_aceite(contrato)
        self.client.force_authenticate(user=None)

        response = self.aceitar_contrato(pedido_id, contrato=contrato)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(AceiteContrato.objects.count(), 0)

    def test_aceite_salva_snapshots_e_auditoria(self):
        contrato = self.criar_contrato()
        pedido_id = self.criar_pedido_legado_sem_aceite(contrato)

        response = self.aceitar_contrato(pedido_id, contrato=contrato)

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        aceite = AceiteContrato.objects.get()
        self.assertEqual(aceite.contrato_versao_snapshot, contrato.versao)
        self.assertEqual(aceite.contrato_titulo_snapshot, contrato.titulo)
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
        pedido_id = self.criar_pedido_legado_sem_aceite(contrato)

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
        pedido_id = self.criar_pedido_legado_sem_aceite(contrato)

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
        pedido_id = self.criar_pedido_legado_sem_aceite(contrato)
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


class PedidoAdminAPITests(APITestCase):
    lista_url = "/api/admin/pedidos/"

    def setUp(self):
        self.data_inicio = timezone.localdate() + timedelta(days=30)
        self.data_fim = self.data_inicio + timedelta(days=2)
        self.admin = get_user_model().objects.create_user(
            username="admin-pedidos",
            email="admin-pedidos@email.com",
            password="senha-segura-123",
            is_staff=True,
        )
        self.usuario = get_user_model().objects.create_user(
            username="cliente-admin-api",
            email="cliente-admin-api@email.com",
            password="senha-segura-123",
        )
        self.outro_usuario = get_user_model().objects.create_user(
            username="outro-cliente-admin-api",
            email="outro-admin-api@email.com",
            password="senha-segura-123",
        )
        self.cliente = Cliente.objects.create(
            user=self.usuario,
            nome="Cliente Vinculado",
            telefone="11988887777",
        )
        self.outro_cliente = Cliente.objects.create(
            user=self.outro_usuario,
            nome="Outro Cliente",
            telefone="11977776666",
        )
        self.categoria = Categoria.objects.create(
            nome="Brinquedos admin pedidos",
            slug="brinquedos-admin-pedidos",
        )
        self.brinquedo = Brinquedo.objects.create(
            nome="Cama elastica admin",
            descricao="Brinquedo para festas maiores.",
            categoria=self.categoria,
            preco_aluguel=Decimal("220.00"),
        )
        self.contrato = Contrato.objects.create(
            titulo="Contrato de locacao",
            versao="2026-05-admin-pedidos",
            texto="Texto vigente do contrato.",
            ativo=True,
        )

    def detalhe_url(self, pedido):
        return f"{self.lista_url}{pedido.id}/"

    def autenticar_admin(self):
        self.client.force_authenticate(user=self.admin)

    def test_admin_obtem_contrato_ativo(self):
        self.autenticar_admin()

        response = self.client.get("/api/admin/contrato/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.contrato.id)
        self.assertEqual(response.data["titulo"], self.contrato.titulo)
        self.assertEqual(response.data["versao"], self.contrato.versao)
        self.assertEqual(response.data["texto"], self.contrato.texto)

    def test_cliente_comum_nao_acessa_admin_contrato(self):
        self.client.force_authenticate(user=self.usuario)

        response = self.client.get("/api/admin/contrato/")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_cria_contrato_padrao_sem_versao_manual(self):
        self.contrato.delete()
        self.autenticar_admin()

        response = self.client.put(
            "/api/admin/contrato/",
            {
                "titulo": "Contrato de locacao",
                "texto": "Texto padrao do contrato.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        contrato = Contrato.objects.get(ativo=True)
        self.assertEqual(contrato.titulo, "Contrato de locacao")
        self.assertEqual(contrato.texto, "Texto padrao do contrato.")
        self.assertTrue(contrato.versao.startswith("admin-"))

    def test_admin_nao_salva_contrato_com_titulo_ou_texto_vazio(self):
        self.autenticar_admin()

        response = self.client.patch(
            "/api/admin/contrato/",
            {
                "titulo": "   ",
                "texto": "",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("titulo", response.data)
        self.assertIn("texto", response.data)

    def test_admin_atualiza_contrato_sem_aceites_no_mesmo_registro(self):
        self.autenticar_admin()

        response = self.client.patch(
            "/api/admin/contrato/",
            {
                "titulo": "Contrato atualizado",
                "versao": "2026-06-admin-pedidos",
                "texto": "Texto atualizado.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.contrato.refresh_from_db()
        self.assertEqual(self.contrato.titulo, "Contrato atualizado")
        self.assertEqual(self.contrato.versao, "2026-06-admin-pedidos")
        self.assertEqual(self.contrato.texto, "Texto atualizado.")
        self.assertTrue(self.contrato.ativo)

    def test_admin_cria_nova_versao_quando_contrato_ja_tem_aceite(self):
        pedido = self.criar_pedido()
        AceiteContrato.objects.create(
            pedido=pedido,
            contrato=self.contrato,
            contrato_versao_snapshot=self.contrato.versao,
            contrato_titulo_snapshot=self.contrato.titulo,
            contrato_texto_snapshot=self.contrato.texto,
            nome_cliente_snapshot=pedido.nome_cliente_snapshot,
            email_cliente_snapshot=pedido.email_cliente_snapshot,
            aceito_em=timezone.now(),
        )
        self.autenticar_admin()

        response = self.client.patch(
            "/api/admin/contrato/",
            {
                "titulo": "Contrato nova versao",
                "versao": "2026-07-admin-pedidos",
                "texto": "Texto da nova versao.",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.contrato.refresh_from_db()
        self.assertFalse(self.contrato.ativo)
        novo = Contrato.objects.get(ativo=True)
        self.assertEqual(novo.titulo, "Contrato nova versao")
        self.assertEqual(novo.versao, "2026-07-admin-pedidos")
        self.assertEqual(pedido.aceite_contrato.contrato_titulo_snapshot, "Contrato de locacao")

    def criar_pedido(
        self,
        cliente=None,
        usuario=None,
        status_pedido=None,
        nome_snapshot="Cliente Snapshot",
        email_snapshot="snapshot@email.com",
        telefone_snapshot="11999999999",
    ):
        cliente = cliente if cliente is not None else self.cliente
        usuario = usuario if usuario is not None else self.usuario
        return Pedido.objects.create(
            usuario=usuario,
            cliente=cliente,
            nome_cliente_snapshot=nome_snapshot,
            telefone_cliente_snapshot=telefone_snapshot,
            email_cliente_snapshot=email_snapshot,
            observacoes_cliente="Entregar no salao.",
            data_evento_pretendida=self.data_inicio,
            data_inicio_locacao=self.data_inicio,
            data_fim_locacao=self.data_fim,
            subtotal_itens_snapshot=Decimal("220.00"),
            endereco_entrega_snapshot={
                "cep": "01001000",
                "logradouro": "Praca da Se",
                "numero": "100",
                "bairro": "Se",
                "cidade": "Sao Paulo",
                "uf": "SP",
            },
            distancia_ida_km_snapshot=Decimal("8.00"),
            distancia_total_km_snapshot=Decimal("16.00"),
            valor_por_km_snapshot=Decimal("3.00"),
            taxa_entrega_retirada_snapshot=Decimal("48.00"),
            total_estimado_snapshot=Decimal("268.00"),
            status=status_pedido or Pedido.Status.AGUARDANDO_ANALISE,
        )

    def criar_item(self, pedido):
        return ItemPedido.objects.create(
            pedido=pedido,
            tipo_item=ItemCarrinho.TipoItem.BRINQUEDO,
            brinquedo=self.brinquedo,
            quantidade=1,
            nome_snapshot=self.brinquedo.nome,
            preco_unitario_snapshot=self.brinquedo.preco_aluguel,
            subtotal_snapshot=self.brinquedo.preco_aluguel,
            snapshot={
                "tipo_item": "brinquedo",
                "brinquedo": {"id": self.brinquedo.id, "nome": self.brinquedo.nome},
                "quantidade": 1,
            },
        )

    def criar_aceite(self, pedido):
        return AceiteContrato.objects.create(
            pedido=pedido,
            contrato=self.contrato,
            contrato_versao_snapshot=self.contrato.versao,
            contrato_texto_snapshot=self.contrato.texto,
            nome_cliente_snapshot=pedido.nome_cliente_snapshot,
            email_cliente_snapshot=pedido.email_cliente_snapshot,
            aceito_em=timezone.now(),
            ip="203.0.113.10",
            user_agent="Teste Browser",
        )

    def criar_reserva(self, pedido, item):
        unidade = UnidadeBrinquedo.objects.create(
            brinquedo=self.brinquedo,
            codigo=f"ADM-PED-{UnidadeBrinquedo.objects.count() + 1:03d}",
            status=UnidadeBrinquedo.Status.DISPONIVEL,
        )
        return ReservaUnidade.objects.create(
            pedido=pedido,
            item_pedido=item,
            unidade_brinquedo=unidade,
            data_inicio=self.data_inicio,
            data_fim=self.data_fim,
            status=ReservaUnidade.Status.ATIVA,
        )

    def test_anonimo_nao_acessa_lista_admin(self):
        response = self.client.get(self.lista_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_usuario_comum_nao_acessa_lista_admin(self):
        self.client.force_authenticate(user=self.usuario)

        response = self.client.get(self.lista_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_lista_pedidos_com_campos_resumidos(self):
        self.autenticar_admin()
        pedido = self.criar_pedido()
        self.criar_item(pedido)
        self.criar_aceite(pedido)

        response = self.client.get(self.lista_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        item = response.data["results"][0]
        self.assertEqual(item["id"], pedido.id)
        self.assertEqual(item["status"], Pedido.Status.AGUARDANDO_ANALISE)
        self.assertEqual(item["cliente"]["id"], self.cliente.id)
        self.assertEqual(item["cliente_snapshot"]["nome"], "Cliente Snapshot")
        self.assertEqual(item["cliente_snapshot"]["email"], "snapshot@email.com")
        self.assertEqual(item["cliente_snapshot"]["telefone"], "11999999999")
        self.assertEqual(item["total_estimado_snapshot"], "268.00")
        self.assertTrue(item["tem_aceite_contrato"])
        self.assertFalse(item["possui_reservas_ativas"])
        self.assertEqual(item["quantidade_itens"], 1)
        self.assertNotIn("itens", item)
        self.assertNotIn("reservas", item)
        self.assertNotIn("contrato_texto_snapshot", item)

    def test_admin_ve_detalhe_de_qualquer_pedido_com_dados_tratados(self):
        self.autenticar_admin()
        pedido = self.criar_pedido(
            cliente=self.outro_cliente,
            usuario=self.outro_usuario,
            status_pedido=Pedido.Status.RESERVADO,
        )
        item = self.criar_item(pedido)
        self.criar_aceite(pedido)
        reserva = self.criar_reserva(pedido, item)

        response = self.client.get(self.detalhe_url(pedido))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], pedido.id)
        self.assertEqual(response.data["cliente"]["id"], self.outro_cliente.id)
        self.assertEqual(response.data["cliente_snapshot"]["nome"], "Cliente Snapshot")
        self.assertEqual(response.data["endereco_entrega"]["logradouro"], "Praca da Se")
        self.assertEqual(response.data["valores"]["subtotal_itens_snapshot"], "220.00")
        self.assertEqual(
            response.data["valores"]["taxa_entrega_retirada_snapshot"],
            "48.00",
        )
        self.assertEqual(response.data["valores"]["total_estimado_snapshot"], "268.00")
        self.assertEqual(len(response.data["itens"]), 1)
        self.assertEqual(response.data["itens"][0]["id"], item.id)
        self.assertEqual(
            response.data["itens"][0]["resumo_composicao"]["brinquedo"]["id"],
            self.brinquedo.id,
        )
        self.assertNotIn("snapshot", response.data["itens"][0])
        self.assertEqual(response.data["aceite_contrato"]["contrato"], self.contrato.id)
        self.assertEqual(
            response.data["aceite_contrato"]["versao_aceita"],
            self.contrato.versao,
        )
        self.assertEqual(response.data["aceite_contrato"]["ip"], "203.0.113.10")
        self.assertEqual(len(response.data["reservas"]), 1)
        self.assertEqual(response.data["reservas"][0]["id"], reserva.id)
        self.assertEqual(response.data["reservas"][0]["item_pedido"], item.id)
        self.assertEqual(
            response.data["reservas"][0]["unidade"]["id"],
            reserva.unidade_brinquedo_id,
        )
        self.assertEqual(
            response.data["reservas"][0]["brinquedo"]["id"],
            self.brinquedo.id,
        )
        self.assertEqual(len(response.data["unidades_reservadas"]), 1)
        self.assertEqual(response.data["acoes_disponiveis"], ["confirmar"])

    def test_acoes_disponiveis_incluem_reservar_para_pedido_reservavel(self):
        self.autenticar_admin()
        pedido = self.criar_pedido(status_pedido=Pedido.Status.AGUARDANDO_ANALISE)
        self.criar_item(pedido)

        response = self.client.get(self.detalhe_url(pedido))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["tem_aceite_contrato"], False)
        self.assertEqual(response.data["acoes_disponiveis"], ["reservar_unidades"])

    def test_acoes_disponiveis_nao_incluem_reservar_sem_itens_ou_periodo(self):
        self.autenticar_admin()
        sem_itens = self.criar_pedido(status_pedido=Pedido.Status.AGUARDANDO_ANALISE)
        periodo_invalido = self.criar_pedido(
            status_pedido=Pedido.Status.AGUARDANDO_ANALISE,
            nome_snapshot="Periodo Invalido",
        )
        periodo_invalido.data_fim_locacao = periodo_invalido.data_inicio_locacao
        periodo_invalido.save(update_fields=["data_fim_locacao", "atualizado_em"])
        self.criar_item(periodo_invalido)

        response_sem_itens = self.client.get(self.detalhe_url(sem_itens))
        response_periodo_invalido = self.client.get(
            self.detalhe_url(periodo_invalido)
        )

        self.assertEqual(response_sem_itens.status_code, status.HTTP_200_OK)
        self.assertEqual(response_sem_itens.data["acoes_disponiveis"], [])
        self.assertEqual(response_periodo_invalido.status_code, status.HTTP_200_OK)
        self.assertEqual(response_periodo_invalido.data["acoes_disponiveis"], [])

    def test_acoes_disponiveis_dos_principais_status(self):
        self.autenticar_admin()
        reservado = self.criar_pedido(status_pedido=Pedido.Status.RESERVADO)
        item_reservado = self.criar_item(reservado)
        self.criar_aceite(reservado)
        self.criar_reserva(reservado, item_reservado)
        reservado_sem_aceite = self.criar_pedido(
            status_pedido=Pedido.Status.RESERVADO,
            nome_snapshot="Reservado Sem Aceite",
        )
        item_sem_aceite = self.criar_item(reservado_sem_aceite)
        self.criar_reserva(reservado_sem_aceite, item_sem_aceite)
        confirmado = self.criar_pedido(status_pedido=Pedido.Status.CONFIRMADO)
        self.criar_item(confirmado)
        em_locacao = self.criar_pedido(status_pedido=Pedido.Status.EM_LOCACAO)
        self.criar_item(em_locacao)

        casos = (
            (reservado, ["confirmar"]),
            (reservado_sem_aceite, []),
            (confirmado, ["iniciar_locacao"]),
            (em_locacao, ["registrar_retirada"]),
        )

        for pedido, acoes_esperadas in casos:
            with self.subTest(status=pedido.status, pedido=pedido.id):
                response = self.client.get(self.detalhe_url(pedido))

                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.assertEqual(response.data["acoes_disponiveis"], acoes_esperadas)

    def test_filtro_por_status_funciona(self):
        self.autenticar_admin()
        reservado = self.criar_pedido(status_pedido=Pedido.Status.RESERVADO)
        self.criar_pedido(status_pedido=Pedido.Status.CANCELADO)

        response = self.client.get(
            self.lista_url,
            {"status": Pedido.Status.RESERVADO},
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], reservado.id)

    def test_filtro_por_cliente_funciona(self):
        self.autenticar_admin()
        esperado = self.criar_pedido(cliente=self.outro_cliente, usuario=self.outro_usuario)
        self.criar_pedido()

        response = self.client.get(self.lista_url, {"cliente": self.outro_cliente.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], esperado.id)

    def test_busca_por_nome_email_e_telefone_snapshot_funciona(self):
        self.autenticar_admin()
        esperado = self.criar_pedido(
            nome_snapshot="Maria Busca",
            email_snapshot="maria.busca@email.com",
            telefone_snapshot="51912345678",
        )
        self.criar_pedido(
            nome_snapshot="Cliente Diferente",
            email_snapshot="diferente@email.com",
            telefone_snapshot="11900000000",
        )

        for termo in ("Maria Busca", "maria.busca@email.com", "51912345678"):
            with self.subTest(termo=termo):
                response = self.client.get(self.lista_url, {"busca": termo})

                self.assertEqual(response.status_code, status.HTTP_200_OK)
                self.assertEqual(response.data["count"], 1)
                self.assertEqual(response.data["results"][0]["id"], esperado.id)

    def test_ordenacao_padrao_e_por_mais_recentes(self):
        self.autenticar_admin()
        antigo = self.criar_pedido(nome_snapshot="Antigo")
        recente = self.criar_pedido(nome_snapshot="Recente")
        Pedido.objects.filter(id=antigo.id).update(
            criado_em=timezone.now() - timedelta(days=2),
        )
        Pedido.objects.filter(id=recente.id).update(criado_em=timezone.now())

        response = self.client.get(self.lista_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [pedido["id"] for pedido in response.data["results"]]
        self.assertEqual(ids, [recente.id, antigo.id])

    def test_endpoint_publico_continua_listando_apenas_pedidos_do_usuario(self):
        pedido_usuario = self.criar_pedido()
        pedido_outro = self.criar_pedido(
            cliente=self.outro_cliente,
            usuario=self.outro_usuario,
        )
        self.client.force_authenticate(user=self.usuario)

        response = self.client.get("/api/pedidos/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids = [pedido["id"] for pedido in response.data]
        self.assertIn(pedido_usuario.id, ids)
        self.assertNotIn(pedido_outro.id, ids)

    def test_endpoint_publico_continua_bloqueando_pedido_de_outro_cliente(self):
        pedido_outro = self.criar_pedido(
            cliente=self.outro_cliente,
            usuario=self.outro_usuario,
        )
        self.client.force_authenticate(user=self.usuario)

        response = self.client.get(f"/api/pedidos/{pedido_outro.id}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)


class PedidoAdminAgendaAPITests(APITestCase):
    agenda_url = "/api/admin/agenda/"

    def setUp(self):
        self.data_inicio = timezone.localdate() + timedelta(days=30)
        self.data_fim = self.data_inicio + timedelta(days=6)
        self.admin = get_user_model().objects.create_user(
            username="admin-agenda",
            email="admin-agenda@email.com",
            password="senha-segura-123",
            is_staff=True,
        )
        self.usuario = get_user_model().objects.create_user(
            username="cliente-agenda",
            email="cliente-agenda@email.com",
            password="senha-segura-123",
        )
        self.cliente = Cliente.objects.create(
            user=self.usuario,
            nome="Cliente Agenda",
            telefone="51999999999",
        )
        self.categoria = Categoria.objects.create(
            nome="Brinquedos agenda",
            slug="brinquedos-agenda",
        )
        self.brinquedo = Brinquedo.objects.create(
            nome="Cama elastica agenda",
            descricao="Brinquedo para agenda.",
            categoria=self.categoria,
            preco_aluguel=Decimal("220.00"),
        )
        self.outro_brinquedo = Brinquedo.objects.create(
            nome="Piscina de bolinhas agenda",
            descricao="Brinquedo de apoio para kit.",
            categoria=self.categoria,
            preco_aluguel=Decimal("160.00"),
        )
        self.kit_festa = KitFesta.objects.create(
            nome="Kit Festa Agenda",
            descricao="Kit usado em evento de agenda.",
            preco_aluguel=Decimal("350.00"),
        )
        ItemKitFesta.objects.create(
            kit=self.kit_festa,
            brinquedo=self.brinquedo,
            quantidade=1,
        )
        self.contrato = Contrato.objects.create(
            titulo="Contrato agenda",
            versao="2026-05-agenda",
            texto="Texto vigente do contrato para agenda.",
            ativo=True,
        )

    def parametros(self, **extra):
        params = {
            "inicio": self.data_inicio.isoformat(),
            "fim": self.data_fim.isoformat(),
        }
        params.update(extra)
        return params

    def autenticar_admin(self):
        self.client.force_authenticate(user=self.admin)

    def criar_pedido(
        self,
        status_pedido,
        data_inicio=None,
        data_fim=None,
        nome_snapshot="Cliente Agenda",
    ):
        data_inicio = data_inicio or self.data_inicio
        data_fim = data_fim or data_inicio + timedelta(days=2)
        return Pedido.objects.create(
            usuario=self.usuario,
            cliente=self.cliente,
            nome_cliente_snapshot=nome_snapshot,
            telefone_cliente_snapshot="51999999999",
            email_cliente_snapshot="cliente-agenda@email.com",
            observacoes_cliente="Entregar com antecedencia.",
            data_evento_pretendida=data_inicio,
            data_inicio_locacao=data_inicio,
            data_fim_locacao=data_fim,
            subtotal_itens_snapshot=Decimal("220.00"),
            endereco_entrega_snapshot={
                "cep": "01001000",
                "logradouro": "Praca da Se",
                "numero": "100",
                "bairro": "Se",
                "cidade": "Sao Paulo",
                "uf": "SP",
            },
            distancia_ida_km_snapshot=Decimal("8.00"),
            distancia_total_km_snapshot=Decimal("16.00"),
            valor_por_km_snapshot=Decimal("3.00"),
            taxa_entrega_retirada_snapshot=Decimal("48.00"),
            total_estimado_snapshot=Decimal("268.00"),
            status=status_pedido,
        )

    def criar_item_brinquedo(self, pedido, brinquedo=None):
        brinquedo = brinquedo or self.brinquedo
        return ItemPedido.objects.create(
            pedido=pedido,
            tipo_item=ItemCarrinho.TipoItem.BRINQUEDO,
            brinquedo=brinquedo,
            quantidade=1,
            nome_snapshot=brinquedo.nome,
            preco_unitario_snapshot=brinquedo.preco_aluguel,
            subtotal_snapshot=brinquedo.preco_aluguel,
            snapshot={
                "tipo_item": "brinquedo",
                "brinquedo": {"id": brinquedo.id, "nome": brinquedo.nome},
                "quantidade": 1,
            },
        )

    def criar_item_kit_festa(self, pedido):
        return ItemPedido.objects.create(
            pedido=pedido,
            tipo_item=ItemCarrinho.TipoItem.KIT_FESTA,
            kit_festa=self.kit_festa,
            quantidade=1,
            nome_snapshot=self.kit_festa.nome,
            preco_unitario_snapshot=self.kit_festa.preco_aluguel,
            subtotal_snapshot=self.kit_festa.preco_aluguel,
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
                        }
                    ],
                },
                "quantidade": 1,
            },
        )

    def criar_unidade(self, brinquedo=None, status_unidade=None, codigo=None):
        brinquedo = brinquedo or self.brinquedo
        return UnidadeBrinquedo.objects.create(
            brinquedo=brinquedo,
            codigo=codigo or f"AGENDA-{UnidadeBrinquedo.objects.count() + 1:03d}",
            status=status_unidade or UnidadeBrinquedo.Status.DISPONIVEL,
        )

    def criar_reserva(self, pedido, item, unidade):
        return ReservaUnidade.objects.create(
            pedido=pedido,
            item_pedido=item,
            unidade_brinquedo=unidade,
            data_inicio=pedido.data_inicio_locacao,
            data_fim=pedido.data_fim_locacao,
            status=ReservaUnidade.Status.ATIVA,
        )

    def criar_aceite(self, pedido):
        return AceiteContrato.objects.create(
            pedido=pedido,
            contrato=self.contrato,
            contrato_versao_snapshot=self.contrato.versao,
            contrato_texto_snapshot=self.contrato.texto,
            nome_cliente_snapshot=pedido.nome_cliente_snapshot,
            email_cliente_snapshot=pedido.email_cliente_snapshot,
            aceito_em=timezone.now(),
            ip="203.0.113.50",
            user_agent="Agenda Test Browser",
        )

    def preparar_cenario_agenda(self):
        entrega = self.criar_pedido(
            Pedido.Status.CONFIRMADO,
            data_inicio=self.data_inicio + timedelta(days=1),
        )
        item_entrega = self.criar_item_kit_festa(entrega)
        unidade_entrega = self.criar_unidade(codigo="AGENDA-ENTREGA-001")
        self.criar_reserva(entrega, item_entrega, unidade_entrega)
        self.criar_aceite(entrega)

        em_locacao = self.criar_pedido(
            Pedido.Status.EM_LOCACAO,
            data_inicio=self.data_inicio + timedelta(days=2),
            data_fim=self.data_inicio + timedelta(days=4),
            nome_snapshot="Cliente em locacao",
        )
        item_em_locacao = self.criar_item_brinquedo(em_locacao)
        unidade_em_locacao = self.criar_unidade(
            status_unidade=UnidadeBrinquedo.Status.EM_LOCACAO,
            codigo="AGENDA-LOCACAO-001",
        )
        self.criar_reserva(em_locacao, item_em_locacao, unidade_em_locacao)
        self.criar_aceite(em_locacao)

        contrato_pendente = self.criar_pedido(
            Pedido.Status.RESERVADO,
            data_inicio=self.data_inicio + timedelta(days=3),
            nome_snapshot="Cliente sem contrato",
        )
        item_contrato = self.criar_item_brinquedo(contrato_pendente)
        unidade_contrato = self.criar_unidade(codigo="AGENDA-CONTRATO-001")
        self.criar_reserva(contrato_pendente, item_contrato, unidade_contrato)

        reservado_com_aceite = self.criar_pedido(
            Pedido.Status.RESERVADO,
            data_inicio=self.data_inicio + timedelta(days=3),
            nome_snapshot="Cliente com contrato",
        )
        self.criar_item_brinquedo(reservado_com_aceite)
        self.criar_aceite(reservado_com_aceite)

        higienizacao = self.criar_pedido(
            Pedido.Status.RETIRADO,
            data_inicio=self.data_inicio + timedelta(days=5),
            nome_snapshot="Cliente retirado",
        )
        item_higienizacao = self.criar_item_brinquedo(higienizacao)
        unidade_higienizacao = self.criar_unidade(
            status_unidade=UnidadeBrinquedo.Status.HIGIENIZACAO,
            codigo="AGENDA-HIG-001",
        )
        self.criar_reserva(higienizacao, item_higienizacao, unidade_higienizacao)

        standby = self.criar_unidade(
            status_unidade=UnidadeBrinquedo.Status.STANDBY,
            codigo="AGENDA-STANDBY-001",
        )

        return {
            "entrega": entrega,
            "em_locacao": em_locacao,
            "contrato_pendente": contrato_pendente,
            "reservado_com_aceite": reservado_com_aceite,
            "higienizacao": higienizacao,
            "standby": standby,
        }

    def test_anonimo_nao_acessa_agenda_admin(self):
        response = self.client.get(self.agenda_url, self.parametros())

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_usuario_comum_nao_acessa_agenda_admin(self):
        self.client.force_authenticate(user=self.usuario)

        response = self.client.get(self.agenda_url, self.parametros())

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_admin_lista_eventos_operacionais_do_periodo(self):
        self.autenticar_admin()
        pedidos = self.preparar_cenario_agenda()

        response = self.client.get(self.agenda_url, self.parametros())

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["periodo"],
            {
                "inicio": self.data_inicio.isoformat(),
                "fim": self.data_fim.isoformat(),
            },
        )
        self.assertEqual(response.data["resumo"]["total"], 4)
        self.assertEqual(
            response.data["resumo"]["por_tipo"],
            {
                "entrega": 1,
                "retirada": 1,
                "contrato_pendente": 1,
                "locacao_em_andamento": 1,
            },
        )

        eventos_por_tipo = {evento["tipo"]: evento for evento in response.data["eventos"]}
        self.assertEqual(
            eventos_por_tipo["entrega"]["id"],
            f"pedido-{pedidos['entrega'].id}-entrega",
        )
        self.assertEqual(
            eventos_por_tipo["entrega"]["data"],
            pedidos["entrega"].data_inicio_locacao.isoformat(),
        )
        self.assertIsNone(eventos_por_tipo["entrega"]["hora_inicio"])
        self.assertTrue(eventos_por_tipo["entrega"]["pedido"]["tem_kit_festa"])
        self.assertTrue(
            eventos_por_tipo["entrega"]["pedido"]["tem_aceite_contrato"]
        )
        self.assertEqual(
            eventos_por_tipo["entrega"]["unidades"][0]["codigo"],
            "AGENDA-ENTREGA-001",
        )

        self.assertEqual(
            eventos_por_tipo["retirada"]["data"],
            pedidos["em_locacao"].data_fim_locacao.isoformat(),
        )
        self.assertEqual(
            eventos_por_tipo["locacao_em_andamento"]["data"],
            pedidos["em_locacao"].data_inicio_locacao.isoformat(),
        )
        self.assertEqual(
            eventos_por_tipo["contrato_pendente"]["pedido"]["id"],
            pedidos["contrato_pendente"].id,
        )

        ids_pedidos = {
            evento["pedido"]["id"]
            for evento in response.data["eventos"]
        }
        self.assertNotIn(pedidos["reservado_com_aceite"].id, ids_pedidos)
        self.assertNotIn(pedidos["higienizacao"].id, ids_pedidos)
        codigos_unidades = {
            unidade["codigo"]
            for evento in response.data["eventos"]
            for unidade in evento["unidades"]
        }
        self.assertNotIn("AGENDA-HIG-001", codigos_unidades)
        self.assertNotIn("AGENDA-STANDBY-001", codigos_unidades)

    def test_agenda_filtra_por_tipo(self):
        self.autenticar_admin()
        self.preparar_cenario_agenda()

        response = self.client.get(
            self.agenda_url,
            self.parametros(tipo="retirada,contrato_pendente"),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [evento["tipo"] for evento in response.data["eventos"]],
            ["contrato_pendente", "retirada"],
        )
        self.assertEqual(response.data["resumo"]["total"], 2)
        self.assertEqual(response.data["resumo"]["por_tipo"]["entrega"], 0)
        self.assertEqual(response.data["resumo"]["por_tipo"]["retirada"], 1)

    def test_agenda_filtra_por_status_do_pedido(self):
        self.autenticar_admin()
        self.preparar_cenario_agenda()

        response = self.client.get(
            self.agenda_url,
            self.parametros(status=Pedido.Status.EM_LOCACAO),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [evento["tipo"] for evento in response.data["eventos"]],
            ["locacao_em_andamento", "retirada"],
        )

    def test_locacao_em_andamento_ancora_no_inicio_do_periodo_consultado(self):
        self.autenticar_admin()
        pedido = self.criar_pedido(
            Pedido.Status.EM_LOCACAO,
            data_inicio=self.data_inicio - timedelta(days=2),
            data_fim=self.data_inicio + timedelta(days=2),
        )
        item = self.criar_item_brinquedo(pedido)
        unidade = self.criar_unidade(
            status_unidade=UnidadeBrinquedo.Status.EM_LOCACAO,
            codigo="AGENDA-LOCACAO-ANTERIOR-001",
        )
        self.criar_reserva(pedido, item, unidade)

        response = self.client.get(
            self.agenda_url,
            self.parametros(tipo="locacao_em_andamento"),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["eventos"]), 1)
        self.assertEqual(
            response.data["eventos"][0]["data"],
            self.data_inicio.isoformat(),
        )

    def test_agenda_exige_inicio_e_fim_validos(self):
        self.autenticar_admin()

        sem_inicio = self.client.get(
            self.agenda_url,
            {"fim": self.data_fim.isoformat()},
        )
        fim_antes_inicio = self.client.get(
            self.agenda_url,
            {
                "inicio": self.data_fim.isoformat(),
                "fim": self.data_inicio.isoformat(),
            },
        )
        intervalo_longo = self.client.get(
            self.agenda_url,
            {
                "inicio": self.data_inicio.isoformat(),
                "fim": (self.data_inicio + timedelta(days=31)).isoformat(),
            },
        )

        self.assertEqual(sem_inicio.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("inicio", sem_inicio.data)
        self.assertEqual(fim_antes_inicio.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("fim", fim_antes_inicio.data)
        self.assertEqual(intervalo_longo.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("fim", intervalo_longo.data)

    def test_agenda_rejeita_tipo_invalido(self):
        self.autenticar_admin()

        response = self.client.get(
            self.agenda_url,
            self.parametros(tipo="entrega,higienizacao"),
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("tipo", response.data)

    def test_agenda_nao_expoe_dados_sensiveis_do_aceite(self):
        self.autenticar_admin()
        self.preparar_cenario_agenda()

        response = self.client.get(
            self.agenda_url,
            self.parametros(tipo="entrega"),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        evento = response.data["eventos"][0]
        self.assertNotIn("aceite_contrato", evento)
        self.assertNotIn("email_cliente_snapshot", evento["pedido"])
        self.assertNotIn("ip", evento["pedido"])
        self.assertNotIn("user_agent", evento["pedido"])


class ReservaUnidadesPedidoAdminTests(APITestCase):
    def setUp(self):
        self.url_template = "/api/admin/pedidos/{}/reservar-unidades/"
        self.confirmar_url_template = "/api/admin/pedidos/{}/confirmar/"
        self.iniciar_locacao_url_template = (
            "/api/admin/pedidos/{}/iniciar-locacao/"
        )
        self.registrar_retirada_url_template = (
            "/api/admin/pedidos/{}/registrar-retirada/"
        )
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

    def iniciar_locacao_url(self, pedido=None):
        pedido = pedido or self.pedido
        return self.iniciar_locacao_url_template.format(pedido.id)

    def registrar_retirada_url(self, pedido=None):
        pedido = pedido or self.pedido
        return self.registrar_retirada_url_template.format(pedido.id)

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

    def dedicar_unidade_ao_kit(self, unidade, brinquedo):
        item_kit = self.kit_festa.itens.get(brinquedo=brinquedo)
        return DedicacaoUnidadeKit.objects.create(item_kit=item_kit, unidade=unidade)

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

    def preparar_pedido_confirmado(self):
        item, unidade, reserva = self.preparar_pedido_confirmavel()
        self.pedido.status = Pedido.Status.CONFIRMADO
        self.pedido.save(update_fields=["status", "atualizado_em"])
        return item, unidade, reserva

    def preparar_pedido_em_locacao(self):
        item, unidade, reserva = self.preparar_pedido_confirmado()
        unidade.status = UnidadeBrinquedo.Status.EM_LOCACAO
        unidade.save(update_fields=["status", "atualizado_em"])
        self.pedido.status = Pedido.Status.EM_LOCACAO
        self.pedido.save(update_fields=["status", "atualizado_em"])
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
        self.dedicar_unidade_ao_kit(self.criar_unidade(brinquedo=self.brinquedo, codigo="CAMA-001"), self.brinquedo)
        self.dedicar_unidade_ao_kit(self.criar_unidade(brinquedo=self.outro_brinquedo, codigo="PISC-001"), self.outro_brinquedo)
        self.dedicar_unidade_ao_kit(self.criar_unidade(brinquedo=self.outro_brinquedo, codigo="PISC-002"), self.outro_brinquedo)

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

    def test_reserva_kit_festa_rejeita_composicao_sem_unidades_dedicadas(self):
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

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("disponibilidade", response.data)
        self.assertFalse(ReservaUnidade.objects.exists())

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

    def test_reserva_nao_exige_contrato_aceito(self):
        self.autenticar_admin()
        self.pedido = self.criar_pedido(aceitar=False)
        self.criar_item_brinquedo()
        self.criar_unidade()

        response = self.client.post(self.url(), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], Pedido.Status.RESERVADO)
        self.assertEqual(ReservaUnidade.objects.count(), 1)

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

    def test_nao_confirma_pedido_se_brinquedo_ficou_indisponivel(self):
        self.autenticar_admin()
        self.preparar_pedido_confirmavel()
        self.brinquedo.indisponivel_catalogo = True
        self.brinquedo.save(update_fields=["indisponivel_catalogo"])

        response = self.client.post(self.confirmar_url(), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("alugado", str(response.data).lower())
        self.pedido.refresh_from_db()
        self.assertEqual(self.pedido.status, Pedido.Status.RESERVADO)

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

    def test_admin_inicia_locacao_de_pedido_confirmado(self):
        self.autenticar_admin()
        item, unidade, reserva = self.preparar_pedido_confirmado()
        total_estimado = self.pedido.total_estimado_snapshot

        response = self.client.post(self.iniciar_locacao_url(), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.pedido.refresh_from_db()
        reserva.refresh_from_db()
        unidade.refresh_from_db()
        item.refresh_from_db()
        self.assertEqual(self.pedido.status, Pedido.Status.EM_LOCACAO)
        self.assertEqual(unidade.status, UnidadeBrinquedo.Status.EM_LOCACAO)
        self.assertEqual(reserva.status, ReservaUnidade.Status.ATIVA)
        self.assertEqual(item.pedido, self.pedido)
        self.assertEqual(self.pedido.total_estimado_snapshot, total_estimado)
        self.assertEqual(response.data["id"], self.pedido.id)
        self.assertEqual(response.data["status"], Pedido.Status.EM_LOCACAO)
        self.assertEqual(
            response.data["unidades_atualizadas"],
            [{"id": unidade.id, "status": UnidadeBrinquedo.Status.EM_LOCACAO}],
        )

    def test_iniciar_locacao_exige_pedido_confirmado(self):
        self.autenticar_admin()
        self.preparar_pedido_confirmavel()

        response = self.client.post(self.iniciar_locacao_url(), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("status", response.data)
        self.pedido.refresh_from_db()
        self.assertEqual(self.pedido.status, Pedido.Status.RESERVADO)

    def test_iniciar_locacao_exige_reservas_ativas(self):
        self.autenticar_admin()
        self.pedido = self.criar_pedido(status_pedido=Pedido.Status.CONFIRMADO)
        self.criar_item_brinquedo()

        response = self.client.post(self.iniciar_locacao_url(), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("reservas", response.data)

    def test_usuario_comum_nao_acessa_endpoint_admin_de_iniciar_locacao(self):
        self.client.force_authenticate(user=self.usuario)
        self.preparar_pedido_confirmado()

        response = self.client.post(self.iniciar_locacao_url(), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonimo_nao_acessa_endpoint_admin_de_iniciar_locacao(self):
        self.preparar_pedido_confirmado()

        response = self.client.post(self.iniciar_locacao_url(), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_segunda_chamada_de_iniciar_locacao_retorna_erro_seguro(self):
        self.autenticar_admin()
        self.preparar_pedido_confirmado()
        primeira = self.client.post(self.iniciar_locacao_url(), {}, format="json")
        segunda = self.client.post(self.iniciar_locacao_url(), {}, format="json")

        self.assertEqual(primeira.status_code, status.HTTP_200_OK)
        self.assertEqual(segunda.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("status", segunda.data)
        self.assertEqual(
            ReservaUnidade.objects.filter(status=ReservaUnidade.Status.ATIVA).count(),
            1,
        )

    def test_iniciar_locacao_faz_rollback_se_unidade_estiver_inconsistente(self):
        self.autenticar_admin()
        self.pedido = self.criar_pedido(status_pedido=Pedido.Status.CONFIRMADO)
        item = self.criar_item_brinquedo(quantidade=2)
        unidade_disponivel = self.criar_unidade(codigo="CAMA-001")
        unidade_inconsistente = self.criar_unidade(codigo="CAMA-002")
        primeira_reserva = self.criar_reserva(unidade_disponivel, item=item)
        segunda_reserva = self.criar_reserva(unidade_inconsistente, item=item)
        unidade_inconsistente.status = UnidadeBrinquedo.Status.HIGIENIZACAO
        unidade_inconsistente.save(update_fields=["status", "atualizado_em"])

        response = self.client.post(self.iniciar_locacao_url(), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("unidades", response.data)
        self.pedido.refresh_from_db()
        primeira_reserva.refresh_from_db()
        segunda_reserva.refresh_from_db()
        unidade_disponivel.refresh_from_db()
        unidade_inconsistente.refresh_from_db()
        item.refresh_from_db()
        self.assertEqual(self.pedido.status, Pedido.Status.CONFIRMADO)
        self.assertEqual(primeira_reserva.status, ReservaUnidade.Status.ATIVA)
        self.assertEqual(segunda_reserva.status, ReservaUnidade.Status.ATIVA)
        self.assertEqual(unidade_disponivel.status, UnidadeBrinquedo.Status.DISPONIVEL)
        self.assertEqual(
            unidade_inconsistente.status,
            UnidadeBrinquedo.Status.HIGIENIZACAO,
        )
        self.assertEqual(item.pedido, self.pedido)

    def test_admin_registra_retirada_de_pedido_em_locacao(self):
        self.autenticar_admin()
        item, unidade, reserva = self.preparar_pedido_em_locacao()
        total_estimado = self.pedido.total_estimado_snapshot

        response = self.client.post(self.registrar_retirada_url(), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.pedido.refresh_from_db()
        reserva.refresh_from_db()
        unidade.refresh_from_db()
        item.refresh_from_db()
        self.assertEqual(self.pedido.status, Pedido.Status.RETIRADO)
        self.assertEqual(reserva.status, ReservaUnidade.Status.ENCERRADA)
        self.assertEqual(unidade.status, UnidadeBrinquedo.Status.HIGIENIZACAO)
        self.assertNotEqual(unidade.status, UnidadeBrinquedo.Status.DISPONIVEL)
        self.assertEqual(item.pedido, self.pedido)
        self.assertEqual(self.pedido.total_estimado_snapshot, total_estimado)
        self.assertEqual(response.data["id"], self.pedido.id)
        self.assertEqual(response.data["status"], Pedido.Status.RETIRADO)
        self.assertEqual(
            response.data["reservas_encerradas"],
            [{"id": reserva.id, "status": ReservaUnidade.Status.ENCERRADA}],
        )
        self.assertEqual(
            response.data["unidades_atualizadas"],
            [{"id": unidade.id, "status": UnidadeBrinquedo.Status.HIGIENIZACAO}],
        )

    def test_registrar_retirada_rejeita_pedido_fora_de_em_locacao(self):
        self.autenticar_admin()
        self.preparar_pedido_confirmado()

        response = self.client.post(self.registrar_retirada_url(), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("status", response.data)
        self.pedido.refresh_from_db()
        self.assertEqual(self.pedido.status, Pedido.Status.CONFIRMADO)

    def test_registrar_retirada_exige_reservas_ativas(self):
        self.autenticar_admin()
        self.pedido = self.criar_pedido(status_pedido=Pedido.Status.EM_LOCACAO)
        self.criar_item_brinquedo()

        response = self.client.post(self.registrar_retirada_url(), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("reservas", response.data)

    def test_usuario_comum_nao_acessa_endpoint_admin_de_registrar_retirada(self):
        self.client.force_authenticate(user=self.usuario)
        self.preparar_pedido_em_locacao()

        response = self.client.post(self.registrar_retirada_url(), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_anonimo_nao_acessa_endpoint_admin_de_registrar_retirada(self):
        self.preparar_pedido_em_locacao()

        response = self.client.post(self.registrar_retirada_url(), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_segunda_chamada_de_registrar_retirada_retorna_erro_seguro(self):
        self.autenticar_admin()
        self.preparar_pedido_em_locacao()
        primeira = self.client.post(self.registrar_retirada_url(), {}, format="json")
        segunda = self.client.post(self.registrar_retirada_url(), {}, format="json")

        self.assertEqual(primeira.status_code, status.HTTP_200_OK)
        self.assertEqual(segunda.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("status", segunda.data)
        self.assertEqual(
            ReservaUnidade.objects.filter(
                status=ReservaUnidade.Status.ENCERRADA,
            ).count(),
            1,
        )

    def test_registrar_retirada_faz_rollback_se_unidade_estiver_inconsistente(self):
        self.autenticar_admin()
        self.pedido = self.criar_pedido(status_pedido=Pedido.Status.EM_LOCACAO)
        item = self.criar_item_brinquedo(quantidade=2)
        unidade_em_locacao = self.criar_unidade(codigo="CAMA-001")
        unidade_inconsistente = self.criar_unidade(codigo="CAMA-002")
        primeira_reserva = self.criar_reserva(unidade_em_locacao, item=item)
        segunda_reserva = self.criar_reserva(unidade_inconsistente, item=item)
        unidade_em_locacao.status = UnidadeBrinquedo.Status.EM_LOCACAO
        unidade_em_locacao.save(update_fields=["status", "atualizado_em"])
        unidade_inconsistente.status = UnidadeBrinquedo.Status.DISPONIVEL
        unidade_inconsistente.save(update_fields=["status", "atualizado_em"])

        response = self.client.post(self.registrar_retirada_url(), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("unidades", response.data)
        self.pedido.refresh_from_db()
        primeira_reserva.refresh_from_db()
        segunda_reserva.refresh_from_db()
        unidade_em_locacao.refresh_from_db()
        unidade_inconsistente.refresh_from_db()
        item.refresh_from_db()
        self.assertEqual(self.pedido.status, Pedido.Status.EM_LOCACAO)
        self.assertEqual(primeira_reserva.status, ReservaUnidade.Status.ATIVA)
        self.assertEqual(segunda_reserva.status, ReservaUnidade.Status.ATIVA)
        self.assertEqual(unidade_em_locacao.status, UnidadeBrinquedo.Status.EM_LOCACAO)
        self.assertEqual(
            unidade_inconsistente.status,
            UnidadeBrinquedo.Status.DISPONIVEL,
        )
        self.assertEqual(item.pedido, self.pedido)


class ItemCarrinhoModelTests(APITestCase):
    def test_carrinho_autenticado_rejeita_session_key_persistida(self):
        usuario = get_user_model().objects.create_user(
            username="cliente-sem-session-key",
            password="senha-segura-123",
        )

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Carrinho.objects.create(
                    usuario=usuario,
                    session_key="sessao-que-nao-deve-ser-persistida",
                )

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
