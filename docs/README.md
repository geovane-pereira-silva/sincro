# Documentação viva — SINCRO

Esta pasta é a **documentação viva** do projeto. Ela deve ser mantida
atualizada a cada mudança relevante e **lida antes de iniciar qualquer nova
tarefa**, para não recriar algo que já existe nem contradizer decisões já
tomadas.

> ⚠️ Nota de escopo: o pedido original de documentação mencionava um projeto
> de portal de notícias ("Chip Notícias" — matérias, vagas, falecimentos,
> busca, anunciantes, salvos). **Este repositório não é esse projeto.** Ele é
> o **SINCRO**, um sistema de ponto eletrônico e gestão de jornada. A
> documentação abaixo reflete o que realmente existe no código.

## Estrutura

```
/docs
  /01-sistema
    visao-geral.md      — o que é o SINCRO, público-alvo, objetivo
    arquitetura.md      — stack, estrutura de pastas, convenções
  /02-funcionalidades   — um .md por módulo
    autenticacao-perfis.md
    ponto.md
    empresas-gestor.md
    colaboradores-convites.md
    solicitacoes.md
    notificacoes.md
    geolocalizacao.md
    relatorios-exportacao.md
    financeiro-assinaturas.md
    admin.md
  changelog.md          — log cronológico (mais recente no topo)
```

## Regra de ouro (LEIA ANTES DE AGIR)

Antes de implementar qualquer nova funcionalidade ou alteração:

1. Consultar `/docs/02-funcionalidades` para checar se algo parecido já existe
   (evitar recriar componente/tabela/lógica duplicada).
2. Consultar as últimas entradas de `/docs/changelog.md` para entender o que
   foi feito recentemente e não contradizer trabalho já validado.
3. Se o pedido já existe ou é parecido com algo implementado, **avisar antes
   de criar do zero** e perguntar se é para reaproveitar/estender ou se é
   intencionalmente uma nova versão.

## Padrão de cada arquivo em /02-funcionalidades

```
# Nome do Módulo
## O que é
## O que ele faz
## Como funciona
## Dependências
## Status  (Em produção / Em desenvolvimento / Planejado)
```
