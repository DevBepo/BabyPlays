from django.db import migrations, models
import django.core.validators
from decimal import Decimal


def copiar_preco_legado_para_15_dias(apps, schema_editor):
    Brinquedo = apps.get_model("catalogo", "Brinquedo")
    KitFesta = apps.get_model("catalogo", "KitFesta")

    for model in (Brinquedo, KitFesta):
        for item in model.objects.all().only("id", "preco_aluguel", "preco_15_dias"):
            if item.preco_aluguel is not None and item.preco_15_dias is None:
                item.preco_15_dias = item.preco_aluguel
                item.save(update_fields=["preco_15_dias"])


class Migration(migrations.Migration):

    dependencies = [
        ("catalogo", "0009_kitfesta_permite_diaria"),
    ]

    operations = [
        migrations.AddField(
            model_name="brinquedo",
            name="preco_diaria",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=8,
                null=True,
                validators=[django.core.validators.MinValueValidator(Decimal("0.01"))],
                verbose_name="Preco da diaria",
            ),
        ),
        migrations.AddField(
            model_name="brinquedo",
            name="preco_15_dias",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=8,
                null=True,
                validators=[django.core.validators.MinValueValidator(Decimal("0.01"))],
                verbose_name="Preco de 15 dias",
            ),
        ),
        migrations.AddField(
            model_name="brinquedo",
            name="preco_30_dias",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=8,
                null=True,
                validators=[django.core.validators.MinValueValidator(Decimal("0.01"))],
                verbose_name="Preco de 30 dias",
            ),
        ),
        migrations.AddField(
            model_name="kitfesta",
            name="preco_diaria",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=8,
                null=True,
                validators=[django.core.validators.MinValueValidator(Decimal("0.01"))],
                verbose_name="Preco da diaria",
            ),
        ),
        migrations.AddField(
            model_name="kitfesta",
            name="preco_15_dias",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=8,
                null=True,
                validators=[django.core.validators.MinValueValidator(Decimal("0.01"))],
                verbose_name="Preco de 15 dias",
            ),
        ),
        migrations.AddField(
            model_name="kitfesta",
            name="preco_30_dias",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=8,
                null=True,
                validators=[django.core.validators.MinValueValidator(Decimal("0.01"))],
                verbose_name="Preco de 30 dias",
            ),
        ),
        migrations.RunPython(copiar_preco_legado_para_15_dias, migrations.RunPython.noop),
    ]
