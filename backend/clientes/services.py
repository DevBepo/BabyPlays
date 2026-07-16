import logging
from math import ceil
from urllib.parse import urlencode

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode

from .serializers import normalizar_email


logger = logging.getLogger(__name__)


def recuperacao_senha_configurada():
    if not settings.PASSWORD_RESET_FRONTEND_URL:
        return False

    backend = settings.EMAIL_BACKEND
    if not settings.DEBUG and backend in {
        "django.core.mail.backends.console.EmailBackend",
        "django.core.mail.backends.dummy.EmailBackend",
        "django.core.mail.backends.locmem.EmailBackend",
    }:
        return False

    if backend == "django.core.mail.backends.smtp.EmailBackend" and not settings.EMAIL_HOST:
        return False

    return True


def criar_link_recuperacao_senha(user):
    fragment = urlencode(
        {
            "uid": urlsafe_base64_encode(force_bytes(user.pk)),
            "token": default_token_generator.make_token(user),
        }
    )
    return f"{settings.PASSWORD_RESET_FRONTEND_URL}/redefinir-senha#{fragment}"


def solicitar_recuperacao_senha(email):
    email_normalizado = normalizar_email(email)
    usuarios = get_user_model().objects.filter(
        email__iexact=email_normalizado,
        is_active=True,
    )

    for user in usuarios.iterator():
        if not user.has_usable_password():
            continue

        contexto = {
            "link_recuperacao": criar_link_recuperacao_senha(user),
            "tempo_expiracao_minutos": ceil(settings.PASSWORD_RESET_TIMEOUT / 60),
        }
        mensagem = render_to_string(
            "clientes/email/recuperacao_senha.txt",
            contexto,
        )

        try:
            send_mail(
                subject="Redefinicao de senha da BabyPlays",
                message=mensagem,
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=False,
            )
        except Exception:
            # A resposta publica permanece generica para nao revelar contas.
            # O log nao inclui e-mail, token, uid ou credenciais SMTP.
            logger.error("Falha ao enviar e-mail de recuperacao de senha.")
