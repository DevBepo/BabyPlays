# Security Checklist - BABYPLAYS.BRINQUEDOS

Este checklist deve ser usado em toda tarefa que altera backend, frontend, banco, autenticação, pedidos, estoque, contrato, e-mails ou deploy.

Referências:
- OWASP ASVS
- OWASP Top 10
- Django Deployment Checklist
- Django Security Documentation
- Django REST Framework Authentication & Permissions

## 1. Autenticação

- [ ] Rotas privadas exigem usuário autenticado.
- [ ] Rotas administrativas exigem usuário admin/staff.
- [ ] Login possui proteção contra força bruta/rate limit.
- [ ] Senhas nunca são armazenadas em texto puro.
- [ ] Senhas usam hash seguro do Django.
- [ ] Reset de senha, se existir, usa token com expiração.
- [ ] Autenticação oficial usa Django SessionAuthentication com cookies de sessão.
- [ ] CSRF é obrigatório em métodos mutáveis autenticados por sessão.
- [ ] Session id, CSRF token e cookies não aparecem em logs.
- [ ] Logout invalida sessão corretamente.
- [ ] Usuário inativo não consegue acessar o sistema.

## 2. Autorização e permissões

- [ ] Cliente só acessa os próprios dados.
- [ ] Cliente não acessa pedidos de outro cliente.
- [ ] Cliente não acessa dados administrativos.
- [ ] Admin acessa somente endpoints realmente administrativos.
- [ ] Endpoints de criação, edição e exclusão têm permissões explícitas.
- [ ] Permissões são validadas no backend, não apenas no frontend.
- [ ] IDs enviados pela URL não permitem acesso indevido a objetos de terceiros.
- [ ] Existe teste para acesso negado quando necessário.

## 3. Validação de entrada

- [ ] Todo dado vindo do usuário é validado no backend.
- [ ] Serializers/forms validam campos obrigatórios.
- [ ] Campos monetários não são aceitos cegamente do frontend.
- [ ] Preço, frete, desconto e disponibilidade são calculados no backend.
- [ ] Datas de locação são validadas.
- [ ] Data final não pode ser anterior à data inicial.
- [ ] Bairro precisa existir e estar ativo para calcular frete.
- [ ] Produto/kit precisa estar ativo para entrar no carrinho.
- [ ] Upload de imagem valida tipo, tamanho e extensão.
- [ ] Campos de texto possuem limite de tamanho.

## 4. Estoque e reservas

- [ ] Sistema impede overbooking.
- [ ] Reserva usa transação no banco quando altera estoque/pedido.
- [ ] Disponibilidade considera unidades físicas, não apenas quantidade total.
- [ ] Unidade indisponível, higienizando, manutenção ou standby não pode ser reservada.
- [ ] Item devolvido não volta automaticamente para disponível.
- [ ] Admin precisa liberar manualmente item devolvido.
- [ ] Cancelamento de pedido libera unidades corretamente, quando aplicável.
- [ ] Alteração de datas revalida disponibilidade.
- [ ] Confirmação do pedido revalida disponibilidade.
- [ ] Existem testes para conflito de datas.
- [ ] Existem testes para múltiplas unidades do mesmo produto.
- [ ] Existem testes para devolução e higienização/standby.

## 5. Contrato e aceite

- [ ] Pedido não pode ser confirmado sem contrato aceito.
- [ ] Cliente precisa aceitar a versão ativa do contrato.
- [ ] Aceite registra data e hora.
- [ ] Aceite registra IP.
- [ ] Aceite registra user-agent.
- [ ] Aceite registra usuário/cliente.
- [ ] Aceite registra pedido.
- [ ] Aceite preserva o texto ou snapshot da versão aceita.
- [ ] Mudanças futuras no contrato não alteram contratos já aceitos.
- [ ] Checkbox de aceite é obrigatório no frontend e validado no backend.
- [ ] Existe teste impedindo confirmação sem aceite.

## 6. Carrinho e checkout

