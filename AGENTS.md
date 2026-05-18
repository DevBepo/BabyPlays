# AGENTS.md

Leia estes arquivos quando forem relevantes:
- docs/PROJECT_CONTEXT.md
- docs/CODEX_RULES.md
- docs/SECURITY_CHECKLIST.md

Projeto BABYPLAYS.BRINQUEDOS.

Stack:
- Backend: Django + Django REST Framework
- Frontend: Next.js + TypeScript
- Banco: PostgreSQL
- Deploy provável: VPS Hostinger/HostGator 2GB ou 4GB

Regras:
- Trabalhe em mudanças pequenas.
- Não implemente funcionalidades futuras sem pedido.
- Não refatore partes fora do escopo.
- Autenticação oficial usa Django sessions + CSRF.
- Não introduza JWT sem solicitação explícita.
- Valide regras críticas no backend.
- Toda regra crítica precisa de teste.
- Cliente só acessa os próprios dados.
- Admin tem rotas próprias protegidas.
- Estoque é por unidade física.
- Item devolvido vai para higienização/standby e não volta automaticamente para disponível.
- Pedido não confirma sem contrato aceito.
- Preço, frete e disponibilidade são calculados no backend.
