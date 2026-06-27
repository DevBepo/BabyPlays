from django.conf import settings
from django.test import SimpleTestCase, override_settings


class SecuritySettingsTests(SimpleTestCase):
    def test_security_headers_are_configured(self):
        self.assertTrue(settings.SECURE_CONTENT_TYPE_NOSNIFF)
        self.assertEqual(settings.X_FRAME_OPTIONS, "DENY")
        self.assertEqual(settings.SECURE_REFERRER_POLICY, "same-origin")

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