- [ ] Carrinho pertence a um cliente/sessão identificável.
- [ ] Carrinho anônimo usa session_key.
- [ ] Carrinho da sessão é reaproveitado após login.
- [ ] Cliente não consegue manipular carrinho de outro cliente.
- [ ] Login é obrigatório para fechar pedido.
- [ ] Valores do carrinho são recalculados no backend.
- [ ] Frete por bairro é calculado no backend.
- [ ] Bairro não atendido bloqueia checkout.
- [ ] Pedido criado começa em status seguro, como draft ou awaiting_contract.
- [ ] Pedido não pula etapas obrigatórias.
- [ ] Kits personalizados validam disponibilidade de todos os itens.
- [ ] Kits prontos validam disponibilidade de todos os itens.
- [ ] O resumo enviado por WhatsApp/e-mail usa dados salvos no backend.

## 7. E-mails e notificações

- [ ] E-mails não expõem dados sensíveis desnecessários.
- [ ] E-mail de confirmação só é enviado quando o pedido está no status correto.
- [ ] E-mail interno de nova reserva não duplica envio.
- [ ] Lembrete de carrinho abandonado possui regra de tempo clara.
- [ ] Lembrete de carrinho abandonado não envia repetidamente sem controle.
- [ ] Existe registro de notificações enviadas.
- [ ] Templates de e-mail escapam dados do usuário.
- [ ] Configurações SMTP ficam em variáveis de ambiente.
- [ ] Erros de envio são logados sem vazar segredos.

## 8. API Django REST Framework

- [ ] Todo endpoint tem permission_classes explícito.
- [ ] ViewSets filtram queryset conforme usuário autenticado.
- [ ] Admin endpoints não aparecem para cliente comum.
- [ ] Serializers não expõem campos internos desnecessários.
- [ ] Campos como is_staff, is_superuser, status crítico e preço final não podem ser alterados por cliente.
- [ ] Paginação existe em listas grandes.
- [ ] Filtros não permitem vazamento de dados entre clientes.
- [ ] Métodos perigosos como PATCH/DELETE são restritos.
- [ ] Erros retornam mensagens seguras e compreensíveis.

## 9. Frontend Next.js

- [ ] Frontend não guarda segredos.
- [ ] Variáveis públicas usam apenas prefixo seguro e conteúdo não sensível.
- [ ] Telas administrativas são protegidas.
- [ ] Requisições autenticadas enviam cookies com credentials: "include".
- [ ] Frontend não decide preço final, frete final ou disponibilidade final.
- [ ] Contrato é exibido antes da confirmação.
- [ ] Checkbox de contrato não substitui validação no backend.
- [ ] Mensagens de erro não expõem detalhes internos.
- [ ] Formulários tratam loading, erro e sucesso.
- [ ] Dados de cliente não aparecem no HTML público indevidamente.

## 10. Dados sensíveis e LGPD

- [ ] Coletar somente dados necessários.
- [ ] Não expor telefone, e-mail e endereço em rotas públicas.
- [ ] Logs não devem conter documentos, senhas, session id, CSRF token, cookies ou dados sensíveis desnecessários.
- [ ] Admin deve conseguir localizar histórico de aceite do contrato.
- [ ] Admin deve conseguir anonimizar ou excluir cliente quando necessário.
- [ ] Política de privacidade deve existir antes da produção.
- [ ] Backups precisam ser protegidos.
- [ ] Acesso ao banco de produção deve ser restrito.

## 11. Configuração de produção Django

