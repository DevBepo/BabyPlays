import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("clientes", "0001_initial"),
        ("catalogo", "0011_kitfesta_imagem"),
    ]

    operations = [
        migrations.CreateModel(
            name="DedicacaoUnidadeKit",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("criado_em", models.DateTimeField(auto_now_add=True, verbose_name="Criado em")),
                ("item_kit", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="unidades_dedicadas", to="catalogo.itemkitfesta", verbose_name="Item do kit")),
                ("unidade", models.OneToOneField(on_delete=django.db.models.deletion.PROTECT, related_name="dedicacao_kit", to="catalogo.unidadebrinquedo", verbose_name="Unidade dedicada")),
            ],
            options={"verbose_name": "Unidade dedicada ao kit", "verbose_name_plural": "Unidades dedicadas aos kits", "ordering": ("item_kit__ordem", "unidade__codigo")},
        ),
        migrations.CreateModel(
            name="InteresseDisponibilidade",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("status", models.CharField(choices=[("pendente", "Pendente"), ("contatado", "Contatado"), ("cancelado", "Cancelado")], db_index=True, default="pendente", max_length=20, verbose_name="Status")),
                ("disponibilidade_destacada", models.BooleanField(default=False, verbose_name="Disponibilidade destacada")),
                ("criado_em", models.DateTimeField(auto_now_add=True, verbose_name="Criado em")),
                ("atualizado_em", models.DateTimeField(auto_now=True, verbose_name="Atualizado em")),
                ("contatado_em", models.DateTimeField(blank=True, null=True, verbose_name="Contatado em")),
                ("brinquedo", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="interesses_disponibilidade", to="catalogo.brinquedo", verbose_name="Brinquedo")),
                ("cliente", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="interesses_disponibilidade", to="clientes.cliente", verbose_name="Cliente")),
            ],
            options={"verbose_name": "Interesse de disponibilidade", "verbose_name_plural": "Interesses de disponibilidade", "ordering": ("-disponibilidade_destacada", "criado_em", "id")},
        ),
        migrations.AddConstraint(
            model_name="interessedisponibilidade",
            constraint=models.UniqueConstraint(condition=models.Q(("status", "pendente")), fields=("cliente", "brinquedo"), name="catalogo_interesse_pendente_unico_cliente_brinquedo"),
        ),
    ]
