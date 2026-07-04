# Decisões arquiteturais

Estas ADRs resumidas descrevem decisões observadas no sistema atual.

## ADR-001 — Django monolítico modular

**Status:** aceita.

**Decisão:** manter catálogo, pedidos, clientes e entregas como apps no mesmo projeto Django e banco relacional.

**Motivo e consequências:** o domínio e a equipe ainda se beneficiam de deploy simples, transações locais e regras compartilhadas. Os limites por app preservam organização sem o custo operacional de microsserviços. O risco é acoplamento interno; services e relações explícitas devem manter as fronteiras legíveis.

## ADR-002 — Estoque por unidade física

**Status:** aceita.

**Decisão:** representar cada exemplar como `UnidadeBrinquedo` e reservar unidades específicas.

**Motivo e consequências:** locação depende de identidade, condição e agenda de cada peça, não apenas de uma quantidade agregada. Isso permite evitar overbooking e rastrear higienização/manutenção. Em troca, reserva e mudança de status exigem transações e revalidação cuidadosas.

## ADR-003 — Backend como fonte de verdade no checkout

**Status:** aceita.

**Decisão:** calcular e revalidar preço, frete, contrato, datas e disponibilidade no backend ao converter o carrinho.

**Motivo e consequências:** o navegador não é confiável e seus dados podem estar obsoletos. A API ignora decisões comerciais fornecidas pelo cliente e grava snapshots auditáveis. Isso duplica parte da apresentação no frontend, mas mantém a regra crítica em um único lugar confiável.

## ADR-004 — Frete atual por bairro

**Status:** aceita; Google Routes permanece opcional.

**Decisão:** usar regras administrativas por UF/cidade/bairro como mecanismo vigente, sem tornar Google Routes obrigatório.

**Motivo e consequências:** a operação consegue definir valores previsíveis e cobertura sem depender de custo, quota ou disponibilidade de uma API externa. ViaCEP identifica a localidade; Google Routes pode apoiar uma evolução baseada em distância. Regras precisam ser mantidas e bairros não cadastrados são bloqueados ou tratados conforme a regra operacional.

## ADR-005 — Painel administrativo próprio além do Django Admin

**Status:** aceita.

**Decisão:** manter telas Next.js e endpoints próprios para atividades diárias, sem remover o Django Admin.

**Motivo e consequências:** a equipe recebe jornadas adequadas a pedidos, agenda, catálogo, contrato e entregas; o Django Admin continua útil para manutenção técnica. Existem duas superfícies administrativas, portanto ambas precisam de autorização de staff e consistência de regras no backend.

## ADR-006 — Ocultar quantidade de unidades do cliente

**Status:** aceita.

**Decisão:** expor disponibilidade comercial, não a contagem interna de unidades físicas.

**Motivo e consequências:** o cliente precisa saber se pode solicitar, enquanto quantidade, códigos e estados das unidades são detalhes operacionais e comercialmente sensíveis. A ocultação reduz exposição, mas não é mecanismo de estoque: a disponibilidade real continua sendo validada no backend.