- [ ] DEBUG=False em produção.
- [ ] SECRET_KEY vem de variável de ambiente.
- [ ] ALLOWED_HOSTS configurado corretamente.
- [ ] CSRF_TRUSTED_ORIGINS configurado.
- [ ] Banco de produção não usa SQLite.
- [ ] CORS restrito aos domínios reais.
- [ ] HTTPS ativo.
- [ ] Cookies seguros em produção.
- [ ] SESSION_COOKIE_SECURE=True.
- [ ] CSRF_COOKIE_SECURE=True.
- [ ] Cookies de sessão/CSRF usam HttpOnly, Secure e SameSite conforme aplicável.
- [ ] SECURE_SSL_REDIRECT=True quando HTTPS estiver configurado.
- [ ] SECURE_HSTS_SECONDS configurado após validar HTTPS.
- [ ] SECURE_CONTENT_TYPE_NOSNIFF=True.
- [ ] X_FRAME_OPTIONS configurado.
- [ ] Rodar `python manage.py check --deploy` antes de publicar.

## 12. Banco de dados

- [ ] Migrations revisadas antes de aplicar em produção.
- [ ] Campos críticos possuem constraints.
- [ ] Índices existem para buscas frequentes.
- [ ] Não há dados mockados em produção.
- [ ] Valores monetários usam Decimal, não float.
- [ ] Datas usam timezone-aware datetime.
- [ ] Operações críticas usam transaction.atomic.
- [ ] Backup automático configurado.
- [ ] Restauração de backup foi testada pelo menos uma vez.

## 13. Deploy em VPS

- [ ] Servidor atualizado.
- [ ] Usuário root não é usado para rodar aplicação.
- [ ] Firewall ativo.
- [ ] Somente portas necessárias abertas: 80, 443 e SSH.
- [ ] SSH com senha desativada, se possível.
- [ ] Nginx configurado como reverse proxy.
- [ ] Gunicorn/Uvicorn rodando via systemd.
- [ ] Logs com rotação configurada.
- [ ] Certificado HTTPS válido.
- [ ] Renovação automática do certificado testada.
- [ ] Variáveis de ambiente protegidas.
- [ ] Banco não exposto publicamente.
- [ ] Backups automáticos configurados.

## 14. Logs, erros e auditoria

- [ ] Erros internos não mostram stack trace ao usuário.
- [ ] Logs registram eventos importantes sem dados sensíveis.
- [ ] Registrar eventos de:
  - login;
  - falha de login;
  - criação de pedido;
  - aceite de contrato;
  - confirmação de pedido;
  - alteração de status;
  - devolução;
  - liberação de item para estoque;
  - cancelamento.
- [ ] Admin actions críticas deixam rastro.
- [ ] Logs possuem rotação.
- [ ] Existe forma de investigar um problema de pedido sem acessar dados sensíveis desnecessários.

## 15. Testes obrigatórios

Antes de aceitar uma tarefa crítica, verificar se existem testes para:

- [ ] Cliente não acessa dados de outro cliente.
- [ ] Cliente não acessa endpoint admin.
- [ ] Pedido não confirma sem contrato.
- [ ] Pedido não confirma sem disponibilidade.
- [ ] Produto com múltiplas unidades respeita limite.
- [ ] Sistema bloqueia overbooking.
- [ ] Devolução manda item para higienização/standby.
- [ ] Admin libera item manualmente.
- [ ] Frete por bairro é calculado corretamente.
- [ ] Bairro não atendido bloqueia checkout.
- [ ] E-mail não duplica envio.
- [ ] Campos de preço/frete enviados pelo frontend são ignorados ou recalculados.

## 16. Checklist antes de produção

- [ ] Todos os testes passam.
- [ ] `python manage.py check --deploy` executado.
- [ ] DEBUG=False.
- [ ] Domínio real configurado.
- [ ] HTTPS ativo.
- [ ] Backup configurado.
- [ ] Restore de backup testado.
- [ ] Admin com senha forte.
- [ ] Usuários de teste removidos.
- [ ] Dados fake removidos.
- [ ] Logs revisados.
- [ ] Política de privacidade publicada.
- [ ] Contrato final cadastrado.
- [ ] E-mails testados.
- [ ] Fluxo completo testado:
  - catálogo;
  - carrinho;
  - frete;
  - contrato;
  - pedido;
  - confirmação;
  - entrega;
  - devolução;
  - higienização;
  - liberação de estoque.
