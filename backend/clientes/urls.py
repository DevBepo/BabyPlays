from django.urls import path

from .views import (
    AlterarSenhaView,
    CadastroClienteView,
    CsrfClienteView,
    LoginClienteView,
    LogoutClienteView,
    MeClienteView,
    RedefinirSenhaView,
    SolicitarRecuperacaoSenhaView,
)


urlpatterns = [
    path("cadastro/", CadastroClienteView.as_view(), name="auth-cadastro"),
    path("login/", LoginClienteView.as_view(), name="auth-login"),
    path("logout/", LogoutClienteView.as_view(), name="auth-logout"),
    path("me/", MeClienteView.as_view(), name="auth-me"),
    path("senha/", AlterarSenhaView.as_view(), name="auth-senha"),
    path(
        "esqueci-senha/",
        SolicitarRecuperacaoSenhaView.as_view(),
        name="auth-esqueci-senha",
    ),
    path(
        "redefinir-senha/",
        RedefinirSenhaView.as_view(),
        name="auth-redefinir-senha",
    ),
    path("csrf/", CsrfClienteView.as_view(), name="auth-csrf"),
]
