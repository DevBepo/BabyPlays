import json
from dataclasses import dataclass
from decimal import Decimal
from urllib.error import HTTPError, URLError
from urllib.request import urlopen

from django.conf import settings


class CepInvalidoError(Exception):
    pass


class CepNaoEncontradoError(Exception):
    pass


class EnderecoIncompletoError(Exception):
    pass


class RotaProviderError(Exception):
    pass


@dataclass(frozen=True)
class EnderecoInterpretado:
    cep: str
    logradouro: str
    numero: str
    complemento: str
    bairro: str
    cidade: str
    uf: str

    def as_dict(self):
        return {
            "cep": self.cep,
            "logradouro": self.logradouro,
            "numero": self.numero,
            "complemento": self.complemento,
            "bairro": self.bairro,
            "cidade": self.cidade,
            "uf": self.uf,
        }


class CepProvider:
    def buscar(self, cep):
        cep = "".join(caractere for caractere in str(cep) if caractere.isdigit())
        if len(cep) != 8:
            raise CepInvalidoError("CEP invalido.")

        url = f"https://viacep.com.br/ws/{cep}/json/"
        try:
            with urlopen(url, timeout=5) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
            raise CepNaoEncontradoError("CEP nao encontrado.") from exc

        if payload.get("erro"):
            raise CepNaoEncontradoError("CEP nao encontrado.")

        return {
            "cep": cep,
            "logradouro": payload.get("logradouro", "").strip(),
            "bairro": payload.get("bairro", "").strip(),
            "cidade": payload.get("localidade", "").strip(),
            "uf": payload.get("uf", "").strip(),
        }


class RotaProvider:
    def calcular_distancia_ida_km(self, origem, destino):
        if not getattr(settings, "ROTA_PROVIDER_API_KEY", ""):
            raise RotaProviderError(
                "Provider de rota nao configurado para calcular a distancia."
            )
        raise RotaProviderError("Provider de rota real ainda nao implementado.")


class FakeCepProvider:
    def __init__(self, endereco=None, erro=None):
        self.endereco = endereco or {}
        self.erro = erro

    def buscar(self, cep):
        if self.erro:
            raise self.erro
        return self.endereco


class FakeRotaProvider:
    def __init__(self, distancia_ida_km=None, erro=None):
        self.distancia_ida_km = distancia_ida_km
        self.erro = erro

    def calcular_distancia_ida_km(self, origem, destino):
        if self.erro:
            raise self.erro
        return Decimal(str(self.distancia_ida_km))
