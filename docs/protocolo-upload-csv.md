# Protocolo de Upload CSV — EduGestor

> Objetivo: definir como enviar dados em massa via ficheiros CSV (alunos, turmas, cursos, notas, presenças, propinas) respeitando a arquitetura atual: **offline-first (Dexie) + syncQueue + Supabase + RLS por `instituicao_id`**.

Estado atual relevante:
- Export já existe em `src/utils/exportCSV.ts`: separador `;`, escape com `"`, BOM `\uFEFF` para Excel PT/AO.
- Escrita local usa Dexie (`src/services/database/db.ts`) + `syncQueue` (`src/types/base.ts`).
- Upload para Supabase passa por `src/services/database/sync/uploadService.ts` com `cleanRecordForSupabase()`, `processedRecords()`, `processarRegistrosUnicos()` em `src/utils/syncManagerUtils.ts`.
- IDs locais: `local_${Date.now()}_${rand}` via `src/utils/idGenerator.ts`. No push, `id` local é removido e o servidor gera UUID.
- Deduplicação atual: `alunos` por `numero_estudante`, `cursos` por `normalizeCourseName(nome)+instituicao_id`, `turmas` por `nome_turma+ano_lectivo`.
- Ordem de upsert: `UPSERT_TABLE_ORDER = ['cursos','turmas','alunos','aulas','frequencias','avaliacoes','propina',...]`.
- Todo o registo tem de levar `instituicao_id` via `instituicaoIdValue()` (`src/utils/getInstituicaoID.ts`).
- Auditoria via `auditLogService.log()`.

---

## 1. Especificação comum do ficheiro (vale para os 3 métodos)

### 1.1 Formato
- Encoding: `UTF-8 com BOM`. Aceitar sem BOM mas exportar sempre com BOM.
- Separadores aceites na leitura: `;` (principal, padrão Excel AO/PT), `,` e `\t` como fallback por auto-detecção.
- Quebra de linha: `\n` ou `\r\n`.
- Escape: igual ao export atual: `"campo ""com aspas""; com ponto e vírgula"`.
- Header obrigatório na primeira linha, em minúsculas, sem acentos de preferência. Ex.: `nome_completo;data_nascimento;sexo;...`
- Limites sugeridos: máx `5 MB` / `5000 linhas` por ficheiro no client. Acima disso, dividir ou usar Método B.

### 1.2 Templates por entidade

Mapear colunas CSV -> campo interno. Campos com `*` são obrigatórios.

**`alunos` (`Student` em `src/types/aluno.ts`):**
```csv
nome_completo*;data_nascimento*;sexo*;turma_nome*;numero_estudante;contacto_principal;endereco;nome_pai;nome_mae;email;ano_lectivo*;classe_escolar*;estado;tipo_matricula;propina
Maria Santos;2010-05-12;F;7ª A;1234;923000000;Luanda;João Santos;Ana Santos;maria@mail.com;2025-2026;7ª classe;ativo;regular;5000
```
Regras: `sexo` só `M|F`, `estado` só `ativo|pendente|transferido|desistente|inativo`, `turma_nome` resolvido para `turma_id` (ver §3.3), `numero_estudante` se vazio -> gerar via contador local (`alunosService.readLocalCounter`).

**`turmas` (`Turma` em `src/types/turma.ts`):**
```csv
nome_turma*;ano_lectivo*;curso_nome*;professor;turno*;capacidade_maxima;estado
7ª A;2025-2026;Ensino Primário;Paulo Manuel;manhã;45;ativa
```

**`cursos` (`Course` em `src/types/curso.ts`):**
```csv
nome*;preco;duracao;vagas;ativo;descricao
Reforço Matemática;5000;3 meses;30;true;Apoio 7ª-9ª
```

> Novos tipos (notas, presenças) seguem o mesmo padrão: 1 ficheiro = 1 tabela. Não misturar entidades no mesmo CSV.

### 1.3 Pipeline de validação em 3 fases

1. **Estrutura:** ficheiro existe, extensão `.csv`, header corresponde ao template, encoding legível.
2. **Linha:** tipos, datas ISO (`YYYY-MM-DD`), enums, obrigatórios, trim. Juntar erros por linha: `{ linha: 12, coluna: 'sexo', valor: 'X', erro: 'esperado M|F' }`.
3. **Negócio:** duplicados dentro do ficheiro + contra Dexie/Supabase, FKs (`turma_nome` existe?), `instituicao_id` injetado, RLS.

Modo `dry-run` obrigatório: faz parse + valida tudo, mostra preview das primeiras 10 linhas + contagem válidos/inválidos, só grava após confirmação do utilizador.

---

