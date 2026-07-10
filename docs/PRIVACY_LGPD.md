# Privacidade e LGPD - Politica Tecnica Preliminar

Este documento e uma base tecnica para operacao segura do BabyPlays. Ele nao substitui revisao juridica ou validacao operacional antes de atender clientes reais.

## Dados tratados

A aplicacao pode armazenar:

- nome, e-mail e telefone do cliente;
- endereco de entrega e complemento;
- dados de pedido, carrinho, itens, valores, frete e historico operacional;
- aceite de contrato, versao, data/hora, IP e user-agent;
- mensagens ou observacoes fornecidas pelo cliente;
- registros administrativos necessarios para operacao, suporte e auditoria.

## Finalidades

Os dados devem ser usados somente para:

- cadastro e autenticacao do cliente;
- montagem de carrinho e solicitacao de locacao;
- calculo de entrega e disponibilidade;
- execucao, suporte, auditoria e historico de pedidos;
- comprovacao de aceite contratual;
- comunicacao operacional sobre pedidos e atendimento.

## Minimizacao

Colete apenas dados necessarios para o fluxo operacional. Nao registre senhas, session ids, tokens CSRF, cookies ou dados pessoais desnecessarios em logs.

## Retencao

A retencao deve ser definida pelo responsavel juridico/operacional considerando obrigacoes contratuais, fiscais, suporte e auditoria. Dados que nao forem mais necessarios devem ser excluidos ou anonimizados quando cabivel.

## Exclusao e anonimizacao

Antes da producao real, o mantenedor deve definir um procedimento para:

- confirmar identidade do titular solicitante;
- localizar dados em usuarios, clientes, pedidos, contratos, logs e backups;
- excluir dados quando legalmente possivel;
- anonimizar historico operacional quando a exclusao integral afetar obrigacoes legais ou antifraude;
- registrar internamente a data e o resultado da solicitacao.

## Compartilhamento e provedores

Dados podem trafegar por provedores tecnicos necessarios a hospedagem, banco de dados, mapas/rotas, e-mail ou atendimento, conforme configuracao de producao. Cada provedor deve ser revisado antes de operar com dados reais.

## Contato do titular

Defina e publique um canal oficial para solicitacoes de privacidade antes de producao real, como e-mail ou formulario operacional.

## Pendencias antes de producao

- revisao juridica da politica publica de privacidade;
- definicao formal de retencao por categoria de dado;
- processo documentado de exclusao/anonimizacao;
- revisao de logs e backups;
- validacao de contratos com provedores.
