# Story: Greenfield MVP de Analise de Estoque, Vendas e Projecao

## Contexto

Projeto novo para consolidar relatorios diarios do ERP em uma aplicacao web focada em leitura gerencial de estoque, vendas e projecao de fechamento do mes.

## Objetivo

Criar um MVP isolado em `apps/zain-inventory-console` para:
- importar relatorio de estoque
- importar relatorio de vendas/faturamento
- consolidar produtos por codigo
- mostrar ultimos 3 meses de vendas
- calcular projecao do mes atual por dias uteis
- destacar status de estoque e risco de ruptura
- entregar uma visao simples para validacao funcional local

## Resumo Funcional Extraido do Briefing

- Chave principal: codigo do produto
- Entradas: relatorio de estoque e relatorio de vendas/faturamento
- Formatos iniciais: `csv`, `xlsx`
- Saida principal por produto:
  - codigo
  - SKU
  - nome
  - marca
  - grupo
  - subgrupo
  - estoque atual
  - estoque reservado
  - estoque disponivel
  - vendas dos ultimos 3 meses
  - vendas do mes atual
  - projecao do mes atual
  - media 3 meses
  - cobertura
  - necessidade de compra
  - status do estoque
- Dashboard:
  - total de produtos
  - estoque total
  - vendas do mes
  - projecao do mes
  - produtos sem estoque
  - produtos com estoque baixo

## Premissas do MVP

- Operacao local primeiro
- Importacao manual primeiro
- Dias uteis = segunda a sexta, sem feriados nesta fase
- Banco e persistencia podem entrar depois
- Foco imediato em validacao funcional com arquivos reais

## Checklist

- [x] Story greenfield criada a partir do briefing do usuario
- [x] Novo app isolado criado em `apps/zain-inventory-console`
- [x] Script de execucao local criado em `package.json`
- [x] Tela inicial com escopo e fluxo funcional criada
- [x] Upload de planilhas `.xlsx` e `.csv` implementado
- [x] Parser de estoque implementado
- [x] Parser de vendas implementado
- [x] Consolidacao por codigo implementada
- [x] Dashboard MVP implementado
- [x] Tabela consolidada implementada
- [ ] Teste com arquivos reais do usuario

## File List

- [docs/stories/zain-inventory-console-greenfield-mvp.md](/C:/Users/Administrator/.gemini/antigravity/scratch/manifestation-bridge/docs/stories/zain-inventory-console-greenfield-mvp.md)
- [package.json](/C:/Users/Administrator/.gemini/antigravity/scratch/manifestation-bridge/package.json)
- [apps/zain-inventory-console/server.js](/C:/Users/Administrator/.gemini/antigravity/scratch/manifestation-bridge/apps/zain-inventory-console/server.js)
- [apps/zain-inventory-console/public/index.html](/C:/Users/Administrator/.gemini/antigravity/scratch/manifestation-bridge/apps/zain-inventory-console/public/index.html)
- [apps/zain-inventory-console/public/styles.css](/C:/Users/Administrator/.gemini/antigravity/scratch/manifestation-bridge/apps/zain-inventory-console/public/styles.css)
- [apps/zain-inventory-console/public/app.js](/C:/Users/Administrator/.gemini/antigravity/scratch/manifestation-bridge/apps/zain-inventory-console/public/app.js)
