# EduGestor

Sistema de gestão escolar com foco em:
- gestão académica (alunos, turmas, aulas, frequência, avaliações);
- gestão financeira (transações, propinas, alocações);
- planeamento estratégico (metas, tarefas, rotinas, eventos);
- operação offline-first com sincronização.

Atualizado em: 21/02/2026

## Stack atual
- Frontend: React 19 + Vite 7
- UI: Tailwind CSS, MUI, Framer Motion
- Estado/Formulários: Zustand, React Hook Form, Zod
- Banco local: Dexie (IndexedDB)
- Backend e autenticação: Supabase (Auth, Postgres, Edge Functions)
- Gráficos: Recharts e Chart.js

## Arquitetura (resumo)
- `src/pages`: telas por módulo
- `src/components`: componentes de UI e domínio
- `src/services/database`: acesso a dados, sincronização e cache local
- `src/contexts`: estado global (ex.: autenticação)
- `src/types`: modelos de domínio TypeScript
- `src/utils`: utilitários

## Organização recente (Fases 1-3)
- Barrel de modais em `src/components/strategy/modals/index.ts`
- Barrel de estratégia em `src/components/strategy/index.ts`
- Tipos de planeamento centralizados em `src/types/planeamento/index.ts`
- Compatibilidade mantida com `src/types/planeamento.ts`
- Nomenclatura padronizada para `Planeamento*` nos componentes principais
- Reorganização física de ficheiros adiada para evitar regressões neste ciclo

## Módulos principais
- Dashboard
- Alunos
- Turmas e Cursos
- Frequência e Aulas
- Financeiro (pagamentos, propinas, transações)
- Estratégia (metas, tarefas, planeamento, eventos)
- Administração de utilizadores

## Lógica de negócio (resumo funcional)
### Núcleo do produto
- Gestão escolar operacional e gerencial com visão unificada de Académico, Financeiro e Estratégia.
- Suporte a operação offline-first para contextos de conectividade instável.

### Entidades e relações principais
- `Curso` agrupa `Turmas`.
- `Turma` agrupa `Alunos` e recebe `Aulas`.
- `Aluno` relaciona-se com frequência, notas e pagamentos.
- `Propina/Transação` representa receitas e despesas.
- `Meta/Tarefa/Evento` suporta planeamento e execução estratégica.
- Escopo de dados por instituição via `instituicao_id`.

### Regras financeiras principais
- Dashboard financeiro consolida:
  - total recebido;
  - total de despesas;
  - lucro líquido;
  - saldo atual (`entradas - saídas`);
  - taxa de pagamento (alunos em dia vs total).
- Suporte a alocação de recursos/lucro para metas.

### Regras académicas principais
- Aulas, frequência e avaliações alimentam métricas de desempenho.
- Planeamento semanal/mensal orienta execução pedagógica.
- Dashboards apresentam indicadores para decisão operacional e gestão.

### Sincronização e consistência
- Escrita local em Dexie e sincronização com Supabase quando online.
- Eventos de atualização (`db-changed`) para refresco reativo das telas.
- Indicadores de pendência/sincronização por entidade crítica.

## Atualizações recentes
- Consolidação do modo escuro nas áreas de Finanças e Dashboard.
- Ajustes de consistência visual em componentes de tabela, cards e modais.
- Melhorias de responsividade em modais full-height para mobile.
- Refinos em contrastes de texto/borda para legibilidade em dark mode.
- Organização progressiva de domínio em Estratégia/Planeamento mantida.

## QA 95% (Tabela de validação)
Legenda de status:
- `OK`: validado sem problemas relevantes.
- `Ajustar`: existe pendência não crítica.
- `Bloqueante`: quebra funcional/visual crítica.

Nota: tabela abaixo preenchida como **pré-avaliação técnica estática** (leitura de código + consistência visual), pendente de QA manual completo por rota.

