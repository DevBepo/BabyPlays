import json
from io import BytesIO
from decimal import Decimal
from urllib.error import HTTPError
from unittest.mock import patch

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase, override_settings
from rest_framework import status
from rest_framework.test import APITestCase

from .models import ConfiguracaoTaxaEntregaRetirada, RegraFreteBairro
from .providers import (
    CepNaoEncontradoError,
    EnderecoInterpretado,
    EnderecoIncompletoError,
    FakeCepProvider,
    FakeRotaProvider,
    GoogleRoutesRotaProvider,
    RotaProviderError,
)
from .services import TaxaEntregaRetiradaService


ENDERECO_DESTINO = {
    "cep": "01001000",
    "logradouro": "Praca da Se",
    "bairro": "Se",
    "cidade": "Sao Paulo",
    "uf": "SP",
}

ORIGEM_INTERPRETADA = EnderecoInterpretado(
    cep="02020000",
    logradouro="Rua de Origem",
    numero="100",
    complemento="",
    bairro="Santana",
    cidade="Sao Paulo",
    uf="SP",
)

DESTINO_INTERPRETADO = EnderecoInterpretado(
    cep="01001000",
    logradouro="Praca da Se",
    numero="123",
    complemento="Apto 45",
    bairro="Se",
    cidade="Sao Paulo",
    uf="SP",
)


class FakeHttpResponse:
    def __init__(self, payload):
        self.payload = payload

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        return False

    def read(self):
        return json.dumps(self.payload).encode("utf-8")


def criar_configuracao(**extra):
    dados = {
        "valor_por_km": Decimal("3.00"),
        "origem_cep": "02020000",
        "origem_logradouro": "Rua de Origem",
        "origem_numero": "100",
        "origem_complemento": "",
        "origem_bairro": "Santana",
        "origem_cidade": "Sao Paulo",
        "origem_uf": "SP",
        "ativo": True,
    }
    dados.update(extra)
    return ConfiguracaoTaxaEntregaRetirada.objects.create(**dados)


class ConfiguracaoTaxaEntregaRetiradaModelTests(TestCase):
    def test_configuracao_aceita_valor_por_km_valido(self):
        configuracao = criar_configuracao(valor_por_km=Decimal("3.00"))

        configuracao.full_clean()

        self.assertEqual(configuracao.valor_por_km, Decimal("3.00"))

    def test_configuracao_rejeita_valor_por_km_negativo(self):
        configuracao = ConfiguracaoTaxaEntregaRetirada(
            valor_por_km=Decimal("-0.01"),
            origem_cep="02020000",
            origem_logradouro="Rua de Origem",
            origem_numero="100",
            origem_bairro="Santana",
            origem_cidade="Sao Paulo",
            origem_uf="SP",
            ativo=True,
        )

        with self.assertRaises(ValidationError):
            configuracao.full_clean()

    def test_nao_permite_mais_de_uma_configuracao_ativa_na_validacao(self):
        criar_configuracao()
        outra_configuracao = ConfiguracaoTaxaEntregaRetirada(
            valor_por_km=Decimal("4.00"),
            origem_cep="03030000",
            origem_logradouro="Rua Nova",
            origem_numero="200",
            origem_bairro="Centro",
            origem_cidade="Sao Paulo",
            origem_uf="SP",
            ativo=True,
        )

        with self.assertRaises(ValidationError):
            outra_configuracao.full_clean()

    def test_nao_permite_mais_de_uma_configuracao_ativa_no_banco(self):
        criar_configuracao()

        with self.assertRaises(IntegrityError):
            criar_configuracao(origem_cep="03030000")


