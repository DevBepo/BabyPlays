# Instruções para agentes de código

Antes de qualquer alteração, leia:

- docs/PROJECT_CONTEXT.md
- docs/CODEX_RULES.md
- docs/SECURITY_CHECKLIST.md

Projeto: BABYPLAYS.BRINQUEDOS

Stack:
- Backend: Django + Django REST Framework
- Frontend: Next.js + TypeScript
- Banco: PostgreSQL
- Deploy provável: VPS Hostinger/HostGator 2GB ou 4GB

Regras obrigatórias:
- Não implementar tudo de uma vez.
- Trabalhar em mudanças pequenas.
- Não refatorar partes fora do escopo.
- Não criar lógica falsa apenas para parecer funcionando.
- Toda regra crítica deve ter teste.
- Toda validação importante deve existir no backend.
- Nunca confiar apenas no frontend.
- Antes de editar, explique o plano.
- Depois de editar, liste arquivos alterados, testes e riscos restantes.