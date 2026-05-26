# Trilha de Estudo BabyPlays

Material interno baseado no histórico real de commits do projeto BabyPlays.

Esta trilha não é documentação genérica. Cada módulo aponta para commits, arquivos, classes, serviços, serializers, views e testes do próprio repositório.

## Como Estudar

1. Leia o módulo em ordem.
2. Abra o commit indicado com `git show <hash>`.
3. Compare o diff do commit com o estado atual do arquivo.
4. Rode os testes citados quando quiser validar a regra no backend.
5. Use os exercícios como revisão de engenharia, não como tarefas de produto.

## Módulos

- `01-fundacao-backend-catalogo.md`: Django, DRF, CORS, settings e primeira API de catálogo.
- `02-catalogo-estoque-e-midia.md`: unidade física, categoria, catálogo público seguro e imagens.
- `03-kits-e-regras-de-selecao.md`: kits prontos, kits personalizáveis e validação de seleção.
- `04-carrinho-pedido-entrega-contrato.md`: carrinho, pedido, frete por distância, snapshots e contrato.
- `05-reservas-ciclo-operacional.md`: disponibilidade por período, reserva de unidades, confirmação, locação e retirada.
- `06-clientes-sessao-csrf.md`: clientes, login por sessão Django, CSRF, remoção de JWT e proteção staff.
- `07-nextjs-typescript-integracao.md`: frontend Next.js, TypeScript, cliente HTTP, sessão, catálogo e carrinho inicial.
- `08-painel-admin-agenda.md`: painel administrativo, integração de pedidos, ações admin e agenda operacional.
- `09-apendices.md`: mapa mental, perguntas de entrevista, portfólio, débitos técnicos e plano de revisão de 14 dias.

## Cobertura do Histórico

### Fundação e catálogo

- `7b184a4`: estrutura monorepo e modelo base de brinquedos.
- `2002579`: configuração e CORS.
- `a60e2bb`: correção de sintaxe do modelo `Brinquedo` e primeira migration.
- `f77b1cd`: API REST de brinquedos.
- `8b82a77`: camada de serviço e permissões do `BrinquedoViewSet`.
- `51f8ebf`: configuração de ambiente e documentação de segurança.
- `67aac45`: testes de autenticação e validação da API de brinquedos.

### Catálogo, estoque físico e mídia

- `bae215b`: `UnidadeBrinquedo` e contagem disponível.
- `9fdde91`: separação entre status de catálogo e estoque.
- `70dc172`: correção para ocultar brinquedos inativos.
- `187e056`: categorias.
- `272da36`: ocultação de campos internos na API pública.
- `62bf4f2`: imagens seguras.

### Kits

- `ada8783`: `KitFesta` e `ItemKitFesta`.
- `5c393e5`: configuração de kits personalizáveis.
- `93e1ac8`: validação de seleção dos kits personalizáveis.

### Carrinho, pedidos, entrega e contrato

- `7ad2e9c`: carrinho inicial.
- `a524126`: pedidos e validação de dados do cliente.
- `b2bcfbc`: ocultação de snapshot interno.
- `f1e8a6f`: taxa de entrega e retirada por distância.
- `ed5c440`: provider Google Routes.
- `2c50443`: integração da taxa na conversão do carrinho.
- `13464c8`: contrato vigente e aceite.

### Reserva e operação

- `5ca95fe`: disponibilidade por período.
- `179ff89`: período de locação no pedido.
- `aa5286e`: reserva de unidades físicas.
- `2ed40c5`: confirmação administrativa.
- `9040731`: início e retirada da locação.
- `c769c2a`: liberação manual de unidades.
- `33f8c10`: correção das ações disponíveis do pedido.

### Clientes, sessão e CSRF

- `d5bc892`: base inicial de clientes.
- `a098e76`: pedido vinculado ao cliente e login obrigatório no checkout.
- `a0e6c5b`: cadastro e autenticação por sessão.
- `eeb170a`: remoção de JWT e consolidação da autenticação oficial.
- `b4ba3c7`: proteção de painel admin por sessão staff.
- `059c913`: login de staff sem cliente.
- `a9be2e2`: correção de logout de sessões Django.

### Frontend e painel

- `3f2019f`: componentização inicial do Next.js.
- `b9a9a92`: cliente HTTP com sessão e CSRF.
- `e4c32d1`: login integrado com sessão Django.
- `7d2d755`: catálogo com busca conectado à API.
- `3988c20`: melhorias do cabeçalho.
- `6aa031a`: telas iniciais do painel admin ainda sem API.
- `7140aaa`: commit repetido sem diff material.
- `0083e30`: usabilidade inicial no Django Admin.
- `52b1c7a`: actions seguras no Django Admin.
- `391e203`: logo nas telas.
- `683802e`: merge sem diff próprio.
- `f960611`: tela de registro e contador local de carrinho.
- `d262675`: API backend de listagem e detalhe admin de pedidos.
- `1b5a814`: listagem admin de pedidos conectada.
- `8f0b85a`: detalhe admin real.
- `b60d932`: ações admin de pedido conectadas.
- `b1f3b0a`: correção do login frontend para staff sem cliente.
- `bf44c80`: correção de redirecionamento pós-login admin.
- `65528b4`: correção do guard do painel admin.
- `ebc1814`: padronização local em `127.0.0.1`.
- `f25940f`: ajuste de exibição da logo.
- `ca06f91`: ajuste de favicon.
- `74b69c7`: tela semanal da agenda operacional.
- `dba6094`: endpoint backend da agenda.
- `02a9e10`: melhoria visual da agenda operacional.
