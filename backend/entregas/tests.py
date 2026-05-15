from decimal import Decimal
from unittest.mock import patch

from django.core.exceptions import ValidationError
from django.db import IntegrityError
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APITestCase

from .models import ConfiguracaoTaxaEntregaRetirada
from .providers import (
    CepNaoEncontradoError,
    EnderecoIncompletoError,
    FakeCepProvider,
    FakeRotaProvider,
    RotaProviderError,
)
from .services import (
    ConfiguracaoTaxaAusenteError,
    DistanciaInvalidaError,
    TaxaEntregaRetiradaService,
)


ENDERECO_DESTINO = {
    "cep": "01001000",
    "logradouro": "Praca da Se",
    "bairro": "Se",
    "cidade": "Sao Paulo",
    "uf": "SP",
}


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


class TaxaEntregaRetiradaServiceTests(TestCase):
    def test_service_usa_decimal_e_arredonda_corretamente(self):
        criar_configuracao(valor_por_km=Decimal("2.55"))
        service = TaxaEntregaRetiradaService(
            cep_provider=FakeCepProvider(ENDERECO_DESTINO),
            rota_provider=FakeRotaProvider(Decimal("1.005")),
        )

        resultado = service.calcular("01001-000", "123")

        self.assertEqual(resultado["distancia_ida_km"], Decimal("1.01"))
        self.assertEqual(resultado["distancia_total_km"], Decimal("2.01"))
        self.assertEqual(resultado["valor_por_km"], Decimal("2.55"))
        self.assertEqual(resultado["taxa"], Decimal("5.13"))

    def test_service_erro_se_nao_existir_configuracao_ativa(self):
        service = TaxaEntregaRetiradaService(
            cep_provider=FakeCepProvider(ENDERECO_DESTINO),
            rota_provider=FakeRotaProvider(Decimal("8.00")),
        )

        with self.assertRaises(ConfiguracaoTaxaAusenteError):
            service.calcular("01001000", "123")

    def test_service_erro_para_endereco_incompleto(self):
        criar_configuracao()
        endereco_incompleto = {
            "cep": "01001000",
            "logradouro": "",
            "bairro": "Se",
            "cidade": "Sao Paulo",
            "uf": "SP",
        }
        service = TaxaEntregaRetiradaService(
            cep_provider=FakeCepProvider(endereco_incompleto),
            rota_provider=FakeRotaProvider(Decimal("8.00")),
        )

        with self.assertRaises(EnderecoIncompletoError):
            service.calcular("01001000", "123")

    def test_service_erro_para_distancia_zero_negativa_ou_inconsistente(self):
        criar_configuracao()
        distancias_invalidas = [Decimal("0.00"), Decimal("-1.00"), "abc"]

        for distancia in distancias_invalidas:
            with self.subTest(distancia=distancia):
                service = TaxaEntregaRetiradaService(
                    cep_provider=FakeCepProvider(ENDERECO_DESTINO),
                    rota_provider=FakeRotaProvider(distancia),
                )

                with self.assertRaises(DistanciaInvalidaError):
                    service.calcular("01001000", "123")


