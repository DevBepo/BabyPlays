# Plano visual mobile-first — BabyPlays

> Documento de planejamento. Não altera nem substitui a interface em produção. O protótipo usa somente dados fictícios e não executa regras de negócio.

## 1. Resumo do problema visual atual

A análise de `frontend/src` mostra uma base visual pública consistente com a marca, mas com muita informação simultânea em telas estreitas. Na home, hero, busca, filtros, carrosséis, opções de período, preço e ação principal competem por atenção. Os cards têm boa estrutura, porém ficam altos quando todas as variações são exibidas. O carrinho já prevê larguras mobile, mas concentra itens, datas, resumo, erros e finalização no mesmo painel.

No admin, a navegação lateral, os indicadores, filtros, tabelas e muitas ações foram organizados prioritariamente para desktop. A tabela genérica usa rolagem horizontal; em pedidos isso dificulta comparar status, data e cliente. O detalhe do pedido reúne informações importantes em vários painéis, mas falta uma ordem operacional explícita no mobile. Há ainda inconsistência visual entre a linguagem colorida do catálogo e a linguagem neutra do admin.

Para uma cliente final de 45+ anos, os principais riscos são: texto pequeno, alvos de toque próximos, excesso de escolhas por bloco, dependência de rolagem horizontal e pouca distinção entre informação, ação segura e ação crítica.

## 2. Telas prioritárias

### Prioridade 1 — fluxo principal e operação diária

1. Home e catálogo público (`/`).
2. Cards de brinquedo e kit festa.
3. Carrinho e fechamento da reserva.
4. Login, cadastro e recuperação orientada de erros.
5. Admin: painel inicial, listagem de pedidos e detalhe de pedido.

### Prioridade 2 — continuidade do fluxo

1. Detalhe de brinquedo e kit (`/brinquedos/[id]`, `/kits/[id]`).
2. Minha conta e pedidos do cliente.
3. Admin: agenda e entregas.
4. Admin: brinquedos, kits e unidades físicas.

### Prioridade 3 — manutenção e conteúdo

1. Admin: categorias, interesses e contrato.
2. Ajuda e “Como funciona”.
3. Formulários administrativos de criação/edição.

## 3. Proposta de layout mobile

### Estrutura pública

- Cabeçalho compacto com logo, acesso à conta e carrinho; menu secundário dentro de um painel acionável.
- Busca em largura total logo abaixo do cabeçalho, com rótulo visível ou texto de apoio claro.
- Hero mais baixo, com uma mensagem, uma frase de apoio e uma única ação.
- Categorias como chips horizontais roláveis, sem exigir precisão excessiva.
- Catálogo em uma coluna a 360–390 px; a partir de 430 px, manter uma coluna confortável em vez de comprimir dois cards.
- Filtros avançados em painel inferior (“bottom sheet”), com contador e ações “Limpar” e “Ver resultados”.
- Navegação inferior opcional com quatro destinos: Início, Catálogo, Carrinho e Conta. Validar com usuárias antes de implementar.

### Cards de brinquedo e kit

- Imagem 4:3 ou quadrada, nome em no máximo duas linhas, um selo de categoria/status e preço principal.
- Mostrar apenas o período selecionado; demais períodos ficam em seletor simples.
- Preço em bloco compacto, sem ocupar um cartão independente grande.
- Uma ação primária por card: “Adicionar”; link secundário “Ver detalhes”.
- Kit deve informar quantidade de itens e benefício principal, sem listar composição completa.

### Carrinho mobile

- Abrir como painel de tela quase inteira, ancorado na base, com cabeçalho e botão de fechar fixos.
- Itens em cartões compactos; editar período/data em bloco expansível.
- Resumo financeiro curto e sempre identificado como “calculado/confirmado pelo sistema”.
- Rodapé fixo com total e “Continuar para dados”; evitar cobrir conteúdo com `padding-bottom` correspondente.
- Checkout em etapas curtas: 1. Dados, 2. Entrega e datas, 3. Contrato e revisão.
- Contrato deve ser exibido antes da confirmação; aceite obrigatório e validação permanecem no backend.

### Login e cadastro

- Um formulário por tela, sem colunas no mobile.
- Campos com rótulo persistente, ajuda próxima e opção de revelar senha.
- Explicar em uma frase por que o login é necessário para concluir a reserva.
- Erro no topo e no campo correspondente, sem apagar os demais dados digitados.

### Admin mobile

