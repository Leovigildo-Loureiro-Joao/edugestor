import { conflictResolver } from "../services/database/sync/conflictResolver";
import { SyncQueueItem } from "../types/base";
import { instituicaoIdValue, isValidInstituicaoId } from "./getInsitituicaoID";

    const HARD_DELETE_RECONCILE_TABLES = new Set([
       'cursos',
       'turmas',
       'alunos',
       'alocacao',
       'transacoes',
       'aulas',
       'propina',
       'frequencias',
       'tarefas',
       'metas',
       'rotinas',
       'evento',
       'system_config',
       'notificacao',
       'avaliacoes',
       'turma_horarios',
       'planeamentos',
       'plano_aulas'
    ]);
    const LEGACY_INSTITUICAO_IDS = new Set(['local_default_instituicao', '']);
    const DESTINATARIOS_NOTIFICACAO_VALIDOS = new Set(['aluno', 'professor', 'admin', 'responsavel', 'todos']);
    const LOCAL_ID_MAP_KEY = 'sync_local_id_map';
    const DELETE_TABLE_ORDER = [
    'frequencias',
    'avaliacoes',
    'propina',
    'plano_aulas',
    'aulas',
    'turma_horarios',
    'alunos',
    'turmas',
    'cursos'
    ];
    const UPSERT_TABLE_ORDER = [
    'cursos',
    'turmas',
    'alunos',
    'aulas',
    'frequencias',
    'avaliacoes',
    'propina',
    'turma_horarios',
    'plano_aulas'
    ];

    const isLegacyInstituicaoId = (value?: string | null): boolean =>
       !isValidInstituicaoId(value) && LEGACY_INSTITUICAO_IDS.has(value || '');

    const isUuid = (value?: string | null): boolean =>
       !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
     
    const isSeedRecordId = (value?: string | null): boolean =>
       !!value && value.startsWith('seed_');



    const normalizeCourseName = (value?: string | null): string =>
       String(value || '')
         .trim()
         .replace(/\s+/g, ' ')
         .toLowerCase();

    const normalizarDestinatarioNotificacao = (destinatario?: string): string | undefined => {
       if (!destinatario) return undefined;
       const valor = destinatario.toLowerCase();
       if (valor === 'teacher' || valor === 'professor') return 'professor';
       if (valor === 'manager' || valor === 'admin') return 'admin';
       if (valor === 'user' || valor === 'aluno') return 'aluno';
       if (valor === 'responsavel' || valor === 'todos') return valor;
       return DESTINATARIOS_NOTIFICACAO_VALIDOS.has(valor) ? valor : undefined;
     };

    const getSyncQueueInstitutionId =() : string => instituicaoIdValue();
    
  

    const resolveValidInstituicaoId = (value?: string | null, allowNull = false): string | null => {
       if (isValidInstituicaoId(value)) return value;
       const active = getSyncQueueInstitutionId();
       if (isValidInstituicaoId(active)) return active;
       return allowNull ? null : '';
    };

     
    const getTableOrderIndex = (tableName: string, order: string[]) => {
       const idx = order.indexOf(tableName);
       return idx === -1 ? Number.MAX_SAFE_INTEGER : idx;
    };

    const  groupByTable=(items: SyncQueueItem[]) => {
        const groups: Record<string, SyncQueueItem[]> = {};
    
        items.forEach(item => {
          if (!groups[item.table]) {
            groups[item.table] = [];
          }
          groups[item.table].push(item);
        });
    
        return groups;
    }

    const processarRegistrosUnicos=(records: any[], tabela: string): any[] => {
      conflictResolver.debugSyncQueueIssue(tabela)
      const registrosUnicos = new Map();
    
      records.forEach(record => {
        let chaveUnica;
    
        switch(tabela) {
          case 'alunos':
            
            chaveUnica = record.numero_estudante;
            break;
    
          case 'cursos': {
            const nomeKey = normalizeCourseName(record.nome);
            const instKey = record.instituicao_id || '';
            if (nomeKey) {
              chaveUnica = `curso_${nomeKey}_${instKey}`;
            }
            break;
          }
    
          case 'turmas':
            
            chaveUnica = `${record.nome_turma}_${record.ano_lectivo}`;
            break;
    
          case 'professores':
            
            chaveUnica = record.email || record.numero_bi;
            break;
    
          case 'aulas':
            
            chaveUnica = [
              record.turma_id || '',
              record.data_aula || '',
              record.hora_inicio || '',
              record.hora_fim || '',
              record.disciplina || '',
              record.tema_aula || ''
            ].join('|');
            break;
    
          default:
            
            chaveUnica = record.id || Math.random().toString();
        }
    
        
        if (!chaveUnica) {
          chaveUnica = `temp_${Math.random().toString(36).substr(2, 9)}`;
        }
    
        
        const existente = registrosUnicos.get(chaveUnica);
        if (existente) {
          
          const dataAtual = record.updated_at || record.created_at;
          const dataExistente = existente.updated_at || existente.created_at;
    
          if (dataAtual && dataExistente) {
            const isMaisRecente = new Date(dataAtual) > new Date(dataExistente);
            if (isMaisRecente) {
              registrosUnicos.set(chaveUnica, record);
            }
          } else if (dataAtual && !dataExistente) {
            
            registrosUnicos.set(chaveUnica, record);
          }
        } else {
          registrosUnicos.set(chaveUnica, record);
        }
      });
    
      return Array.from(registrosUnicos.values());
    }

    const processedRecords=(records:any[],tableName:string)=>{
        switch (tableName) {
          case 'turmas':
            
            return records.map(record => {
              const { id,aulas, horarios, ...rest } = record;
              return rest;
            });
    
          case 'alunos':
            
            return records.map(record => {
              const { id, avaliacao, curso, observacoes_especificas, ...rest } = record;
              return rest;
            });
            
    
          case 'aulas':
            
            return records.map(record => {
              const {id, registro,turmas, ...rest } = record;
              return rest;
            });
    
          case 'frequencias':
            return records.map(record => {
              const { id, ...rest } = record;
              return {
                ...rest,
                instituicao_id: resolveValidInstituicaoId(rest.instituicao_id) || ''
              };
            });
         case 'avaliacoes':
            return records.map(record => {
              const { id, peso,...rest } = record;
              return {
                ...rest,
                instituicao_id: resolveValidInstituicaoId(rest.instituicao_id) || ''
              };
            });
          case 'cursos':
            
            return records.map(record => {
              const {id, alunos,has_active_turmas,turmas,turmas_count, ...rest } = record;
              return rest;
            });
          case 'notificacao':
            return records.map((record) => {
              const { id, ...rest } = record;
              const destinatario_tipo = normalizarDestinatarioNotificacao(rest.destinatario_tipo);
              return {
                ...rest,
                destinatario_tipo,
                instituicao_id: resolveValidInstituicaoId(rest.instituicao_id, true)
              };
            });
          case 'system_config':
            return records.map((record) => {
              const { id, updated_by, ...rest } = record;
              return {
                ...rest,
                instituicao_id: resolveValidInstituicaoId(rest.instituicao_id) || ''
              };
            });
    
          default:
            return records.map(record => {
              const {id, ...rest } = record;
              return rest;
            });
        }
      }

    const removeBatchDuplicates=(tableName: string, records: any[])=> {
          const uniqueMap = new Map();
          const duplicates = [];
      
          records.forEach(record => {
            let key = record.id;
      
            if (tableName === 'alunos' && record.numero_estudante) {
              key = `aluno_${record.numero_estudante}`;
            } else if (tableName === 'turmas' && record.nome_turma && record.ano_lectivo) {
              key = `turma_${record.nome_turma}_${record.ano_lectivo}`;
            }
      
            if (key && uniqueMap.has(key)) {
              duplicates.push({ key, record });
            } else if (key) {
              uniqueMap.set(key, record);
            }
          });
      
          if (duplicates.length > 0) {
            console.warn(`⚠️ Removidas ${duplicates.length} duplicatas do batch ${tableName}`);
          }
      
          return Array.from(uniqueMap.values());
    }

    const cleanRecordForSupabase=(record: any)=> {
        
        const { sync_status, deleted, ...cleanRecord } = record;
        const sanitizedInstituicaoId = resolveValidInstituicaoId(cleanRecord.instituicao_id, true);
    
        
        return {
        ...cleanRecord,
        ...(cleanRecord.instituicao_id !== undefined ? { instituicao_id: sanitizedInstituicaoId } : {}),
        created_at: record.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
    
        
        ...(record.id && record.id.toString().startsWith('local_')
            ? { id: undefined }
            : {})
        };
    }
      
       
      
     
     export{
        HARD_DELETE_RECONCILE_TABLES,
        LEGACY_INSTITUICAO_IDS,
        DESTINATARIOS_NOTIFICACAO_VALIDOS,
        LOCAL_ID_MAP_KEY,
        DELETE_TABLE_ORDER,
        UPSERT_TABLE_ORDER,

        getTableOrderIndex,

        getSyncQueueInstitutionId,


        
        normalizarDestinatarioNotificacao,
        normalizeCourseName,
        

        isSeedRecordId,
        isUuid,
        isLegacyInstituicaoId,

        resolveValidInstituicaoId,


        groupByTable,
        removeBatchDuplicates,
        cleanRecordForSupabase,
        processedRecords,
        processarRegistrosUnicos
     }

