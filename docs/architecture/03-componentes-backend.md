# Componentes do backend

O backend é um projeto Django organizado em apps de domínio. Views e serializers formam a borda HTTP; services concentram orquestração e regras mais pesadas; models representam e protegem o estado persistido.

## `catalogo`

**Responsabilidade:** publicar produtos e kits e representar o estoque físico que pode ser reservado.

Modelos principais:

- `Categoria` agrupa brinquedos.
- `Brinquedo` contém descrição, visibilidade e preços por período.
- `ImagemBrinquedo` mantém as imagens de cada brinquedo.
- `UnidadeBrinquedo` representa cada exemplar físico, com código e estado (`disponivel`, `reservada`, `em_locacao`, `higienizacao`, `manutencao`, `standby` ou `baixada`).
- `KitFesta` e `ItemKitFesta` compõem kits prontos a partir de brinquedos e quantidades.
- `DedicacaoUnidadeKit` associa uma unidade física específica a um item de kit.
- `ConfiguracaoKitPersonalizavel` e `RegraCategoriaKitPersonalizavel` definem limites e elegibilidade de kits montados pelo cliente.
- `InteresseDisponibilidade` registra clientes interessados em um brinquedo indisponível.

Relações centrais: categoria 1:N brinquedos; brinquedo 1:N imagens e unidades; kit 1:N itens; item de kit N:1 brinquedo; dedicação liga item de kit 1:1 a uma unidade compatível.

## `pedidos`

**Responsabilidade:** carrinho, conversão em pedido, contrato, snapshots comerciais, reservas e ciclo operacional.

Modelos principais:

- `Carrinho` pertence a uma sessão anônima ou a um usuário autenticado e possui vários `ItemCarrinho`.
- `ItemCarrinho` referencia brinquedo, kit pronto ou configuração personalizada e guarda período, quantidade e escolhas.
- `Pedido` pertence ao usuário e, quando disponível, ao perfil `Cliente`; mantém status, datas, endereço e snapshots de cliente, valores e frete.
- `ItemPedido` congela a descrição, composição, quantidade, período e preço usados na solicitação.
- `Contrato` é uma versão do texto contratual; `AceiteContrato` liga contrato, pedido e usuário e preserva texto, versão, data, IP, user-agent e dados do cliente.
- `ReservaUnidade` liga um item de pedido a uma `UnidadeBrinquedo`, com período e status da reserva.
- `HistoricoPedido` registra mudanças e ações administrativas relevantes.

Relações centrais: carrinho 1:N itens; pedido 1:N itens, reservas e históricos; pedido 1:1 aceite; item de pedido 1:N reservas; reserva N:1 unidade física.

## `clientes`

**Responsabilidade:** representar o perfil comercial do usuário Django.

O modelo `Cliente` possui relação 1:1 com `AUTH_USER_MODEL` e acrescenta nome, telefone e estado ativo. Pedidos e interesses de disponibilidade podem referenciá-lo. Credenciais e flags de staff continuam sob responsabilidade do usuário Django; o perfil não substitui autenticação.

## `entregas`

**Responsabilidade:** interpretar endereço e calcular/administrar a taxa de entrega e retirada.

Modelos principais:

- `RegraFreteBairro` identifica uma localidade normalizada e guarda valor, ativação e observação. A combinação UF/cidade/bairro é única.
- `ConfiguracaoTaxaEntregaRetirada` guarda origem e valor por quilômetro da alternativa baseada em rota, com no máximo uma configuração ativa.

O app também contém providers para ViaCEP e Google Routes e um service que prioriza a regra ativa do bairro. `pedidos` consome esse cálculo e copia o resultado para o pedido; assim, entrega não precisa conhecer carrinho ou contrato.
