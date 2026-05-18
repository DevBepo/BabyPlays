# BABYPLAYS.BRINQUEDOS - Contexto do Projeto

Sistema real de produção para locação de brinquedos e kits de festa.

Funcionalidades principais:
- Site público com catálogo.
- Área do cliente.
- Painel administrativo.
- Produtos avulsos.
- Kits de festas prontos.
- Kits de festas personalizáveis.
- Carrinho.
- Checkout.
- Reserva via WhatsApp e/ou e-mail.
- Frete por bairro.
- Contrato obrigatório antes da confirmação.
- E-mail de confirmação.
- E-mail de lembrete de carrinho abandonado.

Autenticação e carrinho:
- Autenticação oficial usa sessão Django com CSRF, não JWT.
- Endpoints oficiais: POST /api/auth/cadastro/, POST /api/auth/login/, POST /api/auth/logout/, GET /api/auth/me/ e GET /api/auth/csrf/.
- Visitante anônimo pode navegar e montar carrinho.
- Carrinho anônimo usa session_key.
- Após login, carrinho da sessão é reaproveitado pelo usuário autenticado.
- Login é obrigatório para fechar pedido.

Regras de estoque:
- Estoque deve ser controlado por unidade física.
- Um produto pode ter várias unidades.
- Item devolvido não volta automaticamente para disponível.
- Após devolução, item deve entrar em higienização, manutenção ou standby.
- Admin precisa liberar manualmente para voltar ao estoque disponível.

Contrato:
- Cliente deve marcar “li e aceito”.
- Pedido não pode ser confirmado sem contrato aceito.
- Registrar versão do contrato, data/hora, IP, user-agent e texto aceito.

Frete:
- Frete calculado por bairro.
- Entrega feita pela própria empresa.
- Bairro não atendido deve bloquear checkout.

Prioridades:
1. Segurança.
2. Correção das regras de estoque e reserva.
3. Código limpo.
4. Testes.
5. Design intuitivo.