| Rota | Negócio | Responsividade | UI/UX + A11y | Observações | Status final |
|---|---|---|---|---|---|
| `/dashboard` | Ajustar | Ajustar | Ajustar | Calendário e densidade dos cards ainda pedem revisão final | Ajustar |
| `/financeiro` | OK | OK | Ajustar | Núcleo está estável; falta lapidar contraste/estado vazio em subfluxos | Ajustar |
| `/financeiro/pagamentos` | Ajustar | Ajustar | Ajustar | Conferir tabela mobile, filtros combinados e feedback de erro | Ajustar |
| `/financeiro/transacoes` | Ajustar | Ajustar | Ajustar | Revisar filtros avançados, exportação e consistência do modal | Ajustar |
| `/alunos` | Ajustar | Ajustar | Ajustar | Ações em lote e legibilidade da tabela em viewport pequeno | Ajustar |
| `/alunos/:id` | Ajustar | Ajustar | Ajustar | Abas e modais auxiliares precisam validação fim-a-fim | Ajustar |
| `/turmas` | Ajustar | Ajustar | Ajustar | Revisar filtros, listagem e mensagens de vazio | Ajustar |
| `/turmas/*` | Ajustar | Ajustar | Ajustar | Formulários longos e estados de validação visual | Ajustar |
| `/aulas/*` | Ajustar | Ajustar | Ajustar | Alta densidade de componentes; revisar modais e planeamento | Ajustar |
| `/estrategia/*` | Ajustar | Ajustar | Ajustar | Gráficos/visão integrada precisam verificação visual completa | Ajustar |
| `/configuracoes/*` | Ajustar | OK | Ajustar | Forms extensos (notif/secure/academy) com foco em consistência | Ajustar |
| `/admin/*` | Ajustar | Ajustar | Ajustar | Tabelas de gestão e contrastes em áreas de controle | Ajustar |

### Prioridades para fechar 95%
1. `P0` Fluxos críticos de negócio
- Validar criar/editar/apagar em `financeiro`, `alunos`, `turmas`, `aulas`.
- Confirmar consistência de KPIs (Dashboard + Financeiro + Estratégia).
- Revisar estados `loading`, `error`, `empty`, `offline` nas rotas de maior uso.

2. `P1` Responsividade e modais
- Fechar responsividade de tabelas e listas densas (`alunos`, `admin`, `aulas`).
- Garantir modais full-height com scroll interno e ações sempre acessíveis.
- Validar breakpoints `360/768/1024/1440` nas rotas principais.

3. `P2` UI/UX e acessibilidade
- Uniformizar contraste/foco/hover/disabled em componentes reutilizáveis.
- Revisar botões só-ícone com `aria-label`.
- Padronizar feedback visual e mensagens de sucesso/erro.

### Checklist rápido por rota (marcar durante QA)
- [ ] Fluxos críticos sem erro (criar/editar/apagar/salvar)
- [ ] Estados `loading`, `empty`, `error` e `offline` cobertos
- [ ] Layout aprovado em `360`, `768`, `1024`, `1440`
- [ ] Contraste e foco visível (dark/light)
- [ ] Sem overflow horizontal ou corte de ações

## Requisitos
- Node.js 20+ (recomendado para Vite 7)
- npm 10+
- Projeto Supabase configurado

## Configuração de ambiente
Crie um ficheiro `.env` na raiz com:

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

## Fluxo de dados (alto nível)
1. Escrita local em IndexedDB (Dexie)
2. Registo em fila (`syncQueue`)
3. Upload/download com Supabase quando online
4. Atualização de status de sincronização por entidade

## TODO OFFLINE (recomendações práticas)
- [x] Garantir que cada criação/edição local grava em Dexie com `sync_status: 'pending'`.
- [x] Garantir que cada operação relevante adiciona item em `syncQueue` com `table`, `record_id`, `operation` e `data` (snapshot).
- [x] Sempre que uma tela está aberta, sincronizar apenas as tabelas dela (evitar `syncAll` fora do dashboard).
- [x] Na UI, mostrar estados: `pending` (aguardando sync), `synced`, `failed`.
- [ ] Nos logs, registrar ações offline com `source: 'sync_queue'` e `table_name/record_id`.
- [x] Evitar reloads globais quando ficar online; usar throttling por tela.
- [ ] Em operações sensíveis, oferecer feedback de “salvo localmente” quando offline.
- [ ] Validar conflitos (mesmo registro modificado online e offline) e definir regra de resolução.

