# Regras de Engenharia para Codex

Sempre:
- Fazer mudanças pequenas.
- Criar ou atualizar testes.
- Usar services para regra de negócio pesada.
- Usar serializers/forms para validação de entrada.
- Usar transaction.atomic em reservas, confirmação e baixa de estoque.
- Proteger endpoints com autenticação e permissão.
- Garantir que cliente só acesse seus próprios dados.
- Garantir que admin acesse rotas administrativas.
- Usar variáveis de ambiente para segredos.
- Evitar dados sensíveis em logs.

Nunca:
- Confirmar pedido sem contrato aceito.
- Permitir overbooking.
- Voltar item devolvido automaticamente para disponível.
- Criar endpoint administrativo sem permissão.
- Confiar em preço, frete ou disponibilidade enviados pelo frontend.
- Refatorar arquivos não relacionados sem autorização.