from decimal import Decimal, ROUND_HALF_UP

from .models import RegraFreteBairro, normalizar_localidade
from .providers import (
    CepProvider,
    EnderecoIncompletoError,
    EnderecoInterpretado,
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
    STATUS_CALCULADA = "calculada"
    STATUS_A_CONFIRMAR = "a_confirmar"
    STATUS_SUJEITA_ANALISE = "sujeita_analise"

    def __init__(self, cep_provider=None, rota_provider=None):
        self.cep_provider = cep_provider or CepProvider()
        self.rota_provider = rota_provider

    def calcular(self, cep, numero, complemento=""):
        destino = self._interpretar_destino(cep, numero, complemento)
        regra = self._buscar_regra(destino)

        if regra is None:
            status = self.STATUS_SUJEITA_ANALISE
            taxa = None
        elif regra.valor_taxa is None or regra.valor_taxa <= 0:
            status = self.STATUS_A_CONFIRMAR
            taxa = None
        else:
            status = self.STATUS_CALCULADA
            taxa = quantizar_decimal(regra.valor_taxa)

        return {
            "nome": self.nome_taxa,
            "endereco_interpretado": destino.as_dict(),
            "status": status,
            "distancia_ida_km": None,
            "distancia_total_km": None,
            "valor_por_km": None,
            "taxa": taxa,
        }

    def _buscar_regra(self, destino):
        return RegraFreteBairro.objects.filter(
            ativo=True,
            uf=destino.uf,
            cidade_normalizada=normalizar_localidade(destino.cidade),
            bairro_normalizado=normalizar_localidade(destino.bairro),
        ).first()

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
