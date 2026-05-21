import shutil
import tempfile
from datetime import date
from io import BytesIO
from types import SimpleNamespace
from unittest.mock import patch

from django.conf import settings
from django.contrib import admin
from django.db import IntegrityError, transaction
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase
from rest_framework.serializers import ValidationError as DRFValidationError
from pedidos.models import Pedido, ReservaUnidade

from .models import (
    Brinquedo,
    Categoria,
    ConfiguracaoKitPersonalizavel,
    ImagemBrinquedo,
    ItemKitFesta,
    KitFesta,
    RegraCategoriaKitPersonalizavel,
    UnidadeBrinquedo,
)
from .services import BrinquedoService


class DisponibilidadePeriodoAPITests(APITestCase):
    data_inicio = date(2026, 6, 20)
    data_fim = date(2026, 6, 22)

    def setUp(self):
        self.brinquedo = Brinquedo.objects.create(
            nome="Piscina de bolinhas",
            descricao="Brinquedo para festas infantis.",
            preco_aluguel="150.00",
        )
        self.outro_brinquedo = Brinquedo.objects.create(
            nome="Cama elastica",
            descricao="Brinquedo para festas maiores.",
            preco_aluguel="220.00",
        )
        self.kit = KitFesta.objects.create(
            nome="Kit Diversao",
            descricao="Kit pronto para festa.",
            preco_aluguel="350.00",
        )
        self.configuracao = ConfiguracaoKitPersonalizavel.objects.create(
            nome="Monte seu kit",
            descricao="Escolha os brinquedos para sua festa.",
            preco_base="50.00",
            quantidade_minima_brinquedos=2,
            quantidade_maxima_brinquedos=4,
            modo_elegibilidade=(
                ConfiguracaoKitPersonalizavel.ModoElegibilidade.BRINQUEDOS
            ),
        )
        self.configuracao.brinquedos_permitidos.add(
            self.brinquedo,
            self.outro_brinquedo,
        )

    def disponibilidade_brinquedo_url(self, brinquedo=None):
        brinquedo = brinquedo or self.brinquedo
        return f"/api/brinquedos/{brinquedo.id}/disponibilidade/"

    def disponibilidade_kit_url(self, kit=None):
        kit = kit or self.kit
        return f"/api/kits-festa/{kit.id}/disponibilidade/"

    def disponibilidade_kit_personalizavel_url(self, configuracao=None):
        configuracao = configuracao or self.configuracao
        return f"/api/kits-personalizaveis/{configuracao.id}/disponibilidade/"

    def parametros_periodo(self, **kwargs):
        parametros = {
            "data_inicio": self.data_inicio.isoformat(),
            "data_fim": self.data_fim.isoformat(),
            "quantidade": 1,
        }
        parametros.update(kwargs)
        return parametros

    def criar_unidade(self, brinquedo=None, status_unidade=None, codigo="UNI-001"):
        return UnidadeBrinquedo.objects.create(
            brinquedo=brinquedo or self.brinquedo,
            codigo=codigo,
            status=status_unidade or UnidadeBrinquedo.Status.DISPONIVEL,
        )

    def criar_pedido(self):
        return Pedido.objects.create(
            nome_cliente_snapshot="Cliente Teste",
            telefone_cliente_snapshot="11999999999",
            email_cliente_snapshot="cliente@email.com",
            data_evento_pretendida=self.data_inicio,
            subtotal_itens_snapshot="150.00",
        )

    def criar_reserva(self, unidade, data_inicio=None, data_fim=None, status_reserva=None):
        return ReservaUnidade.objects.create(
            pedido=self.criar_pedido(),
            unidade_brinquedo=unidade,
            data_inicio=data_inicio or self.data_inicio,
            data_fim=data_fim or self.data_fim,
            status=status_reserva or ReservaUnidade.Status.ATIVA,
        )

    def test_brinquedo_com_unidade_disponivel_no_periodo_retorna_disponivel(self):
        self.criar_unidade()

        response = self.client.get(
            self.disponibilidade_brinquedo_url(),
            self.parametros_periodo(),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["disponivel"])
        self.assertEqual(response.data["quantidade_solicitada"], 1)
        self.assertEqual(response.data["quantidade_disponivel"], 1)

    def test_brinquedo_sem_unidades_suficientes_retorna_indisponivel(self):
        self.criar_unidade()

        response = self.client.get(
            self.disponibilidade_brinquedo_url(),
            self.parametros_periodo(quantidade=2),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["disponivel"])
        self.assertEqual(response.data["quantidade_disponivel"], 1)

    def test_unidade_com_reserva_ativa_conflitante_nao_conta(self):
        unidade = self.criar_unidade()
        self.criar_reserva(unidade)

        response = self.client.get(
            self.disponibilidade_brinquedo_url(),
            self.parametros_periodo(),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["disponivel"])
        self.assertEqual(response.data["quantidade_disponivel"], 0)

    def test_reserva_cancelada_nao_bloqueia_disponibilidade(self):
        unidade = self.criar_unidade()
        self.criar_reserva(unidade, status_reserva=ReservaUnidade.Status.CANCELADA)

        response = self.client.get(
            self.disponibilidade_brinquedo_url(),
            self.parametros_periodo(),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["disponivel"])
        self.assertEqual(response.data["quantidade_disponivel"], 1)

    def test_periodos_sobrepostos_conflitam(self):
        unidade = self.criar_unidade()
        self.criar_reserva(
            unidade,
            data_inicio=date(2026, 6, 10),
            data_fim=date(2026, 6, 12),
        )

        response = self.client.get(
            self.disponibilidade_brinquedo_url(),
            self.parametros_periodo(
                data_inicio="2026-06-11",
                data_fim="2026-06-13",
            ),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["disponivel"])
        self.assertEqual(response.data["quantidade_disponivel"], 0)

    def test_periodos_encostados_nao_conflitam(self):
        unidade = self.criar_unidade()
        self.criar_reserva(
            unidade,
            data_inicio=date(2026, 6, 10),
            data_fim=date(2026, 6, 12),
        )

        response = self.client.get(
            self.disponibilidade_brinquedo_url(),
            self.parametros_periodo(
                data_inicio="2026-06-12",
                data_fim="2026-06-14",
            ),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["disponivel"])
        self.assertEqual(response.data["quantidade_disponivel"], 1)

    def test_unidades_com_status_nao_disponivel_nao_contam(self):
        status_indisponiveis = [
            UnidadeBrinquedo.Status.RESERVADA,
            UnidadeBrinquedo.Status.EM_LOCACAO,
            UnidadeBrinquedo.Status.HIGIENIZACAO,
            UnidadeBrinquedo.Status.MANUTENCAO,
            UnidadeBrinquedo.Status.STANDBY,
            UnidadeBrinquedo.Status.BAIXADA,
        ]
        for indice, status_unidade in enumerate(status_indisponiveis, start=1):
            self.criar_unidade(status_unidade=status_unidade, codigo=f"UNI-{indice}")

        response = self.client.get(
            self.disponibilidade_brinquedo_url(),
            self.parametros_periodo(),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["disponivel"])
        self.assertEqual(response.data["quantidade_disponivel"], 0)

    def test_data_fim_menor_ou_igual_data_inicio_e_rejeitada(self):
        response = self.client.get(
            self.disponibilidade_brinquedo_url(),
            self.parametros_periodo(data_fim=self.data_inicio.isoformat()),
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("data_fim", response.data)

    def test_quantidade_menor_que_um_e_rejeitada(self):
        response = self.client.get(
            self.disponibilidade_brinquedo_url(),
            self.parametros_periodo(quantidade=0),
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("quantidade", response.data)

    def test_kit_festa_indisponivel_se_faltar_unidade_de_qualquer_item(self):
        ItemKitFesta.objects.create(
            kit=self.kit,
            brinquedo=self.brinquedo,
            quantidade=2,
        )
        self.criar_unidade(brinquedo=self.brinquedo)

        response = self.client.get(
            self.disponibilidade_kit_url(),
            self.parametros_periodo(),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["disponivel"])
        self.assertFalse(response.data["itens"][0]["disponivel"])
        self.assertEqual(response.data["itens"][0]["quantidade_necessaria"], 2)
        self.assertEqual(response.data["itens"][0]["quantidade_disponivel"], 1)

    def test_kit_festa_disponivel_quando_todos_itens_tem_unidades_suficientes(self):
        ItemKitFesta.objects.create(
            kit=self.kit,
            brinquedo=self.brinquedo,
            quantidade=1,
        )
        ItemKitFesta.objects.create(
            kit=self.kit,
            brinquedo=self.outro_brinquedo,
            quantidade=1,
        )
        self.criar_unidade(brinquedo=self.brinquedo, codigo="PISCINA-001")
        self.criar_unidade(brinquedo=self.outro_brinquedo, codigo="CAMA-001")

        response = self.client.get(
            self.disponibilidade_kit_url(),
            self.parametros_periodo(quantidade=1),
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["disponivel"])
        self.assertTrue(all(item["disponivel"] for item in response.data["itens"]))

    def test_kit_personalizado_indisponivel_se_faltar_unidade_selecionada(self):
        self.criar_unidade(brinquedo=self.brinquedo, codigo="PISCINA-001")
        payload = self.parametros_periodo()
        payload["itens"] = [
            {"brinquedo_id": self.brinquedo.id, "quantidade": 1},
            {"brinquedo_id": self.outro_brinquedo.id, "quantidade": 1},
        ]

        response = self.client.post(
            self.disponibilidade_kit_personalizavel_url(),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertFalse(response.data["disponivel"])
        itens_por_id = {item["brinquedo_id"]: item for item in response.data["itens"]}
        self.assertFalse(itens_por_id[self.outro_brinquedo.id]["disponivel"])

    def test_kit_personalizado_disponivel_quando_selecao_tem_unidades_suficientes(self):
        self.criar_unidade(brinquedo=self.brinquedo, codigo="PISCINA-001")
        self.criar_unidade(brinquedo=self.outro_brinquedo, codigo="CAMA-001")
        payload = self.parametros_periodo()
        payload["itens"] = [
            {"brinquedo_id": self.brinquedo.id, "quantidade": 1},
            {"brinquedo_id": self.outro_brinquedo.id, "quantidade": 1},
        ]

        response = self.client.post(
            self.disponibilidade_kit_personalizavel_url(),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["disponivel"])
        self.assertTrue(all(item["disponivel"] for item in response.data["itens"]))

    def test_kit_personalizado_continua_validando_regras_de_selecao(self):
        payload = self.parametros_periodo()
        payload["itens"] = [
            {"brinquedo_id": self.brinquedo.id, "quantidade": 1},
        ]

        response = self.client.post(
            self.disponibilidade_kit_personalizavel_url(),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("itens", response.data)

    def test_consulta_nao_cria_reservas_nem_altera_status_da_unidade(self):
        unidade = self.criar_unidade()

        response = self.client.get(
            self.disponibilidade_brinquedo_url(),
            self.parametros_periodo(),
        )

        unidade.refresh_from_db()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(ReservaUnidade.objects.count(), 0)
        self.assertEqual(unidade.status, UnidadeBrinquedo.Status.DISPONIVEL)


class LiberarDisponibilidadeUnidadeAdminTests(APITestCase):
    data_inicio = date(2026, 6, 20)
    data_fim = date(2026, 6, 22)

    def setUp(self):
        self.brinquedo = Brinquedo.objects.create(
            nome="Cama elastica",
            descricao="Brinquedo para festas maiores.",
            preco_aluguel="220.00",
        )
        self.admin = get_user_model().objects.create_user(
            username="admin-libera-unidade",
            password="senha-segura-123",
            is_staff=True,
        )
        self.usuario = get_user_model().objects.create_user(
            username="cliente-libera-unidade",
            password="senha-segura-123",
        )

    def url(self, unidade):
        return f"/api/admin/unidades/{unidade.id}/liberar-disponibilidade/"

    def autenticar_admin(self):
        self.client.force_authenticate(user=self.admin)

    def criar_unidade(self, status_unidade, codigo="CAMA-001"):
        return UnidadeBrinquedo.objects.create(
            brinquedo=self.brinquedo,
            codigo=codigo,
            status=status_unidade,
        )

    def criar_pedido(self):
        return Pedido.objects.create(
            usuario=self.usuario,
            nome_cliente_snapshot="Cliente Teste",
            telefone_cliente_snapshot="11999999999",
            email_cliente_snapshot="cliente@email.com",
            data_evento_pretendida=self.data_inicio,
            data_inicio_locacao=self.data_inicio,
            data_fim_locacao=self.data_fim,
            subtotal_itens_snapshot="220.00",
            status=Pedido.Status.RETIRADO,
        )

    def criar_reserva(self, unidade, pedido=None):
        return ReservaUnidade.objects.create(
            pedido=pedido or self.criar_pedido(),
            unidade_brinquedo=unidade,
            data_inicio=self.data_inicio,
            data_fim=self.data_fim,
            status=ReservaUnidade.Status.ENCERRADA,
        )

    def assert_unidade_liberada(self, unidade, response):
        unidade.refresh_from_db()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(unidade.status, UnidadeBrinquedo.Status.DISPONIVEL)
        self.assertEqual(
            response.data,
            {
                "id": unidade.id,
                "codigo": unidade.codigo,
                "status": UnidadeBrinquedo.Status.DISPONIVEL,
            },
        )

    def assert_status_nao_liberavel(self, status_unidade):
        self.autenticar_admin()
        unidade = self.criar_unidade(status_unidade)
        atualizado_em = unidade.atualizado_em

        response = self.client.post(self.url(unidade), {}, format="json")

        unidade.refresh_from_db()
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("status", response.data)
        self.assertEqual(unidade.status, status_unidade)
        self.assertEqual(unidade.atualizado_em, atualizado_em)

    def test_admin_libera_unidade_em_higienizacao_para_disponivel(self):
        self.autenticar_admin()
        unidade = self.criar_unidade(UnidadeBrinquedo.Status.HIGIENIZACAO)

        response = self.client.post(self.url(unidade), {}, format="json")

        self.assert_unidade_liberada(unidade, response)

    def test_admin_libera_unidade_em_standby_para_disponivel(self):
        self.autenticar_admin()
        unidade = self.criar_unidade(UnidadeBrinquedo.Status.STANDBY)

        response = self.client.post(self.url(unidade), {}, format="json")

        self.assert_unidade_liberada(unidade, response)

    def test_usuario_comum_nao_acessa_endpoint(self):
        unidade = self.criar_unidade(UnidadeBrinquedo.Status.HIGIENIZACAO)
        self.client.force_authenticate(user=self.usuario)

        response = self.client.post(self.url(unidade), {}, format="json")

        unidade.refresh_from_db()
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(unidade.status, UnidadeBrinquedo.Status.HIGIENIZACAO)

    def test_anonimo_nao_acessa_endpoint(self):
        unidade = self.criar_unidade(UnidadeBrinquedo.Status.HIGIENIZACAO)

        response = self.client.post(self.url(unidade), {}, format="json")

        unidade.refresh_from_db()
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(unidade.status, UnidadeBrinquedo.Status.HIGIENIZACAO)

    def test_unidade_em_locacao_nao_pode_ser_liberada(self):
        self.assert_status_nao_liberavel(UnidadeBrinquedo.Status.EM_LOCACAO)

    def test_unidade_reservada_nao_pode_ser_liberada(self):
        self.assert_status_nao_liberavel(UnidadeBrinquedo.Status.RESERVADA)

    def test_unidade_em_manutencao_nao_pode_ser_liberada(self):
        self.assert_status_nao_liberavel(UnidadeBrinquedo.Status.MANUTENCAO)

    def test_unidade_baixada_nao_pode_ser_liberada(self):
        self.assert_status_nao_liberavel(UnidadeBrinquedo.Status.BAIXADA)

    def test_unidade_ja_disponivel_retorna_erro_sem_efeito_colateral(self):
        self.assert_status_nao_liberavel(UnidadeBrinquedo.Status.DISPONIVEL)

    def test_liberacao_nao_altera_reservas_existentes(self):
        self.autenticar_admin()
        unidade = self.criar_unidade(UnidadeBrinquedo.Status.HIGIENIZACAO)
        reserva = self.criar_reserva(unidade)
        dados_reserva = {
            "pedido_id": reserva.pedido_id,
            "unidade_brinquedo_id": reserva.unidade_brinquedo_id,
            "status": reserva.status,
            "data_inicio": reserva.data_inicio,
            "data_fim": reserva.data_fim,
        }

        response = self.client.post(self.url(unidade), {}, format="json")

        reserva.refresh_from_db()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            dados_reserva,
            {
                "pedido_id": reserva.pedido_id,
                "unidade_brinquedo_id": reserva.unidade_brinquedo_id,
                "status": reserva.status,
                "data_inicio": reserva.data_inicio,
                "data_fim": reserva.data_fim,
            },
        )

    def test_liberacao_nao_altera_pedidos(self):
        self.autenticar_admin()
        unidade = self.criar_unidade(UnidadeBrinquedo.Status.HIGIENIZACAO)
        pedido = self.criar_pedido()
        self.criar_reserva(unidade, pedido=pedido)
        dados_pedido = {
            "status": pedido.status,
            "total_estimado_snapshot": pedido.total_estimado_snapshot,
            "data_inicio_locacao": pedido.data_inicio_locacao,
            "data_fim_locacao": pedido.data_fim_locacao,
        }

        response = self.client.post(self.url(unidade), {}, format="json")

        pedido.refresh_from_db()
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            dados_pedido,
            {
                "status": pedido.status,
                "total_estimado_snapshot": pedido.total_estimado_snapshot,
                "data_inicio_locacao": pedido.data_inicio_locacao,
                "data_fim_locacao": pedido.data_fim_locacao,
            },
        )

    def test_fluxo_invalido_retorna_erro_seguro(self):
        self.autenticar_admin()
        unidade = self.criar_unidade(UnidadeBrinquedo.Status.BAIXADA)

        response = self.client.post(self.url(unidade), {}, format="json")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["status"],
            (
                "Unidade so pode ser liberada para disponivel quando estiver "
                "em higienizacao ou standby."
            ),
        )

    @patch("catalogo.admin.UnidadeBrinquedoOperacaoService.liberar_disponibilidade")
    def test_admin_action_libera_unidades_usando_service_e_reporta_falhas(
        self,
        liberar_disponibilidade,
    ):
        unidade_liberavel = self.criar_unidade(
            UnidadeBrinquedo.Status.HIGIENIZACAO,
            codigo="CAMA-002",
        )
        unidade_nao_liberavel = self.criar_unidade(
            UnidadeBrinquedo.Status.DISPONIVEL,
            codigo="CAMA-003",
        )
        model_admin = admin.site._registry[UnidadeBrinquedo]
        request = SimpleNamespace(user=self.admin)
        queryset = UnidadeBrinquedo.objects.filter(
            id__in=[unidade_liberavel.id, unidade_nao_liberavel.id]
        ).order_by("id")

        with patch.object(model_admin, "message_user") as message_user:
            model_admin.liberar_disponibilidade(request, queryset)

        liberar_disponibilidade.assert_called_once()
        self.assertEqual(
            liberar_disponibilidade.call_args.args[0],
            unidade_liberavel,
        )
        self.assertEqual(message_user.call_count, 2)
        mensagens = [call.args[1] for call in message_user.call_args_list]
        self.assertTrue(
            any("1 unidade(s) liberada(s) para disponivel" in msg for msg in mensagens)
        )
        self.assertTrue(any("CAMA-003" in msg and "falharam" in msg for msg in mensagens))

    @patch("catalogo.admin.UnidadeBrinquedoOperacaoService.liberar_disponibilidade")
    def test_admin_action_reporta_erro_do_service_sem_interromper_lote(
        self,
        liberar_disponibilidade,
    ):
        primeira = self.criar_unidade(
            UnidadeBrinquedo.Status.HIGIENIZACAO,
            codigo="CAMA-004",
        )
        segunda = self.criar_unidade(
            UnidadeBrinquedo.Status.STANDBY,
            codigo="CAMA-005",
        )
        liberar_disponibilidade.side_effect = [
            primeira,
            DRFValidationError({"status": "Falha controlada."}),
        ]
        model_admin = admin.site._registry[UnidadeBrinquedo]
        request = SimpleNamespace(user=self.admin)
        queryset = UnidadeBrinquedo.objects.filter(
            id__in=[primeira.id, segunda.id]
        ).order_by("id")

        with patch.object(model_admin, "message_user") as message_user:
            model_admin.liberar_disponibilidade(request, queryset)

        self.assertEqual(liberar_disponibilidade.call_count, 2)
        self.assertEqual(message_user.call_count, 2)
        mensagens = [call.args[1] for call in message_user.call_args_list]
        self.assertTrue(
            any("1 unidade(s) liberada(s) para disponivel" in msg for msg in mensagens)
        )
        self.assertTrue(any("Falha controlada" in msg for msg in mensagens))


class BrinquedoAPITests(APITestCase):
    brinquedos_url = "/api/brinquedos/"

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.media_root_temporario = tempfile.mkdtemp()
        cls.override_media_root = override_settings(
            MEDIA_ROOT=cls.media_root_temporario,
        )
        cls.override_media_root.enable()

    @classmethod
    def tearDownClass(cls):
        cls.override_media_root.disable()
        shutil.rmtree(cls.media_root_temporario, ignore_errors=True)
        super().tearDownClass()

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
            "ativo": True,
        }

    def imagem_upload(self, nome="brinquedo.jpg", formato="JPEG", tamanho=(80, 80)):
        arquivo = BytesIO()
        Image.new("RGB", tamanho, color="blue").save(arquivo, format=formato)
        arquivo.seek(0)
        return SimpleUploadedFile(
            nome,
            arquivo.read(),
            content_type=f"image/{formato.lower()}",
        )

    def criar_imagem_brinquedo(self, **kwargs):
        dados = {
            "brinquedo": self.brinquedo,
            "imagem": self.imagem_upload(),
        }
        dados.update(kwargs)
        imagem = ImagemBrinquedo(**dados)
        imagem.full_clean()
        imagem.save()
        return imagem

    def test_usuario_anonimo_lista_apenas_brinquedos_ativos(self):
        Brinquedo.objects.create(
            nome="Escorregador inativo",
            descricao="Brinquedo fora do catalogo publico.",
            preco_aluguel="120.00",
            ativo=False,
        )

        response = self.client.get(self.brinquedos_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["nome"], self.brinquedo.nome)

    def test_api_publica_listagem_nao_retorna_ativo(self):
        response = self.client.get(self.brinquedos_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn("ativo", response.data[0])

    def test_api_publica_listagem_nao_retorna_data_cadastro(self):
        response = self.client.get(self.brinquedos_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn("data_cadastro", response.data[0])

    def test_usuario_anonimo_consegue_visualizar_detalhe_de_brinquedo_ativo(self):
        response = self.client.get(f"{self.brinquedos_url}{self.brinquedo.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.brinquedo.id)
        self.assertEqual(response.data["nome"], self.brinquedo.nome)

    def test_api_publica_detalhe_nao_retorna_ativo(self):
        response = self.client.get(f"{self.brinquedos_url}{self.brinquedo.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn("ativo", response.data)

    def test_api_publica_detalhe_nao_retorna_data_cadastro(self):
        response = self.client.get(f"{self.brinquedos_url}{self.brinquedo.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn("data_cadastro", response.data)

    def test_api_publica_retorna_categoria_do_brinquedo(self):
        categoria = Categoria.objects.create(
            nome="Brinquedos grandes",
            slug="brinquedos-grandes",
            descricao="Brinquedos para festas maiores.",
            ordem=1,
        )
        self.brinquedo.categoria = categoria
        self.brinquedo.save(update_fields=["categoria"])

        response = self.client.get(f"{self.brinquedos_url}{self.brinquedo.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["categoria"],
            {
                "id": categoria.id,
                "nome": "Brinquedos grandes",
                "slug": "brinquedos-grandes",
            },
        )
        self.assertNotIn("ativo", response.data["categoria"])
        self.assertNotIn("ordem", response.data["categoria"])

    def test_brinquedo_sem_categoria_continua_retornando_corretamente(self):
        response = self.client.get(f"{self.brinquedos_url}{self.brinquedo.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIsNone(response.data["categoria"])
        self.assertEqual(response.data["nome"], self.brinquedo.nome)

    def test_usuario_anonimo_nao_visualiza_detalhe_de_brinquedo_inativo(self):
        self.brinquedo.ativo = False
        self.brinquedo.save(update_fields=["ativo"])

        response = self.client.get(f"{self.brinquedos_url}{self.brinquedo.id}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

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

    def test_usuario_admin_consegue_criar_brinquedo_com_categoria(self):
        categoria = Categoria.objects.create(
            nome="Bebes",
            slug="bebes",
        )
        payload = self.payload_valido()
        payload["categoria"] = categoria.id
        self.client.force_authenticate(user=self.usuario_admin)

        response = self.client.post(self.brinquedos_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        brinquedo_criado = Brinquedo.objects.get(nome="Cama elastica")
        self.assertEqual(brinquedo_criado.categoria, categoria)
        self.assertEqual(response.data["categoria"]["id"], categoria.id)
        self.assertEqual(response.data["categoria"]["nome"], "Bebes")
        self.assertEqual(response.data["categoria"]["slug"], "bebes")

    def test_categoria_usa_slug_unico(self):
        Categoria.objects.create(nome="Bebes", slug="bebes")

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Categoria.objects.create(nome="Bebes duplicado", slug="bebes")

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
        payload["quantidade_disponivel"] = 999

        response = self.client.post(self.brinquedos_url, payload, format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        brinquedo_criado = Brinquedo.objects.get(nome="Cama elastica")
        self.assertNotEqual(brinquedo_criado.id, 999)
        self.assertNotEqual(
            brinquedo_criado.data_cadastro.isoformat(),
            "2000-01-01T00:00:00+00:00",
        )
        self.assertEqual(response.data["quantidade_disponivel"], 0)

    def test_brinquedo_sem_unidades_disponiveis_retorna_quantidade_zero(self):
        response = self.client.get(f"{self.brinquedos_url}{self.brinquedo.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["quantidade_disponivel"], 0)
        self.assertIn("quantidade_disponivel", response.data)

    def test_brinquedo_com_multiplas_unidades_disponiveis_conta_corretamente(self):
        UnidadeBrinquedo.objects.create(
            brinquedo=self.brinquedo,
            codigo="PISCINA-001",
            status=UnidadeBrinquedo.Status.DISPONIVEL,
        )
        UnidadeBrinquedo.objects.create(
            brinquedo=self.brinquedo,
            codigo="PISCINA-002",
            status=UnidadeBrinquedo.Status.DISPONIVEL,
        )

        response = self.client.get(f"{self.brinquedos_url}{self.brinquedo.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["quantidade_disponivel"], 2)

    def test_unidades_indisponiveis_nao_contam_como_disponiveis(self):
        status_indisponiveis = [
            UnidadeBrinquedo.Status.RESERVADA,
            UnidadeBrinquedo.Status.EM_LOCACAO,
            UnidadeBrinquedo.Status.HIGIENIZACAO,
            UnidadeBrinquedo.Status.MANUTENCAO,
            UnidadeBrinquedo.Status.STANDBY,
            UnidadeBrinquedo.Status.BAIXADA,
        ]
        for indice, status_unidade in enumerate(status_indisponiveis, start=1):
            UnidadeBrinquedo.objects.create(
                brinquedo=self.brinquedo,
                codigo=f"PISCINA-IND-{indice:03d}",
                status=status_unidade,
            )

        response = self.client.get(f"{self.brinquedos_url}{self.brinquedo.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["quantidade_disponivel"], 0)

    def test_quantidade_disponivel_continua_sendo_exibida_para_brinquedo_ativo(self):
        UnidadeBrinquedo.objects.create(
            brinquedo=self.brinquedo,
            codigo="PISCINA-ATIVO-001",
            status=UnidadeBrinquedo.Status.DISPONIVEL,
        )

        response = self.client.get(f"{self.brinquedos_url}{self.brinquedo.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["quantidade_disponivel"], 1)

    def test_quantidade_disponivel_nao_depende_de_brinquedo_ativo(self):
        self.brinquedo.ativo = False
        self.brinquedo.save(update_fields=["ativo"])
        UnidadeBrinquedo.objects.create(
            brinquedo=self.brinquedo,
            codigo="PISCINA-ATIVO-FALSE-001",
            status=UnidadeBrinquedo.Status.DISPONIVEL,
        )

        quantidade = BrinquedoService.quantidade_disponivel(self.brinquedo)

        self.assertEqual(quantidade, 1)

    def test_cria_imagem_valida_associada_a_brinquedo(self):
        imagem = self.criar_imagem_brinquedo(
            alt_text="Piscina de bolinhas azul",
            principal=True,
        )

        self.assertEqual(imagem.brinquedo, self.brinquedo)
        self.assertTrue(imagem.imagem.name.startswith("catalogo/brinquedos/"))
        self.assertTrue(imagem.principal)

    def test_bloqueia_mais_de_uma_imagem_principal_para_mesmo_brinquedo(self):
        self.criar_imagem_brinquedo(principal=True)

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                ImagemBrinquedo.objects.create(
                    brinquedo=self.brinquedo,
                    imagem=self.imagem_upload("segunda.jpg"),
                    principal=True,
                )

    def test_permite_imagem_principal_em_brinquedos_diferentes(self):
        outro_brinquedo = Brinquedo.objects.create(
            nome="Cama elastica",
            descricao="Cama elastica infantil.",
            preco_aluguel="220.00",
        )

        self.criar_imagem_brinquedo(principal=True)
        outra_imagem = self.criar_imagem_brinquedo(
            brinquedo=outro_brinquedo,
            imagem=self.imagem_upload("cama.jpg"),
            principal=True,
        )

        self.assertEqual(outra_imagem.brinquedo, outro_brinquedo)
        self.assertTrue(outra_imagem.principal)

    def test_api_publica_retorna_imagens_ativas(self):
        imagem = self.criar_imagem_brinquedo(
            alt_text="Imagem ativa",
            principal=True,
            ativo=True,
        )

        response = self.client.get(f"{self.brinquedos_url}{self.brinquedo.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["imagens"]), 1)
        self.assertEqual(response.data["imagens"][0]["id"], imagem.id)
        self.assertEqual(response.data["imagens"][0]["alt_text"], "Imagem ativa")

    def test_api_publica_nao_retorna_imagens_inativas(self):
        self.criar_imagem_brinquedo(ativo=False)

        response = self.client.get(f"{self.brinquedos_url}{self.brinquedo.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["imagens"], [])
        self.assertIsNone(response.data["imagem_principal"])

    def test_api_publica_retorna_imagem_principal(self):
        imagem = self.criar_imagem_brinquedo(principal=True)

        response = self.client.get(f"{self.brinquedos_url}{self.brinquedo.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["imagem_principal"]["id"], imagem.id)
        self.assertTrue(response.data["imagem_principal"]["principal"])

    def test_api_publica_ordena_imagens_por_principal_ordem_e_id(self):
        imagem_ordem_2 = self.criar_imagem_brinquedo(
            imagem=self.imagem_upload("ordem-2.jpg"),
            ordem=2,
        )
        imagem_ordem_1 = self.criar_imagem_brinquedo(
            imagem=self.imagem_upload("ordem-1.jpg"),
            ordem=1,
        )
        imagem_principal = self.criar_imagem_brinquedo(
            imagem=self.imagem_upload("principal.jpg"),
            principal=True,
            ordem=99,
        )

        response = self.client.get(f"{self.brinquedos_url}{self.brinquedo.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [imagem["id"] for imagem in response.data["imagens"]],
            [imagem_principal.id, imagem_ordem_1.id, imagem_ordem_2.id],
        )

    def test_api_publica_nao_expoe_caminho_interno_do_arquivo(self):
        self.criar_imagem_brinquedo(principal=True)

        response = self.client.get(f"{self.brinquedos_url}{self.brinquedo.id}/")

        imagem = response.data["imagem_principal"]
        self.assertEqual(
            set(imagem.keys()),
            {"id", "url", "alt_text", "principal", "ordem"},
        )
        self.assertNotIn(str(settings.MEDIA_ROOT), imagem["url"])
        self.assertNotIn("\\", imagem["url"])

    def test_upload_bloqueia_extensao_invalida(self):
        imagem = ImagemBrinquedo(
            brinquedo=self.brinquedo,
            imagem=self.imagem_upload("brinquedo.gif"),
        )

        with self.assertRaises(ValidationError):
            imagem.full_clean()

    def test_upload_bloqueia_svg(self):
        arquivo = SimpleUploadedFile(
            "brinquedo.svg",
            b"<svg><script>alert('x')</script></svg>",
            content_type="image/svg+xml",
        )
        imagem = ImagemBrinquedo(brinquedo=self.brinquedo, imagem=arquivo)

        with self.assertRaises(ValidationError):
            imagem.full_clean()

    def test_upload_bloqueia_arquivo_acima_do_limite(self):
        arquivo = self.imagem_upload()
        arquivo.size = 3 * 1024 * 1024 + 1
        imagem = ImagemBrinquedo(brinquedo=self.brinquedo, imagem=arquivo)

        with self.assertRaises(ValidationError):
            imagem.full_clean()

    def test_upload_bloqueia_extensao_falsa_que_nao_e_imagem_real(self):
        arquivo = SimpleUploadedFile(
            "brinquedo.jpg",
            b"isto nao e uma imagem",
            content_type="image/jpeg",
        )
        imagem = ImagemBrinquedo(brinquedo=self.brinquedo, imagem=arquivo)

        with self.assertRaises(ValidationError):
            imagem.full_clean()

    def test_brinquedo_sem_imagem_continua_retornando_normalmente(self):
        response = self.client.get(f"{self.brinquedos_url}{self.brinquedo.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["imagens"], [])
        self.assertIsNone(response.data["imagem_principal"])
        self.assertEqual(response.data["nome"], self.brinquedo.nome)


class KitFestaAPITests(APITestCase):
    kits_url = "/api/kits-festa/"

    def setUp(self):
        self.brinquedo = Brinquedo.objects.create(
            nome="Piscina de bolinhas",
            descricao="Brinquedo para festas infantis.",
            preco_aluguel="150.00",
        )
        self.outro_brinquedo = Brinquedo.objects.create(
            nome="Cama elastica",
            descricao="Brinquedo para festas maiores.",
            preco_aluguel="220.00",
        )
        self.kit = KitFesta.objects.create(
            nome="Kit Diversao",
            descricao="Kit pronto para festa infantil.",
            preco_aluguel="350.00",
            ordem=1,
        )
        self.usuario_comum = get_user_model().objects.create_user(
            username="cliente-kit",
            password="senha-segura-123",
        )
        self.usuario_admin = get_user_model().objects.create_user(
            username="admin-kit",
            password="senha-segura-123",
            is_staff=True,
        )

    def payload_valido(self):
        return {
            "nome": "Kit Premium",
            "descricao": "Kit pronto premium.",
            "preco_aluguel": "500.00",
            "ativo": True,
            "ordem": 2,
        }

    def test_usuario_anonimo_lista_apenas_kits_ativos(self):
        KitFesta.objects.create(
            nome="Kit Inativo",
            descricao="Kit fora do catalogo publico.",
            preco_aluguel="250.00",
            ativo=False,
        )

        response = self.client.get(self.kits_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["nome"], self.kit.nome)

    def test_usuario_anonimo_ve_detalhe_de_kit_ativo(self):
        response = self.client.get(f"{self.kits_url}{self.kit.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.kit.id)
        self.assertEqual(response.data["nome"], self.kit.nome)

    def test_usuario_anonimo_nao_ve_detalhe_de_kit_inativo(self):
        self.kit.ativo = False
        self.kit.save(update_fields=["ativo"])

        response = self.client.get(f"{self.kits_url}{self.kit.id}/")

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_usuario_anonimo_nao_consegue_criar_kit(self):
        response = self.client.post(self.kits_url, self.payload_valido(), format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(KitFesta.objects.count(), 1)

    def test_usuario_comum_autenticado_nao_consegue_criar_kit(self):
        self.client.force_authenticate(user=self.usuario_comum)

        response = self.client.post(self.kits_url, self.payload_valido(), format="json")

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(KitFesta.objects.count(), 1)

    def test_usuario_admin_consegue_criar_kit(self):
        self.client.force_authenticate(user=self.usuario_admin)

        response = self.client.post(self.kits_url, self.payload_valido(), format="json")

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(KitFesta.objects.count(), 2)
        self.assertEqual(response.data["nome"], "Kit Premium")
        self.assertTrue(response.data["ativo"])

    def test_api_publica_retorna_itens_do_kit(self):
        ItemKitFesta.objects.create(
            kit=self.kit,
            brinquedo=self.brinquedo,
            quantidade=2,
            ordem=1,
        )

        response = self.client.get(f"{self.kits_url}{self.kit.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["itens"]), 1)
        item = response.data["itens"][0]
        self.assertEqual(item["quantidade"], 2)
        self.assertEqual(item["ordem"], 1)
        self.assertEqual(item["brinquedo"]["id"], self.brinquedo.id)
        self.assertEqual(item["brinquedo"]["nome"], self.brinquedo.nome)

    def test_itens_do_kit_sao_retornados_ordenados_por_ordem_depois_id(self):
        item_ordem_2 = ItemKitFesta.objects.create(
            kit=self.kit,
            brinquedo=self.brinquedo,
            quantidade=1,
            ordem=2,
        )
        item_ordem_1 = ItemKitFesta.objects.create(
            kit=self.kit,
            brinquedo=self.outro_brinquedo,
            quantidade=1,
            ordem=1,
        )

        response = self.client.get(f"{self.kits_url}{self.kit.id}/")

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            [item["id"] for item in response.data["itens"]],
            [item_ordem_1.id, item_ordem_2.id],
        )

    def test_item_kit_festa_rejeita_quantidade_menor_que_um(self):
        item = ItemKitFesta(
            kit=self.kit,
            brinquedo=self.brinquedo,
            quantidade=0,
        )

        with self.assertRaises(ValidationError):
            item.full_clean()

    def test_nao_permite_mesmo_brinquedo_duas_vezes_no_mesmo_kit(self):
        ItemKitFesta.objects.create(
            kit=self.kit,
            brinquedo=self.brinquedo,
            quantidade=1,
        )

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                ItemKitFesta.objects.create(
                    kit=self.kit,
                    brinquedo=self.brinquedo,
                    quantidade=2,
                )


class KitPersonalizavelAPITests(APITestCase):
    kits_personalizaveis_url = "/api/kits-personalizaveis/"

    def setUp(self):
        self.categoria_grandes = Categoria.objects.create(
            nome="Brinquedos grandes",
            slug="brinquedos-grandes",
            ordem=1,
        )
        self.categoria_bebes = Categoria.objects.create(
            nome="Bebes",
            slug="bebes",
            ordem=2,
        )
        self.brinquedo_grande = Brinquedo.objects.create(
            nome="Cama elastica",
            descricao="Brinquedo para festas maiores.",
            categoria=self.categoria_grandes,
            preco_aluguel="220.00",
        )
        self.brinquedo_bebe = Brinquedo.objects.create(
            nome="Piscina de bolinhas",
            descricao="Brinquedo para bebes.",
            categoria=self.categoria_bebes,
            preco_aluguel="150.00",
        )
        self.brinquedo_inativo = Brinquedo.objects.create(
            nome="Escorregador inativo",
            descricao="Fora do catalogo publico.",
            categoria=self.categoria_grandes,
            preco_aluguel="120.00",
            ativo=False,
        )
        self.configuracao = ConfiguracaoKitPersonalizavel.objects.create(
            nome="Monte seu kit",
            descricao="Escolha os brinquedos para sua festa.",
            preco_base="50.00",
            quantidade_minima_brinquedos=2,
            quantidade_maxima_brinquedos=4,
            modo_elegibilidade=(
                ConfiguracaoKitPersonalizavel.ModoElegibilidade.CATEGORIAS
            ),
            ordem=1,
        )
        self.configuracao.categorias_permitidas.add(self.categoria_grandes)
        self.usuario_comum = get_user_model().objects.create_user(
            username="cliente-kit-personalizavel",
            password="senha-segura-123",
        )
        self.usuario_admin = get_user_model().objects.create_user(
            username="admin-kit-personalizavel",
            password="senha-segura-123",
            is_staff=True,
        )

    def payload_valido(self):
        return {
            "nome": "Monte seu kit premium",
            "descricao": "Escolha uma combinacao premium.",
            "ativo": True,
            "ordem": 2,
            "preco_base": "80.00",
            "quantidade_minima_brinquedos": 1,
            "quantidade_maxima_brinquedos": 3,
            "modo_elegibilidade": (
                ConfiguracaoKitPersonalizavel.ModoElegibilidade.BRINQUEDOS
            ),
            "categorias_permitidas": [],
            "brinquedos_permitidos": [self.brinquedo_bebe.id],
        }

    def test_usuario_anonimo_lista_apenas_configuracoes_ativas(self):
        ConfiguracaoKitPersonalizavel.objects.create(
            nome="Config inativa",
            descricao="Nao deve aparecer.",
            ativo=False,
            preco_base="0.00",
            quantidade_minima_brinquedos=1,
            quantidade_maxima_brinquedos=2,
            modo_elegibilidade=(
                ConfiguracaoKitPersonalizavel.ModoElegibilidade.BRINQUEDOS
            ),
        )

        response = self.client.get(self.kits_personalizaveis_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["nome"], self.configuracao.nome)

    def test_usuario_anonimo_ve_detalhe_de_configuracao_ativa(self):
        response = self.client.get(
            f"{self.kits_personalizaveis_url}{self.configuracao.id}/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["id"], self.configuracao.id)
        self.assertEqual(response.data["nome"], self.configuracao.nome)

    def test_usuario_anonimo_nao_ve_detalhe_de_configuracao_inativa(self):
        self.configuracao.ativo = False
        self.configuracao.save(update_fields=["ativo"])

        response = self.client.get(
            f"{self.kits_personalizaveis_url}{self.configuracao.id}/"
        )

        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)

    def test_usuario_anonimo_nao_consegue_criar_configuracao(self):
        response = self.client.post(
            self.kits_personalizaveis_url,
            self.payload_valido(),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(ConfiguracaoKitPersonalizavel.objects.count(), 1)

    def test_usuario_comum_autenticado_nao_consegue_criar_configuracao(self):
        self.client.force_authenticate(user=self.usuario_comum)

        response = self.client.post(
            self.kits_personalizaveis_url,
            self.payload_valido(),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(ConfiguracaoKitPersonalizavel.objects.count(), 1)

    def test_usuario_admin_consegue_criar_configuracao(self):
        self.client.force_authenticate(user=self.usuario_admin)

        response = self.client.post(
            self.kits_personalizaveis_url,
            self.payload_valido(),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(ConfiguracaoKitPersonalizavel.objects.count(), 2)
        self.assertEqual(response.data["nome"], "Monte seu kit premium")
        self.assertTrue(response.data["ativo"])

    def test_configuracao_rejeita_quantidade_minima_maior_que_maxima(self):
        configuracao = ConfiguracaoKitPersonalizavel(
            nome="Config invalida",
            descricao="Limites invalidos.",
            preco_base="0.00",
            quantidade_minima_brinquedos=5,
            quantidade_maxima_brinquedos=2,
            modo_elegibilidade=(
                ConfiguracaoKitPersonalizavel.ModoElegibilidade.BRINQUEDOS
            ),
        )

        with self.assertRaises(ValidationError):
            configuracao.full_clean()

    def test_regra_categoria_rejeita_quantidade_minima_maior_que_maxima(self):
        regra = RegraCategoriaKitPersonalizavel(
            configuracao=self.configuracao,
            categoria=self.categoria_grandes,
            quantidade_minima=3,
            quantidade_maxima=1,
        )

        with self.assertRaises(ValidationError):
            regra.full_clean()

    def test_nao_permite_repetir_categoria_em_regras_da_mesma_configuracao(self):
        RegraCategoriaKitPersonalizavel.objects.create(
            configuracao=self.configuracao,
            categoria=self.categoria_grandes,
            quantidade_minima=1,
            quantidade_maxima=2,
        )

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                RegraCategoriaKitPersonalizavel.objects.create(
                    configuracao=self.configuracao,
                    categoria=self.categoria_grandes,
                    quantidade_minima=1,
                    quantidade_maxima=3,
                )

    def test_api_publica_nao_expoe_campos_administrativos(self):
        response = self.client.get(
            f"{self.kits_personalizaveis_url}{self.configuracao.id}/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertNotIn("ativo", response.data)
        self.assertNotIn("criado_em", response.data)
        self.assertNotIn("atualizado_em", response.data)
        self.assertNotIn("brinquedos_permitidos", response.data)

    def test_api_publica_retorna_categorias_permitidas(self):
        response = self.client.get(
            f"{self.kits_personalizaveis_url}{self.configuracao.id}/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(
            response.data["categorias_permitidas"],
            [
                {
                    "id": self.categoria_grandes.id,
                    "nome": self.categoria_grandes.nome,
                    "slug": self.categoria_grandes.slug,
                }
            ],
        )

    def test_api_publica_retorna_regras_por_categoria(self):
        regra = RegraCategoriaKitPersonalizavel.objects.create(
            configuracao=self.configuracao,
            categoria=self.categoria_grandes,
            quantidade_minima=1,
            quantidade_maxima=2,
            ordem=1,
        )

        response = self.client.get(
            f"{self.kits_personalizaveis_url}{self.configuracao.id}/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data["regras_categoria"]), 1)
        regra_response = response.data["regras_categoria"][0]
        self.assertEqual(regra_response["id"], regra.id)
        self.assertEqual(regra_response["categoria"]["id"], self.categoria_grandes.id)
        self.assertEqual(regra_response["quantidade_minima"], 1)
        self.assertEqual(regra_response["quantidade_maxima"], 2)

    def test_api_publica_retorna_brinquedos_elegiveis_no_modo_categorias(self):
        response = self.client.get(
            f"{self.kits_personalizaveis_url}{self.configuracao.id}/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        brinquedos = response.data["brinquedos_elegiveis"]
        self.assertEqual(len(brinquedos), 1)
        self.assertEqual(brinquedos[0]["id"], self.brinquedo_grande.id)
        self.assertEqual(brinquedos[0]["preco_aluguel"], "220.00")
        self.assertIn("quantidade_disponivel", brinquedos[0])

    def test_api_publica_retorna_brinquedos_elegiveis_no_modo_brinquedos(self):
        self.configuracao.modo_elegibilidade = (
            ConfiguracaoKitPersonalizavel.ModoElegibilidade.BRINQUEDOS
        )
        self.configuracao.save(update_fields=["modo_elegibilidade"])
        self.configuracao.brinquedos_permitidos.add(self.brinquedo_bebe)

        response = self.client.get(
            f"{self.kits_personalizaveis_url}{self.configuracao.id}/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        brinquedos = response.data["brinquedos_elegiveis"]
        self.assertEqual(len(brinquedos), 1)
        self.assertEqual(brinquedos[0]["id"], self.brinquedo_bebe.id)

    def test_api_publica_retorna_uniao_sem_duplicidade_no_modo_categorias_e_brinquedos(
        self,
    ):
        self.configuracao.modo_elegibilidade = (
            ConfiguracaoKitPersonalizavel.ModoElegibilidade.CATEGORIAS_E_BRINQUEDOS
        )
        self.configuracao.save(update_fields=["modo_elegibilidade"])
        self.configuracao.brinquedos_permitidos.add(
            self.brinquedo_grande,
            self.brinquedo_bebe,
        )

        response = self.client.get(
            f"{self.kits_personalizaveis_url}{self.configuracao.id}/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids_brinquedos = [
            brinquedo["id"] for brinquedo in response.data["brinquedos_elegiveis"]
        ]
        self.assertEqual(
            sorted(ids_brinquedos),
            sorted([self.brinquedo_grande.id, self.brinquedo_bebe.id]),
        )
        self.assertEqual(len(ids_brinquedos), len(set(ids_brinquedos)))

    def test_brinquedos_inativos_nao_aparecem_em_brinquedos_elegiveis(self):
        response = self.client.get(
            f"{self.kits_personalizaveis_url}{self.configuracao.id}/"
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        ids_brinquedos = [
            brinquedo["id"] for brinquedo in response.data["brinquedos_elegiveis"]
        ]
        self.assertNotIn(self.brinquedo_inativo.id, ids_brinquedos)

    def test_validar_selecao_retorna_resumo_com_preco_estimado_do_backend(self):
        UnidadeBrinquedo.objects.create(
            brinquedo=self.brinquedo_grande,
            codigo="CAMA-001",
            status=UnidadeBrinquedo.Status.DISPONIVEL,
        )
        UnidadeBrinquedo.objects.create(
            brinquedo=self.brinquedo_grande,
            codigo="CAMA-002",
            status=UnidadeBrinquedo.Status.DISPONIVEL,
        )
        RegraCategoriaKitPersonalizavel.objects.create(
            configuracao=self.configuracao,
            categoria=self.categoria_grandes,
            quantidade_minima=1,
            quantidade_maxima=2,
        )
        payload = {
            "itens": [
                {
                    "brinquedo_id": self.brinquedo_grande.id,
                    "quantidade": 2,
                }
            ],
            "preco_estimado": "0.01",
        }

        response = self.client.post(
            (
                f"{self.kits_personalizaveis_url}{self.configuracao.id}/"
                "validar-selecao/"
            ),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["configuracao_id"], self.configuracao.id)
        self.assertEqual(response.data["quantidade_total"], 2)
        self.assertEqual(str(response.data["preco_base"]), "50.00")
        self.assertEqual(str(response.data["preco_itens"]), "440.00")
        self.assertEqual(str(response.data["preco_estimado"]), "490.00")
        self.assertEqual(len(response.data["itens"]), 1)
        item = response.data["itens"][0]
        self.assertEqual(item["brinquedo_id"], self.brinquedo_grande.id)
        self.assertEqual(item["quantidade"], 2)
        self.assertEqual(str(item["preco_unitario"]), "220.00")
        self.assertEqual(str(item["subtotal"]), "440.00")

    def test_validar_selecao_rejeita_brinquedo_fora_da_configuracao(self):
        payload = {
            "itens": [
                {
                    "brinquedo_id": self.brinquedo_bebe.id,
                    "quantidade": 2,
                }
            ]
        }

        response = self.client.post(
            (
                f"{self.kits_personalizaveis_url}{self.configuracao.id}/"
                "validar-selecao/"
            ),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("itens", response.data)

    def test_validar_selecao_rejeita_quantidade_total_menor_que_minima(self):
        payload = {
            "itens": [
                {
                    "brinquedo_id": self.brinquedo_grande.id,
                    "quantidade": 1,
                }
            ]
        }

        response = self.client.post(
            (
                f"{self.kits_personalizaveis_url}{self.configuracao.id}/"
                "validar-selecao/"
            ),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("itens", response.data)

    def test_validar_selecao_rejeita_quantidade_total_maior_que_maxima(self):
        payload = {
            "itens": [
                {
                    "brinquedo_id": self.brinquedo_grande.id,
                    "quantidade": 5,
                }
            ]
        }

        response = self.client.post(
            (
                f"{self.kits_personalizaveis_url}{self.configuracao.id}/"
                "validar-selecao/"
            ),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("itens", response.data)

    def test_validar_selecao_nao_bloqueia_por_estoque_atual_disponivel(self):
        payload = {
            "itens": [
                {
                    "brinquedo_id": self.brinquedo_grande.id,
                    "quantidade": 2,
                }
            ]
        }

        response = self.client.post(
            (
                f"{self.kits_personalizaveis_url}{self.configuracao.id}/"
                "validar-selecao/"
            ),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["quantidade_total"], 2)
        self.assertEqual(str(response.data["preco_estimado"]), "490.00")

    def test_validar_selecao_rejeita_brinquedo_repetido_no_payload(self):
        payload = {
            "itens": [
                {
                    "brinquedo_id": self.brinquedo_grande.id,
                    "quantidade": 1,
                },
                {
                    "brinquedo_id": self.brinquedo_grande.id,
                    "quantidade": 1,
                },
            ]
        }

        response = self.client.post(
            (
                f"{self.kits_personalizaveis_url}{self.configuracao.id}/"
                "validar-selecao/"
            ),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("itens", response.data)

    def test_validar_selecao_rejeita_regra_minima_por_categoria(self):
        self.configuracao.modo_elegibilidade = (
            ConfiguracaoKitPersonalizavel.ModoElegibilidade.CATEGORIAS_E_BRINQUEDOS
        )
        self.configuracao.save(update_fields=["modo_elegibilidade"])
        self.configuracao.brinquedos_permitidos.add(self.brinquedo_bebe)
        RegraCategoriaKitPersonalizavel.objects.create(
            configuracao=self.configuracao,
            categoria=self.categoria_grandes,
            quantidade_minima=1,
            quantidade_maxima=2,
        )
        UnidadeBrinquedo.objects.create(
            brinquedo=self.brinquedo_bebe,
            codigo="BEBE-001",
            status=UnidadeBrinquedo.Status.DISPONIVEL,
        )
        UnidadeBrinquedo.objects.create(
            brinquedo=self.brinquedo_bebe,
            codigo="BEBE-002",
            status=UnidadeBrinquedo.Status.DISPONIVEL,
        )
        payload = {
            "itens": [
                {
                    "brinquedo_id": self.brinquedo_bebe.id,
                    "quantidade": 2,
                }
            ]
        }

        response = self.client.post(
            (
                f"{self.kits_personalizaveis_url}{self.configuracao.id}/"
                "validar-selecao/"
            ),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("itens", response.data)

    def test_validar_selecao_rejeita_regra_maxima_por_categoria(self):
        RegraCategoriaKitPersonalizavel.objects.create(
            configuracao=self.configuracao,
            categoria=self.categoria_grandes,
            quantidade_minima=1,
            quantidade_maxima=2,
        )
        for indice in range(1, 4):
            UnidadeBrinquedo.objects.create(
                brinquedo=self.brinquedo_grande,
                codigo=f"CAMA-{indice:03d}",
                status=UnidadeBrinquedo.Status.DISPONIVEL,
            )
        payload = {
            "itens": [
                {
                    "brinquedo_id": self.brinquedo_grande.id,
                    "quantidade": 3,
                }
            ]
        }

        response = self.client.post(
            (
                f"{self.kits_personalizaveis_url}{self.configuracao.id}/"
                "validar-selecao/"
            ),
            payload,
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("itens", response.data)
