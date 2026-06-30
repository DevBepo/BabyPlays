from django.db import migrations, models
from django.db.models import Q


def limpar_session_keys_de_carrinhos_autenticados(apps, schema_editor):
    Carrinho = apps.get_model("pedidos", "Carrinho")
    Carrinho.objects.filter(usuario__isnull=False).update(session_key=None)


class Migration(migrations.Migration):
    dependencies = [
        ("pedidos", "0011_historico_pedido_e_datas_opcionais"),
    ]

    operations = [
        migrations.RunPython(
            limpar_session_keys_de_carrinhos_autenticados,
            migrations.RunPython.noop,
        ),
        migrations.RemoveField(
            model_name="pedido",
            name="session_key_snapshot",
        ),
        migrations.AlterField(
            model_name="carrinho",
            name="session_key",
            field=models.CharField(
                blank=True,
                db_index=True,
                editable=False,
                max_length=40,
                null=True,
                verbose_name="Chave da sessao",
            ),
        ),
        migrations.AddConstraint(
            model_name="carrinho",
            constraint=models.CheckConstraint(
                condition=Q(usuario__isnull=True) | Q(session_key__isnull=True),
                name="pedidos_carrinho_autenticado_sem_session_key",
            ),
        ),
    ]
