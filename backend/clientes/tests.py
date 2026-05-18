from django.contrib import admin
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.test import TestCase
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch
from rest_framework import status
from rest_framework.test import APITestCase

from catalogo.models import Brinquedo, Categoria
from pedidos.models import Carrinho, Pedido
from .admin import ClienteAdmin
from .models import Cliente


class FakeTaxaEntregaRetiradaService:
    def calcular(self, cep, numero, complemento=""):
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


class ClienteModelTests(TestCase):
    def setUp(self):
        self.user = get_user_model().objects.create_user(
            username="cliente",
            email="cliente@example.com",
            password="senha-segura-123",
        )

    def test_cria_cliente_vinculado_a_user(self):
        cliente = Cliente.objects.create(
            user=self.user,
            nome="Cliente Teste",
            telefone="11999999999",
        )

        self.assertEqual(cliente.user, self.user)
        self.assertEqual(self.user.cliente, cliente)
        self.assertTrue(cliente.ativo)
        self.assertIsNotNone(cliente.criado_em)
        self.assertIsNotNone(cliente.atualizado_em)

    def test_impede_dois_clientes_para_o_mesmo_user(self):
        Cliente.objects.create(
            user=self.user,
            nome="Cliente Teste",
            telefone="11999999999",
        )

        with self.assertRaises(IntegrityError):
            with transaction.atomic():
                Cliente.objects.create(
                    user=self.user,
                    nome="Cliente Duplicado",
                    telefone="11888888888",
                )

        self.assertEqual(Cliente.objects.count(), 1)

    def test_str_retorna_nome_do_cliente(self):
        cliente = Cliente.objects.create(
            user=self.user,
            nome="Cliente Teste",
            telefone="11999999999",
        )

        self.assertEqual(str(cliente), "Cliente Teste")

    def test_cliente_aparece_em_consulta_basica(self):
        Cliente.objects.create(
            user=self.user,
            nome="Cliente Teste",
            telefone="11999999999",
        )

        cliente = Cliente.objects.get(user=self.user)

        self.assertEqual(cliente.nome, "Cliente Teste")
        self.assertEqual(cliente.telefone, "11999999999")
        self.assertEqual(cliente.user.email, "cliente@example.com")


class ClienteAdminTests(TestCase):
    def test_cliente_admin_registrado_com_configuracao_basica(self):
        model_admin = admin.site._registry[Cliente]

        self.assertIsInstance(model_admin, ClienteAdmin)
        self.assertEqual(
            model_admin.list_display,
            (
                "nome",
                "user",
                "email_do_user",
                "telefone",
                "ativo",
                "criado_em",
            ),
        )
        self.assertIn("user__email", model_admin.search_fields)
        self.assertIn("ativo", model_admin.list_filter)


