"""
URL configuration for setup project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
import mimetypes
from pathlib import Path

from django.conf import settings
from django.contrib import admin
from django.http import FileResponse, Http404
from django.urls import path, include, re_path
from clientes.views import AdminMeView


def serve_media_upload(request, path):
    media_root = Path(settings.MEDIA_ROOT).resolve()
    requested_path = (media_root / path).resolve()

    try:
        requested_path.relative_to(media_root)
    except ValueError as exc:
        raise Http404("Arquivo nao encontrado.") from exc

    if not requested_path.is_file():
        raise Http404("Arquivo nao encontrado.")

    content_type, _ = mimetypes.guess_type(str(requested_path))
    return FileResponse(
        requested_path.open("rb"),
        content_type=content_type or "application/octet-stream",
    )


urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('clientes.urls')),
    path('api/admin/me/', AdminMeView.as_view(), name='admin-me'),
    path('api/', include('catalogo.urls')),
    path('api/', include('pedidos.urls')),
    path('api/', include('entregas.urls')),
    re_path(r"^media/(?P<path>.+)$", serve_media_upload, name="media-upload"),
]