## 2. Método A — Client + Dexie + syncQueue (recomendado)

**Quando usar:** 95% dos casos. Funciona offline, reutiliza sync, RLS e `auditLogService`. É o único que respeita PWA + modo offline.

**Fluxo:**
```
[CSV file] -> parse local -> validar (3 fases) -> preview/dry-run
  -> gerar id local_ -> put Dexie (sync_status='pending')
  -> enqueue syncQueue {table, record_id, operation:'upsert', instituicao_id}
  -> syncManager.uploadBatch() (quando online, em chunks) -> Supabase upsert
  -> relatório sucesso/falha
```

**Passos de implementação:**

1. **Instalar parser (1 linha):** `papaparse` já resolve BOM, `;`, quotes. Alternativa sem dependência: reutilizar split simples — não recomendado para casos com `;` dentro de campo.
   ```bash
   npm i papaparse
   npm i -D @types/papaparse
   ```

2. **Criar `src/services/import/csvImportService.ts`:**
   ```ts
   // pseudo-código alinhado ao projeto
   import Papa from 'papaparse';
   import db from '../database/db';
   import { generateUniqueId } from '../../utils/idGenerator';
   import { instituicaoIdValue } from '../../utils/getInstituicaoID';
   import { emitPendingSync } from '../../utils/emitPendingSync';

   export async function parseCsvFile(file: File) {
     return new Promise((resolve, reject) => {
       Papa.parse(file, {
         header: true, skipEmptyLines: true, encoding: 'UTF-8',
         delimiter: '', // auto-detect ; , \t
         complete: (res) => resolve(res.data as Record<string,string>[]),
         error: reject
       });
     });
   }

   export async function importAlunos(rows: Record<string,string>[]) {
     const instituicao_id = instituicaoIdValue();
     if (!instituicao_id) throw new Error('Sem instituição ativa');
     const now = new Date().toISOString();
     const errors: any[] = [];
     let ok = 0;

     // chunk para não bloquear UI: 200 de cada vez
     for (let i = 0; i < rows.length; i += 200) {
       const chunk = rows.slice(i, i + 200);
       const toPut: any[] = [];
       const toQueue: any[] = [];
       for (const [idx, r] of chunk.entries()) {
         const line = i + idx + 2; // + header
         const v = validateAlunoRow(r); // fase 2
         if (!v.valid) { errors.push({ linha: line, ...v.error }); continue; }
         // fase 3: dedup por numero_estudante dentro do Dexie
         // + resolve turma_nome -> turma_id (turmaService.getByName)
         const id = generateUniqueId();
         const record = { id, instituicao_id, sync_status: 'pending',
           created_at: now, updated_at: now, deleted: false, ...v.mapped };
         toPut.push(record);
         toQueue.push({ instituicao_id, table: 'alunos', record_id: id,
           operation: 'upsert', status: 'pending', created_at: now,
           data: JSON.stringify(record) });
         ok++;
       }
       await db.alunos.bulkPut(toPut);
       await db.syncQueue.bulkAdd(toQueue);
     }
     emitPendingSync();
     return { ok, errors };
   }
   ```

3. **Criar `src/components/import/CsvUploader.tsx`:** `<input type="file" accept=".csv">` -> `parseCsvFile` -> tabela preview (10 linhas) -> botão `Validar` (dry-run) -> botão `Confirmar importação` -> barra progresso por chunk -> relatório final com download `erros_importacao_YYYY-MM-DD.csv` (reutilizar `exportToCSV`).

4. **Respeitar ordem e limpeza existentes:** não chamar Supabase direto aqui. Deixar `uploadService.prepareInsertRecords / executeUpsertToSupabase` fazer `cleanRecordForSupabase` + `processarRegistrosUnicos` + `UPSERT_TABLE_ORDER`. Importar `cursos` antes de `turmas` antes de `alunos` se o CSV trouxer os 3.

5. **Auditoria:** `auditLogService.log('CSV_IMPORT', { tabela, total, ok, falhas, filename })`.

**Prós:** offline, sem nova infra, sem custo, usa RLS/JWT atuais.
**Contras:** ficheiros >5000 linhas bloqueiam UI (resolver com Web Worker + chunks).

---

## 3. Método B — Storage + Edge Function (ficheiros grandes / multi-escola)

**Quando usar:** migração inicial (10k+ alunos), uploads recorrentes da secretaria, ou quando queres validação centralizada no servidor.