class GoogleRoutesRotaProviderTests(TestCase):
    @override_settings(GOOGLE_ROUTES_API_KEY="google-test-key")
    def test_provider_transforma_distancia_metros_em_km(self):
        provider = GoogleRoutesRotaProvider()

        with patch(
            "entregas.providers.urlopen",
            return_value=FakeHttpResponse({"routes": [{"distanceMeters": 12345}]}),
        ) as mock_urlopen:
            distancia = provider.calcular_distancia_ida_km(
                ORIGEM_INTERPRETADA,
                DESTINO_INTERPRETADO,
            )

        request = mock_urlopen.call_args.args[0]
        payload = json.loads(request.data.decode("utf-8"))
        self.assertEqual(distancia, Decimal("12.345"))
        self.assertEqual(mock_urlopen.call_args.kwargs["timeout"], 5)
        self.assertEqual(request.headers["X-goog-api-key"], "google-test-key")
        self.assertEqual(request.headers["X-goog-fieldmask"], "routes.distanceMeters")
        self.assertEqual(payload["travelMode"], "DRIVE")
        self.assertIn("Rua de Origem, 100", payload["origin"]["address"])
        self.assertIn("Praca da Se, 123", payload["destination"]["address"])

    @override_settings(GOOGLE_ROUTES_API_KEY="")
    def test_provider_falha_de_forma_segura_sem_chave_configurada(self):
        provider = GoogleRoutesRotaProvider()

        with self.assertRaises(RotaProviderError) as contexto:
            provider.calcular_distancia_ida_km(ORIGEM_INTERPRETADA, DESTINO_INTERPRETADO)

        self.assertEqual(
            str(contexto.exception),
            "Provider de rota nao configurado para calcular a distancia.",
        )

    @override_settings(GOOGLE_ROUTES_API_KEY="google-test-key")
    def test_provider_falha_de_forma_segura_em_timeout(self):
        provider = GoogleRoutesRotaProvider()

        with patch("entregas.providers.urlopen", side_effect=TimeoutError):
            with self.assertRaises(RotaProviderError) as contexto:
                provider.calcular_distancia_ida_km(
                    ORIGEM_INTERPRETADA,
                    DESTINO_INTERPRETADO,
                )

        self.assertEqual(
            str(contexto.exception),
            "Nao foi possivel calcular a rota para este endereco.",
        )

    @override_settings(GOOGLE_ROUTES_API_KEY="google-test-key")
    def test_provider_falha_de_forma_segura_em_status_http_invalido(self):
        provider = GoogleRoutesRotaProvider()
        erro_http = HTTPError(
            url=provider.api_url,
            code=500,
            msg="Internal Server Error",
            hdrs=None,
            fp=None,
        )

        with patch("entregas.providers.urlopen", side_effect=erro_http):
            with self.assertRaises(RotaProviderError) as contexto:
                provider.calcular_distancia_ida_km(
                    ORIGEM_INTERPRETADA,
                    DESTINO_INTERPRETADO,
                )

        self.assertEqual(
            str(contexto.exception),
            "Nao foi possivel calcular a rota para este endereco.",
        )

    @override_settings(GOOGLE_ROUTES_API_KEY="google-test-key")
    def test_provider_registra_erro_google_sem_expor_chave(self):
        provider = GoogleRoutesRotaProvider()
        corpo = json.dumps(
            {
                "error": {
                    "code": 403,
                    "status": "PERMISSION_DENIED",
                    "message": "API key google-test-key does not have permission",
                    "details": [{"reason": "API_KEY_SERVICE_BLOCKED"}],
                }
            }
        ).encode("utf-8")
        erro_http = HTTPError(
            url=provider.api_url,
            code=403,
            msg="Forbidden",
            hdrs=None,
            fp=BytesIO(corpo),
        )

        with self.assertLogs("entregas.providers", level="WARNING") as logs:
            with patch("entregas.providers.urlopen", side_effect=erro_http):
                with self.assertRaises(RotaProviderError):
                    provider.calcular_distancia_ida_km(
                        ORIGEM_INTERPRETADA,
                        DESTINO_INTERPRETADO,
                    )

        registro = " ".join(logs.output)
        self.assertIn("http_status=403", registro)
        self.assertIn("google_status=PERMISSION_DENIED", registro)
        self.assertIn("reason=API_KEY_SERVICE_BLOCKED", registro)
        self.assertIn("message=API key [REDACTED] does not have permission", registro)
        self.assertNotIn("google-test-key", registro)

    @override_settings(GOOGLE_ROUTES_API_KEY="google-test-key")
    def test_provider_falha_se_api_retornar_resposta_sem_rota(self):
        provider = GoogleRoutesRotaProvider()

        with patch(
            "entregas.providers.urlopen",
            return_value=FakeHttpResponse({"routes": []}),
        ):
            with self.assertRaises(RotaProviderError):
                provider.calcular_distancia_ida_km(
                    ORIGEM_INTERPRETADA,
                    DESTINO_INTERPRETADO,
                )

    @override_settings(GOOGLE_ROUTES_API_KEY="google-test-key")
    def test_provider_falha_se_distancia_vier_ausente_ou_invalida(self):
        respostas_invalidas = [
            {"routes": [{}]},
            {"routes": [{"distanceMeters": 0}]},
            {"routes": [{"distanceMeters": -1}]},
            {"routes": [{"distanceMeters": "abc"}]},
            {"routes": [{"distanceMeters": "NaN"}]},
            {"routes": [{"distanceMeters": "Infinity"}]},
        ]

        for resposta in respostas_invalidas:
            with self.subTest(resposta=resposta):
                provider = GoogleRoutesRotaProvider()

                with patch(
                    "entregas.providers.urlopen",
                    return_value=FakeHttpResponse(resposta),
                ):
                    with self.assertRaises(RotaProviderError):
                        provider.calcular_distancia_ida_km(
                            ORIGEM_INTERPRETADA,
                            DESTINO_INTERPRETADO,
                        )



