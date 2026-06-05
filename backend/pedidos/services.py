from decimal import Decimal

from django.http import Http404
from django.db import transaction
from django.db.models import Prefetch
from django.utils.dateparse import parse_date
from django.utils import timezone
from rest_framework import serializers

from catalogo.models import (
    Brinquedo,
    ConfiguracaoKitPersonalizavel,
    KitFesta,
    UnidadeBrinquedo,
)
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
from clientes.models import Cliente

from .models import (
    AceiteContrato,
    Carrinho,
    Contrato,
    ItemCarrinho,
    ItemPedido,
    Pedido,
    ReservaUnidade,
)


class CarrinhoService:
    PERIODOS_LOCACAO = {
        "15_dias": {"tipo": "15_dias", "label": "15 dias", "dias": 15},
        "30_dias": {"tipo": "30_dias", "label": "30 dias", "dias": 30},
        "diaria": {"tipo": "diaria", "label": "Diaria", "dias": 1},
    }

    @staticmethod
    def _validar_periodo_locacao(item, periodo_locacao, nome_campo):
        periodo = CarrinhoService.PERIODOS_LOCACAO.get(periodo_locacao)
        if not periodo:
            raise serializers.ValidationError(
                {nome_campo: "Periodo de locacao invalido."}
            )
        preco = item.preco_por_periodo(periodo_locacao)
        if preco is None:
            raise serializers.ValidationError(
                {
                    nome_campo: (
                        "Este item nao permite locacao no periodo selecionado."
                    )
                }
            )
        return {**periodo, "preco": f"{preco:.2f}"}, preco

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
    def _snapshot_brinquedo(brinquedo, quantidade, periodo_locacao="15_dias"):
        periodo, preco_unitario = CarrinhoService._validar_periodo_locacao(
            brinquedo,
            periodo_locacao,
            "periodo_locacao",
        )

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
                    "preco_periodo": str(preco_unitario),
                },
                "periodo_locacao": periodo,
                "quantidade": quantidade,
            },
        }

    @staticmethod
    def _snapshot_kit_festa(kit_festa, quantidade, periodo_locacao="15_dias"):
        periodo, preco_unitario = CarrinhoService._validar_periodo_locacao(
            kit_festa,
            periodo_locacao,
            "periodo_locacao",
        )
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
                    "preco_periodo": str(preco_unitario),
                    "itens": itens,
                },
                "periodo_locacao": periodo,
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
    def adicionar_brinquedo(
        carrinho,
        brinquedo_id,
        quantidade,
        periodo_locacao="15_dias",
    ):
        brinquedo = Brinquedo.objects.filter(id=brinquedo_id).first()
        if not brinquedo:
            raise serializers.ValidationError(
                {"brinquedo_id": "Brinquedo nao encontrado."}
            )
        if not brinquedo.ativo:
            raise serializers.ValidationError(
                {"brinquedo_id": "Brinquedo inativo nao pode ser adicionado."}
            )
        
        # Ao invés de ficar adicionando item a item na lista do carrinho,
        # É adicionado mais um na quantidade.
        
        for item in carrinho.itens.all():
            if item.tipo_item == ItemCarrinho.TipoItem.BRINQUEDO and item.brinquedo_id == brinquedo_id:
                periodo_existente = item.snapshot.get("periodo_locacao", {}).get("tipo")
                if periodo_existente == periodo_locacao:
                    nova_quantidade = item.quantidade + quantidade
                    return CarrinhoService.alterar_quantidade(item, nova_quantidade)
            

        dados = CarrinhoService._snapshot_brinquedo(
            brinquedo,
            quantidade,
            periodo_locacao,
        )
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
    def adicionar_kit_festa(
        carrinho,
        kit_festa_id,
        quantidade,
        periodo_locacao="15_dias",
    ):
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

        # Literal a cópia da lógica para brinquedo.
        # Só que para o Kit Festa.
        
        for item in carrinho.itens.all():
            if item.tipo_item == ItemCarrinho.TipoItem.KIT_FESTA and item.kit_festa_id == kit_festa.id:
                periodo_existente = item.snapshot.get("periodo_locacao", {}).get("tipo")
                if periodo_existente == periodo_locacao:
                    nova_quantidade = item.quantidade + quantidade
                    return CarrinhoService.alterar_quantidade(item, nova_quantidade)
        
        dados = CarrinhoService._snapshot_kit_festa(
            kit_festa,
            quantidade,
            periodo_locacao,
        )
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
                dados.get("periodo_locacao", "15_dias"),
            )
        if tipo_item == ItemCarrinho.TipoItem.KIT_FESTA:
            return CarrinhoService.adicionar_kit_festa(
                carrinho,
                dados["kit_festa_id"],
                quantidade,
                dados.get("periodo_locacao", "15_dias"),
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
            periodo_locacao = item.snapshot.get("periodo_locacao", {}).get(
                "tipo",
                "15_dias",
            )
            dados = CarrinhoService._snapshot_brinquedo(
                item.brinquedo,
                quantidade,
                periodo_locacao,
            )
        elif item.tipo_item == ItemCarrinho.TipoItem.KIT_FESTA:
            periodo_locacao = item.snapshot.get("periodo_locacao", {}).get(
                "tipo",
                "15_dias",
            )
            dados = CarrinhoService._snapshot_kit_festa(
                item.kit_festa,
                quantidade,
                periodo_locacao,
            )
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
            "data_inicio_locacao",
            "data_fim_locacao",
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

        data_inicio_locacao = dados.get("data_inicio_locacao")
        if isinstance(data_inicio_locacao, str):
            data_inicio_locacao = parse_date(data_inicio_locacao)
            dados["data_inicio_locacao"] = data_inicio_locacao

        data_fim_locacao = dados.get("data_fim_locacao")
        if isinstance(data_fim_locacao, str):
            data_fim_locacao = parse_date(data_fim_locacao)
            dados["data_fim_locacao"] = data_fim_locacao

        if (
            data_inicio_locacao
            and data_fim_locacao
            and data_fim_locacao <= data_inicio_locacao
        ):
            erros["data_fim_locacao"] = (
                "A data final da locacao deve ser posterior a data inicial "
                "da locacao."
            )
        if (
            dados.get("data_inicio_locacao") is None
            and "data_inicio_locacao" not in erros
        ):
            erros["data_inicio_locacao"] = "Informe uma data valida."
        if dados.get("data_fim_locacao") is None and "data_fim_locacao" not in erros:
            erros["data_fim_locacao"] = "Informe uma data valida."

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
    def converter_carrinho(carrinho, dados_cliente, usuario, taxa_service=None):
        PedidoService._validar_dados_cliente(dados_cliente)

        if not usuario or not usuario.is_authenticated:
            raise serializers.ValidationError(
                {"usuario": "Autenticacao obrigatoria para fechar pedido."}
            )

        carrinho = (
            Carrinho.objects.select_for_update()
            .select_related("usuario")
            .get(id=carrinho.id)
        )
        if carrinho.status != Carrinho.Status.ATIVO:
            raise serializers.ValidationError(
                {"carrinho": "Somente carrinho ativo pode ser convertido em pedido."}
            )
        if carrinho.usuario_id != usuario.id:
            raise serializers.ValidationError(
                {"carrinho": "Carrinho nao pertence ao usuario autenticado."}
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
        cliente, _criado = Cliente.objects.get_or_create(
            user=usuario,
            defaults={
                "nome": dados_cliente["nome_cliente_snapshot"],
                "telefone": dados_cliente["telefone_cliente_snapshot"],
            },
        )
        pedido = Pedido.objects.create(
            carrinho_origem=carrinho,
            usuario=usuario,
            cliente=cliente,
            session_key_snapshot=carrinho.session_key,
            nome_cliente_snapshot=dados_cliente["nome_cliente_snapshot"],
            telefone_cliente_snapshot=dados_cliente["telefone_cliente_snapshot"],
            email_cliente_snapshot=dados_cliente["email_cliente_snapshot"],
            observacoes_cliente=dados_cliente.get("observacoes_cliente", ""),
            data_evento_pretendida=dados_cliente["data_evento_pretendida"],
            data_inicio_locacao=dados_cliente["data_inicio_locacao"],
            data_fim_locacao=dados_cliente["data_fim_locacao"],
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
        queryset = Pedido.objects.select_related("usuario", "cliente").filter(
            id=pedido_id
        )
        usuario = request.user if request.user.is_authenticated else None

        pedido = queryset.filter(usuario=usuario).first() if usuario else None

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
            .select_related("usuario", "cliente")
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


class ReservaPedidoService:
    @staticmethod
    def _validar_pedido_reservavel(pedido):
        if pedido.status != Pedido.Status.AGUARDANDO_ANALISE:
            raise serializers.ValidationError(
                {"status": "Pedido em status nao reservavel."}
            )
        if not pedido.data_inicio_locacao or not pedido.data_fim_locacao:
            raise serializers.ValidationError(
                {"periodo": "Pedido sem periodo de locacao definido."}
            )
        if pedido.data_fim_locacao <= pedido.data_inicio_locacao:
            raise serializers.ValidationError(
                {"data_fim_locacao": "Periodo de locacao invalido."}
            )

    @staticmethod
    def _adicionar_demanda(demandas, item_pedido, brinquedo_id, quantidade):
        if quantidade <= 0:
            return
        demanda = demandas.setdefault(
            brinquedo_id,
            {
                "quantidade": 0,
                "origens": [],
            },
        )
        demanda["quantidade"] += quantidade
        demanda["origens"].append(
            {
                "item_pedido": item_pedido,
                "quantidade": quantidade,
            }
        )

    @staticmethod
    def _montar_demandas(pedido):
        itens = list(
            pedido.itens.select_related("brinquedo", "kit_festa")
            .prefetch_related("kit_festa__itens__brinquedo")
            .order_by("id")
        )
        if not itens:
            raise serializers.ValidationError(
                {"itens": "Pedido sem itens nao pode ser reservado."}
        )

        demandas = {}
        brinquedo_ids_snapshot = set()

        for item in itens:
            multiplicador = item.quantidade
            if item.tipo_item == ItemCarrinho.TipoItem.BRINQUEDO:
                ReservaPedidoService._adicionar_demanda(
                    demandas,
                    item,
                    item.brinquedo_id,
                    multiplicador,
                )
            elif item.tipo_item == ItemCarrinho.TipoItem.KIT_FESTA:
                itens_snapshot = item.snapshot.get("kit_festa", {}).get("itens", [])
                if not itens_snapshot:
                    raise serializers.ValidationError(
                        {"itens": "Snapshot de kit festa invalido para reserva."}
                    )
                for item_kit in itens_snapshot:
                    brinquedo_id = item_kit.get("brinquedo_id")
                    quantidade = item_kit.get("quantidade")
                    if not brinquedo_id or not quantidade:
                        raise serializers.ValidationError(
                            {"itens": "Snapshot de kit festa invalido para reserva."}
                        )
                    brinquedo_ids_snapshot.add(brinquedo_id)
                    ReservaPedidoService._adicionar_demanda(
                        demandas,
                        item,
                        brinquedo_id,
                        quantidade * multiplicador,
                    )
            elif item.tipo_item == ItemCarrinho.TipoItem.KIT_PERSONALIZADO:
                for item_snapshot in item.snapshot.get("itens", []):
                    brinquedo_id = item_snapshot.get("brinquedo_id")
                    quantidade = item_snapshot.get("quantidade")
                    if not brinquedo_id or not quantidade:
                        raise serializers.ValidationError(
                            {
                                "itens": (
                                    "Snapshot de kit personalizado invalido para "
                                    "reserva."
                                )
                            }
                        )
                    brinquedo_ids_snapshot.add(brinquedo_id)
                    ReservaPedidoService._adicionar_demanda(
                        demandas,
                        item,
                        brinquedo_id,
                        quantidade * multiplicador,
                    )

        if brinquedo_ids_snapshot:
            brinquedos_existentes = set(
                Brinquedo.objects.filter(id__in=brinquedo_ids_snapshot).values_list(
                    "id",
                    flat=True,
                )
            )
            if brinquedos_existentes != brinquedo_ids_snapshot:
                raise serializers.ValidationError(
                    {
                        "itens": (
                            "Snapshot de kit personalizado referencia brinquedo "
                            "inexistente."
                        )
                    }
                )

        return demandas

    @staticmethod
    def _reservas_ativas_do_pedido(pedido):
        return (
            ReservaUnidade.objects.filter(
                pedido=pedido,
                status=ReservaUnidade.Status.ATIVA,
            )
            .select_related("unidade_brinquedo")
            .order_by("id")
        )

    @staticmethod
    def _reservas_sao_compativeis(pedido, demandas, reservas):
        if not reservas:
            return False

        inicio = pedido.data_inicio_locacao
        fim = pedido.data_fim_locacao
        contagem_por_brinquedo = {}
        unidades_vistas = set()

        for reserva in reservas:
            if reserva.data_inicio != inicio or reserva.data_fim != fim:
                return False
            if reserva.unidade_brinquedo_id in unidades_vistas:
                return False
            unidades_vistas.add(reserva.unidade_brinquedo_id)
            brinquedo_id = reserva.unidade_brinquedo.brinquedo_id
            contagem_por_brinquedo[brinquedo_id] = (
                contagem_por_brinquedo.get(brinquedo_id, 0) + 1
            )

        demanda_por_brinquedo = {
            brinquedo_id: dados["quantidade"]
            for brinquedo_id, dados in demandas.items()
        }
        return contagem_por_brinquedo == demanda_por_brinquedo

    @staticmethod
    def _item_pedido_para_reserva(demanda):
        while demanda["origens"]:
            origem = demanda["origens"][0]
            if origem["quantidade"] > 0:
                origem["quantidade"] -= 1
                return origem["item_pedido"]
            demanda["origens"].pop(0)
        return None

    @staticmethod
    def _unidades_candidatas_livres(brinquedo_id, data_inicio, data_fim):
        unidades = list(
            UnidadeBrinquedo.objects.select_for_update()
            .filter(
                brinquedo_id=brinquedo_id,
                status=UnidadeBrinquedo.Status.DISPONIVEL,
            )
            .exclude(
                reservas__status=ReservaUnidade.Status.ATIVA,
                reservas__data_inicio__lt=data_fim,
                reservas__data_fim__gt=data_inicio,
            )
            .distinct()
            .order_by("id")
        )
        if not unidades:
            return []

        unidade_ids_bloqueadas = set(
            ReservaUnidade.objects.filter(
                unidade_brinquedo_id__in=[unidade.id for unidade in unidades],
                status=ReservaUnidade.Status.ATIVA,
                data_inicio__lt=data_fim,
                data_fim__gt=data_inicio,
            ).values_list("unidade_brinquedo_id", flat=True)
        )
        return [
            unidade
            for unidade in unidades
            if unidade.id not in unidade_ids_bloqueadas
        ]

    @staticmethod
    def _resposta(pedido, reservas, reservas_criadas):
        return {
            "pedido_id": pedido.id,
            "status": pedido.status,
            "reservas_criadas": reservas_criadas,
            "reservas": reservas,
        }

    @staticmethod
    @transaction.atomic
    def reservar_unidades(pedido):
        pedido = (
            Pedido.objects.select_for_update()
            .prefetch_related("itens")
            .get(id=pedido.id)
        )
        demandas = ReservaPedidoService._montar_demandas(pedido)
        reservas_ativas = list(ReservaPedidoService._reservas_ativas_do_pedido(pedido))

        if pedido.status == Pedido.Status.RESERVADO:
            if ReservaPedidoService._reservas_sao_compativeis(
                pedido,
                demandas,
                reservas_ativas,
            ):
                return ReservaPedidoService._resposta(
                    pedido,
                    reservas_ativas,
                    [],
                )
            raise serializers.ValidationError(
                {"detail": "Pedido ja reservado com reservas incompativeis."}
            )

        ReservaPedidoService._validar_pedido_reservavel(pedido)
        if reservas_ativas:
            if ReservaPedidoService._reservas_sao_compativeis(
                pedido,
                demandas,
                reservas_ativas,
            ):
                raise serializers.ValidationError(
                    {"detail": "Pedido ja possui reservas ativas compativeis."}
                )
            raise serializers.ValidationError(
                {"reservas": "Pedido possui reservas ativas incompativeis."}
            )

        reservas_criadas = []
        data_inicio = pedido.data_inicio_locacao
        data_fim = pedido.data_fim_locacao

        for brinquedo_id in sorted(demandas):
            demanda = demandas[brinquedo_id]
            quantidade_necessaria = demanda["quantidade"]
            unidades_livres = ReservaPedidoService._unidades_candidatas_livres(
                brinquedo_id,
                data_inicio,
                data_fim,
            )
            if len(unidades_livres) < quantidade_necessaria:
                raise serializers.ValidationError(
                    {
                        "disponibilidade": (
                            "Unidades insuficientes para o brinquedo "
                            f"{brinquedo_id}."
                        )
                    }
                )

            for unidade in unidades_livres[:quantidade_necessaria]:
                reserva = ReservaUnidade(
                    pedido=pedido,
                    item_pedido=ReservaPedidoService._item_pedido_para_reserva(
                        demanda
                    ),
                    unidade_brinquedo=unidade,
                    data_inicio=data_inicio,
                    data_fim=data_fim,
                    status=ReservaUnidade.Status.ATIVA,
                )
                reserva.full_clean()
                reserva.save()
                reservas_criadas.append(reserva)

        pedido.status = Pedido.Status.RESERVADO
        pedido.save(update_fields=["status", "atualizado_em"])
        return ReservaPedidoService._resposta(
            pedido,
            reservas_criadas,
            reservas_criadas,
        )


class AgendaAdminService:
    EVENTO_ENTREGA = "entrega"
    EVENTO_RETIRADA = "retirada"
    EVENTO_CONTRATO_PENDENTE = "contrato_pendente"
    EVENTO_LOCACAO_EM_ANDAMENTO = "locacao_em_andamento"

    TIPOS_EVENTO = (
        EVENTO_ENTREGA,
        EVENTO_RETIRADA,
        EVENTO_CONTRATO_PENDENTE,
        EVENTO_LOCACAO_EM_ANDAMENTO,
    )

    LABELS = {
        EVENTO_ENTREGA: "Entrega",
        EVENTO_RETIRADA: "Retirada",
        EVENTO_CONTRATO_PENDENTE: "Contrato pendente",
        EVENTO_LOCACAO_EM_ANDAMENTO: "Locacao em andamento",
    }

    ORDEM_TIPOS = {
        EVENTO_ENTREGA: 1,
        EVENTO_RETIRADA: 2,
        EVENTO_CONTRATO_PENDENTE: 3,
        EVENTO_LOCACAO_EM_ANDAMENTO: 4,
    }

    @classmethod
    def gerar(cls, inicio, fim, tipos=None, status=None):
        tipos = tuple(tipos or cls.TIPOS_EVENTO)
        eventos = []

        if cls.EVENTO_ENTREGA in tipos:
            eventos.extend(cls._eventos_entrega(inicio, fim, status))
        if cls.EVENTO_RETIRADA in tipos:
            eventos.extend(cls._eventos_retirada(inicio, fim, status))
        if cls.EVENTO_CONTRATO_PENDENTE in tipos:
            eventos.extend(cls._eventos_contrato_pendente(inicio, fim, status))
        if cls.EVENTO_LOCACAO_EM_ANDAMENTO in tipos:
            eventos.extend(cls._eventos_locacao_em_andamento(inicio, fim, status))

        eventos.sort(
            key=lambda evento: (
                evento["data"],
                cls.ORDEM_TIPOS.get(evento["tipo"], 99),
                evento["pedido"]["id"],
                evento["id"],
            )
        )

        return {
            "periodo": {
                "inicio": inicio,
                "fim": fim,
            },
            "eventos": eventos,
            "resumo": cls._resumo(eventos),
        }

    @classmethod
    def _queryset_base(cls):
        reservas_ativas = (
            ReservaUnidade.objects.filter(status=ReservaUnidade.Status.ATIVA)
            .select_related(
                "unidade_brinquedo",
                "unidade_brinquedo__brinquedo",
            )
            .order_by("id")
        )
        return (
            Pedido.objects.select_related("cliente", "aceite_contrato")
            .prefetch_related(
                "itens",
                Prefetch(
                    "reservas_unidades",
                    queryset=reservas_ativas,
                    to_attr="reservas_ativas_agenda",
                ),
            )
            .order_by("data_inicio_locacao", "id")
        )

    @staticmethod
    def _filtrar_status(queryset, status):
        if status:
            return queryset.filter(status=status)
        return queryset

    @classmethod
    def _eventos_entrega(cls, inicio, fim, status):
        queryset = cls._queryset_base().filter(
            status=Pedido.Status.CONFIRMADO,
            data_inicio_locacao__gte=inicio,
            data_inicio_locacao__lte=fim,
        )
        queryset = cls._filtrar_status(queryset, status)
        return [
            cls._montar_evento(pedido, cls.EVENTO_ENTREGA, pedido.data_inicio_locacao)
            for pedido in queryset
        ]

    @classmethod
    def _eventos_retirada(cls, inicio, fim, status):
        queryset = cls._queryset_base().filter(
            status=Pedido.Status.EM_LOCACAO,
            data_fim_locacao__gte=inicio,
            data_fim_locacao__lte=fim,
        )
        queryset = cls._filtrar_status(queryset, status)
        return [
            cls._montar_evento(pedido, cls.EVENTO_RETIRADA, pedido.data_fim_locacao)
            for pedido in queryset
        ]

    @classmethod
    def _eventos_contrato_pendente(cls, inicio, fim, status):
        queryset = cls._queryset_base().filter(
            status=Pedido.Status.RESERVADO,
            aceite_contrato__isnull=True,
            data_inicio_locacao__gte=inicio,
            data_inicio_locacao__lte=fim,
        )
        queryset = cls._filtrar_status(queryset, status)
        return [
            cls._montar_evento(
                pedido,
                cls.EVENTO_CONTRATO_PENDENTE,
                pedido.data_inicio_locacao,
            )
            for pedido in queryset
        ]

    @classmethod
    def _eventos_locacao_em_andamento(cls, inicio, fim, status):
        queryset = cls._queryset_base().filter(
            status=Pedido.Status.EM_LOCACAO,
            data_inicio_locacao__lte=fim,
            data_fim_locacao__gte=inicio,
        )
        queryset = cls._filtrar_status(queryset, status)
        return [
            cls._montar_evento(
                pedido,
                cls.EVENTO_LOCACAO_EM_ANDAMENTO,
                max(pedido.data_inicio_locacao, inicio),
            )
            for pedido in queryset
        ]

    @classmethod
    def _montar_evento(cls, pedido, tipo, data):
        return {
            "id": cls._id_evento(pedido, tipo),
            "tipo": tipo,
            "label": cls.LABELS[tipo],
            "data": data,
            "hora_inicio": None,
            "pedido": cls._pedido_resumo(pedido),
            "unidades": cls._unidades_resumo(pedido),
        }

    @staticmethod
    def _id_evento(pedido, tipo):
        return f"pedido-{pedido.id}-{tipo.replace('_', '-')}"

    @classmethod
    def _pedido_resumo(cls, pedido):
        cliente_nome = (
            pedido.cliente.nome
            if pedido.cliente_id and pedido.cliente
            else pedido.nome_cliente_snapshot
        )
        cliente_telefone = (
            pedido.cliente.telefone
            if pedido.cliente_id and pedido.cliente
            else pedido.telefone_cliente_snapshot
        )
        return {
            "id": pedido.id,
            "status": pedido.status,
            "cliente_nome": cliente_nome,
            "cliente_telefone": cliente_telefone,
            "data_inicio_locacao": pedido.data_inicio_locacao,
            "data_fim_locacao": pedido.data_fim_locacao,
            "tem_aceite_contrato": cls._tem_aceite_contrato(pedido),
            "tem_kit_festa": cls._tem_kit_festa(pedido),
        }

    @staticmethod
    def _tem_aceite_contrato(pedido):
        return hasattr(pedido, "aceite_contrato")

    @staticmethod
    def _tem_kit_festa(pedido):
        return any(
            item.tipo_item == ItemCarrinho.TipoItem.KIT_FESTA
            for item in pedido.itens.all()
        )

    @staticmethod
    def _unidades_resumo(pedido):
        reservas = getattr(pedido, "reservas_ativas_agenda", None)
        if reservas is None:
            reservas = (
                pedido.reservas_unidades.filter(
                    status=ReservaUnidade.Status.ATIVA,
                )
                .select_related(
                    "unidade_brinquedo",
                    "unidade_brinquedo__brinquedo",
                )
                .order_by("id")
            )

        unidades = []
        unidade_ids = set()
        for reserva in reservas:
            unidade = reserva.unidade_brinquedo
            if unidade.id in unidade_ids:
                continue
            unidade_ids.add(unidade.id)
            unidades.append(
                {
                    "id": unidade.id,
                    "codigo": unidade.codigo,
                    "brinquedo": unidade.brinquedo.nome,
                    "status": unidade.status,
                }
            )
        return unidades

    @classmethod
    def _resumo(cls, eventos):
        por_tipo = {tipo: 0 for tipo in cls.TIPOS_EVENTO}
        for evento in eventos:
            por_tipo[evento["tipo"]] += 1
        return {
            "total": len(eventos),
            "por_tipo": por_tipo,
        }


class AdminPedidoAcoesService:
    @staticmethod
    def acoes_disponiveis(pedido):
        if pedido.status == Pedido.Status.AGUARDANDO_ANALISE:
            if AdminPedidoAcoesService._tem_itens_e_periodo_reservaveis(pedido):
                return ["reservar_unidades"]
            return []
        if pedido.status == Pedido.Status.RESERVADO:
            if hasattr(pedido, "aceite_contrato"):
                return ["confirmar"]
            return []
        if pedido.status == Pedido.Status.CONFIRMADO:
            return ["iniciar_locacao"]
        if pedido.status == Pedido.Status.EM_LOCACAO:
            return ["registrar_retirada"]
        return []

    @staticmethod
    def _tem_itens_e_periodo_reservaveis(pedido):
        if not pedido.data_inicio_locacao or not pedido.data_fim_locacao:
            return False
        if pedido.data_fim_locacao <= pedido.data_inicio_locacao:
            return False
        try:
            demandas = ReservaPedidoService._montar_demandas(pedido)
        except serializers.ValidationError:
            return False
        return bool(demandas)


class ConfirmacaoPedidoService:
    @staticmethod
    @transaction.atomic
    def confirmar(pedido, usuario_admin):
        pedido = (
            Pedido.objects.select_for_update()
            .prefetch_related("itens")
            .get(id=pedido.id)
        )

        if pedido.status == Pedido.Status.CONFIRMADO:
            return pedido

        if pedido.status != Pedido.Status.RESERVADO:
            raise serializers.ValidationError(
                {"status": "Pedido em status nao confirmavel."}
            )
        if not hasattr(pedido, "aceite_contrato"):
            raise serializers.ValidationError(
                {"contrato": "Pedido sem contrato aceito."}
            )
        if not pedido.data_inicio_locacao or not pedido.data_fim_locacao:
            raise serializers.ValidationError(
                {"periodo": "Pedido sem periodo de locacao definido."}
            )
        if pedido.data_fim_locacao <= pedido.data_inicio_locacao:
            raise serializers.ValidationError(
                {"data_fim_locacao": "Periodo de locacao invalido."}
            )

        demandas = ReservaPedidoService._montar_demandas(pedido)
        reservas_ativas = list(ReservaPedidoService._reservas_ativas_do_pedido(pedido))
        if not reservas_ativas:
            raise serializers.ValidationError(
                {"reservas": "Pedido sem reservas ativas."}
            )
        if not ReservaPedidoService._reservas_sao_compativeis(
            pedido,
            demandas,
            reservas_ativas,
        ):
            raise serializers.ValidationError(
                {"reservas": "Reservas ativas incompativeis com o pedido."}
            )

        pedido.status = Pedido.Status.CONFIRMADO
        pedido.confirmado_em = timezone.now()
        pedido.confirmado_por = usuario_admin
        pedido.save(
            update_fields=[
                "status",
                "confirmado_em",
                "confirmado_por",
                "atualizado_em",
            ]
        )
        return pedido


class OperacaoLocacaoService:
    @staticmethod
    def _reservas_ativas_travadas(pedido):
        return list(
            ReservaUnidade.objects.select_for_update()
            .filter(
                pedido=pedido,
                status=ReservaUnidade.Status.ATIVA,
            )
            .select_related("unidade_brinquedo")
            .order_by("id")
        )

    @staticmethod
    def _unidades_travadas(reservas):
        unidade_ids = [reserva.unidade_brinquedo_id for reserva in reservas]
        unidades = list(
            UnidadeBrinquedo.objects.select_for_update()
            .filter(id__in=unidade_ids)
            .order_by("id")
        )
        unidades_por_id = {unidade.id: unidade for unidade in unidades}
        if len(unidades_por_id) != len(set(unidade_ids)):
            raise serializers.ValidationError(
                {"unidades": "Reservas possuem unidades invalidas."}
            )
        return unidades_por_id

    @staticmethod
    def _validar_reservas_compativeis(pedido, reservas):
        if not reservas:
            raise serializers.ValidationError(
                {"reservas": "Pedido sem reservas ativas."}
            )
        demandas = ReservaPedidoService._montar_demandas(pedido)
        if not ReservaPedidoService._reservas_sao_compativeis(
            pedido,
            demandas,
            reservas,
        ):
            raise serializers.ValidationError(
                {"reservas": "Reservas ativas incompativeis com o pedido."}
            )

    @staticmethod
    def _resposta(pedido, reservas=None, unidades=None):
        resposta = {
            "id": pedido.id,
            "status": pedido.status,
            "unidades_atualizadas": unidades or [],
        }
        if reservas is not None:
            resposta["reservas_encerradas"] = reservas
        return resposta

    @staticmethod
    @transaction.atomic
    def iniciar_locacao(pedido, usuario_admin):
        pedido = (
            Pedido.objects.select_for_update()
            .prefetch_related("itens")
            .get(id=pedido.id)
        )

        if pedido.status != Pedido.Status.CONFIRMADO:
            raise serializers.ValidationError(
                {"status": "Pedido em status invalido para iniciar locacao."}
            )

        reservas = OperacaoLocacaoService._reservas_ativas_travadas(pedido)
        OperacaoLocacaoService._validar_reservas_compativeis(pedido, reservas)
        unidades_por_id = OperacaoLocacaoService._unidades_travadas(reservas)

        unidades_atualizadas = []
        for reserva in reservas:
            unidade = unidades_por_id[reserva.unidade_brinquedo_id]
            if unidade.status != UnidadeBrinquedo.Status.DISPONIVEL:
                raise serializers.ValidationError(
                    {"unidades": "Unidade reservada nao esta disponivel."}
                )
            unidade.status = UnidadeBrinquedo.Status.EM_LOCACAO
            unidade.save(update_fields=["status", "atualizado_em"])
            unidades_atualizadas.append(unidade)

        pedido.status = Pedido.Status.EM_LOCACAO
        pedido.save(update_fields=["status", "atualizado_em"])

        return OperacaoLocacaoService._resposta(
            pedido,
            unidades=unidades_atualizadas,
        )

    @staticmethod
    @transaction.atomic
    def registrar_retirada(pedido, usuario_admin):
        pedido = (
            Pedido.objects.select_for_update()
            .prefetch_related("itens")
            .get(id=pedido.id)
        )

        if pedido.status != Pedido.Status.EM_LOCACAO:
            raise serializers.ValidationError(
                {"status": "Pedido em status invalido para registrar retirada."}
            )

        reservas = OperacaoLocacaoService._reservas_ativas_travadas(pedido)
        OperacaoLocacaoService._validar_reservas_compativeis(pedido, reservas)
        unidades_por_id = OperacaoLocacaoService._unidades_travadas(reservas)

        unidades_atualizadas = []
        reservas_encerradas = []
        for reserva in reservas:
            unidade = unidades_por_id[reserva.unidade_brinquedo_id]
            if unidade.status != UnidadeBrinquedo.Status.EM_LOCACAO:
                raise serializers.ValidationError(
                    {"unidades": "Unidade reservada nao esta em locacao."}
                )

            reserva.status = ReservaUnidade.Status.ENCERRADA
            reserva.save(update_fields=["status", "atualizado_em"])
            reservas_encerradas.append(reserva)

            unidade.status = UnidadeBrinquedo.Status.HIGIENIZACAO
            unidade.save(update_fields=["status", "atualizado_em"])
            unidades_atualizadas.append(unidade)

        pedido.status = Pedido.Status.RETIRADO
        pedido.save(update_fields=["status", "atualizado_em"])

        return OperacaoLocacaoService._resposta(
            pedido,
            reservas=reservas_encerradas,
            unidades=unidades_atualizadas,
        )
