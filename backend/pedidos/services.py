from decimal import Decimal

from django.http import Http404
from django.db import transaction
from django.utils.dateparse import parse_date
from django.utils import timezone
from rest_framework import serializers

from catalogo.models import Brinquedo, ConfiguracaoKitPersonalizavel, KitFesta
from catalogo.serializers import ValidarSelecaoKitPersonalizavelSerializer
from catalogo.services import KitPersonalizavelService
from entregas.providers import (
    CepInvalidoError,
    CepNaoEncontradoError,
    EnderecoIncompletoError,
    RotaProviderError,
)
from entregas.services import (
    ConfiguracaoTaxaAusenteError,
    DistanciaInvalidaError,
    TaxaEntregaRetiradaService,
    quantizar_decimal,
)

from .models import (
    AceiteContrato,
    Carrinho,
    Contrato,
    ItemCarrinho,
    ItemPedido,
    Pedido,
)


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


class PedidoService:
    @staticmethod
    def _validar_dados_cliente(dados):
        erros = {}
        for campo in (
            "nome_cliente_snapshot",
            "telefone_cliente_snapshot",
            "email_cliente_snapshot",
            "data_evento_pretendida",
            "cep",
            "numero",
        ):
            if not dados.get(campo):
                erros[campo] = "Este campo e obrigatorio."

        data_evento = dados.get("data_evento_pretendida")
        if isinstance(data_evento, str):
            data_evento = parse_date(data_evento)
            dados["data_evento_pretendida"] = data_evento

        if data_evento and data_evento < timezone.localdate():
            erros["data_evento_pretendida"] = (
                "A data pretendida do evento nao pode estar no passado."
            )
        if dados.get("data_evento_pretendida") is None and "data_evento_pretendida" not in erros:
            erros["data_evento_pretendida"] = "Informe uma data valida."

        if erros:
            raise serializers.ValidationError(erros)

    @staticmethod
    def _calcular_taxa_entrega(dados_cliente, taxa_service=None):
        service = taxa_service or TaxaEntregaRetiradaService()
        try:
            return service.calcular(
                cep=dados_cliente["cep"],
                numero=dados_cliente["numero"],
                complemento=dados_cliente.get("complemento", ""),
            )
        except (CepInvalidoError, CepNaoEncontradoError) as exc:
            raise serializers.ValidationError(
                {"cep": "CEP invalido ou nao encontrado."}
            ) from exc
        except EnderecoIncompletoError as exc:
            raise serializers.ValidationError(
                {"endereco": "Endereco incompleto para calcular a taxa."}
            ) from exc
        except ConfiguracaoTaxaAusenteError as exc:
            raise serializers.ValidationError(
                {"taxa_entrega": "Taxa de entrega e retirada indisponivel."}
            ) from exc
        except (RotaProviderError, DistanciaInvalidaError) as exc:
            raise serializers.ValidationError(
                {"taxa_entrega": "Nao foi possivel calcular a taxa de entrega."}
            ) from exc

    @staticmethod
    @transaction.atomic
    def converter_carrinho(carrinho, dados_cliente, taxa_service=None):
        PedidoService._validar_dados_cliente(dados_cliente)

        carrinho = (
            Carrinho.objects.select_for_update()
            .select_related("usuario")
            .get(id=carrinho.id)
        )
        if carrinho.status != Carrinho.Status.ATIVO:
            raise serializers.ValidationError(
                {"carrinho": "Somente carrinho ativo pode ser convertido em pedido."}
            )

        itens = list(
            carrinho.itens.select_related(
                "brinquedo",
                "kit_festa",
                "configuracao_kit_personalizavel",
            )
        )
        if not itens:
            raise serializers.ValidationError(
                {"carrinho": "Carrinho vazio nao pode ser convertido em pedido."}
            )

        subtotal = sum(
            (item.subtotal_snapshot for item in itens),
            Decimal("0.00"),
        )
        calculo_taxa = PedidoService._calcular_taxa_entrega(
            dados_cliente,
            taxa_service=taxa_service,
        )
        taxa_entrega = quantizar_decimal(calculo_taxa["taxa"])
        total_estimado = quantizar_decimal(subtotal + taxa_entrega)
        pedido = Pedido.objects.create(
            carrinho_origem=carrinho,
            usuario=carrinho.usuario,
            session_key_snapshot=carrinho.session_key,
            nome_cliente_snapshot=dados_cliente["nome_cliente_snapshot"],
            telefone_cliente_snapshot=dados_cliente["telefone_cliente_snapshot"],
            email_cliente_snapshot=dados_cliente["email_cliente_snapshot"],
            observacoes_cliente=dados_cliente.get("observacoes_cliente", ""),
            data_evento_pretendida=dados_cliente["data_evento_pretendida"],
            subtotal_itens_snapshot=subtotal,
            endereco_entrega_snapshot=calculo_taxa["endereco_interpretado"],
            distancia_ida_km_snapshot=calculo_taxa["distancia_ida_km"],
            distancia_total_km_snapshot=calculo_taxa["distancia_total_km"],
            valor_por_km_snapshot=calculo_taxa["valor_por_km"],
            taxa_entrega_retirada_snapshot=taxa_entrega,
            total_estimado_snapshot=total_estimado,
        )

        for item in itens:
            item_pedido = ItemPedido(
                pedido=pedido,
                tipo_item=item.tipo_item,
                brinquedo=item.brinquedo,
                kit_festa=item.kit_festa,
                configuracao_kit_personalizavel=(
                    item.configuracao_kit_personalizavel
                ),
                quantidade=item.quantidade,
                nome_snapshot=item.nome_snapshot,
                preco_unitario_snapshot=item.preco_unitario_snapshot,
                subtotal_snapshot=item.subtotal_snapshot,
                snapshot=item.snapshot,
            )
            item_pedido.full_clean()
            item_pedido.save()

        carrinho.status = Carrinho.Status.CONVERTIDO
        carrinho.save(update_fields=["status", "atualizado_em"])

        return pedido