- Cabeçalho fixo com nome da seção e botão de menu; navegação lateral vira gaveta.
- Painel inicial prioriza: pedidos que exigem ação, entregas do dia, devoluções/higienização e alertas.
- Indicadores financeiros e contadores em cartões menores, com rótulo de 12–13 px e valor de 20–24 px.
- Listagem de pedidos vira cards no mobile; tabela permanece disponível em telas maiores.
- Detalhe do pedido começa com status, próxima ação permitida e alertas; depois cliente/endereço, itens, datas, valores e histórico.
- Ações críticas não ficam lado a lado com ações comuns; confirmação explícita e rastro de auditoria continuam obrigatórios.

## 4. Breakpoints sugeridos

| Faixa | Uso sugerido |
|---|---|
| 0–359 px | Suporte mínimo: uma coluna, 16 px laterais, sem conteúdo essencial truncado. |
| 360–429 px | Mobile principal; validar especialmente 360 e base de 390 px. |
| 430–767 px | Mobile amplo; pode ampliar imagem e colocar pares de indicadores, sem forçar dois cards de catálogo. |
| 768–1023 px | Tablet; duas colunas de catálogo e navegação adaptada. |
| 1024–1279 px | Desktop compacto; sidebar admin e tabelas retornam. |
| 1280 px+ | Desktop amplo atual, com limites de largura para leitura. |

Usar media queries por necessidade do conteúdo, não por modelo de aparelho. Evitar orientação como requisito.

## 5. Tipografia

- Fonte de interface: sistema/Arial como fallback; manter Fredoka apenas em títulos de marca, caso já carregada pelo projeto.
- Corpo: 16 px, altura de linha 1,5; texto auxiliar nunca abaixo de 13 px.
- Labels: 14 px, peso 600; títulos de card: 18 px; H1 mobile: 28–32 px.
- Valores: 20–24 px nos resumos e 18–20 px nos cards. Evitar valores gigantes que dominem a tela.
- Não usar caixa alta em frases; caixa alta apenas em micro-rótulos curtos, com espaçamento moderado.
- Texto deve suportar zoom de 200% sem perda de ação ou conteúdo.

## 6. Espaçamento

- Escala base: 4, 8, 12, 16, 24, 32 e 40 px.
- Margem lateral: 16 px em 360/390; 20 px em 430.
- Espaço entre seções: 32 px; entre cartões: 16 px; dentro de cartões: 16 px.
- Elementos relacionados ficam a 8 px; grupos diferentes a 16–24 px.
- Respeitar `safe-area-inset-bottom` em rodapés fixos.

## 7. Cards

- Raio entre 16 e 20 px; borda visível de 1 px e sombra discreta.
- Um card deve representar uma entidade ou decisão, não uma linha decorativa.
- Ordem: contexto/status, título, informação principal, preço/valor e ação.
- Cards de valores: altura curta, fundo neutro, sem ícones decorativos obrigatórios; no máximo dois por linha em 390 px.
- Estados selecionado, indisponível e foco não podem depender somente de cor.

## 8. Botões

- Altura mínima de 48 px para ações primárias e 44 px para controles compactos; área de toque mínima 44×44 px.
- Rótulos com verbo e resultado: “Adicionar ao carrinho”, “Revisar reserva”, “Confirmar pedido”.
- Uma ação primária por região. Secundária com contorno; destrutiva em vermelho e separada.
- Loading preserva a largura e informa a ação (“Salvando…”). Desabilitado deve manter contraste legível e explicar o motivo quando necessário.
- Foco visível de pelo menos 2 px; não remover outline sem substituto acessível.

## 9. Formulários

- Uma coluna até 767 px. Labels sempre visíveis; placeholder não substitui label.
- Campos com 48–52 px, fonte de 16 px para evitar zoom automático em navegadores móveis.
- Teclado adequado (`email`, `tel`, `numeric`) e autocomplete sem expor dados sensíveis.
- Erro objetivo abaixo do campo e resumo no topo quando houver múltiplos erros.
- Checkbox do contrato com toda a linha clicável e texto completo; não pré-selecionar.
- Datas de locação e bairro precisam informar que disponibilidade e frete serão recalculados pelo backend.
- Nunca usar o frontend como autoridade para preço, frete, contrato ou disponibilidade.

## 10. Tabelas no admin

