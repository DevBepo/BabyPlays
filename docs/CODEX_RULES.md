# Regras de Engenharia para Codex

Sempre:
- Fazer mudanças pequenas.
- Criar ou atualizar testes.
- Usar services para regra de negócio pesada.
- Usar serializers/forms para validação de entrada.
- Usar transaction.atomic em reservas, confirmação e baixa de estoque.
- Preservar SessionAuthentication como autenticação oficial.
- Respeitar CSRF em fluxos autenticados por sessão.
- Proteger endpoints com autenticação e permissão.
- Usar IsAuthenticated nos fluxos que exigem login.
- Garantir que cliente só acesse seus próprios dados.
- Garantir que admin acesse rotas administrativas.
- Manter carrinho anônimo por sessão preservado até autenticação.
- Usar variáveis de ambiente para segredos.
- Evitar dados sensíveis em logs.

Nunca:
- Confirmar pedido sem contrato aceito.
- Permitir overbooking.
- Voltar item devolvido automaticamente para disponível.
- Criar endpoint administrativo sem permissão.
- Criar endpoint JWT sem pedido explícito.
- Confiar em preço, frete ou disponibilidade enviados pelo frontend.
- Refatorar arquivos não relacionados sem autorização.