## Exemplos offline (como trabalhar)
### Exemplo 1: Criar aluno offline
1. Desligar internet.
2. Criar aluno na tela de Alunos.
3. Verificar se o aluno aparece imediatamente.
4. Validar no Dexie que `sync_status` ficou `pending` e `syncQueue` recebeu um item `upsert`.
5. Ligar internet e confirmar que o aluno sincroniza e fica `synced`.

### Exemplo 2: Editar turma offline
1. Desligar internet.
2. Editar uma turma existente (ex: nome).
3. Confirmar atualização na tela sem recarregar.
4. Verificar `syncQueue` com `table: 'turmas'`, `record_id` correto e snapshot em `data`.
5. Ligar internet e conferir se o status muda para `synced`.

### Exemplo 3: Registrar pagamento offline
1. Desligar internet.
2. Criar uma transação no Financeiro.
3. Confirmar que a lista mostra o item com estado `pending`.
4. Ligar internet e confirmar upload (sem duplicar).

### Exemplo 4: Logout offline
1. Desligar internet.
2. Fazer logout.
3. Confirmar que a sessão local é limpa.
4. Após reconectar, validar que o log de logout foi enfileirado (se aplicável).

## Testes offline (manual)
Checklist recomendado antes de deploy:
1. Iniciar online e autenticar normalmente.
2. Desligar internet e criar/editar dados em módulos críticos (Aulas, Notas, Estratégia, Financeiro).
3. Confirmar persistência local após refresh da página.
4. Verificar status visual de sincronização (`pending`/`synced`) quando aplicável.
5. Reativar internet e validar sincronização automática.
6. Confirmar ausência de duplicados e consistência de dados após sync.
7. Revisar logs de erro no console para conflitos silenciosos.

## Estado do projeto
- Base funcional ampla e modular
- Estrutura interna mais consistente nas áreas de Estratégia e Planeamento
- Em evolução de hardening técnico (auth/roles, sync e qualidade de código)

## Roadmap técnico curto
- Estabilizar fluxo de autenticação e permissões por role
- Reduzir erros de lint e padronizar tipos
- Reforçar sincronização offline/online e tratamento de conflitos
- Melhorar performance de bundle com code splitting
- Adicionar testes automatizados de serviços críticos

## Notas de encerramento deste ciclo
- Build validado com sucesso após as fases de organização
- Sem mudanças estruturais agressivas (sem mover ficheiros fisicamente)
- Próximo foco recomendado: testes offline e ajuste fino de regras RLS

## Segurança
- Nunca comitar tokens, chaves privadas ou credenciais reais
- Manter variáveis sensíveis apenas em `.env` ou cofre de segredos

## Decisões arquiteturais

### 1) Offline-first com Dexie + Supabase
**Contexto:** conectividade pode ser instável.  
**Decisão:** CRUD local primeiro (Dexie), enfileiramento em `syncQueue` e sincronização com Supabase quando online.  
**Trade-offs:** melhor resiliência e performance local, com maior complexidade de conflitos.

### 2) Organização lógica por domínio
**Contexto:** crescimento rápido do projeto.  
**Decisão:** manter repositório único com separação lógica clara por domínio e uso de barrels (`index.ts`).  
**Trade-offs:** simplicidade e velocidade agora, com possível acoplamento se não houver disciplina.

### 3) Centralização progressiva de tipos
**Contexto:** duplicação e inconsistência de tipos.  
**Decisão:** centralizar tipos em `src/types/[domínio]` com compatibilidade retroativa durante migração.

### 4) Barrels para reduzir acoplamento de imports
**Contexto:** imports longos e frágeis.  
**Decisão:** expor APIs de componentes/tipos por barrels para facilitar refatoração interna sem quebrar consumidores.

### 5) Estado e sincronização
**Atual:** Zustand para estado global essencial + serviços Dexie/Supabase para dados.  
**Próximo passo (planeado):** avaliar React Query para cache server-side e revalidação.