- Até 767 px, substituir tabelas de pedidos por cards semânticos; não apenas esconder colunas.
- Cada card mostra: número, status, cliente abreviado/permitido, data relevante, total e próxima ação.
- Filtros viram painel expansível com resumo dos filtros ativos.
- Tabelas realmente matriciais (por exemplo, comparação de períodos) podem usar rolagem horizontal com primeira coluna fixa e indicação visual de rolagem.
- Em 768–1023 px, reduzir colunas e mover dados secundários para expansão de linha.
- Em 1024 px+, tabela completa; cabeçalho fixo, paginação e ações agrupadas.

## 11. Estados de interface

- Vazio: explicar o que falta e oferecer uma ação útil, quando existir.
- Carregamento: skeleton com estrutura semelhante ao conteúdo; nunca simular resultado final.
- Erro: mensagem humana, ação “Tentar novamente” e nenhum detalhe técnico sensível.
- Sucesso: confirmação curta próxima da ação, sem depender apenas de toast temporário.
- Offline/instabilidade: preservar dados preenchidos sempre que possível.

## 12. Riscos de implementação

- Alterar a densidade dos cards pode esconder períodos ou condições importantes.
- Rodapés fixos podem cobrir campos, teclado ou mensagens de erro.
- Transformar tabela em card pode criar duas árvores de marcação e divergência de conteúdo.
- Gavetas e modais podem falhar em foco, retorno de foco, Escape e leitura por tecnologia assistiva.
- Breakpoints podem conflitar com classes Tailwind existentes e componentes compartilhados.
- Imagens sem proporção reservada podem causar deslocamento de layout.
- Estados locais do carrinho podem se perder ao trocar entre etapas.
- A simplificação visual nunca pode antecipar confirmação de preço, frete, estoque ou contrato no cliente.
- Mudanças em admin exigem validar permissões e não expor dados de clientes em markup público.

## 13. Plano de implementação em pequenas etapas

1. **Fundação:** inventário de componentes, tokens de espaçamento/tipografia e testes visuais em 360/390/430 px.
2. **Cabeçalho e navegação pública:** header, busca e filtros, sem alterar regras do catálogo.
3. **Catálogo:** card de brinquedo, card de kit e estados vazio/loading/erro.
4. **Carrinho:** painel mobile, itens e resumo; preservar sessão, CSRF e serviços atuais.
5. **Checkout:** dividir visualmente em etapas, sem mover validações críticas do backend.
6. **Autenticação e conta:** login, cadastro, feedback e pedidos do cliente.
7. **Fundação admin:** cabeçalho/gaveta e cartões de indicadores.
8. **Pedidos admin:** listagem responsiva e filtros; depois detalhe e ordem operacional.
9. **Demais telas admin:** agenda, entregas, catálogo, kits, unidades e contrato.
10. **Qualidade:** acessibilidade, teclado, zoom, leitores de tela, desempenho e regressão desktop.

Cada etapa deve ter PR pequeno, screenshots nos três tamanhos móveis e testes das regras críticas afetadas.

## 14. Critérios de aceite

- Sem rolagem horizontal da página em 360, 390 e 430 px.
- Conteúdo e ações principais funcionam a 200% de zoom.
- Texto de corpo tem 16 px; texto auxiliar tem no mínimo 13 px.
- Ações principais possuem pelo menos 48 px de altura e controles pelo menos 44×44 px.
- Foco visível, ordem de tabulação lógica e gavetas com gerenciamento de foco.
- Catálogo apresenta nome, disponibilidade, período/preço e ação sem ambiguidade.
- Carrinho mostra itens, datas/período, frete, total e erros sem esconder conteúdo sob rodapé fixo.
- Checkout não confirma sem login, disponibilidade, bairro atendido e contrato aceito, sempre validados pelo backend.
- Admin mobile permite identificar status e próxima ação de um pedido sem rolagem horizontal.
- Ações destrutivas/críticas são separadas e pedem confirmação adequada.
- Estados vazio, loading, erro e sucesso existem nas telas assíncronas.
- Nenhum dado real de cliente é usado em desenvolvimento visual, testes ou documentação.
- Desktop não sofre regressão visual ou funcional.
- Validação humana com pelo menos uma usuária representativa de 45+ anos conclui busca, adição ao carrinho e leitura de um pedido admin sem orientação.

## 15. Pontos para aprovação humana

- Navegação inferior pública ou apenas cabeçalho/menu.
- Uso definitivo da paleta e intensidade das cores no admin.
- Ordem e nomes das etapas do checkout.
- Quais indicadores aparecem primeiro no painel admin.
- Conteúdo textual do contrato e mensagens legais (fora do escopo visual).
- Teste de legibilidade, confiança e facilidade com usuárias reais de 45+ anos.
