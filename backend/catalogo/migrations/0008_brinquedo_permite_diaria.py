from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalogo", "0007_configuracaokitpersonalizavel_and_more"),
    ]

    operations = [
        migrations.AddField(
            model_name="brinquedo",
            name="permite_diaria",
            field=models.BooleanField(
                default=False,
                help_text="Indica se o brinquedo pode ser alugado por diaria.",
                verbose_name="Permite diaria",
            ),
        ),
    ]
