from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from django.core.exceptions import ObjectDoesNotExist

from .models import ConfiguracaoTaxaEntregaRetirada
from .providers import (
    CepInvalidoError,
    CepNaoEncontradoError,
    CepProvider,
    EnderecoIncompletoError,
    EnderecoInterpretado,
    RotaProvider,
    RotaProviderError,
)


class ConfiguracaoTaxaAusenteError(Exception):
    pass


class DistanciaInvalidaError(Exception):
    pass


DUAS_CASAS = Decimal("0.01")


def quantizar_decimal(valor):
    return Decimal(valor).quantize(DUAS_CASAS, rounding=ROUND_HALF_UP)


class TaxaEntregaRetiradaService:
    nome_taxa = "Taxa de entrega e retirada"

    def __init__(self, cep_provider=None, rota_provider=None):
        self.cep_provider = cep_provider or CepProvider()
        self.rota_provider = rota_provider or RotaProvider()

    def calcular(self, cep, numero, complemento=""):
        configuracao = self._obter_configuracao_ativa()
        destino = self._interpretar_destino(cep, numero, complemento)
        origem = self._montar_origem(configuracao)
        distancia_ida_km = self._calcular_distancia_ida(origem, destino)
        distancia_total_km = quantizar_decimal(distancia_ida_km * Decimal("2"))
        valor_por_km = quantizar_decimal(configuracao.valor_por_km)
        taxa = quantizar_decimal(distancia_total_km * valor_por_km)

        return {
            "nome": self.nome_taxa,
            "endereco_interpretado": destino.as_dict(),
            "distancia_ida_km": quantizar_decimal(distancia_ida_km),
            "distancia_total_km": distancia_total_km,
            "valor_por_km": valor_por_km,
            "taxa": taxa,
        }

    def _obter_configuracao_ativa(self):
        try:
            return ConfiguracaoTaxaEntregaRetirada.objects.get(ativo=True)
        except ObjectDoesNotExist as exc:
            raise ConfiguracaoTaxaAusenteError(
                "Configuracao ativa da taxa de entrega e retirada ausente."
            ) from exc

    def _interpretar_destino(self, cep, numero, complemento):
        dados_cep = self.cep_provider.buscar(cep)
        numero = str(numero or "").strip()
        complemento = str(complemento or "").strip()

        endereco = EnderecoInterpretado(
            cep=str(dados_cep.get("cep", "")).strip(),
            logradouro=str(dados_cep.get("logradouro", "")).strip(),
            numero=numero,
            complemento=complemento,
            bairro=str(dados_cep.get("bairro", "")).strip(),
            cidade=str(dados_cep.get("cidade", "")).strip(),
            uf=str(dados_cep.get("uf", "")).strip().upper(),
        )

        campos_obrigatorios = (
            endereco.cep,
            endereco.logradouro,
            endereco.numero,
            endereco.bairro,
            endereco.cidade,
            endereco.uf,
        )
        if not all(campos_obrigatorios):
            raise EnderecoIncompletoError("Endereco incompleto para calcular a taxa.")

        return endereco

    def _montar_origem(self, configuracao):
        return EnderecoInterpretado(
            cep=configuracao.origem_cep,
            logradouro=configuracao.origem_logradouro,
            numero=configuracao.origem_numero,
            complemento=configuracao.origem_complemento,
            bairro=configuracao.origem_bairro,
            cidade=configuracao.origem_cidade,
            uf=configuracao.origem_uf,
        )

    def _calcular_distancia_ida(self, origem, destino):
        try:
            distancia = Decimal(
                str(self.rota_provider.calcular_distancia_ida_km(origem, destino))
            )
        except (InvalidOperation, TypeError, ValueError) as exc:
            raise DistanciaInvalidaError(
                "Distancia retornada pelo provider de rota e invalida."
            ) from exc
        except RotaProviderError:
            raise

        if distancia <= 0:
            raise DistanciaInvalidaError(
                "Distancia de entrega deve ser maior que zero."
            )

        return distancia
