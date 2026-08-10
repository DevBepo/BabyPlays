from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("pedidos", "0013_pedido_taxa_entrega_status_snapshot_and_more"),
    ]

    operations = [
        migrations.AlterField(
            model_name="reservaunidade",
            name="data_inicio",
            field=models.DateField(blank=True, null=True, verbose_name="Data de inicio"),
        ),
        migrations.AlterField(
            model_name="reservaunidade",
            name="data_fim",
            field=models.DateField(blank=True, null=True, verbose_name="Data de fim"),
        ),
    ]
