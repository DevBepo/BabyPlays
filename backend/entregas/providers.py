import json
import logging
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from django.conf import settings


logger = logging.getLogger(__name__)


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


class GoogleRoutesRotaProvider:
    api_url = "https://routes.googleapis.com/directions/v2:computeRoutes"
    timeout_segundos = 5

    def calcular_distancia_ida_km(self, origem, destino):
        api_key = str(getattr(settings, "GOOGLE_ROUTES_API_KEY", "") or "").strip()
        if not api_key:
            raise RotaProviderError(
                "Provider de rota nao configurado para calcular a distancia."
            )

        payload = self._montar_payload(origem, destino)
        request = Request(
            self.api_url,
            data=json.dumps(payload).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                "X-Goog-Api-Key": api_key,
                "X-Goog-FieldMask": "routes.distanceMeters",
            },
            method="POST",
        )

        try:
            with urlopen(request, timeout=self.timeout_segundos) as response:
                resposta = json.loads(response.read().decode("utf-8"))
        except HTTPError as exc:
            self._logar_erro_http(exc)
            raise RotaProviderError(
                "Nao foi possivel calcular a rota para este endereco."
            ) from exc
        except (URLError, TimeoutError, OSError, json.JSONDecodeError) as exc:
            logger.warning(
                "Falha ao chamar Google Routes API: tipo=%s",
                type(exc).__name__,
            )
            raise RotaProviderError(
                "Nao foi possivel calcular a rota para este endereco."
            ) from exc

        distancia_metros = self._extrair_distancia_metros(resposta)
        return self._converter_metros_para_km(distancia_metros)

    def _logar_erro_http(self, erro_http):
        erro_google = {}
        try:
            corpo = erro_http.read().decode("utf-8")
            payload = json.loads(corpo)
            if isinstance(payload, dict) and isinstance(payload.get("error"), dict):
                erro_google = payload["error"]
        except (AttributeError, UnicodeDecodeError, json.JSONDecodeError):
            pass

        motivo = ""
        detalhes = erro_google.get("details")
        if isinstance(detalhes, list):
            for detalhe in detalhes:
                if isinstance(detalhe, dict) and detalhe.get("reason"):
                    motivo = str(detalhe["reason"])
                    break

        google_code = self._sanitizar_valor_log(erro_google.get("code", ""))
        google_status = self._sanitizar_valor_log(erro_google.get("status", ""))
        motivo = self._sanitizar_valor_log(motivo)
        mensagem = self._sanitizar_valor_log(erro_google.get("message", ""), 500)
        logger.warning(
            "Google Routes API recusou a chamada: http_status=%s "
            "google_code=%s google_status=%s reason=%s message=%s",
            getattr(erro_http, "code", ""),
            google_code,
            google_status,
            motivo,
            mensagem,
        )

    @staticmethod
    def _sanitizar_valor_log(valor, limite=100):
        texto = str(valor or "").replace("\r", " ").replace("\n", " ")
        api_key = str(getattr(settings, "GOOGLE_ROUTES_API_KEY", "") or "").strip()
        if api_key:
            texto = texto.replace(api_key, "[REDACTED]")
        return texto[:limite]

    def _montar_payload(self, origem, destino):
        return {
            "origin": {"address": self._formatar_endereco(origem)},
            "destination": {"address": self._formatar_endereco(destino)},
            "travelMode": "DRIVE",
            "routingPreference": "TRAFFIC_UNAWARE",
            "units": "METRIC",
        }

    def _formatar_endereco(self, endereco):
        partes = [
            f"{endereco.logradouro}, {endereco.numero}",
            endereco.bairro,
            f"{endereco.cidade} - {endereco.uf}",
            endereco.cep,
            "Brasil",
        ]
        return ", ".join(str(parte).strip() for parte in partes if str(parte).strip())

    def _extrair_distancia_metros(self, resposta):
        rotas = resposta.get("routes") if isinstance(resposta, dict) else None
        if not rotas or not isinstance(rotas, list):
            raise RotaProviderError(
                "Nao foi possivel calcular a rota para este endereco."
            )

        primeira_rota = rotas[0]
        if not isinstance(primeira_rota, dict):
            raise RotaProviderError(
                "Nao foi possivel calcular a rota para este endereco."
            )

        distancia_metros = primeira_rota.get("distanceMeters")
        if distancia_metros is None:
            raise RotaProviderError(
                "Nao foi possivel calcular a rota para este endereco."
            )

        return distancia_metros

    def _converter_metros_para_km(self, distancia_metros):
        try:
            distancia_km = Decimal(str(distancia_metros)) / Decimal("1000")
        except (InvalidOperation, TypeError, ValueError) as exc:
            raise RotaProviderError(
                "Nao foi possivel calcular a rota para este endereco."
            ) from exc

        if not distancia_km.is_finite() or distancia_km <= 0:
            raise RotaProviderError(
                "Nao foi possivel calcular a rota para este endereco."
            )

        return distancia_km


class RotaProvider(GoogleRoutesRotaProvider):
    pass


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