**Fluxo:**
```
[PWA] -> upload .csv para Supabase Storage bucket `imports/{instituicao_id}/2026-10-09_alunos.csv`
  -> INSERT em tabela `import_jobs {id, instituicao_id, tabela, storage_path, status:'queued', total_linhas}`
  -> Edge Function `process-csv-import` (Deno) triggered por webhook/queue
  -> parse + validar + upsert em batches de 500 com `onConflict: id`
  -> UPDATE `import_jobs {status:'done'|'partial'|'failed', ok, erros, error_csv_path}`
  -> PWA faz polling/subscribe e mostra progresso
```

**Passos:**

1. **Storage:** criar bucket privado `imports`. Policy: só `authenticated` com `instituicao_id` no path (via JWT `app_metadata.instituicao_id` já usado em `update-jwt-claims`).
2. **Tabela `import_jobs`:** `id uuid, instituicao_id uuid, tabela text, storage_path text, status text, total int, ok int, falhas int, error_report_path text, created_by uuid, created_at timestamptz`.
3. **Edge Function `supabase/functions/process-csv-import/index.ts`:** usa `csv-parse` Deno, mesma `validateAlunoRow` partilhada (copiar regras do Método A para não divergir), `supabase-js` com `service_role` mas forçando `instituicao_id` do job (nunca confiar no CSV).
4. **Client:** `supabase.storage.from('imports').upload(path, file)` -> `supabase.from('import_jobs').insert(...)` -> polling a cada 3s ou Realtime subscribe.
5. **Relatório de erros:** a Function grava `erros_*.csv` no mesmo bucket e devolve URL assinada.

**Prós:** não trava PWA, processa 50k linhas, reprocessável, histórico por escola.
**Contras:** precisa bucket + tabela + function + policies; custo/latência; mais código para manter. Só compensa se Método A provar ser insuficiente.

---

## 4. Método C — Upsert direto online (migração pontual / admin)

**Quando usar:** script único de migração feito por dev/admin, com internet estável. Não usar como fluxo normal da PWA.

**Fluxo:**
```
parse local -> validar -> supabase.from('alunos').upsert(records, { onConflict: 'numero_estudante' }) em batches 500
```

**Passos:**
1. Mesmo parser e validador do Método A.
2. Injetar `instituicao_id` + `created_at/updated_at`, remover `id` local (`cleanRecordForSupabase`).
3. Chamar direto, sem Dexie/syncQueue. Tratar erros `23505` (duplicado) e `42501` (RLS) como já faz `uploadService.executeUpsertToSupabase`.

**Prós:** 20 linhas, ideal para seed/migração.
**Contras:** sem offline, sem fila, falha a meio deixa metade importado, não aparece no `SyncMonitorPage`.

---

## 5. Decisão e roadmap sugerido

| Critério | A (Dexie+fila) | B (Storage+Function) | C (direto) |
|---|---|---|---|
| Offline | ✅ | ❌ | ❌ |
| Ficheiros grandes | ⚠️ chunks/worker | ✅ | ⚠️ |
| Complexidade | baixa | alta | mínima |
| Reutiliza sync/RLS | ✅ | parcial | ✅ |
| Histórico/auditoria | via syncQueue+audit | via import_jobs | manual |

**Recomendação:**
1. Implementar **Método A para `alunos` + `turmas` + `cursos`** (são os que mais precisam). Estimativa: 1 serviço + 1 componente + templates + testes.
2. Adicionar botão `Modelo CSV` em cada página (gera template via `exportToCSV([], columns, 'modelo_alunos')`).
3. Se surgirem ficheiros >5000 linhas com queixas de lentidão, evoluir para **Método B** reutilizando o mesmo validador.
4. Usar **Método C** apenas como script `scripts/migracao-csv.ts` para carga inicial.

**Checklist de segurança (obrigatório nos 3):**
- [ ] Só `admin|manager` pode importar (ver `hasPermission` em `AuthContext`).
- [ ] `instituicao_id` sempre do `instituicaoIdValue()` / JWT, nunca do CSV.
- [ ] Respeitar `minimum_password_length` / RLS existentes; testar com utilizador não-admin (esperar `42501`).
- [ ] Logar em `auditLogService` + mostrar relatório de erros descarregável.
- [ ] Teste com CSV com BOM/sem BOM, com `;` e `,`, com aspas e acentos (`João`, `7ª classe`), e com 2000 linhas.

**Ficheiros a criar (Método A):**
- `src/services/import/csvImportService.ts` (parse + validate + bulkPut + bulkAdd queue)
- `src/services/import/validators.ts` (`validateAlunoRow`, `validateTurmaRow`, `validateCursoRow`)
- `src/services/import/templates.ts` (headers + `modelo_*.csv`)
- `src/components/import/CsvUploader.tsx` + `ImportPreview.tsx`
- `scripts/migracao-csv.ts` (Método C, opcional)
