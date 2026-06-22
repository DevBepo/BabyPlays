from datetime import timedelta

from django.contrib.auth import get_user_model
from django.test import TestCase
from django.utils import timezone

from catalogo.models import Brinquedo, UnidadeBrinquedo
from .models import HistoricoPedido, Pedido, ReservaUnidade
from .serializers import ConverterCarrinhoPedidoSerializer
from .services import GestaoAdminPedidoService


class CheckoutSemDatasTests(TestCase):
    def test_payload_de_checkout_nao_exige_datas(self):
        serializer = ConverterCarrinhoPedidoSerializer(
            data={
                "nome": "Cliente",
                "telefone": "5511999999999",
                "email": "cliente@example.com",
                "cep": "01001000",
                "numero": "10",
                "contrato_aceito": True,
                "contrato_id": 1,
                "contrato_versao": "v1",
            }
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)
        self.assertNotIn("data_inicio_locacao", serializer.dados_para_pedido())


class RenovacaoPedidoTests(TestCase):
    def setUp(self):
        self.admin = get_user_model().objects.create_user(
            username="admin-renovacao", password="teste", is_staff=True
        )
        inicio = timezone.localdate() + timedelta(days=5)
        self.pedido = Pedido.objects.create(
            status=Pedido.Status.EM_LOCACAO,
            nome_cliente_snapshot="Cliente",
            telefone_cliente_snapshot="5511999999999",
            email_cliente_snapshot="cliente@example.com",
            data_evento_pretendida=inicio,
            data_inicio_locacao=inicio,
            data_fim_locacao=inicio + timedelta(days=2),
            subtotal_itens_snapshot="100.00",
        )
        brinquedo = Brinquedo.objects.create(
            nome="Gangorra", descricao="Gangorra", preco_aluguel="100.00", preco_15_dias="100.00"
        )
        unidade = UnidadeBrinquedo.objects.create(
            brinquedo=brinquedo,
            codigo="G-01",
            status=UnidadeBrinquedo.Status.EM_LOCACAO,
        )
        self.reserva = ReservaUnidade.objects.create(
            pedido=self.pedido,
            unidade_brinquedo=unidade,
            data_inicio=self.pedido.data_inicio_locacao,
            data_fim=self.pedido.data_fim_locacao,
        )

    def test_renovacao_estende_pedido_reserva_e_registra_historico(self):
        nova_data = self.pedido.data_fim_locacao + timedelta(days=3)
        GestaoAdminPedidoService.renovar(self.pedido, self.admin, nova_data)

        self.pedido.refresh_from_db()
        self.reserva.refresh_from_db()
        self.assertEqual(self.pedido.data_fim_locacao, nova_data)
        self.assertEqual(self.reserva.data_fim, nova_data)
        self.assertTrue(
            HistoricoPedido.objects.filter(
                pedido=self.pedido, acao=HistoricoPedido.Acao.RENOVADO
            ).exists()
        )

    def test_renovacao_com_conflito_nao_altera_datas(self):
        outro_pedido = Pedido.objects.create(
            status=Pedido.Status.RESERVADO,
            nome_cliente_snapshot="Outro",
            telefone_cliente_snapshot="5511888888888",
            email_cliente_snapshot="outro@example.com",
            data_inicio_locacao=self.pedido.data_fim_locacao + timedelta(days=1),
            data_fim_locacao=self.pedido.data_fim_locacao + timedelta(days=4),
            subtotal_itens_snapshot="100.00",
        )
        ReservaUnidade.objects.create(
            pedido=outro_pedido,
            unidade_brinquedo=self.reserva.unidade_brinquedo,
            data_inicio=outro_pedido.data_inicio_locacao,
            data_fim=outro_pedido.data_fim_locacao,
        )
        data_original = self.pedido.data_fim_locacao

        from rest_framework.serializers import ValidationError
        with self.assertRaises(ValidationError):
            GestaoAdminPedidoService.renovar(
                self.pedido, self.admin, data_original + timedelta(days=3)
            )

        self.pedido.refresh_from_db()
        self.reserva.refresh_from_db()
        self.assertEqual(self.pedido.data_fim_locacao, data_original)
        self.assertEqual(self.reserva.data_fim, data_original)