class ContratoVigenteAusenteError(Exception):
    pass


class ContratoService:
    @staticmethod
    def obter_contrato_vigente():
        contrato = Contrato.objects.filter(ativo=True).first()
        if not contrato:
            raise ContratoVigenteAusenteError("Contrato vigente indisponivel.")
        return contrato

    @staticmethod
    def obter_pedido_do_request(request, pedido_id):
        queryset = Pedido.objects.select_related("usuario").filter(id=pedido_id)
        usuario = request.user if request.user.is_authenticated else None

        if usuario:
            pedido = queryset.filter(usuario=usuario).first()
        else:
            session_key = request.session.session_key
            pedido = None
            if session_key:
                pedido = queryset.filter(
                    usuario__isnull=True,
                    session_key_snapshot=session_key,
                ).first()

        if not pedido:
            raise Http404("Pedido nao encontrado.")
        return pedido

    @staticmethod
    def obter_contrato_do_pedido(request, pedido_id):
        ContratoService.obter_pedido_do_request(request, pedido_id)
        return ContratoService.obter_contrato_vigente()

    @staticmethod
    def _obter_ip(request):
        forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR", "")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        return request.META.get("REMOTE_ADDR") or None

    @staticmethod
    def _obter_user_agent(request):
        return request.META.get("HTTP_USER_AGENT", "")

    @staticmethod
    @transaction.atomic
    def registrar_aceite(request, pedido_id, dados):
        pedido = (
            Pedido.objects.select_for_update()
            .select_related("usuario")
            .get(id=ContratoService.obter_pedido_do_request(request, pedido_id).id)
        )
        contrato = ContratoService.obter_contrato_vigente()

        if hasattr(pedido, "aceite_contrato"):
            raise serializers.ValidationError(
                {"detail": "Contrato ja aceito para este pedido."}
            )

        if dados.get("contrato_id") != contrato.id:
            raise serializers.ValidationError(
                {"contrato_id": "Contrato divergente do contrato vigente."}
            )
        if dados.get("contrato_versao") != contrato.versao:
            raise serializers.ValidationError(
                {"contrato_versao": "Versao divergente do contrato vigente."}
            )

        aceite = AceiteContrato(
            pedido=pedido,
            contrato=contrato,
            contrato_versao_snapshot=contrato.versao,
            contrato_texto_snapshot=contrato.texto,
            nome_cliente_snapshot=pedido.nome_cliente_snapshot,
            email_cliente_snapshot=pedido.email_cliente_snapshot,
            aceito_em=timezone.now(),
            ip=ContratoService._obter_ip(request),
            user_agent=ContratoService._obter_user_agent(request),
        )
        aceite.full_clean()
        aceite.save()
        return aceite
