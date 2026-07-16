from hashlib import sha256

from rest_framework.throttling import SimpleRateThrottle

from .serializers import normalizar_email


class PasswordResetIpThrottle(SimpleRateThrottle):
    scope = "password_reset_ip"

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }


class PasswordResetEmailThrottle(SimpleRateThrottle):
    scope = "password_reset_email"

    def get_cache_key(self, request, view):
        email = normalizar_email(request.data.get("email"))
        if not email:
            return None

        email_hash = sha256(email.encode("utf-8")).hexdigest()
        return self.cache_format % {
            "scope": self.scope,
            "ident": email_hash,
        }


class PasswordResetConfirmThrottle(SimpleRateThrottle):
    scope = "password_reset_confirm"

    def get_cache_key(self, request, view):
        return self.cache_format % {
            "scope": self.scope,
            "ident": self.get_ident(request),
        }
