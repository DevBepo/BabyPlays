from django.contrib import admin
from django.contrib.auth import get_user_model
from django.db import IntegrityError, transaction
from django.test import TestCase

from .admin import ClienteAdmin
from .models import Cliente


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
