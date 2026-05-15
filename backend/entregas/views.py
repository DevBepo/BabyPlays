from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from .providers import (
    CepInvalidoError,
    CepNaoEncontradoError,
    EnderecoIncompletoError,
    RotaProviderError,
)
from .serializers import (
    CalcularTaxaEntregaRetiradaSerializer,
    ResultadoTaxaEntregaRetiradaSerializer,
)
from .services import (
    ConfiguracaoTaxaAusenteError,
    DistanciaInvalidaError,
    TaxaEntregaRetiradaService,
)


class CalcularTaxaEntregaRetiradaView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = CalcularTaxaEntregaRetiradaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        service = TaxaEntregaRetiradaService()
        try:
            resultado = service.calcular(**serializer.validated_data)
        except CepInvalidoError:
            return self._erro("CEP invalido.")
        except CepNaoEncontradoError:
            return self._erro("CEP nao encontrado.")
        except EnderecoIncompletoError:
            return self._erro("Endereco incompleto para calcular a taxa.")
        except ConfiguracaoTaxaAusenteError:
            return self._erro(
                "Configuracao ativa da taxa de entrega e retirada ausente.",
                status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except RotaProviderError:
            return self._erro(
                "Nao foi possivel calcular a rota para este endereco.",
                status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        except DistanciaInvalidaError:
            return self._erro("Distancia de entrega invalida.")

        response_serializer = ResultadoTaxaEntregaRetiradaSerializer(resultado)
        return Response(response_serializer.data)

    def _erro(self, mensagem, status_code=status.HTTP_400_BAD_REQUEST):
        return Response({"detail": mensagem}, status=status_code)
