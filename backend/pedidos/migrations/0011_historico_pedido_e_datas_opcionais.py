import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ("pedidos", "0010_aceitecontrato_contrato_titulo_snapshot"),
    ]

    operations = [
        migrations.AlterField(
            model_name="pedido",
            name="data_evento_pretendida",
            field=models.DateField(blank=True, null=True, verbose_name="Data pretendida do evento"),
        ),
        migrations.CreateModel(
            name="HistoricoPedido",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("acao", models.CharField(choices=[("datas_alteradas", "Datas alteradas"), ("renovado", "Renovado"), ("status_alterado", "Status alterado")], max_length=30, verbose_name="Acao")),
                ("dados", models.JSONField(blank=True, default=dict, verbose_name="Dados")),
                ("criado_em", models.DateTimeField(auto_now_add=True, verbose_name="Criado em")),
                ("pedido", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="historico", to="pedidos.pedido", verbose_name="Pedido")),
                ("usuario_admin", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="acoes_administrativas_pedidos", to=settings.AUTH_USER_MODEL, verbose_name="Usuario administrativo")),
            ],
            options={"verbose_name": "Historico do pedido", "verbose_name_plural": "Historicos dos pedidos", "ordering": ("-criado_em", "-id")},
        ),
    ]
