import shutil
import tempfile
from io import BytesIO

from django.conf import settings
from django.db import IntegrityError, transaction
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.core.files.uploadedfile import SimpleUploadedFile
from PIL import Image
from rest_framework import status
from rest_framework.test import APITestCase

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