class ClienteAuthAPITests(APITestCase):
    cadastro_url = "/api/auth/cadastro/"
    login_url = "/api/auth/login/"
    logout_url = "/api/auth/logout/"
    me_url = "/api/auth/me/"
    csrf_url = "/api/auth/csrf/"
    carrinho_url = "/api/carrinho/atual/"
    itens_url = "/api/carrinho/itens/"
    converter_pedido_url = "/api/pedidos/converter-carrinho/"

    def payload_cadastro(self, **extra):
        payload = {
            "nome": "Cliente Teste",
            "email": "cliente@email.com",
            "telefone": "11999999999",
            "senha": "SenhaForte123!",
            "confirmacao_senha": "SenhaForte123!",
        }
        payload.update(extra)
        return payload

    def criar_usuario_cliente(
        self,
        email="cliente@email.com",
        senha="SenhaForte123!",
        is_active=True,
    ):
        user = get_user_model().objects.create_user(
            username=email,
            email=email,
            password=senha,
            is_active=is_active,
        )
        cliente = Cliente.objects.create(
            user=user,
            nome="Cliente Teste",
            telefone="11999999999",
        )
        return user, cliente

    def criar_brinquedo(self):
        categoria = Categoria.objects.create(
            nome="Brinquedos grandes",
            slug="brinquedos-grandes",
        )
        return Brinquedo.objects.create(
            nome="Cama elastica",
            descricao="Brinquedo para festas maiores.",
            categoria=categoria,
            preco_aluguel=Decimal("220.00"),
        )

    def adicionar_brinquedo_ao_carrinho(self, brinquedo):
        return self.client.post(
            self.itens_url,
            {
                "tipo_item": "brinquedo",
                "brinquedo_id": brinquedo.id,
                "quantidade": 1,
            },
            format="json",
        )

    def payload_pedido(self):
        data_evento = timezone.localdate() + timedelta(days=30)
        return {
            "nome": "Cliente Teste",
            "telefone": "11999999999",
            "email": "cliente@email.com",
            "data_evento_pretendida": str(data_evento),
            "data_inicio_locacao": str(data_evento),
            "data_fim_locacao": str(data_evento + timedelta(days=2)),
            "cep": "01001-000",
            "numero": "123",
        }

    def login_cliente(self, email="cliente@email.com", senha="SenhaForte123!"):
        return self.client.post(
            self.login_url,
            {"email": email, "senha": senha},
            format="json",
        )

    def test_cadastro_cria_user_e_cliente(self):
        response = self.client.post(
            self.cadastro_url,
            self.payload_cadastro(),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        user = get_user_model().objects.get(email="cliente@email.com")
        cliente = Cliente.objects.get(user=user)
        self.assertEqual(user.username, "cliente@email.com")
        self.assertTrue(user.check_password("SenhaForte123!"))
        self.assertEqual(cliente.nome, "Cliente Teste")
        self.assertEqual(cliente.telefone, "11999999999")
        self.assertNotIn("senha", response.data)
        self.assertNotIn("confirmacao_senha", response.data)
        self.assertEqual(response.data["user"]["email"], "cliente@email.com")
        self.assertEqual(response.data["cliente"]["id"], cliente.id)

    def test_cadastro_rejeita_email_duplicado(self):
        self.criar_usuario_cliente()

        response = self.client.post(
            self.cadastro_url,
            self.payload_cadastro(email="CLIENTE@email.com"),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("email", response.data)
        self.assertEqual(get_user_model().objects.count(), 1)
        self.assertEqual(Cliente.objects.count(), 1)

    def test_cadastro_valida_senha_fraca(self):
        response = self.client.post(
            self.cadastro_url,
            self.payload_cadastro(senha="123", confirmacao_senha="123"),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("senha", response.data)
        self.assertEqual(get_user_model().objects.count(), 0)

    def test_cadastro_valida_confirmacao_de_senha(self):
        response = self.client.post(
            self.cadastro_url,
            self.payload_cadastro(confirmacao_senha="OutraSenha123!"),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("confirmacao_senha", response.data)
        self.assertEqual(get_user_model().objects.count(), 0)

    def test_cadastro_autentica_automaticamente_a_sessao(self):
        cadastro = self.client.post(
            self.cadastro_url,
            self.payload_cadastro(),
            format="json",
        )
        me = self.client.get(self.me_url)

        self.assertEqual(cadastro.status_code, status.HTTP_201_CREATED)
        self.assertEqual(me.status_code, status.HTTP_200_OK)
        self.assertTrue(me.data["authenticated"])
        self.assertEqual(me.data["user"]["email"], "cliente@email.com")

    def test_login_valido_autentica(self):
        user, cliente = self.criar_usuario_cliente()

        response = self.login_cliente()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["user"]["id"], user.id)
        self.assertEqual(response.data["cliente"]["id"], cliente.id)
        self.assertNotIn("username", response.data["user"])
        self.assertNotIn("is_staff", response.data["user"])
        self.assertNotIn("is_superuser", response.data["user"])
        me = self.client.get(self.me_url)
        self.assertEqual(me.status_code, status.HTTP_200_OK)

    def test_login_invalido_retorna_erro_generico(self):
        self.criar_usuario_cliente()

        response = self.login_cliente(senha="senha-errada")

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            str(response.data["non_field_errors"][0]),
            "E-mail ou senha invalidos.",
        )

    def test_usuario_inativo_nao_autentica(self):
        self.criar_usuario_cliente(is_active=False)

        response = self.login_cliente()

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            str(response.data["non_field_errors"][0]),
            "E-mail ou senha invalidos.",
        )

    def test_logout_encerra_autenticacao(self):
        self.criar_usuario_cliente()
        login_response = self.login_cliente()
        logout_response = self.client.post(self.logout_url, {}, format="json")
        me_response = self.client.get(self.me_url)

        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.assertEqual(logout_response.status_code, status.HTTP_200_OK)
        self.assertEqual(me_response.status_code, status.HTTP_403_FORBIDDEN)

    def test_me_exige_login(self):
        response = self.client.get(self.me_url)

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_me_retorna_cliente_correto(self):
        user, cliente = self.criar_usuario_cliente()
        self.login_cliente()

        response = self.client.get(self.me_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["authenticated"])
        self.assertEqual(response.data["user"], {"id": user.id, "email": user.email})
        self.assertEqual(
            response.data["cliente"],
            {
                "id": cliente.id,
                "nome": cliente.nome,
                "telefone": cliente.telefone,
                "ativo": True,
            },
        )

    def test_csrf_retorna_token_e_cookie(self):
        response = self.client.get(self.csrf_url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("csrfToken", response.data)
        self.assertIn("csrftoken", response.cookies)

    def test_carrinho_anonimo_e_preservado_e_vinculado_apos_login(self):
        brinquedo = self.criar_brinquedo()
        self.criar_usuario_cliente()
        item_response = self.adicionar_brinquedo_ao_carrinho(brinquedo)
        carrinho = Carrinho.objects.get()

        login_response = self.login_cliente()
        carrinho_response = self.client.get(self.carrinho_url)

        self.assertEqual(item_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(login_response.status_code, status.HTTP_200_OK)
        self.assertEqual(carrinho_response.status_code, status.HTTP_200_OK)
        carrinho.refresh_from_db()
        self.assertEqual(carrinho_response.data["id"], carrinho.id)
        self.assertEqual(carrinho.usuario.email, "cliente@email.com")
        self.assertEqual(carrinho.itens.count(), 1)
        self.assertEqual(carrinho.itens.get().brinquedo, brinquedo)

    def test_usuario_autenticado_por_sessao_converte_carrinho_em_pedido(self):
        brinquedo = self.criar_brinquedo()
        user, cliente = self.criar_usuario_cliente()
        self.login_cliente()
        item_response = self.adicionar_brinquedo_ao_carrinho(brinquedo)

        with patch(
            "pedidos.services.TaxaEntregaRetiradaService",
            return_value=FakeTaxaEntregaRetiradaService(),
        ):
            response = self.client.post(
                self.converter_pedido_url,
                self.payload_pedido(),
                format="json",
            )

        self.assertEqual(item_response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        pedido = Pedido.objects.get()
        carrinho = Carrinho.objects.get()
        self.assertEqual(pedido.usuario, user)
        self.assertEqual(pedido.cliente, cliente)
        self.assertEqual(pedido.carrinho_origem, carrinho)
        self.assertEqual(carrinho.status, Carrinho.Status.CONVERTIDO)

    def test_anonimo_continua_bloqueado_no_fechamento_do_pedido(self):
        brinquedo = self.criar_brinquedo()
        self.adicionar_brinquedo_ao_carrinho(brinquedo)

        response = self.client.post(
            self.converter_pedido_url,
            self.payload_pedido(),
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
        self.assertEqual(Pedido.objects.count(), 0)
