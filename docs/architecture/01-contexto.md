# Contexto do BabyPlays

## O que é

O BabyPlays é um sistema de locação de brinquedos e kits para festas. Ele reúne catálogo público, carrinho, checkout, área do cliente e operação administrativa. O sistema registra pedidos, aceite contratual, entrega e retirada, além de controlar o estoque por unidade física.

## Usuários

- **Visitante:** consulta o catálogo e monta um carrinho anônimo associado à sessão.
- **Cliente autenticado:** conclui a solicitação, aceita o contrato e acompanha os próprios pedidos.
- **Equipe administrativa (staff):** mantém catálogo, kits, regras de frete e contrato; analisa pedidos; reserva unidades; acompanha agenda, locação e retirada.

## Problemas resolvidos

- Publicação de brinquedos, imagens, períodos e preços de locação.
- Composição de kits prontos e personalizáveis.
- Continuidade do carrinho antes e depois do login.
- Cálculo consistente de preço e frete sem confiar no navegador.
- Prevenção de conflito de reservas por unidade física e intervalo de datas.
- Evidência do contrato efetivamente aceito pelo cliente.
- Organização operacional de entrega, locação, devolução e preparação do item.

## Principais fluxos de negócio

1. O visitante consulta brinquedos e kits ativos e adiciona escolhas ao carrinho.
2. Ao entrar, o carrinho da sessão é associado ao usuário; autenticação é obrigatória para concluir.
3. O cliente informa datas e endereço. O backend consulta o CEP e procura uma regra ativa para o bairro.
4. O cliente lê e aceita a versão vigente do contrato.
5. O backend revalida itens, preços, datas, disponibilidade, endereço, frete e contrato e cria o pedido com snapshots dos dados relevantes.
6. O frontend abre o WhatsApp com o resumo produzido pelo backend; isso inicia o contato, mas não substitui o pedido persistido.
7. A equipe administrativa reserva unidades físicas e conduz o pedido pelos estados operacionais.
8. Depois da devolução, a unidade segue para higienização, manutenção ou standby e só volta a ficar disponível por ação administrativa.

O BabyPlays separa a **solicitação do cliente** da **confirmação operacional**. Criar o pedido não significa que a locação já foi confirmada ou que uma unidade possa ser usada em duas reservas.
