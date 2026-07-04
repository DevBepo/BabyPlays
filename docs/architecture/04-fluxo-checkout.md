# Fluxo de checkout

## 1. Catálogo

O frontend lista brinquedos e kits publicados pela API. A apresentação pode indicar disponibilidade sem revelar a quantidade de unidades. Preços por período vêm do catálogo mantido no backend.

## 2. Carrinho

Um visitante recebe uma sessão Django e pode adicionar itens ao carrinho associado à `session_key`. Após o login, esse carrinho é reaproveitado pelo usuário. O backend valida tipo de item, período, quantidade, composição de kit e estado do catálogo; o cliente não fecha pedido anonimamente.

## 3. Endereço

O cliente informa CEP, número e complemento. O backend consulta o ViaCEP e forma um endereço interpretado com logradouro, bairro, cidade e UF. Os dados normalizados evitam que diferenças de maiúsculas, espaços ou acentos quebrem a regra de localidade.

## 4. Frete por bairro

O serviço procura uma regra ativa para UF, cidade e bairro. Quando existe valor positivo, a taxa é calculada. Uma regra sem valor indica taxa sujeita a análise. Localidade sem regra ativa é tratada como não atendida e bloqueia o checkout.

## 5. Contrato

O frontend consulta o contrato vigente e exige a marcação de aceite. A conversão envia o identificador e a versão exibida, além de `contrato_aceito=true`. O backend exige aceite explícito e verifica se o contrato ainda é o vigente.

## 6. Revalidação no backend

No momento decisivo, o backend não reutiliza cegamente o resumo da tela. Ele revalida:

- identidade do usuário e posse do carrinho;
- carrinho ativo e não vazio;
- produtos, kits, composições, quantidades e períodos;
- preços atuais e subtotal calculado no servidor;
- datas e disponibilidade das unidades físicas;
- CEP, localidade atendida e taxa de frete;
- contrato vigente e aceite explícito.

Essa revalidação fecha a janela entre a montagem do carrinho e a criação do pedido e reduz manipulação ou dados obsoletos.

## 7. Criação do pedido

A conversão ocorre em transação. O backend cria `Pedido`, `ItemPedido` e `AceiteContrato`, grava snapshots de cliente, endereço, itens, preços, frete e contrato e marca o carrinho como convertido. O pedido nasce em um estado seguro de solicitação; a reserva/confirmação operacional é uma etapa administrativa posterior, com nova validação de disponibilidade.

## 8. WhatsApp

A resposta da API inclui o ID e um resumo de WhatsApp gerado a partir do pedido salvo. O frontend abre o canal com esse texto. Se a abertura do WhatsApp falhar ou for cancelada, o pedido continua registrado; se a API não criar o pedido, não existe mensagem do frontend capaz de substituí-lo.
