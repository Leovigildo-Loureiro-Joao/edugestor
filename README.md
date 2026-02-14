# EduGestor

Sistema de gestao escolar com foco em:
- gestao academica (alunos, turmas, aulas, frequencia, avaliacoes);
- gestao financeira (transacoes, propinas, alocacoes);
- planejamento estrategico (metas, tarefas, rotinas, eventos);
- operacao offline-first com sincronizacao.

## Stack Atual
- Frontend: React 19 + Vite 7
- UI: Tailwind CSS, MUI, Framer Motion
- Estado/Formularios: Zustand, React Hook Form, Zod
- Banco local: Dexie (IndexedDB)
- Backend e auth: Supabase (Auth, Postgres, Edge Functions)
- Graficos: Recharts e Chart.js

## Arquitetura (Resumo)
- `src/pages`: telas de cada modulo
- `src/components`: componentes de UI e dominio
- `src/services/database`: acesso a dados, sincronizacao e cache
- `src/contexts`: estado global de autenticacao
- `src/types`: modelos de dominio TypeScript
- `src/utils`: utilitarios

## Modulos Principais
- Dashboard
- Alunos
- Turmas e Cursos
- Frequencia e Aulas
- Financeiro (pagamentos, propinas, transacoes)
- Estrategia (metas, tarefas, planejamento, eventos)
- Administracao de usuarios

## Requisitos
- Node.js 20+ (recomendado para Vite 7)
- npm 10+
- Projeto Supabase configurado

## Configuracao de Ambiente
Crie um arquivo `.env` na raiz com:

```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Scripts
```bash
npm install
npm run dev
npm run build
npm run preview
npm run lint
```

## Fluxo de Dados (alto nivel)
1. Escrita local em IndexedDB (Dexie)
2. Registro em fila (`syncQueue`)
3. Upload/download com Supabase quando online
4. Atualizacao de status de sincronizacao por entidade

## Estado do Projeto
- Base funcional ampla e modular
- Em evolucao de hardening tecnico (auth/roles, sync e qualidade de codigo)

## Roadmap Tecnico Curto
- estabilizar fluxo de autenticacao e permissao por role
- reduzir erros de lint e padronizar tipos
- reforcar sincronizacao offline/online e tratamento de conflitos
- melhorar performance de bundle com code splitting
- adicionar testes automatizados de servicos criticos

## Seguranca
- nunca comitar tokens, chaves privadas ou credenciais reais
- manter variaveis sensiveis apenas em `.env`/cofre de segredos
