import { supabase } from '../database/db';
import db from './db';
import { syncManager } from './syncManager';
import { emitDbChanged } from '../../utils/emitPendingSync';
import { showGlobalAlert } from '../../components/ui/AlertBadge';
import { turmaService } from './turmas';
import { cursosService } from '.';
import { instituicaoIdValue } from '../../utils/getInsitituicaoID';
import { generateUniqueId } from '../../utils/idGenarator';
import { Avaliacao, AvaliacaoFormData, AvaliacaoStats, AvaliacaoWithAluno, DisciplinaStats } from '../../types/avaliacao';



export const avaliacaoService = {
  // ✅ Criar avaliação com validação avançada
  async criarAvaliacao(avaliacaoData: AvaliacaoFormData): Promise<string> {
    try {
      // Validações
      if (!avaliacaoData.aluno_id) {
        throw new Error('ID do aluno é obrigatório');
      }
      
      if (avaliacaoData.nota < 0 || avaliacaoData.nota > 20) {
        throw new Error('Nota deve estar entre 0 e 20');
      }

      const id = generateUniqueId();
      const now = new Date().toISOString();
      
      const avaliacao: Avaliacao = {
        ...avaliacaoData,
        id,
        created_at: now,
        updated_at: now,
        sync_status: 'pending',
        deleted: false,
      };

      await db.avaliacoes.put(avaliacao);
      emitDbChanged('avaliacoes', 'create');
      
      // Adicionar à fila de sincronização
      await db.syncQueue.add({
        table: 'avaliacoes',
        record_id: id,
        operation: 'upsert',
        data: JSON.stringify(avaliacao),
        status: 'pending',
        created_at: now,
        instituicao_id:instituicaoIdValue(),
        retry_count: 0
      });

      // Tentar sincronizar imediatamente se online
      if (navigator.onLine) {
        setTimeout(() => this.tryImmediateSync(id), 1000);
      }

      return id;
      
    } catch (error: any) {
      console.error('❌ Erro ao salvar avaliação:', error);
      throw new Error(`Falha ao salvar avaliação: ${error.message}`);
    }
  },

  // ✅ Sincronização imediata
  async tryImmediateSync(id: string) {
    try {
      const avaliacao = await db.avaliacoes.get(id);
      if (!avaliacao || avaliacao.sync_status === 'synced') return;

      await Promise.all([
        syncManager.uploadTableBatch('avaliacoes'),
        syncManager.downloadTableBatch('avaliacoes', new Date(0))
      ]);
      showGlobalAlert({ type: 'success', title: 'Avaliação sincronizada com sucesso!' });
    } catch (error) {
      }
  },

  // ✅ Buscar todas as avaliações com joins otimizados
  async getAllAvaliacoes(options?: {
    includeDeleted?: boolean;
    limit?: number;
    offset?: number;
    orderBy?: keyof Avaliacao;
    orderDirection?: 'asc' | 'desc';
  }): Promise<AvaliacaoWithAluno[]> {
    try {
      const {
        includeDeleted = false,
        limit = 100,
        offset = 0,
        orderBy = 'data_avaliacao',
        orderDirection = 'desc'
      } = options || {};

      // Construir query base
      let query = db.avaliacoes;
      
  
      // Executar query
      const avaliacoes = (await query.toArray()).filter(p=> !p.deleted);

      // Ordenar manualmente (IndexedDB não suporta sorting complexo diretamente)
      avaliacoes.sort((a, b) => {
        const aVal = a[orderBy];
        const bVal = b[orderBy];
        
        if (orderDirection === 'desc') {
          return new Date(bVal as string).getTime() - new Date(aVal as string).getTime();
        }
        return new Date(aVal as string).getTime() - new Date(bVal as string).getTime();
      });

      // Aplicar limite e offset
      const paginated = avaliacoes.slice(offset, offset + limit);

      // Buscar informações dos alunos em batch
      const alunoIds = [...new Set(
        paginated
          .map(a => a.aluno_id)
          .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      )];

      const alunos = alunoIds.length > 0
        ? await db.alunos
            .where('id')
            .anyOf(alunoIds)
            .and(aluno => !aluno.deleted)
            .toArray()
        : [];

      const alunoMap = new Map(alunos.map(aluno => [aluno.id, aluno]));

      // Combinar dados
      const resultado: AvaliacaoWithAluno[] = paginated.map(avaliacao => ({
        ...avaliacao,
        aluno: alunoMap.get(avaliacao.aluno_id) ? {
          nome_completo: alunoMap.get(avaliacao.aluno_id)!.nome_completo,
          numero_estudante: alunoMap.get(avaliacao.aluno_id)!.numero_estudante.toString(),
          turma_nome: alunoMap.get(avaliacao.aluno_id)!.turma_nome
        } : undefined
      }));

      return resultado;

    } catch (error) {
      console.error('❌ Erro ao buscar avaliações:', error);
      throw error;
    }
  },
  async getAlunosComMediaAcima(turmaId: string, mediaMinima: number): Promise<Array<{ alunoId: string; nome: string; media: number }>> {  
    try {
      const avaliacoes = await db.avaliacoes.filter(av => av.turma_id === turmaId && !av.deleted).toArray();
      const alunos=await db.alunos.filter(e=>!e.deleted).toArray()
      const alunoStats = new Map<string, { soma: number; count: number; nome: string }>();
      avaliacoes.forEach(av => {
        if (av.turma_id === turmaId && av.aluno_id) {
          const aluno = alunoStats.get(av.aluno_id) || { soma: 0, count: 0, nome: '' };
          aluno.soma += av.nota;
          aluno.count += 1;
          if (!aluno.nome) {
            aluno.nome = alunos.find(a=>a.id==av.aluno_id)?.nome_completo || '';
          }
          alunoStats.set(av.aluno_id, aluno);
        } 
      });
      
      const alunosComMedia = Array.from(alunoStats.entries())
        .filter(([_, stats]) => stats.count > 0 && (stats.soma / stats.count) >= mediaMinima)
        .map(([alunoId, stats]) => ({
          alunoId,
          nome: stats.nome,
          media: stats.soma / stats.count
        }));
      
      return alunosComMedia;
    } catch (error) {
      console.error('❌ Erro ao buscar alunos com média acima:', error);
      throw error;
    }
  },

  // ✅ Sincronizar avaliações
  async syncAvaliacoes(lastSync?: Date) {
    try {
      const syncDate = lastSync || new Date(0);
      
      if(navigator.onLine){
       await Promise.all([syncManager.uploadTableBatch('avaliacoes'),
        syncManager.downloadTableBatch('avaliacoes', new Date(0))
        ])
        await this.cleanupOldData();
        return { success: true, timestamp: new Date() };
      }
      
      else throw new Error("sem net")
      
    } catch (error) {
      console.error('❌ Erro ao sincronizar avaliações:', error);
      throw error;
    }
  },

  // ✅ Limpar dados antigos
  async cleanupOldData(daysToKeep = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const avaliacoesAntigas = await db.avaliacoes
        .where('created_at')
        .below(cutoffDate.toISOString())
        .and(av => av.sync_status === 'synced')
        .toArray();

      for (const avaliacao of avaliacoesAntigas) {
        await db.avaliacoes.delete(avaliacao.id);
      }

      } catch (error) {
      console.error('❌ Erro ao limpar dados antigos:', error);
    }
  },

  // ✅ Buscar avaliações por aluno com estatísticas
  async getAvaliacoesByAluno(
    alunoId: string,
    options?: {
      disciplina?: string;
      periodo?: string;
      tipoAvaliacao?: string;
      dataInicio?: string;
      dataFim?: string;
    }
  ): Promise<{
    avaliacoes: Avaliacao[];
    estatisticas: {
      mediaGeral: number;
      totalAvaliacoes: number;
      aprovados: number;
      reprovados: number;
      mediaPorDisciplinaFreque: Record<string, number>;
      evolucao: Array<{ data: string; media: number ;frequencia:number}>;
      estado:string
    };
  }> {
    try {
      let query = db.avaliacoes
        .where('aluno_id')
        .equals(alunoId)
        .and(av => !av.deleted);
      let freque=await db.frequencias.filter(f=> !f.deleted).toArray()
       var aulas= await db.aulas.filter(f=> !f.deleted&&f.status=="ministrada").toArray()

      // Aplicar filtros
      if (options?.disciplina) {
        query = query.filter(av => av.disciplina === options.disciplina);
        aulas = aulas.filter(av => av.disciplina === options.disciplina);
      }
      if (options?.periodo) {
        query = query.filter(av => av.periodo === options.periodo);
      }
      if (options?.tipoAvaliacao) {
        query = query.filter(av => av.tipo_avaliacao === options.tipoAvaliacao);
      }
      if (options?.dataInicio && options?.dataFim) {
        query = query.filter(av => 
          av.data_avaliacao >= options.dataInicio! && 
          av.data_avaliacao <= options.dataFim!
        );
      }

      const avaliacoes = await query.toArray();
      
      // Ordenar por data
      avaliacoes.sort((a, b) => 
        new Date(b.data_avaliacao).getTime() - new Date(a.data_avaliacao).getTime()
      );

      // Calcular estatísticas
      if (avaliacoes.length === 0) {
        return {
          avaliacoes: [],
          estatisticas: {
            mediaGeral: 0,
            totalAvaliacoes: 0,
            aprovados: 0,
            reprovados: 0,
            mediaPorDisciplinaFreque: {},
            evolucao: [],
            estado:"pendemte"
          }
        };
      }

      // Calcular médias por disciplina
      const mediaPorDisciplinaFreque: Record<string, { soma: number; count: number;all: number; presente: number }> = {};
      const evolucaoMap = new Map<string, { soma: number; count: number ;all: number; presente: number}>();
      let totalSoma = 0;
      let aprovados = 0;
      let reprovados = 0;

       const turma=await turmaService.getTurmaById(aulas[0].turma_id)
      const curso= await cursosService.getCoursesById(turma?.curso_id||"")

      avaliacoes.forEach((av:Avaliacao) => {
        // Média por disciplina
        if (!mediaPorDisciplinaFreque[av.disciplina]) {
          mediaPorDisciplinaFreque[av.disciplina] = { soma: 0, count: 0 ,all:0,presente:0};
        }
        let p =freque.filter(p=> p.aula_id==av.id)
        mediaPorDisciplinaFreque[av.disciplina].soma += av.nota;
        mediaPorDisciplinaFreque[av.disciplina].count += 1;
       
        // Estatísticas gerais
        totalSoma += av.nota;
        if (av.nota >= 10) aprovados++;
        else reprovados++;

        // Evolução por mês
        const data = new Date(av.data_avaliacao);
        const mesKey = `${data.getFullYear()}-${(data.getMonth() + 1).toString().padStart(2, '0')}`;
        if (!evolucaoMap.has(mesKey)) {
          evolucaoMap.set(mesKey, { soma: 0, count: 0,all: 0, presente: 0 });
        }
        const evol = evolucaoMap.get(mesKey)!;
        evol.soma += av.nota;
        evol.count += 1;
        freque.filter(f=> f.aluno_id==alunoId && 
        aulas.find(a=>f.aula_id==a.id)?.disciplina==av.disciplina&&
        f.presente).forEach(f=>{
            curso?.disciplinas.forEach((disc)=>{
            if (!mediaPorDisciplinaFreque[disc]) {
              mediaPorDisciplinaFreque[disc] = { soma: 0, count: 0 ,all:0,presente:0};
            }
            mediaPorDisciplinaFreque[disc].all++;
            mediaPorDisciplinaFreque[disc].presente+= f.presente?1:0;
            const data = new Date(f.data_aula);
            const mesKey = `${data.getFullYear()}-${(data.getMonth() + 1).toString().padStart(2, '0')}`;
            if (!evolucaoMap.has(mesKey)) {
              evolucaoMap.set(mesKey, { soma: 0, count: 0,all: 0, presente: 0 });
            }
            const evol = evolucaoMap.get(mesKey)!;
            evol.all += 1;
            evol.presente += 1;
          })
        })
      });
     
      
    
      // Preparar resultado
      const mediaGeral = totalSoma / avaliacoes.length;
      const evolucao = Array.from(evolucaoMap.entries())
        .map(([mes, dados]) => ({
          data: mes,
          media: dados.soma / dados.count,
          frequencia:dados.all/dados.presente
        }))
        .sort((a, b) => a.data.localeCompare(b.data));
        return {
        avaliacoes,
        estatisticas: {
          mediaGeral,
          totalAvaliacoes: avaliacoes.length,
          aprovados,
          reprovados,
          mediaPorDisciplinaFreque: Object.fromEntries(
            Object.entries(mediaPorDisciplinaFreque).map(([disciplina, dados]) => [
              disciplina,
              dados.soma / dados.count
            ])
          ),
          evolucao,
          estado:mediaGeral>=14?"aprovado":mediaGeral>=10?"recuperacao":mediaGeral<10&&mediaGeral>-1?"reprovado":"pendente"
        }
      };

    } catch (error) {
      console.error('❌ Erro ao buscar avaliações do aluno:', error);
      throw error;
    }
  },

  async deleteAvaliacoesByAluno(alunoId: string) {
    const avaliacoes = await db.avaliacoes
      .where('aluno_id')
      .equals(alunoId)
      .and(av => !av.deleted)
      .toArray();

    for (const avaliacao of avaliacoes) {
      avaliacao.deleted = true;
      avaliacao.sync_status = 'pending';
      avaliacao.updated_at = new Date().toISOString();
      await db.avaliacoes.put(avaliacao);

      await db.syncQueue.add({
        table: 'avaliacoes',
        record_id: avaliacao.id,
        operation: 'delete',
        data: JSON.stringify({ id: avaliacao.id }),
        status: 'pending',
        instituicao_id:instituicaoIdValue(),
        created_at: new Date().toISOString()
      });
    }
  },

  async getAvaliacoesByTurma(turmaId: string) {
    return await db.avaliacoes
      .where('turma_id')
      .equals(turmaId)
      .and(av => !av.deleted)
      .toArray();
  },

  // ✅ Estatísticas avançadas
  async getEstatisticasAvancadas(options?: {
    turmaId?: string;
    periodo?: string;
    dataInicio?: string;
    dataFim?: string;
  }): Promise<{
    geral: AvaliacaoStats;
    porDisciplina: DisciplinaStats[];
    topAlunos: Array<{ alunoId: string; nome: string; media: number }>;
    evolucaoTemporal: Array<{ periodo: string; media: number }>;
  }> {
    try {
      let avaliacoes = await this.getAllAvaliacoes({ includeDeleted: false });

      // Aplicar filtros
      if (options?.turmaId) {
        // Filtrar por turma (precisaria de join com alunos)
        const alunosTurma = await db.alunos
          .where('turma_id')
          .equals(options.turmaId)
          .and(aluno => !aluno.deleted)
          .toArray();
        
        const alunoIds = new Set(alunosTurma.map(a => a.id));
        avaliacoes = avaliacoes.filter(av => alunoIds.has(av.aluno_id));
      }

      if (options?.dataInicio && options?.dataFim) {
        avaliacoes = avaliacoes.filter(av => 
          av.data_avaliacao >= options.dataInicio! && 
          av.data_avaliacao <= options.dataFim!
        );
      }

      // Calcular estatísticas gerais
      const totalNotas = avaliacoes.length;
      const somaNotas = avaliacoes.reduce((sum, av) => sum + av.nota, 0);
      const mediaGeral = totalNotas > 0 ? somaNotas / totalNotas : 0;
      const aprovados = avaliacoes.filter(av => av.nota >= 10).length;
      const reprovados = totalNotas - aprovados;

      // Distribuição de notas (0-20)
      const distribuicaoNotas: Record<number, number> = {};
      for (let i = 0; i <= 20; i++) {
        distribuicaoNotas[i] = avaliacoes.filter(av => Math.round(av.nota) === i).length;
      }

      // Estatísticas por disciplina
      const disciplinasMap = new Map<string, DisciplinaStats>();
      avaliacoes.forEach(av => {
        if (!disciplinasMap.has(av.disciplina)) {
          disciplinasMap.set(av.disciplina, {
            nome: av.disciplina,
            media: 0,
            totalAvaliacoes: 0,
            aprovados: 0,
            reprovados: 0,
            melhorNota: 0,
            piorNota: 20,
            historico: []
          });
        }

        const stats = disciplinasMap.get(av.disciplina)!;
        stats.totalAvaliacoes += 1;
        stats.media += av.nota;
        if (av.nota >= 10) stats.aprovados += 1;
        else stats.reprovados += 1;
        stats.melhorNota = Math.max(stats.melhorNota, av.nota);
        stats.piorNota = Math.min(stats.piorNota, av.nota);
        stats.historico.push({
          data: av.data_avaliacao,
          nota: av.nota
        });
      });

      // Calcular médias finais
      const porDisciplina = Array.from(disciplinasMap.values()).map(stats => ({
        ...stats,
        media: stats.media / stats.totalAvaliacoes,
        historico: stats.historico.sort((a, b) => a.data.localeCompare(b.data))
      }));

      // Top alunos (média geral)
      const alunoStats = new Map<string, { soma: number; count: number; nome: string }>();
      avaliacoes.forEach(av => {
        const aluno = alunoStats.get(av.aluno_id) || { soma: 0, count: 0, nome: '' };
        aluno.soma += av.nota;
        aluno.count += 1;
        // Buscar nome do aluno se necessário
        alunoStats.set(av.aluno_id, aluno);
      });

      const topAlunos = Array.from(alunoStats.entries())
        .map(([alunoId, stats]) => ({
          alunoId,
          nome: stats.nome || alunoId,
          media: stats.soma / stats.count
        }))
        .sort((a, b) => b.media - a.media)
        .slice(0, 10);

      // Evolução temporal
      const evolucaoMap = new Map<string, { soma: number; count: number }>();
      avaliacoes.forEach(av => {
        const periodo = av.periodo;
        if (!evolucaoMap.has(periodo)) {
          evolucaoMap.set(periodo, { soma: 0, count: 0 });
        }
        const evol = evolucaoMap.get(periodo)!;
        evol.soma += av.nota;
        evol.count += 1;
      });

      const evolucaoTemporal = Array.from(evolucaoMap.entries())
        .map(([periodo, dados]) => ({
          periodo,
          media: dados.soma / dados.count
        }))
        .sort((a, b) => a.periodo.localeCompare(b.periodo));

      return {
        geral: {
          totalAvaliacoes: totalNotas,
          mediaGeral,
          aprovados,
          reprovados,
          distribuicaoNotas,
          melhorMedia: porDisciplina.length > 0 
            ? Math.max(...porDisciplina.map(d => d.media))
            : 0,
          piorMedia: porDisciplina.length > 0 
            ? Math.min(...porDisciplina.map(d => d.media))
            : 0
        },
        porDisciplina,
        topAlunos,
        evolucaoTemporal
      };

    } catch (error) {
      console.error('❌ Erro ao calcular estatísticas:', error);
      throw error;
    }
  },

  // ✅ Exportar dados
  async exportData(format: 'csv' | 'json' | 'pdf', options?: {
    alunoIds?: string[];
    turmaId?: string;
    dataInicio?: string;
    dataFim?: string;
  }): Promise<string> {
    try {
      let avaliacoes = await this.getAllAvaliacoes({ includeDeleted: false });

      // Aplicar filtros
      if (options?.alunoIds) {
        const alunoIdsSet = new Set(options.alunoIds);
        avaliacoes = avaliacoes.filter(av => alunoIdsSet.has(av.aluno_id));
      }

      if (options?.turmaId) {
        // Implementar filtro por turma
      }

      if (options?.dataInicio && options?.dataFim) {
        avaliacoes = avaliacoes.filter(av => 
          av.data_avaliacao >= options.dataInicio! && 
          av.data_avaliacao <= options.dataFim!
        );
      }

      switch (format) {
        case 'csv':
          return this.exportToCSV(avaliacoes);
        case 'json':
          return JSON.stringify(avaliacoes, null, 2);
        case 'pdf':
          // Implementar geração de PDF
          throw new Error('Exportação PDF ainda não implementada');
        default:
          throw new Error('Formato de exportação não suportado');
      }

    } catch (error) {
      console.error('❌ Erro ao exportar dados:', error);
      throw error;
    }
  },

  // ✅ Exportar para CSV
   async exportToCSV(avaliacoes: AvaliacaoWithAluno[]): Promise<string> {
    const headers = [
      'Aluno',
      'Número',
      'Turma',
      'Disciplina',
      'Tipo Avaliação',
      'Nota',
      'Data',
      'Período',
      'Observações'
    ];

    const rows = avaliacoes.map(av => [
      av.aluno?.nome_completo || '',
      av.aluno?.numero_estudante || '',
      av.aluno?.turma_nome || '',
      av.disciplina,
      av.tipo_avaliacao,
      av.nota.toString(),
      av.data_avaliacao,
      av.periodo,
      av.observacoes || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return csvContent;
  },

  // ✅ Métodos CRUD básicos (mantidos para compatibilidade)
  async atualizarAvaliacao(id: string, updates: Partial<AvaliacaoFormData>) {
    try {
      const updated_at = new Date().toISOString();
     
      await db.avaliacoes.update(id, {
        ...updates,
        updated_at,
        sync_status: 'pending',
      });
      emitDbChanged('avaliacoes', 'update');

      await db.syncQueue.add({
        table: 'avaliacoes',
        record_id: id,
        instituicao_id:instituicaoIdValue(),
        operation: 'upsert',
        status: 'pending',
        created_at: updated_at,
      });
      
      return await db.avaliacoes.get(id);
      
    } catch (error) {
      console.error('Erro ao atualizar avaliação:', error);
      throw error;
    }
  },

  async deletarAvaliacao(id: string) {
    try {
      const avaliacao = await db.avaliacoes.get(id);
      if (!avaliacao) return;

      await db.avaliacoes.update(id, { 
        deleted: true, 
        sync_status: 'pending_delete',
        updated_at: new Date().toISOString()
      });
      emitDbChanged('avaliacoes', 'delete');
      
      await db.syncQueue.add({
        table: 'avaliacoes',
        record_id: id,
        instituicao_id:instituicaoIdValue(),
        operation: 'delete',
        status: 'pending',
        created_at: new Date().toISOString(),
      });
      
      } catch (error) {
      console.error('Erro ao deletar avaliação:', error);
      throw error;
    }
  },

  async getAvaliacaoById(id: string): Promise<Avaliacao | undefined> {
    try {
      const avaliacao = await db.avaliacoes.get(id);
      return avaliacao && !avaliacao.deleted ? avaliacao : undefined;
    } catch (error) {
      console.error('Erro ao buscar avaliação por ID:', error);
      return undefined;
    }
  },

  // ✅ Monitoramento de performance
  async getPerformanceMetrics() {
    try {
      const avaliacoes = await db.avaliacoes.toArray();
      const ativas = avaliacoes.filter(a => !a.deleted);
      const pendentes = await db.syncQueue
        .where('instituicao_id')
        .equals(instituicaoIdValue())
        .and(item => item.table === 'avaliacoes' && item.status === 'pending')
        .count();

      return {
        totalRegistros: avaliacoes.length,
        registrosAtivos: ativas.length,
        sincronizacoesPendentes: pendentes,
        taxaDisponibilidade: (ativas.length / Math.max(avaliacoes.length, 1)) * 100,
        tempoMedioResposta: 'OK',
        ultimaSincronizacao: new Date().toISOString()
      };
    } catch (error) {
      console.error('❌ Erro ao coletar métricas:', error);
      return {
        totalRegistros: 0,
        registrosAtivos: 0,
        sincronizacoesPendentes: 0,
        taxaDisponibilidade: 0,
        tempoMedioResposta: 'ERROR',
        ultimaSincronizacao: new Date().toISOString()
      };
    }
  }
};
