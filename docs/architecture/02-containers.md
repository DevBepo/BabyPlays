# Containers e integrações

## Visão geral

```text
Navegador
   |
   v
Next.js (site, área do cliente e painel próprio)
   |  HTTPS + JSON + cookies de sessão/CSRF
   v
Django + Django REST Framework
   |---------------------> ViaCEP
   |---------------------> Google Routes (provider configurável, não obrigatório no frete atual)
   |                      
   +--> PostgreSQL
   +--> Railway Volume (/app/media)

Navegador ----------------> WhatsApp (mensagem montada com resumo retornado pela API)
```

## Next.js

É a interface web em TypeScript. Oferece catálogo, autenticação, carrinho, conta do cliente e painel administrativo próprio. Consome a API indicada por `NEXT_PUBLIC_API_BASE_URL`, envia cookies com as requisições autenticadas e obtém o token CSRF para operações mutáveis. Não é fonte de verdade de preço, frete ou disponibilidade.

## Django e Django REST Framework

É o backend monolítico modular. Expõe a API, autentica usuários por sessão, aplica autorização, valida entradas e concentra regras de catálogo, checkout, contrato, estoque, pedidos e entrega. Serviços de domínio coordenam operações críticas e transações no PostgreSQL.

## PostgreSQL

É o banco relacional de homologação/produção. Persiste usuários, clientes, catálogo, unidades físicas, carrinhos, pedidos, snapshots, contratos, aceites, reservas, histórico e regras de entrega. Restrições, relacionamentos e transações ajudam a manter consistência.

## Railway Volume e mídia

Imagens enviadas pelo admin usam o filesystem do Django. Como o container Railway é efêmero, um volume persistente deve ser montado em `/app/media`, com `MEDIA_ROOT=/app/media`. O backend serve somente arquivos existentes sob `/media/`; o banco guarda referências, não o conteúdo das imagens.

## ViaCEP

O backend consulta o ViaCEP pelo CEP informado para obter logradouro, bairro, cidade e UF. Número e complemento continuam sendo dados do cliente. A consulta padroniza a localidade usada no cálculo de frete; falhas ou CEP inválido impedem que o endereço seja tratado como válido.

## WhatsApp

Depois da criação do pedido, a API devolve `whatsapp_resumo`, construído a partir dos dados persistidos. O frontend monta o link para o número configurado e abre o WhatsApp. É um canal de continuidade comercial, não o banco de dados nem o mecanismo de confirmação do pedido.

## Google Routes

Há um provider para a API Google Routes, ativável por `GOOGLE_ROUTES_API_KEY`, capaz de calcular distância rodoviária. O código preserva essa alternativa e também uma configuração histórica de valor por quilômetro, mas ela não é requisito do cálculo atual por bairro. Sem chave, o provider de rotas não calcula distância.

## Frete por bairro

A solução atual procura uma `RegraFreteBairro` ativa pela combinação normalizada de UF, cidade e bairro. Uma regra pode fornecer valor calculado ou indicar taxa sujeita a análise. A regra selecionada e o resultado são registrados como snapshots no pedido, evitando que alterações futuras mudem pedidos antigos.