class CalcularTaxaEntregaRetiradaAPITests(APITestCase):
    url = "/api/taxa-entrega-retirada/calcular/"

    def setUp(self):
        criar_configuracao(valor_por_km=Decimal("3.00"))

    def mockar_providers(self, cep_provider=None, rota_provider=None):
        cep_provider = cep_provider or FakeCepProvider(ENDERECO_DESTINO)
        rota_provider = rota_provider or FakeRotaProvider(Decimal("8.00"))
        patch_cep = patch("entregas.services.CepProvider", return_value=cep_provider)
        patch_rota = patch("entregas.services.RotaProvider", return_value=rota_provider)
        return patch_cep, patch_rota

    def test_endpoint_calcula_taxa_com_ida_e_volta(self):
        patch_cep, patch_rota = self.mockar_providers()
        with patch_cep, patch_rota:
            response = self.client.post(
                self.url,
                {
                    "cep": "01001-000",
                    "numero": "123",
                    "complemento": "Apto 45",
                },
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["nome"], "Taxa de entrega e retirada")
        self.assertEqual(response.data["distancia_ida_km"], "8.00")
        self.assertEqual(response.data["distancia_total_km"], "16.00")
        self.assertEqual(response.data["valor_por_km"], "3.00")
        self.assertEqual(response.data["taxa"], "48.00")
        self.assertEqual(
            response.data["endereco_interpretado"],
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

    def test_frontend_nao_consegue_forjar_distancia_taxa_ou_valor_por_km(self):
        patch_cep, patch_rota = self.mockar_providers()
        with patch_cep, patch_rota:
            response = self.client.post(
                self.url,
                {
                    "cep": "01001000",
                    "numero": "123",
                    "distancia_ida_km": "1.00",
                    "distancia_total_km": "2.00",
                    "valor_por_km": "0.01",
                    "taxa": "0.02",
                    "frete": "0.02",
                    "preco": "0.02",
                },
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("detail", response.data)

    def test_endpoint_erro_se_nao_existir_configuracao_ativa(self):
        ConfiguracaoTaxaEntregaRetirada.objects.all().delete()
        patch_cep, patch_rota = self.mockar_providers()

        with patch_cep, patch_rota:
            response = self.client.post(
                self.url,
                {"cep": "01001000", "numero": "123"},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertIn("Configuracao ativa", response.data["detail"])

    def test_endpoint_erro_para_cep_invalido(self):
        response = self.client.post(
            self.url,
            {"cep": "123", "numero": "123"},
            format="json",
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn("cep", response.data)

    def test_endpoint_erro_para_cep_nao_encontrado(self):
        patch_cep, patch_rota = self.mockar_providers(
            cep_provider=FakeCepProvider(erro=CepNaoEncontradoError())
        )

        with patch_cep, patch_rota:
            response = self.client.post(
                self.url,
                {"cep": "01001000", "numero": "123"},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(response.data["detail"], "CEP nao encontrado.")

    def test_endpoint_erro_para_endereco_incompleto(self):
        patch_cep, patch_rota = self.mockar_providers(
            cep_provider=FakeCepProvider(
                {
                    "cep": "01001000",
                    "logradouro": "",
                    "bairro": "Se",
                    "cidade": "Sao Paulo",
                    "uf": "SP",
                }
            )
        )

        with patch_cep, patch_rota:
            response = self.client.post(
                self.url,
                {"cep": "01001000", "numero": "123"},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertEqual(
            response.data["detail"],
            "Endereco incompleto para calcular a taxa.",
        )

    def test_endpoint_erro_quando_provider_de_rota_falha(self):
        patch_cep, patch_rota = self.mockar_providers(
            rota_provider=FakeRotaProvider(erro=RotaProviderError())
        )

        with patch_cep, patch_rota:
            response = self.client.post(
                self.url,
                {"cep": "01001000", "numero": "123"},
                format="json",
            )

        self.assertEqual(response.status_code, status.HTTP_503_SERVICE_UNAVAILABLE)
        self.assertEqual(
            response.data["detail"],
            "Nao foi possivel calcular a rota para este endereco.",
        )

    def test_endpoint_erro_para_distancia_zero_negativa_ou_inconsistente(self):
        for distancia in [Decimal("0.00"), Decimal("-1.00"), "abc"]:
            with self.subTest(distancia=distancia):
                patch_cep, patch_rota = self.mockar_providers(
                    rota_provider=FakeRotaProvider(distancia)
                )

                with patch_cep, patch_rota:
                    response = self.client.post(
                        self.url,
                        {"cep": "01001000", "numero": "123"},
                        format="json",
                    )

                self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
                self.assertEqual(response.data["detail"], "Distancia de entrega invalida.")