class RegraFreteBairroModelTests(TestCase):
    def test_normaliza_cidade_bairro_e_uf_ao_salvar(self):
        regra = RegraFreteBairro.objects.create(
            uf="rs",
            cidade="  Guaíba ",
            bairro="Parque 35",
            valor_taxa=Decimal("25.00"),
        )

        self.assertEqual(regra.uf, "RS")
        self.assertEqual(regra.cidade_normalizada, "guaiba")
        self.assertEqual(regra.bairro_normalizado, "parque 35")

    def test_valor_zero_e_salvo_como_nulo(self):
        regra = RegraFreteBairro.objects.create(
            uf="RS",
            cidade="Guaiba",
            bairro="Centro",
            valor_taxa=Decimal("0.00"),
        )

        self.assertIsNone(regra.valor_taxa)


class TaxaEntregaRetiradaServiceTests(TestCase):
    def criar_regra(self, valor_taxa=Decimal("25.00"), **extra):
        dados = {
            "uf": "SP",
            "cidade": "São Paulo",
            "bairro": "Sé",
            "valor_taxa": valor_taxa,
            "ativo": True,
        }
        dados.update(extra)
        return RegraFreteBairro.objects.create(**dados)

    def criar_service(self, endereco=None, rota_provider=None):
        return TaxaEntregaRetiradaService(
            cep_provider=FakeCepProvider(endereco or ENDERECO_DESTINO),
            rota_provider=rota_provider,
        )

    def test_bairro_com_valor_retorna_taxa_sem_consultar_google_routes(self):
        self.criar_regra()
        rota_provider = FakeRotaProvider(erro=AssertionError("Google nao deve ser chamado"))

        resultado = self.criar_service(rota_provider=rota_provider).calcular(
            "01001000", "123"
        )

        self.assertEqual(resultado["status"], "calculada")
        self.assertEqual(resultado["taxa"], Decimal("25.00"))
        self.assertIsNone(resultado["distancia_ida_km"])
        self.assertIsNone(resultado["valor_por_km"])

    def test_normaliza_acentos_e_maiusculas_na_busca(self):
        self.criar_regra(cidade="SÃO PAULO", bairro="SÉ")

        resultado = self.criar_service().calcular("01001000", "123")

        self.assertEqual(resultado["status"], "calculada")
        self.assertEqual(resultado["taxa"], Decimal("25.00"))

    def test_bairro_sem_valor_retorna_frete_a_confirmar(self):
        self.criar_regra(valor_taxa=None)

        resultado = self.criar_service().calcular("01001000", "123")

        self.assertEqual(resultado["status"], "a_confirmar")
        self.assertIsNone(resultado["taxa"])

    def test_bairro_nao_cadastrado_retorna_sujeito_a_analise(self):
        resultado = self.criar_service().calcular("01001000", "123")

        self.assertEqual(resultado["status"], "sujeita_analise")
        self.assertIsNone(resultado["taxa"])

    def test_regra_inativa_nao_e_usada(self):
        self.criar_regra(ativo=False)

        resultado = self.criar_service().calcular("01001000", "123")

        self.assertEqual(resultado["status"], "sujeita_analise")
        self.assertIsNone(resultado["taxa"])

    def test_endereco_incompleto_continua_bloqueando(self):
        endereco = {**ENDERECO_DESTINO, "logradouro": ""}

        with self.assertRaises(EnderecoIncompletoError):
            self.criar_service(endereco=endereco).calcular("01001000", "123")


class CalcularTaxaEntregaRetiradaAPITests(APITestCase):
    url = "/api/taxa-entrega-retirada/calcular/"

    def postar(self, cep="01001000", numero="123"):
        with patch(
            "entregas.services.CepProvider",
            return_value=FakeCepProvider(ENDERECO_DESTINO),
        ):
            return self.client.post(
                self.url,
                {"cep": cep, "numero": numero},
                format="json",
            )

    def test_endpoint_retorna_taxa_do_bairro(self):
        RegraFreteBairro.objects.create(
            uf="SP",
            cidade="Sao Paulo",
            bairro="Se",
            valor_taxa=Decimal("31.50"),
        )

        response = self.postar()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "calculada")
        self.assertEqual(response.data["taxa"], "31.50")
        self.assertIsNone(response.data["distancia_ida_km"])

    def test_endpoint_sem_regra_nao_bloqueia(self):
        response = self.postar()

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["status"], "sujeita_analise")
        self.assertIsNone(response.data["taxa"])

    def test_endpoint_rejeita_cep_invalido(self):
        response = self.client.post(
            self.url,
            {"cep": "123", "numero": "123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cep", response.data)

    def test_endpoint_rejeita_cep_nao_encontrado(self):
        with patch(
            "entregas.services.CepProvider",
            return_value=FakeCepProvider(erro=CepNaoEncontradoError()),
        ):
            response = self.client.post(
                self.url,
                {"cep": "01001000", "numero": "123"},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "CEP nao encontrado.")

    def test_frontend_nao_consegue_forjar_taxa(self):
        response = self.client.post(
            self.url,
            {
                "cep": "01001000",
                "numero": "123",
                "taxa": "0.01",
                "frete": "0.01",
            },
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)
