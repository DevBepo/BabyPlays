from django.core.management.base import BaseCommand
from django.db import IntegrityError, transaction

from catalogo.models import Categoria
from pedidos.models import Contrato


CATEGORIAS_BASICAS = (
    {
        "nome": "Brinquedos",
        "slug": "brinquedos",
        "descricao": "Categoria geral para brinquedos avulsos.",
        "ordem": 10,
    },
    {
        "nome": "Kits Festa",
        "slug": "kits-festa",
        "descricao": "Kits prontos para festas e eventos.",
        "ordem": 20,
    },
    {
        "nome": "Infláveis",
        "slug": "inflaveis",
        "descricao": "Brinquedos infláveis para locação.",
        "ordem": 30,
    },
    {
        "nome": "Piscinas de Bolinhas",
        "slug": "piscinas-de-bolinhas",
        "descricao": "Piscinas de bolinhas e itens relacionados.",
        "ordem": 40,
    },
    {
        "nome": "Brinquedos Educativos",
        "slug": "brinquedos-educativos",
        "descricao": "Brinquedos educativos para desenvolvimento infantil.",
        "ordem": 50,
    },
    {
        "nome": "Brinquedos para Bebês",
        "slug": "brinquedos-para-bebes",
        "descricao": "Brinquedos indicados para bebês.",
        "ordem": 60,
    },
)

CONTRATO_HOMOLOGACAO = {
    "titulo": "Contrato inicial de homologacao",
    "versao": "homologacao-inicial-v1",
    "texto": (
        "Contrato inicial criado para homologacao do sistema BabyPlays. "
        "Este texto deve ser substituido pelo contrato oficial antes do uso em "
        "producao com clientes reais."
    ),
    "ativo": True,
}


class Command(BaseCommand):
    help = "Cria dados basicos iniciais do BabyPlays de forma idempotente."

    def handle(self, *args, **options):
        categorias_criadas = 0
        categorias_existentes = 0
        contrato_status = "nao criado"

        with transaction.atomic():
            for categoria in CATEGORIAS_BASICAS:
                objeto, created = Categoria.objects.get_or_create(
                    slug=categoria["slug"],
                    defaults={
                        "nome": categoria["nome"],
                        "descricao": categoria["descricao"],
                        "ativo": True,
                        "ordem": categoria["ordem"],
                    },
                )

                if created:
                    categorias_criadas += 1
                else:
                    Categoria.objects.filter(pk=objeto.pk).update(
                        nome=categoria["nome"],
                        descricao=categoria["descricao"],
                        ativo=True,
                        ordem=categoria["ordem"],
                    )
                    categorias_existentes += 1

            if Contrato.objects.filter(ativo=True).exists():
                contrato_status = "nao criado: ja existe contrato ativo"
            else:
                try:
                    contrato = Contrato(**CONTRATO_HOMOLOGACAO)
                    contrato.full_clean()
                    contrato.save()
                    contrato_status = "criado: contrato inicial de homologacao"
                except IntegrityError:
                    contrato_status = (
                        "nao criado: contrato de homologacao ja existe"
                    )

        self.stdout.write(
            self.style.SUCCESS(
                "Seed BabyPlays basico concluido. "
                f"Categorias criadas: {categorias_criadas}. "
                f"Categorias ja existentes: {categorias_existentes}. "
                f"Contrato: {contrato_status}."
            )
        )
