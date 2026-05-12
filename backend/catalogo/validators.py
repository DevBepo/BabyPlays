from pathlib import Path

from django.core.exceptions import ValidationError
from PIL import Image, UnidentifiedImageError


IMAGEM_BRINQUEDO_EXTENSOES_PERMITIDAS = {".jpg", ".jpeg", ".png", ".webp"}
IMAGEM_BRINQUEDO_FORMATOS_PERMITIDOS = {"JPEG", "PNG", "WEBP"}
IMAGEM_BRINQUEDO_TAMANHO_MAXIMO_BYTES = 3 * 1024 * 1024
IMAGEM_BRINQUEDO_DIMENSAO_MAXIMA = 4000


def validar_imagem_brinquedo(arquivo):
    extensao = Path(arquivo.name).suffix.lower()
    if extensao not in IMAGEM_BRINQUEDO_EXTENSOES_PERMITIDAS:
        raise ValidationError(
            "Formato de imagem nao permitido. Envie arquivos JPG, PNG ou WEBP."
        )

    if arquivo.size > IMAGEM_BRINQUEDO_TAMANHO_MAXIMO_BYTES:
        raise ValidationError("A imagem deve ter no maximo 3 MB.")

    posicao_original = arquivo.tell()
    try:
        arquivo.seek(0)
        with Image.open(arquivo) as imagem:
            imagem.verify()
            formato = imagem.format

        arquivo.seek(0)
        with Image.open(arquivo) as imagem:
            largura, altura = imagem.size
    except (UnidentifiedImageError, OSError):
        raise ValidationError("Arquivo invalido. Envie uma imagem real.")
    finally:
        arquivo.seek(posicao_original)

    if formato not in IMAGEM_BRINQUEDO_FORMATOS_PERMITIDOS:
        raise ValidationError(
            "Formato real da imagem nao permitido. Envie JPG, PNG ou WEBP."
        )

    if (
        largura > IMAGEM_BRINQUEDO_DIMENSAO_MAXIMA
        or altura > IMAGEM_BRINQUEDO_DIMENSAO_MAXIMA
    ):
        raise ValidationError(
            "A imagem deve ter no maximo 4000x4000 pixels."
        )
