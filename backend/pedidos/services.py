from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from catalogo.models import Brinquedo, ConfiguracaoKitPersonalizavel, KitFesta
from catalogo.serializers import ValidarSelecaoKitPersonalizavelSerializer
from catalogo.services import KitPersonalizavelService

from .models import Carrinho, ItemCarrinho


class CarrinhoService:
    @staticmethod
    def garantir_session_key(request):
        if not request.session.session_key:
            request.session.create()
        return request.session.session_key

    @staticmethod
    def carrinho_atual(request):
        usuario = request.user if request.user.is_authenticated else None
        session_key = CarrinhoService.garantir_session_key(request)

        if usuario:
            carrinho = (
                Carrinho.objects.filter(
                    usuario=usuario,
                    status=Carrinho.Status.ATIVO,
                )
                .order_by("-atualizado_em", "-id")
                .first()
            )
            if carrinho:
                if not carrinho.session_key:
                    carrinho.session_key = session_key
                    carrinho.save(update_fields=["session_key", "atualizado_em"])
                return carrinho

            carrinho_sessao = (
                Carrinho.objects.filter(
                    usuario__isnull=True,
                    session_key=session_key,
                    status=Carrinho.Status.ATIVO,
                )
                .order_by("-atualizado_em", "-id")
                .first()
            )
            if carrinho_sessao:
                carrinho_sessao.usuario = usuario
                carrinho_sessao.save(update_fields=["usuario", "atualizado_em"])
                return carrinho_sessao

            return Carrinho.objects.create(usuario=usuario, session_key=session_key)

        carrinho = (
            Carrinho.objects.filter(
                usuario__isnull=True,
                session_key=session_key,
                status=Carrinho.Status.ATIVO,
            )
            .order_by("-atualizado_em", "-id")
            .first()
        )
        if carrinho:
            return carrinho

        return Carrinho.objects.create(session_key=session_key)

    @staticmethod
    def subtotal(carrinho):
        return sum(
            (item.subtotal_snapshot for item in carrinho.itens.all()),
            Decimal("0.00"),
        )

    @staticmethod
    def _snapshot_brinquedo(brinquedo, quantidade):
        preco_unitario = brinquedo.preco_aluguel
        subtotal = preco_unitario * quantidade
        return {
            "nome": brinquedo.nome,
            "preco_unitario": preco_unitario,
            "subtotal": subtotal,
            "snapshot": {
                "tipo_item": ItemCarrinho.TipoItem.BRINQUEDO,
                "brinquedo": {
                    "id": brinquedo.id,
                    "nome": brinquedo.nome,
                    "preco_aluguel": str(brinquedo.preco_aluguel),
                },
                "quantidade": quantidade,
            },
        }

    @staticmethod
    def _snapshot_kit_festa(kit_festa, quantidade):
        preco_unitario = kit_festa.preco_aluguel
        subtotal = preco_unitario * quantidade
        itens = []
        for item in kit_festa.itens.select_related("brinquedo").order_by("ordem", "id"):
            itens.append(
                {
                    "brinquedo_id": item.brinquedo_id,
                    "nome": item.brinquedo.nome,
                    "quantidade": item.quantidade,
                }
            )

        return {
            "nome": kit_festa.nome,
            "preco_unitario": preco_unitario,
            "subtotal": subtotal,
            "snapshot": {
                "tipo_item": ItemCarrinho.TipoItem.KIT_FESTA,
                "kit_festa": {
                    "id": kit_festa.id,
                    "nome": kit_festa.nome,
                    "preco_aluguel": str(kit_festa.preco_aluguel),
                    "itens": itens,
                },
                "quantidade": quantidade,
            },
        }

    @staticmethod
    def _snapshot_kit_personalizado(configuracao, itens, quantidade):
        serializer = ValidarSelecaoKitPersonalizavelSerializer(data={"itens": itens})
        serializer.is_valid(raise_exception=True)
        itens = serializer.validated_data["itens"]
        resumo = KitPersonalizavelService.validar_selecao(configuracao, itens)
        preco_unitario = resumo["preco_estimado"]
        subtotal = preco_unitario * quantidade
        return {
            "nome": resumo["configuracao_nome"],
            "preco_unitario": preco_unitario,
            "subtotal": subtotal,
            "snapshot": {
                "tipo_item": ItemCarrinho.TipoItem.KIT_PERSONALIZADO,
                "configuracao": {
                    "id": resumo["configuracao_id"],
                    "nome": resumo["configuracao_nome"],
                    "preco_base": str(resumo["preco_base"]),
                    "preco_itens": str(resumo["preco_itens"]),
                    "preco_estimado": str(resumo["preco_estimado"]),
                    "quantidade_total": resumo["quantidade_total"],
                },
                "itens": [
                    {
                        **item,
                        "preco_unitario": str(item["preco_unitario"]),
                        "subtotal": str(item["subtotal"]),
                    }
                    for item in resumo["itens"]
                ],
                "quantidade": quantidade,
            },
        }

    @staticmethod
    @transaction.atomic
    def adicionar_brinquedo(carrinho, brinquedo_id, quantidade):
        brinquedo = Brinquedo.objects.filter(id=brinquedo_id).first()
        if not brinquedo:
            raise serializers.ValidationError(
                {"brinquedo_id": "Brinquedo nao encontrado."}
            )
        if not brinquedo.ativo:
            raise serializers.ValidationError(
                {"brinquedo_id": "Brinquedo inativo nao pode ser adicionado."}
            )

        dados = CarrinhoService._snapshot_brinquedo(brinquedo, quantidade)
        item = ItemCarrinho(
            carrinho=carrinho,
            tipo_item=ItemCarrinho.TipoItem.BRINQUEDO,
            brinquedo=brinquedo,
            quantidade=quantidade,
            nome_snapshot=dados["nome"],
            preco_unitario_snapshot=dados["preco_unitario"],
            subtotal_snapshot=dados["subtotal"],
            snapshot=dados["snapshot"],
        )
        item.full_clean()
        item.save()
        return item

    @staticmethod
    @transaction.atomic
    def adicionar_kit_festa(carrinho, kit_festa_id, quantidade):
        kit_festa = (
            KitFesta.objects.prefetch_related("itens__brinquedo")
            .filter(id=kit_festa_id)
            .first()
        )
        if not kit_festa:
            raise serializers.ValidationError(
                {"kit_festa_id": "Kit festa nao encontrado."}
            )
        if not kit_festa.ativo:
            raise serializers.ValidationError(
                {"kit_festa_id": "Kit festa inativo nao pode ser adicionado."}
            )

        dados = CarrinhoService._snapshot_kit_festa(kit_festa, quantidade)
        item = ItemCarrinho(
            carrinho=carrinho,
            tipo_item=ItemCarrinho.TipoItem.KIT_FESTA,
            kit_festa=kit_festa,
            quantidade=quantidade,
            nome_snapshot=dados["nome"],
            preco_unitario_snapshot=dados["preco_unitario"],
            subtotal_snapshot=dados["subtotal"],
            snapshot=dados["snapshot"],
        )
        item.full_clean()
        item.save()
        return item

    @staticmethod
    @transaction.atomic
    def adicionar_kit_personalizado(carrinho, configuracao_id, itens, quantidade=1):
        configuracao = (
            ConfiguracaoKitPersonalizavel.objects.prefetch_related(
                "categorias_permitidas",
                "brinquedos_permitidos",
                "regras_categoria__categoria",
            )
            .filter(id=configuracao_id)
            .first()
        )
        if not configuracao:
            raise serializers.ValidationError(
                {"configuracao_id": "Configuracao de kit personalizada nao encontrada."}
            )
        if not configuracao.ativo:
            raise serializers.ValidationError(
                {
                    "configuracao_id": (
                        "Configuracao de kit personalizada inativa nao pode "
                        "ser adicionada."
                    )
                }
            )

        dados = CarrinhoService._snapshot_kit_personalizado(
            configuracao,
            itens,
            quantidade,
        )
        item = ItemCarrinho(
            carrinho=carrinho,
            tipo_item=ItemCarrinho.TipoItem.KIT_PERSONALIZADO,
            configuracao_kit_personalizavel=configuracao,
            quantidade=quantidade,
            nome_snapshot=dados["nome"],
            preco_unitario_snapshot=dados["preco_unitario"],
            subtotal_snapshot=dados["subtotal"],
            snapshot=dados["snapshot"],
        )
        item.full_clean()
        item.save()
        return item

    @staticmethod
    def adicionar_item(carrinho, dados):
        tipo_item = dados["tipo_item"]
        quantidade = dados.get("quantidade", 1)

        if tipo_item == ItemCarrinho.TipoItem.BRINQUEDO:
            return CarrinhoService.adicionar_brinquedo(
                carrinho,
                dados["brinquedo_id"],
                quantidade,
            )
        if tipo_item == ItemCarrinho.TipoItem.KIT_FESTA:
            return CarrinhoService.adicionar_kit_festa(
                carrinho,
                dados["kit_festa_id"],
                quantidade,
            )
        if tipo_item == ItemCarrinho.TipoItem.KIT_PERSONALIZADO:
            return CarrinhoService.adicionar_kit_personalizado(
                carrinho,
                dados["configuracao_id"],
                dados["itens"],
                quantidade,
            )

        raise serializers.ValidationError({"tipo_item": "Tipo de item invalido."})

    @staticmethod
    @transaction.atomic
    def alterar_quantidade(item, quantidade):
        if item.tipo_item == ItemCarrinho.TipoItem.BRINQUEDO:
            dados = CarrinhoService._snapshot_brinquedo(item.brinquedo, quantidade)
        elif item.tipo_item == ItemCarrinho.TipoItem.KIT_FESTA:
            dados = CarrinhoService._snapshot_kit_festa(item.kit_festa, quantidade)
        else:
            itens = item.snapshot.get("itens", [])
            itens_validacao = [
                {
                    "brinquedo_id": item_snapshot["brinquedo_id"],
                    "quantidade": item_snapshot["quantidade"],
                }
                for item_snapshot in itens
            ]
            dados = CarrinhoService._snapshot_kit_personalizado(
                item.configuracao_kit_personalizavel,
                itens_validacao,
                quantidade,
            )

        item.quantidade = quantidade
        item.nome_snapshot = dados["nome"]
        item.preco_unitario_snapshot = dados["preco_unitario"]
        item.subtotal_snapshot = dados["subtotal"]
        item.snapshot = dados["snapshot"]
        item.full_clean()
        item.save()
        return item

    @staticmethod
    def remover_item(item):
        item.delete()

    @staticmethod
    def limpar(carrinho):
        carrinho.itens.all().delete()
