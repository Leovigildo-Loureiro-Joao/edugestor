import { Meta } from "../../types/eventos";
import { generateUniqueId } from "../../utils/idGenarator";
import db, { supabase } from "./db";
import { transacaoService } from "./transacaoService";
// Você pode criar este utilitário

export const estrategiaService = {
  async getResumoEstrategico() {
    try {
      // Usando Dexie para consultas locais
      const [
        totametasConcluidas,
        tarefasPendentes,
        metasAtrasadas
      ] = await Promise.all([
        // Total de metas concluídas
        db.metas
          .where('status')
          .equals('concluida')
          .count(),
        
        // Tarefas pendentes (assumindo que concluida é booleano)
        db.tarefas
          .where('concluida')
          .equals('true') // Ajuste conforme seu modelo de dados
          .count(),
        
        // Metas atrasadas
        db.metas
          .where('status')
          .equals('pendente')
          .count(),
        
      ]);

      return {
        tarefasPendentes: tarefasPendentes || 0,
        metasConcluidas: totametasConcluidas || 0,
        metasAtrasadas: metasAtrasadas || 0,
        proximasAtividades: [] // Implementar lógica conforme necessário
      };
    } catch (error) {
      console.error('Erro ao buscar resumo estratégico:', error);
      throw error;
    }
  },

  async getTarefas() {
    try {
      const tarefas = await db.tarefas
        .orderBy('created_at')
        .reverse()
        .toArray();
      
      return tarefas || [];
    } catch (error) {
      console.error('Erro ao buscar tarefas:', error);
      throw error;
    }
  },

  async saveTarefa(tarefaData: any) {
    try {
      const id = generateUniqueId();
      const now = new Date().toISOString();
      
      const tarefa = {
        ...tarefaData,
        id,
        created_at: now,
        updated_at: now,
        sync_status: 'pending',
        deleted: false,
      };

      console.log('💾 Salvando tarefa:', tarefa.titulo || tarefa.descricao);
      
      await db.tarefas.put(tarefa);
      
      // Adicionar à fila de sincronização
      await db.syncQueue.add({
        table: 'tarefas',
        record_id: id,
        operation: 'upsert',
        status: 'pending',
        created_at: now
      });

      console.log('✅ Tarefa salva com ID:', id);
      return id;
      
    } catch (error) {
      console.error('❌ Erro ao salvar tarefa:', error);
      throw error;
    }
  },

 async updateRotinaStatus(rotinaId: string, status: string) {
    return this.updateRotina(rotinaId, { status });
  }, 


  async getMetas() {
    try {
      const metas = await db.metas
        .orderBy('created_at')
        .toArray();
      
      return metas || [];
    } catch (error) {
      console.error('Erro ao buscar metas:', error);
      throw error;
    }
  },

    async getMetasID(id:string) {
    try {
      const metas = await db.metas
        .orderBy('created_at')
        .and(a=>a.id===id)
        .toArray();
      
      return metas[0] || [];
    } catch (error) {
      console.error('Erro ao buscar metas:', error);
      throw error;
    }
  },

  async saveMeta(metaData: any) {
    try {
      const id = generateUniqueId();
      const now = new Date().toISOString();
      
      const meta = {
        ...metaData,
        id,
        created_at: now,
        updated_at: now,
        sync_status: 'pending',
        deleted: false,
      };

      console.log('💾 Salvando meta:', meta.titulo || meta.descricao);
      
      await db.metas.put(meta);
      
      // Adicionar à fila de sincronização
      await db.syncQueue.add({
        table: 'metas',
        record_id: id,
        operation: 'upsert',
        status: 'pending',
        created_at: now
      });

      console.log('✅ Meta salva com ID:', id);
      return id;
      
    } catch (error) {
      console.error('❌ Erro ao salvar meta:', error);
      throw error;
    }
  },

  async getRotinasDiarias() {
    try {
      const rotinas = await db.rotinas
        .orderBy('created_at')
        .toArray();
      
      return rotinas || [];
    } catch (error) {
      console.error('Erro ao buscar rotinas:', error);
      throw error;
    }
  },

  async saveRotina(rotinaData: any) {
    try {
      const id = generateUniqueId();
      const now = new Date().toISOString();
      
      const rotina = {
        ...rotinaData,
        id,
        created_at: now,
        updated_at: now,
        sync_status: 'pending',
        deleted: false,
      };

      console.log('💾 Salvando rotina:', rotina.titulo || rotina.descricao);
      
      await db.rotinas.put(rotina);
      
      // Adicionar à fila de sincronização
      await db.syncQueue.add({
        table: 'rotinas',
        record_id: id,
        operation: 'upsert',
        status: 'pending',
        created_at: now
      });

      console.log('✅ Rotina salva com ID:', id);
      return id;
      
    } catch (error) {
      console.error('❌ Erro ao salvar rotina:', error);
      throw error;
    }
  },



  async updateTarefaStatus(tarefaId: string, concluida: string) {
    return this.updateTarefa(tarefaId, { status: concluida });
  },

  async executarRotina(rotinaId: string) {
    try {
      const updated_at = new Date().toISOString();
      
      await db.rotinas.update(rotinaId, {
        status: 'suspensa',
        updated_at,
        sync_status: 'pending'
      });

      // Adicionar/atualizar na fila de sincronização
      await db.syncQueue.add({
        table: 'rotinas',
        record_id: rotinaId,
        operation: 'upsert',
        status: 'pending',
        created_at: updated_at
      });

      console.log(`✅ Rotina ${rotinaId} executada`);
      
      return { success: true, id: rotinaId };
    } catch (error) {
      console.error('Erro ao executar rotina:', error);
      throw error;
    }
  },

  // Métodos para sincronização
  async syncTarefas() {
    // Implementar conforme necessário usando syncManager
    console.log('Sync tarefas...');
  },

  async syncMetas() {
    console.log('Sync metas...');
  },

  async syncRotinas() {
    console.log('Sync rotinas...');
  },

  async syncPlanosAcao() {
    console.log('Sync planos de ação...');
  },

  // Métodos para deletar (soft delete)
  async deleteTarefa(id: string) {
    await this.markForDelete('tarefas', id);
  },

  async deleteMeta(id: string) {
    await this.markForDelete('metas', id);
  },

  async deleteRotina(id: string) {
    await this.markForDelete('rotinas', id);
  },


  async updateTarefa(tarefaId: string, tarefaData: Partial<any>) {
    try {
      const updated_at = new Date().toISOString();
      
      await db.tarefas.update(tarefaId, {
        ...tarefaData,
        updated_at,
        sync_status: 'pending'
      });

      // Adicionar/atualizar na fila de sincronização
      await db.syncQueue.add({
        table: 'tarefas',
        record_id: tarefaId,
        operation: 'upsert',
        status: 'pending',
        created_at: updated_at
      });

      console.log(`✏️ Tarefa ${tarefaId} atualizada`);
      
      return { success: true, id: tarefaId };
    } catch (error) {
      console.error('Erro ao atualizar tarefa:', error);
      throw error;
    }
  },

  // ============ UPDATE PARA METAS ============
  async updateMeta(metaId: string, metaData: Partial<Meta>) {
    try {
      const updated_at = new Date().toISOString();
      
      await db.metas.update(metaId, {
        ...metaData,
        updated_at,
        sync_status: 'pending'
      });

      // Adicionar/atualizar na fila de sincronização
      await db.syncQueue.add({
        table: 'metas',
        record_id: metaId,
        operation: 'upsert',
        status: 'pending',
        created_at: updated_at
      });

      console.log(`✏️ Meta ${metaId} atualizada`);
      
      return { success: true, id: metaId };
    } catch (error) {
      console.error('Erro ao atualizar meta:', error);
      throw error;
    }
  },
  // ============ UPDATE PARA ROTINAS ============
  async updateRotina(rotinaId: string, rotinaData: Partial<any>) {
    try {
      const updated_at = new Date().toISOString();
      
      await db.rotinas.update(rotinaId, {
        ...rotinaData,
        updated_at,
        sync_status: 'pending'
      });

      // Adicionar/atualizar na fila de sincronização
      await db.syncQueue.add({
        table: 'rotinas',
        record_id: rotinaId,
        operation: 'upsert',
        status: 'pending',
        created_at: updated_at
      });

      console.log(`✏️ Rotina ${rotinaId} atualizada`);
      
      return { success: true, id: rotinaId };
    } catch (error) {
      console.error('Erro ao atualizar rotina:', error);
      throw error;
    }
  },


  // Função auxiliar para deletar
  async markForDelete(table: string, id: string) {
    try {
      const record = await db[table].get(id);
      if (!record) return;

      if (record.sync_status === 'synced' && !record.id.startsWith('local_')) {
        // Se já sincronizado, marcar para deleção remota
        await db[table].update(id, { 
          deleted: true, 
          sync_status: 'pending_delete',
          updated_at: new Date().toISOString()
        });
        
        await db.syncQueue.add({
          table,
          record_id: id,
          operation: 'delete',
          status: 'pending',
          created_at: new Date().toISOString()
        });
        
        console.log(`🗑️ ${table} ${id} marcado para deleção remota`);
      } else {
        // Se nunca sincronizado, deletar completamente
        await db[table].delete(id);
        
        // Remover da fila se existir
        await db.syncQueue
          .where('record_id')
          .equals(id)
          .delete();
          
        console.log(`🗑️ ${table} ${id} deletado localmente`);
      }
      
    } catch (error) {
      console.error(`Erro ao deletar ${table}:`, error);
      throw error;
    }
  },

   async updateKPI(metaId: string, kpiId: string, valorAtual: number): Promise<void> {
    try {
      const meta = await this.getMetasID(metaId);
      if (!meta || !meta.kpis) return;

      const kpiIndex = meta.kpis.findIndex(k => k.id === kpiId);
      if (kpiIndex >= 0) {
        meta.kpis[kpiIndex].valor_atual = valorAtual;
        meta.kpis[kpiIndex].ultima_atualizacao = new Date().toISOString();

        // Recalcular progresso da meta
        await this.calcularProgressoMeta(meta);
        
        // Salvar alterações
        await this.updateMeta(metaId, {
          kpis: meta.kpis,
          progresso: meta.progresso
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar KPI:', error);
      throw error;
    }
  },

  /**
   * Adicionar um novo KPI à meta
   */
  async addKPI(metaId: string, kpiData: Omit<Meta['kpis'][0], 'id' | 'ultima_atualizacao'>): Promise<void> {
    try {
      const meta = await this.getMetasID(metaId);
      if (!meta) return;

      const novoKPI: Meta['kpis'][0] = {
        id: generateUniqueId(),
        ...kpiData,
        ultima_atualizacao: new Date().toISOString()
      };

      const kpisAtualizados = meta.kpis ? [...meta.kpis, novoKPI] : [novoKPI];
      
      await this.updateMeta(metaId, { kpis: kpisAtualizados });
    } catch (error) {
      console.error('Erro ao adicionar KPI:', error);
      throw error;
    }
  },

  // ============ MÉTODOS PARA SUB-METAS ============
  
  /**
   * Adicionar uma sub-meta (mini-meta/ ação)
   */
  async addSubMeta(metaId: string, subMetaData: Omit<Meta['submetas'][0], 'id'>): Promise<void> {
    try {
      const meta = await this.getMetasID(metaId);
      if (!meta) return;

      const novaSubMeta: Meta['submetas'][0] = {
        id: generateUniqueId(),
        ...subMetaData,
        status: 'pendente'
      };

      const subMetasAtualizadas = meta.submetas 
        ? [...meta.submetas, novaSubMeta] 
        : [novaSubMeta];
      
      await this.updateMeta(metaId, { submetas: subMetasAtualizadas });
    } catch (error) {
      console.error('Erro ao adicionar sub-meta:', error);
      throw error;
    }
  },

  /**
   * Atualizar status de uma sub-meta
   */
  async updateSubMetaStatus(metaId: string, subMetaId: string, status: Meta['submetas'][0]['status']): Promise<void> {
    try {
      const meta = await this.getMetasID(metaId);
      if (!meta || !meta.submetas) return;

      const subMetaIndex = meta.submetas.findIndex(sm => sm.id === subMetaId);
      if (subMetaIndex >= 0) {
        meta.submetas[subMetaIndex].status = status;
        
        // Se sub-meta foi concluída, podemos atualizar KPIs relacionados
        if (status === 'concluida' && meta.submetas[subMetaIndex].kpis_afetados) {
          // Aqui você poderia adicionar lógica para atualizar KPIs automaticamente
          console.log(`Sub-meta ${subMetaId} concluída - KPIs afetados:`, meta.submetas[subMetaIndex].kpis_afetados);
        }

        await this.updateMeta(metaId, { submetas: meta.submetas });
        await this.calcularProgressoMeta(meta);
      }
    } catch (error) {
      console.error('Erro ao atualizar sub-meta:', error);
      throw error;
    }
  },

  // ============ CÁLCULO DE PROGRESSO ============
  
  /**
   * Calcular progresso da meta baseado em:
   * 1. KPIs (50% do peso)
   * 2. Sub-metas (30% do peso) 
   * 3. Orçamento (20% do peso)
   */
  async calcularProgressoMeta(meta: Meta): Promise<number> {
    let progressoTotal = 0;
    let componentesAtivos = 0;

    // 1. Progresso baseado em KPIs (50%)
    if (meta.kpis && meta.kpis.length > 0) {
      let progressoKPIs = 0;
      let pesoTotal = 0;

      meta.kpis.forEach(kpi => {
        const peso = kpi.peso || 1;
        const progressoKPI = kpi.valor_meta > 0 
          ? Math.min((kpi.valor_atual / kpi.valor_meta) * 100, 100)
          : 0;
        
        progressoKPIs += progressoKPI * peso;
        pesoTotal += peso;
      });

      const mediaKPIs = pesoTotal > 0 ? progressoKPIs / pesoTotal : 0;
      progressoTotal += mediaKPIs * 0.5;
      componentesAtivos++;
    }

    // 2. Progresso baseado em sub-metas (30%)
    if (meta.submetas && meta.submetas.length > 0) {
      const concluidas = meta.submetas.filter(sm => sm.status === 'concluida').length;
      const progressoSubMetas = (concluidas / meta.submetas.length) * 100;
      progressoTotal += progressoSubMetas * 0.3;
      componentesAtivos++;
    }

    // 3. Progresso baseado em orçamento (20%)
    if (meta.orcamento_previsto && meta.orcamento_previsto > 0) {
      const orcamentoAlocado = meta.orcamento_alocado || 0;
      const progressoOrcamento = Math.min((orcamentoAlocado / meta.orcamento_previsto) * 100, 100);
      progressoTotal += progressoOrcamento * 0.2;
      componentesAtivos++;
    }

    // Se não tem nenhum componente, usar 0
    if (componentesAtivos === 0) return 0;

    // Ajustar se não tem todos os componentes
    const fatorAjuste = 3 / componentesAtivos; // 3 = total de componentes possíveis
    const progressoFinal = Math.min(progressoTotal * fatorAjuste, 100);

    return Number(progressoFinal.toFixed(1));
  },

  // ============ ALOCAÇÃO DE RECURSOS ============
  
  /**
   * Alocar recursos (dinheiro) para uma meta
   */
  async alocarRecursos(metaId: string, alocacaoData: {
    valor: number;
    motivo: string;
    tipo: 'complementar' | 'completo' | 'parcial';
    responsavel: string;
  }): Promise<void> {
    try {
      const meta = await this.getMetasID(metaId);
      if (!meta) throw new Error('Meta não encontrada');

      const alocacao = {
        id: generateUniqueId(),
        data: new Date().toISOString(),
        ...alocacaoData
      };

      // Atualizar orçamento alocado
      const novoOrcamentoAlocado = (meta.orcamento_alocado || 0) + alocacaoData.valor;
      
      // Adicionar ao histórico de alocações
      const alocacoesAtualizadas = meta.alocacoes 
        ? [...meta.alocacoes, alocacao] 
        : [alocacao];

      // Atualizar meta
      await this.updateMeta(metaId, {
        orcamento_alocado: novoOrcamentoAlocado,
        alocacoes: alocacoesAtualizadas
      });

      // Criar transação financeira
      await transacaoService.createTransacao({
        categoria: "investimento",
        data: new Date().toISOString(),
        descricao: `Alocação para meta: ${meta.titulo} - ${alocacaoData.motivo}`,
        tipo: 'saida',
        valor: alocacaoData.valor
      });

      // Recalcular progresso
      await this.calcularProgressoMeta(await this.getMetasID(metaId));

      console.log(`💰 ${alocacaoData.valor} AOA alocados para meta ${meta.titulo}`);
    } catch (error) {
      console.error('Erro ao alocar recursos:', error);
      throw error;
    }
  },

  // ============ COLETA AUTOMÁTICA DE DADOS PARA KPIs ============
  
  /**
   * Coletar dados automaticamente para KPIs comuns
   */
  async coletarDadosKPIs(): Promise<void> {
    try {
      console.log('📊 Coletando dados para KPIs...');
      
      const metas = await this.getMetas();
      const hoje = new Date();

      for (const meta of metas) {
        if (!meta.kpis || meta.status === 'concluida' || meta.status === 'suspensa') continue;

        let metaAtualizada = false;
        const kpisAtualizados = [...(meta.kpis || [])];

        for (let i = 0; i < kpisAtualizados.length; i++) {
          const kpi = kpisAtualizados[i];
          
          // Verificar se precisa atualizar baseado na frequência
          const precisaAtualizar = this.verificarNecessidadeAtualizacao(
            kpi.frequencia,
            kpi.ultima_atualizacao
          );

          if (precisaAtualizar && kpi.fonte_dados) {
            const novoValor = await this.calcularValorKPI(kpi.fonte_dados);
            if (novoValor !== null && novoValor !== kpi.valor_atual) {
              kpisAtualizados[i] = {
                ...kpi,
                valor_atual: novoValor,
                ultima_atualizacao: hoje.toISOString()
              };
              metaAtualizada = true;
            }
          }
        }

        if (metaAtualizada) {
          await this.updateMeta(meta.id, { kpis: kpisAtualizados });
          await this.calcularProgressoMeta(meta);
        }
      }

      console.log('✅ Dados de KPIs atualizados');
    } catch (error) {
      console.error('❌ Erro ao coletar dados de KPIs:', error);
    }
  },

  /**
   * Calcular valor para um KPI baseado na fonte de dados
   */
   async calcularValorKPI(fonte: string): Promise<number | null> {
    switch (fonte) {
      case 'matriculas':
        const alunos = await db.alunos.toArray();
        return alunos.filter(a => a.status === 'ativo').length;
        
      case 'frequencia':
        const frequencias = await db.frequencias.toArray();
        if (frequencias.length === 0) return 0;
        const presentes = frequencias.filter(f => f.presente).length;
        return (presentes / frequencias.length) * 100;
        
      // Adicione mais fontes conforme necessário
      default:
        return null;
    }
  },

  /**
   * Verificar se um KPI precisa ser atualizado
   */
   verificarNecessidadeAtualizacao(frequencia: string, ultimaAtualizacao?: string): boolean {
    if (!ultimaAtualizacao) return true;
    
    const agora = new Date();
    const ultima = new Date(ultimaAtualizacao);
    const diffHoras = (agora.getTime() - ultima.getTime()) / (1000 * 60 * 60);
    
    switch (frequencia) {
      case 'diaria': return diffHoras >= 24;
      case 'semanal': return diffHoras >= 168; // 7 dias
      case 'mensal': return diffHoras >= 720; // 30 dias
      case 'trimestral': return diffHoras >= 2160; // 90 dias
      default: return false;
    }
  },

  // ============ MÉTODOS ÚTEIS ADICIONAIS ============
  
  async getMetasAtivas(): Promise<Meta[]> {
    try {
      const metas = await db.metas
        .where('status')
        .anyOf(['nao_iniciada', 'em_andamento'])
        .toArray();
      
      return metas || [];
    } catch (error) {
      console.error('Erro ao buscar metas ativas:', error);
      return [];
    }
  },

  async getMetasPorTipo(tipo: Meta['tipo']): Promise<Meta[]> {
    try {
      const metas = await db.metas
        .where('tipo')
        .equals(tipo)
        .toArray();
      
      return metas || [];
    } catch (error) {
      console.error('Erro ao buscar metas por tipo:', error);
      return [];
    }
  },

  async getMetasPorPrioridade(prioridade: Meta['prioridade']): Promise<Meta[]> {
    try {
      const metas = await db.metas
        .where('prioridade')
        .equals(prioridade)
        .toArray();
      
      return metas || [];
    } catch (error) {
      console.error('Erro ao buscar metas por prioridade:', error);
      return [];
    }
  },

  async verificarPrazosMetas(): Promise<void> {
    try {
      const metas = await this.getMetasAtivas();
      const hoje = new Date();

      for (const meta of metas) {
        const dataFim = new Date(meta.data_fim);
        
        if (hoje > dataFim && meta.status === 'em_andamento') {
          // Meta atrasada
          await this.updateMeta(meta.id, { status: 'atrasada' });
          console.log(`⚠️ Meta "${meta.titulo}" marcada como atrasada`);
        } else if (hoje >= new Date(meta.data_inicio) && meta.status === 'nao_iniciada') {
          // Meta deve iniciar
          await this.updateMeta(meta.id, { status: 'em_andamento' });
          console.log(`▶️ Meta "${meta.titulo}" iniciada automaticamente`);
        }
      }
    } catch (error) {
      console.error('Erro ao verificar prazos:', error);
    }
  },
    async getProgressoEstrategias(): Promise<{
      progressoTotal: number,
        detalhes: {
          metas: {
            progresso:number,
            peso: number,
            total?: number,
            porStatus?: {
                nao_iniciada: number;
                em_andamento: number;
                concluida: number;
                atrasada: number;
            }
          },
          tarefas: {
            progresso: number,
            peso: number,
            total?: number
          },
          rotinas: {
            progresso: number,
            peso: number,
            total?: number
          }
        },
        resumo: {
          nivel: string,
          cor: string,
          mensagem: string,
          alertas: string,
          sugestoes: string
        }
  }> {
    try {
      console.log('📊 Calculando progresso geral das estratégias...');
      
      // Buscar todos os dados
      const [metas, tarefas, rotinas] = await Promise.all([
        this.getMetas(),
        this.getTarefas(),
        this.getRotinasDiarias()
      ]);

      // ============ PROGRESSO DAS METAS ============
      let progressoMetas = 0;
      let metasComProgresso = 0;
      
      // Para cada meta, calcular seu progresso considerando:
      // 1. KPIs (50% do peso da meta)
      // 2. Sub-metas (30% do peso da meta)
      // 3. Orçamento (20% do peso da meta)
      
      for (const meta of metas) {
        if (meta.deleted) continue;
        
        let progressoMetaIndividual = 0;
        let componentesUsados = 0;
        
        // Progresso baseado em KPIs (se existirem)
        if (meta.kpis && meta.kpis.length > 0) {
          let somaKPIs = 0;
          let pesoTotal = 0;
          
          meta.kpis.forEach(kpi => {
            const peso = kpi.peso || 1;
            const progressoKPI = kpi.valor_meta > 0 
              ? Math.min((kpi.valor_atual / kpi.valor_meta) * 100, 100)
              : 0;
            
            somaKPIs += progressoKPI * peso;
            pesoTotal += peso;
          });
          
          const mediaKPIs = pesoTotal > 0 ? somaKPIs / pesoTotal : 0;
          progressoMetaIndividual += mediaKPIs * 0.5; // 50% dos KPIs
          componentesUsados++;
        }
        
        // Progresso baseado em sub-metas (se existirem)
        if (meta.submetas && meta.submetas.length > 0) {
          const subMetasConcluidas = meta.submetas.filter(sm => sm.status === 'concluida').length;
          const progressoSubMetas = (subMetasConcluidas / meta.submetas.length) * 100;
          progressoMetaIndividual += progressoSubMetas * 0.3; // 30% das sub-metas
          componentesUsados++;
        }
        
        // Progresso baseado em orçamento (se existir)
        if (meta.orcamento_previsto && meta.orcamento_previsto > 0) {
          const orcamentoUtilizado = meta.orcamento_alocado || 0;
          const progressoOrcamento = Math.min((orcamentoUtilizado / meta.orcamento_previsto) * 100, 100);
          progressoMetaIndividual += progressoOrcamento * 0.2; // 20% do orçamento
          componentesUsados++;
        }
        
        // Se a meta tem progresso explícito, usar ele como base
        if (meta.progresso !== undefined && meta.progresso !== null) {
          progressoMetaIndividual = meta.progresso;
        }
        
        // Se não tem nenhum componente, considerar 0
        if (componentesUsados === 0) {
          progressoMetaIndividual = 0;
        } else {
          // Ajustar pelo número de componentes usados
          const fator = 3 / componentesUsados; // 3 = total de componentes possíveis
          progressoMetaIndividual = Math.min(progressoMetaIndividual * fator, 100);
        }
        
        // Aplicar peso da prioridade
        let pesoPrioridade = 1;
        switch (meta.prioridade) {
          case 'critica': pesoPrioridade = 1.2; break;
          case 'alta': pesoPrioridade = 1.1; break;
          case 'media': pesoPrioridade = 1.0; break;
          case 'baixa': pesoPrioridade = 0.9; break;
        }
        
        progressoMetas += progressoMetaIndividual * pesoPrioridade;
        metasComProgresso++;
      }
      
      const progressoFinalMetas = metasComProgresso > 0 
        ? progressoMetas / metasComProgresso 
        : 0;

      // ============ PROGRESSO DAS TAREFAS ============
      let progressoTarefas = 0;
      let tarefasAtivas = 0;
      
      for (const tarefa of tarefas) {
        if (tarefa.deleted) continue;
        
        // Se a tarefa tem status explícito de conclusão
        if (tarefa.status === 'concluida') {
          progressoTarefas += 100;
        } 
        // Se tem campo "concluida" booleano
        else if (tarefa.concluida) {
          progressoTarefas += 100;
        }
        // Se tem campo "progresso" numérico
        else if (typeof tarefa.percentual_conclusao === 'number') {
          progressoTarefas += Math.min(tarefa.percentual_conclusao, 100);
        }
        // Se está em andamento
        else if (tarefa.status === 'em_andamento') {
          progressoTarefas += 50; // Valor médio para tarefas em andamento
        }
        // Se não iniciada
        else if (tarefa.status === 'pendente') {
          progressoTarefas += 0;
        }
        // Default
        else {
          progressoTarefas += 0;
        }
        
        tarefasAtivas++;
      }
      
      const progressoFinalTarefas = tarefasAtivas > 0 
        ? progressoTarefas / tarefasAtivas 
        : 0;

      // ============ PROGRESSO DAS ROTINAS ============
      let progressoRotinas = 0;
      let rotinasAtivas = 0;
      
      for (const rotina of rotinas) {
        if (rotina.deleted) continue;
        
        // Considerar status da rotina
        switch (rotina.status) {
          case 'concluida':
            progressoRotinas += 100;
            break;
          case 'em_andamento':
            progressoRotinas += 60; // Valor médio
            break;
          case 'inativa':
            progressoRotinas += 0;
            break;
          case 'suspensa':
            progressoRotinas += 20; // Atrasada mas ainda ativa
            break;
          default:
            progressoRotinas += 0;
        }
        
        rotinasAtivas++;
      }
      
      const progressoFinalRotinas = rotinasAtivas > 0 
        ? progressoRotinas / rotinasAtivas 
        : 0;

      // ============ CÁLCULO FINAL ============
      // Pesos: Metas 50%, Tarefas 30%, Rotinas 20%
      const progressoTotal = (
        (progressoFinalMetas * 0.5) + 
        (progressoFinalTarefas * 0.3) + 
        (progressoFinalRotinas * 0.2)
      );

      // ============ RESUMO POR STATUS ============
      const statusMetas = {
        nao_iniciada: metas.filter(m => !m.deleted && m.status === 'nao_iniciada').length,
        em_andamento: metas.filter(m => !m.deleted && m.status === 'em_andamento').length,
        concluida: metas.filter(m => !m.deleted && m.status === 'concluida').length,
        atrasada: metas.filter(m => !m.deleted && m.status === 'atrasada').length
      };

      // ============ DETERMINAR NÍVEL DE PROGRESSO ============
      let nivelProgresso = '';
      let corProgresso = '';
      
      if (progressoTotal >= 90) {
        nivelProgresso = 'Excelente';
        corProgresso = 'text-green-600';
      } else if (progressoTotal >= 75) {
        nivelProgresso = 'Bom';
        corProgresso = 'text-blue-600';
      } else if (progressoTotal >= 50) {
        nivelProgresso = 'Regular';
        corProgresso = 'text-yellow-600';
      } else if (progressoTotal >= 25) {
        nivelProgresso = 'Preocupante';
        corProgresso = 'text-orange-600';
      } else {
        nivelProgresso = 'Crítico';
        corProgresso = 'text-red-600';
      }

      // ============ GERAR MENSAGEM RESUMO ============
      let mensagemResumo = '';
      
      if (progressoTotal >= 90) {
        mensagemResumo = 'Estratégias avançando muito bem! Continue assim!';
      } else if (progressoTotal >= 75) {
        mensagemResumo = 'Bom progresso! Alguns ajustes podem otimizar ainda mais.';
      } else if (progressoTotal >= 50) {
        mensagemResumo = 'Progresso regular. Foque nas metas prioritárias.';
      } else if (progressoTotal >= 25) {
        mensagemResumo = 'Atenção necessária. Reavalie prazos e recursos.';
      } else {
        mensagemResumo = 'Ação imediata requerida. Revise toda a estratégia.';
      }

      // Adicionar detalhes específicos
      if (statusMetas.atrasada > 0) {
        mensagemResumo += ` ${statusMetas.atrasada} meta(s) atrasada(s).`;
      }
      
      if (statusMetas.nao_iniciada > 0 && progressoTotal < 50) {
        mensagemResumo += ` ${statusMetas.nao_iniciada} meta(s) não iniciada(s).`;
      }

      console.log('✅ Progresso calculado:', {
        total: progressoTotal,
        metas: progressoFinalMetas,
        tarefas: progressoFinalTarefas,
        rotinas: progressoFinalRotinas
      });

      return {
        progressoTotal: Number(progressoTotal.toFixed(1)),
        detalhes: {
          metas: {
            progresso: Number(progressoFinalMetas.toFixed(1)),
            peso: 50,
            total: metas.filter(m => !m.deleted).length,
            porStatus: statusMetas
          },
          tarefas: {
            progresso: Number(progressoFinalTarefas.toFixed(1)),
            peso: 30,
            total: tarefas.filter(t => !t.deleted).length
          },
          rotinas: {
            progresso: Number(progressoFinalRotinas.toFixed(1)),
            peso: 20,
            total: rotinas.filter(r => !r.deleted).length
          }
        },
        resumo: {
          nivel: nivelProgresso,
          cor: corProgresso,
          mensagem: mensagemResumo,
          alertas: statusMetas.atrasada > 0 
            ? `⚠️ ${statusMetas.atrasada} meta(s) atrasada(s)`
            : '',
          sugestoes: this.gerarSugestoesMelhoria(progressoTotal, statusMetas)
        }
      };

    } catch (error) {
      console.error('❌ Erro ao calcular progresso:', error);
      return {
        progressoTotal: 0,
        detalhes: {
          metas: { progresso: 0, peso: 50 },
          tarefas: { progresso: 0, peso: 30 },
          rotinas: { progresso: 0, peso: 20 }
        },
        resumo: {
          nivel: 'Não calculado',
          cor: 'text-gray-600',
          mensagem: 'Erro ao calcular progresso',
          alertas: '',
          sugestoes: ''
        }
      };
    }
  },

  /**
   * Gera sugestões de melhoria baseadas no progresso
   */
   gerarSugestoesMelhoria(
    progressoTotal: number, 
    statusMetas: any
  ): string {
    const sugestoes = [];
    
    if (progressoTotal < 50) {
      sugestoes.push('Foque nas metas de prioridade alta');
      sugestoes.push('Revise prazos e recursos disponíveis');
      sugestoes.push('Divida metas grandes em sub-metas menores');
    }
    
    if (statusMetas.atrasada > 0) {
      sugestoes.push('Atenda primeiro às metas atrasadas');
      sugestoes.push('Considere ajustar prazos ou realocar recursos');
    }
    
    if (statusMetas.nao_iniciada > 0) {
      sugestoes.push('Inicie as metas não iniciadas');
      sugestoes.push('Atribua responsáveis claros para cada meta');
    }
    
    if (progressoTotal > 75 && progressoTotal < 90) {
      sugestoes.push('Mantenha o ritmo atual');
      sugestoes.push('Otimize processos para acelerar conclusão');
    }
    
    if (progressoTotal >= 90) {
      sugestoes.push('Excelente trabalho!');
      sugestoes.push('Considere estabelecer novas metas desafiadoras');
    }
    
    return sugestoes.join('. ');
  },

  /**
   * Função simplificada para dashboard (apenas o progresso total)
   */
  async getProgressoDashboard(): Promise<{
    progresso: number;
    nivel: string;
    cor: string;
  }> {
    try {
      const resultado = await this.getProgressoEstrategias();
      
      return {
        progresso: resultado.progressoTotal,
        nivel: resultado.resumo.nivel,
        cor: resultado.resumo.cor
      };
    } catch (error) {
      console.error('Erro no progresso do dashboard:', error);
      return {
        progresso: 0,
        nivel: 'Erro',
        cor: 'text-gray-600'
      };
    }
  },

  /**
   * Gera relatório detalhado do progresso
   */
  async gerarRelatorioProgresso(): Promise<string> {
    try {
      const progresso = await this.getProgressoEstrategias();
      const dataAtual = new Date().toLocaleDateString('pt-BR');
      
      const relatorio = `
RELATÓRIO DE PROGRESSO ESTRATÉGICO
Data: ${dataAtual}
===================================

PROGRESSO GERAL: ${progresso.progressoTotal}%
Nível: ${progresso.resumo.nivel}

DETALHAMENTO:
-------------
• Metas: ${progresso.detalhes.metas.progresso}% (${progresso.detalhes.metas.peso}% do total)
  - Não iniciadas: ${progresso.detalhes.metas.porStatus?.nao_iniciada}
  - Em andamento: ${progresso.detalhes.metas.porStatus?.em_andamento}
  - Concluídas: ${progresso.detalhes.metas.porStatus?.concluida}
  - Atrasadas: ${progresso.detalhes.metas.porStatus?.atrasada}

• Tarefas: ${progresso.detalhes.tarefas.progresso}% (${progresso.detalhes.tarefas.peso}% do total)
  - Total: ${progresso.detalhes.tarefas.total} tarefas

• Rotinas: ${progresso.detalhes.rotinas.progresso}% (${progresso.detalhes.rotinas.peso}% do total)
  - Total: ${progresso.detalhes.rotinas.total} rotinas

ANÁLISE:
--------
${progresso.resumo.mensagem}

${progresso.resumo.alertas ? 'ALERTAS:\n' + progresso.resumo.alertas + '\n' : ''}
SUGESTÕES:
----------
${progresso.resumo.sugestoes}

Gerado automaticamente pelo Sistema de Gestão Educacional
      `;
      
      return relatorio;
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      return 'Erro ao gerar relatório de progresso.';
    }
  },

  async getMetasAdemicas(){
    const metas=await db.metas.filter(m=>m.tipo=="academica"&&!m.deleted).toArray();
    return metas.map((meta:Meta)=>{
      return {
        label:meta.titulo,
        atual:meta.progresso,
        meta:meta.kpis?.map(
          m =>({
            label:m.nome,
            atual:m.valor_atual,
            meta:m.valor_meta
          })
        )
      }
    })
  },

  /**
   * Retorna estatísticas rápidas para cards do dashboard
   */
  async getEstatisticasRapidas(): Promise<{
    metasTotal: number;
    tarefasPendentes: number;
    rotinasAtivas: number;
    progressoGeral: number;
    proximosPrazos: any[];
  }> {
    try {
      const [metas, tarefas, rotinas, progresso] = await Promise.all([
        this.getMetas(),
        this.getTarefas(),
        this.getRotinasDiarias(),
        this.getProgressoDashboard()
      ]);

      // Metas não deletadas
      const metasAtivas = metas.filter(m => !m.deleted);
      
      // Tarefas pendentes (não concluídas)
      const tarefasPendentes = tarefas.filter(t => 
        !t.deleted && 
        t.status !== 'concluida' && 
        t.concluida !== true
      );

      // Rotinas ativas (não deletadas e não concluídas)
      const rotinasAtivas = rotinas.filter(r => 
        !r.deleted && 
        r.status !== 'concluida'
      );

      // Próximos prazos (metas que terminam nos próximos 7 dias)
      const hoje = new Date();
      const umaSemana = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000);
      
      const proximosPrazos = metasAtivas
        .filter(meta => {
          if (!meta.data_fim || meta.status === 'concluida') return false;
          const dataFim = new Date(meta.data_fim);
          return dataFim > hoje && dataFim <= umaSemana;
        })
        .slice(0, 5) // Limitar a 5
        .map(meta => ({
          id: meta.id,
          titulo: meta.titulo,
          data_fim: meta.data_fim,
          prioridade: meta.prioridade,
          dias_restantes: Math.ceil(
            (new Date(meta.data_fim).getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)
          )
        }));

      return {
        metasTotal: metasAtivas.length,
        tarefasPendentes: tarefasPendentes.length,
        rotinasAtivas: rotinasAtivas.length,
        progressoGeral: progresso.progresso,
        proximosPrazos
      };
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
      return {
        metasTotal: 0,
        tarefasPendentes: 0,
        rotinasAtivas: 0,
        progressoGeral: 0,
        proximosPrazos: []
      };
    }
  },


};