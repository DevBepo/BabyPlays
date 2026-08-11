from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("catalogo", "0016_alter_kitfesta_options_imagemkitfesta"),
    ]

    operations = [
        migrations.AlterField(
            model_name="brinquedo",
            name="descricao",
            field=models.TextField(blank=True, verbose_name="Descrição"),
        ),
    ]
