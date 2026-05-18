from django.urls import path

from .views import (
    CadastroClienteView,
    CsrfClienteView,
    LoginClienteView,
    LogoutClienteView,
    MeClienteView,
)


urlpatterns = [
    path("cadastro/", CadastroClienteView.as_view(), name="auth-cadastro"),
    path("login/", LoginClienteView.as_view(), name="auth-login"),
    path("logout/", LogoutClienteView.as_view(), name="auth-logout"),
    path("me/", MeClienteView.as_view(), name="auth-me"),
    path("csrf/", CsrfClienteView.as_view(), name="auth-csrf"),
]
