import re
from pathlib import Path

from django.conf import settings
from django.test import SimpleTestCase, override_settings


class SecuritySettingsTests(SimpleTestCase):
    def test_security_headers_are_configured(self):
        self.assertTrue(settings.SECURE_CONTENT_TYPE_NOSNIFF)
        self.assertEqual(settings.X_FRAME_OPTIONS, "DENY")
        self.assertEqual(settings.SECURE_REFERRER_POLICY, "same-origin")

    @override_settings(SECURE_SSL_REDIRECT=True)
    def test_http_request_is_redirected_to_https(self):
        response = self.client.get("/")

        self.assertEqual(response.status_code, 301)
        self.assertEqual(response.headers["Location"], "https://testserver/")

    @override_settings(SECURE_SSL_REDIRECT=True)
    def test_trusted_https_proxy_header_avoids_redirect_loop(self):
        response = self.client.get("/", HTTP_X_FORWARDED_PROTO="https")

        self.assertEqual(response.status_code, 404)

    def test_hsts_uses_only_the_local_or_production_value(self):
        self.assertIn(settings.SECURE_HSTS_SECONDS, {0, 31536000})
        self.assertFalse(settings.SECURE_HSTS_INCLUDE_SUBDOMAINS)
        self.assertFalse(settings.SECURE_HSTS_PRELOAD)

    @override_settings(
        ALLOWED_HOSTS=["testserver"],
        SECURE_HSTS_SECONDS=31536000,
        SECURE_HSTS_INCLUDE_SUBDOMAINS=False,
        SECURE_HSTS_PRELOAD=False,
    )
    def test_security_middleware_emits_production_headers_over_https(self):
        response = self.client.get("/rota-inexistente/", secure=True)

        self.assertEqual(response.headers["Strict-Transport-Security"], "max-age=31536000")
        self.assertEqual(response.headers["X-Content-Type-Options"], "nosniff")
        self.assertEqual(response.headers["X-Frame-Options"], "DENY")
        self.assertEqual(response.headers["Referrer-Policy"], "same-origin")


class ProductionNginxHttpsTests(SimpleTestCase):
    def test_public_http_hosts_redirect_permanently_to_https(self):
        config_path = Path(settings.BASE_DIR).parent / "infra/nginx/babyplays.conf"

        if not config_path.exists():
            self.skipTest("Configuracao do Nginx nao esta presente nesta imagem.")

        config = config_path.read_text(encoding="utf-8")
        redirects = {
            "babyplays.com.br": "https://www.babyplays.com.br",
            "www.babyplays.com.br": "https://www.babyplays.com.br",
            "api.babyplays.com.br": "https://api.babyplays.com.br",
        }

        for host, target in redirects.items():
            with self.subTest(host=host):
                pattern = (
                    r"server\s*\{\s*"
                    r"listen 80;\s*"
                    rf"server_name {re.escape(host)};\s*"
                    rf"return 308 {re.escape(target)}\$request_uri;\s*"
                    r"\}"
                )
                self.assertRegex(config, pattern)
