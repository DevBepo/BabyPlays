# Segurança, sessões e autoridade dos dados

## Autenticação

O sistema usa o usuário do Django e `SessionAuthentication` do Django REST Framework. Cadastro e login criam uma sessão no servidor e o navegador mantém o cookie correspondente. Não há JWT no fluxo oficial. O endpoint de identidade permite ao frontend descobrir o usuário atual sem transformar o frontend em autoridade de autenticação.

## Sessão Django

A sessão também dá identidade temporária ao carrinho anônimo. No login, o carrinho da sessão pode ser associado ao usuário. Em ambiente local, misturar `localhost` e `127.0.0.1` quebra a continuidade esperada de cookies; nos ambientes online, frontend e API precisam de configuração de cookie compatível com HTTPS e origens distintas.

## CSRF

Como cookies são enviados automaticamente pelo navegador, operações mutáveis autenticadas exigem proteção CSRF. O frontend obtém o token, envia o cookie de sessão com `credentials: include` e inclui o token no cabeçalho apropriado. `CSRF_TRUSTED_ORIGINS` lista origens completas com `https://`.

## CORS

CORS limita quais origens podem ler/chamar a API pelo navegador. `CORS_ALLOWED_ORIGINS` deve conter apenas os frontends autorizados, e credenciais precisam estar explicitamente habilitadas. CORS não substitui autenticação, autorização nem CSRF: são camadas com ameaças diferentes.

## Autorização

Rotas de pedidos do cliente exigem autenticação e filtram recursos pelo usuário, impedindo acesso por simples troca de ID. Rotas administrativas usam permissões de staff/admin no backend. Ocultar uma página ou botão no Next.js melhora a experiência, mas não protege uma API.

## Admin e staff

O projeto possui o Django Admin para administração técnica e um painel Next.js próprio, apoiado por endpoints `/api/admin/...`. Ambos dependem das flags e permissões Django. O painel próprio oferece fluxos orientados à operação; ele não reduz a exigência de conferir `is_staff`/admin em cada endpoint administrativo.

## Backend como fonte de verdade

Preço, frete e disponibilidade não podem vir como decisões do frontend porque tudo que roda no navegador pode ser alterado pelo usuário e pode ficar desatualizado enquanto o carrinho está aberto. O backend recalcula esses valores, revalida disponibilidade no instante crítico e persiste snapshots. O frontend apresenta estimativas e coleta intenções; o servidor decide o estado aceito.

Outros controles importantes são `DEBUG=False` online, segredos somente em variáveis de ambiente, HTTPS, cookies seguros, validação por serializers/services, transações nas operações críticas e ausência de dados sensíveis em logs.
