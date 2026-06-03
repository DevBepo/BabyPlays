from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("catalogo", "0008_brinquedo_permite_diaria"),
    ]

    operations = [
        migrations.AddField(
            model_name="kitfesta",
            name="permite_diaria",
            field=models.BooleanField(
                default=False,
                help_text="Indica se o kit festa pode ser alugado por diaria.",
                verbose_name="Permite diaria",
            ),
        ),
    ]
