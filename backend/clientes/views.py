from django.contrib.auth import login, logout, update_session_auth_hash
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import status
from rest_framework.authentication import SessionAuthentication
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from pedidos.models import Carrinho

from .serializers import (
    AdminMeSerializer,
    AlterarSenhaSerializer,
    AuthClienteSerializer,
    AtualizarAuthClienteSerializer,
    CadastroClienteSerializer,
    LoginClienteSerializer,
    RedefinirSenhaSerializer,
    SolicitarRecuperacaoSenhaSerializer,
)
from .services import recuperacao_senha_configurada, solicitar_recuperacao_senha
from .throttles import (
    PasswordResetConfirmThrottle,
    PasswordResetEmailThrottle,
    PasswordResetIpThrottle,
)


def dados_auth_cliente(user):
    return {
        "authenticated": True,
        "user": user,
        "cliente": getattr(user, "cliente", None),
    }


def vincular_carrinho_anonimo_da_sessao(request, user, session_key_anterior):
    if not session_key_anterior:
        return

    carrinho = (
        Carrinho.objects.filter(
            session_key=session_key_anterior,
            usuario__isnull=True,
            status=Carrinho.Status.ATIVO,
        )
        .order_by("-atualizado_em", "-id")
        .first()
    )
    if not carrinho:
        return

    carrinho.usuario = user
    carrinho.session_key = None
    carrinho.save(update_fields=["usuario", "session_key", "atualizado_em"])


class SessionAuthenticationCom401(SessionAuthentication):
    def authenticate_header(self, request):
        return "Session"


@method_decorator(csrf_protect, name="dispatch")
class CadastroClienteView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "auth"

    def post(self, request):
        session_key_anterior = request.session.session_key
        serializer = CadastroClienteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        login(request, user)
        vincular_carrinho_anonimo_da_sessao(request, user, session_key_anterior)
        return Response(
            AuthClienteSerializer(dados_auth_cliente(user)).data,
            status=status.HTTP_201_CREATED,
        )


@method_decorator(csrf_protect, name="dispatch")
class LoginClienteView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "auth"

    def post(self, request):
        session_key_anterior = request.session.session_key
        serializer = LoginClienteSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        login(request, user)
        vincular_carrinho_anonimo_da_sessao(request, user, session_key_anterior)
        return Response(AuthClienteSerializer(dados_auth_cliente(user)).data)


@method_decorator(csrf_protect, name="dispatch")
class LogoutClienteView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "auth"

    def post(self, request):
        logout(request)
        return Response({"message": "Logout realizado."})


class MeClienteView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(AuthClienteSerializer(dados_auth_cliente(request.user)).data)

    def patch(self, request):
        serializer = AtualizarAuthClienteSerializer(
            data=request.data,
            context={"request": request},
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(AuthClienteSerializer(dados_auth_cliente(user)).data)


class AlterarSenhaView(APIView):
    permission_classes = [IsAuthenticated]
    throttle_scope = "auth"

    def post(self, request):
        serializer = AlterarSenhaSerializer(
            data=request.data,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        update_session_auth_hash(request, user)
        return Response({"message": "Senha alterada com sucesso."})


@method_decorator(csrf_protect, name="dispatch")
class SolicitarRecuperacaoSenhaView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PasswordResetIpThrottle, PasswordResetEmailThrottle]

    def post(self, request):
        if not recuperacao_senha_configurada():
            return Response(
                {"detail": "A recuperacao de senha esta temporariamente indisponivel."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        serializer = SolicitarRecuperacaoSenhaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        solicitar_recuperacao_senha(serializer.validated_data["email"])
        return Response(
            {
                "message": (
                    "Se o e-mail estiver cadastrado, voce recebera as instrucoes "
                    "para redefinir sua senha."
                )
            }
        )


@method_decorator(csrf_protect, name="dispatch")
class RedefinirSenhaView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [PasswordResetConfirmThrottle]

    def post(self, request):
        serializer = RedefinirSenhaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Senha redefinida com sucesso."})


class AdminMeView(APIView):
    authentication_classes = [SessionAuthenticationCom401]
    permission_classes = [IsAdminUser]

    def get(self, request):
        return Response(AdminMeSerializer(request.user).data)


@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfClienteView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response({"csrfToken": get_token(request)})
