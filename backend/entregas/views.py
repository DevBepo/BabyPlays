from rest_framework import status
from rest_framework import viewsets
from rest_framework.permissions import AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView

from .providers import (
    CepInvalidoError,
    CepNaoEncontradoError,
    EnderecoIncompletoError,
)
from .serializers import (
    CalcularTaxaEntregaRetiradaSerializer,
    RegraFreteBairroAdminSerializer,
    ResultadoTaxaEntregaRetiradaSerializer,
)
from .models import RegraFreteBairro
from .services import TaxaEntregaRetiradaService


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
        response_serializer = ResultadoTaxaEntregaRetiradaSerializer(resultado)
        return Response(response_serializer.data)

    def _erro(self, mensagem, status_code=status.HTTP_400_BAD_REQUEST):
        return Response({"detail": mensagem}, status=status_code)


class RegraFreteBairroAdminViewSet(viewsets.ModelViewSet):
    queryset = RegraFreteBairro.objects.all()
    serializer_class = RegraFreteBairroAdminSerializer
    permission_classes = [IsAdminUser]
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]
