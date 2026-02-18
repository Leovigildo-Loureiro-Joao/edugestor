import db from "./db";
import { Instituicao } from "../../types";
import { profileService } from "./profileService";
import { instituicaoIdValue } from "../../utils/getInsitituicaoID";
import { generateUniqueId } from "../../utils/idGenarator";

export const instituicaoService = {
  // ============ OBTER CONFIGURAÇÃO ============
  async getConfig(): Promise<Instituicao> {
    try {
      const profile = await profileService.getLocalProfile();
      const activeId = instituicaoIdValue() || profile?.instituicao_id || '';
      const instituicao = activeId ? await db.instituicao.get(activeId) : undefined;
      
      if (!instituicao || instituicao.deleted) {
        // Se não existir, criar configuração padrão minimalista
        return await this.createDefaultConfig();
      }
      
      return instituicao;
    } catch (error) {
      console.error('Erro ao buscar configuração da instituição:', error);
      return await this.createDefaultConfig();
    }
  },

  // ============ ATUALIZAR CONFIGURAÇÃO ============
  async updateConfig(config: Partial<Instituicao>): Promise<Instituicao> {
    try {
      const now = new Date().toISOString();
      
      // Buscar configuração atual
      const id = instituicaoIdValue() || config.id || '';
      const existingConfig = id ? await db.instituicao.get(id) : undefined;
      
      const instituicaoAtualizada: Instituicao = {
        // Manter dados existentes ou usar padrão
        nome_escola: existingConfig?.nome_escola || 'CETE',
        endereco: existingConfig?.endereco || '',
        email: existingConfig?.email || '',
        numero_telefone: existingConfig?.numero_telefone || '',
        whatsapp: existingConfig?.whatsapp || '',
        ano_lectivo: existingConfig?.ano_lectivo || new Date().getFullYear().toString(),
        valor_cartao: existingConfig?.valor_cartao || 0,
        valor_confirmacao: existingConfig?.valor_confirmacao || 0,
        valor_matricula: existingConfig?.valor_matricula || 0,
        
        
        // Aplicar atualizações
        ...config,
        id: existingConfig?.id || id || generateUniqueId(),
        sync_status:existingConfig?.sync_status||"pending",

        // Campos fixos
        created_at: existingConfig?.created_at || now,
        updated_at: now
      };

      console.log('💾 Atualizando configuração da instituição:', instituicaoAtualizada.nome_escola);
      
      await db.instituicao.put(instituicaoAtualizada);

      // Adicionar à fila de sincronização se necessário
      await db.syncQueue.add({
        table: 'instituicao',
        instituicao_id:instituicaoIdValue(),
        record_id: instituicaoAtualizada.id,
        operation: 'upsert',
        status: 'pending',
        created_at: now
      });

      console.log('✅ Configuração da instituição atualizada');
      
      return instituicaoAtualizada;
    } catch (error) {
      console.error('Erro ao atualizar configuração da instituição:', error);
      throw error;
    }
  },

  // ============ CRIAR CONFIGURAÇÃO PADRÃO ============
  async createDefaultConfig(): Promise<Instituicao> {
    try {
      const now = new Date().toISOString();
      const currentYear = new Date().getFullYear();
      const id=generateUniqueId();
      const defaultConfig: Instituicao = {
        nome_escola: 'CETE - Centro de Explicação Tia Esperança',
        endereco: '',
        email: '',
        numero_telefone: '',
        whatsapp: '',
        ano_lectivo: currentYear.toString(),
        valor_cartao: 500,
        valor_confirmacao: 1000,
        valor_matricula: 2500,
        created_at: now,
        updated_at: now,
        id: id,
        sync_status: "pending"
      };

      console.log('🏫 Criando configuração padrão da instituição');
      
      await db.instituicao.put(defaultConfig);

      // Adicionar à fila de sincronização
      await db.syncQueue.add({
        table: 'instituicao',
        record_id: id,
        instituicao_id:instituicaoIdValue(),
        operation: 'upsert',
        status: 'pending',
        created_at: now
      });

      console.log('✅ Configuração padrão da instituição criada');
      
      return defaultConfig;
    } catch (error) {
      console.error('❌ Erro ao criar configuração padrão:', error);
      // Retornar objeto mínimo em caso de erro
      return {
        nome_escola: 'CETE',
        ano_lectivo: new Date().getFullYear().toString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
  },

  // ============ SINCRONIZAÇÃO SIMPLIFICADA ============
  async syncInstituicao(): Promise<void> {
    try {
      const id = instituicaoIdValue() || "";
      const instituicao = await db.instituicao.get(id);
      
      if (!instituicao) {
        console.log('📭 Nenhuma instituição para sincronizar');
        return;
      }

      console.log('🔄 Sincronizando instituição...');

      try {
        // Aqui você implementaria a sincronização com Supabase
        console.log(`📤 Enviando instituição para servidor: ${instituicao.nome_escola}`);
        // Exemplo:
        // const { error } = await supabase
        //   .from('instituicao')
        //   .upsert({
        //     ...instituicao,
        //     id: 1 // ID fixo no servidor
        //   });
        // if (error) throw error;

        // Remover da fila de sincronização após sucesso
        await db.syncQueue
          .where('record_id')
          .equals(id)
          .delete();

        console.log('✅ Instituição sincronizada com sucesso');
      } catch (syncError) {
        console.error('❌ Erro ao sincronizar instituição:', syncError);
        throw syncError;
      }
    } catch (error) {
      console.error('❌ Erro ao sincronizar instituição:', error);
      throw error;
    }
  },

  // ============ MÉTODOS AUXILIARES OTIMIZADOS ============

  // Verificar se a instituição está configurada
  async isConfigured(): Promise<boolean> {
    try {
      const id = instituicaoIdValue() || '';
      const instituicao = id ? await db.instituicao.get(id) : undefined;
      return !!instituicao?.nome_escola;
    } catch (error) {
      console.error('Erro ao verificar configuração:', error);
      return false;
    }
  },

  // Obter apenas informações básicas
  async getBasicInfo(): Promise<{
    nome_escola: string;
    endereco: string;
    telefone: string;
    email: string;
  }> {
    const instituicao = await this.getConfig();
    return {
      nome_escola: instituicao.nome_escola || 'Instituição não configurada',
      endereco: instituicao.endereco || '',
      telefone: instituicao.numero_telefone || '',
      email: instituicao.email || ''
    };
  },

  // Obter apenas valores financeiros
  async getValores(): Promise<{
    valor_cartao: number;
    valor_confirmacao: number;
    valor_matricula: number;
  }> {
    const instituicao = await this.getConfig();
    return {
      valor_cartao: instituicao.valor_cartao || 0,
      valor_confirmacao: instituicao.valor_confirmacao || 0,
      valor_matricula: instituicao.valor_matricula || 0
    };
  },

  // Atualizar apenas valores financeiros
  async updateValores(valores: {
    valor_cartao?: number;
    valor_confirmacao?: number;
    valor_matricula?: number;
  }): Promise<Instituicao> {
    return this.updateConfig(valores);
  },

  // Atualizar apenas informações de contato
  async updateContato(contato: {
    endereco?: string;
    email?: string;
    numero_telefone?: string;
    whatsapp?: string;
  }): Promise<Instituicao> {
    return this.updateConfig(contato);
  },

  // Obter ano letivo atual
  async getAnoLectivo(): Promise<string> {
    const instituicao = await this.getConfig();
    return instituicao.ano_lectivo || new Date().getFullYear().toString();
  },

  // Atualizar ano letivo
  async updateAnoLectivo(ano: string): Promise<Instituicao> {
    return this.updateConfig({ ano_lectivo: ano });
  },

  // Verificar se tem todas informações mínimas
  async hasMinimalInfo(): Promise<boolean> {
    const instituicao = await this.getConfig();
    return !!(instituicao.nome_escola && instituicao.ano_lectivo);
  },

  // Limpar configuração (apenas para desenvolvimento)
  async clearConfig(): Promise<void> {
    if (confirm('TEM CERTEZA? Isso apaga a configuração da instituição!')) {
      const id = instituicaoIdValue() || '';
      if (!id) return;
      await db.instituicao.delete(id);
      await db.syncQueue
        .where('record_id')
        .equals(id)
        .delete();
      console.log('🧹 Configuração da instituição removida');
    }
  },

  // Método rápido para obter nome da escola
  async getNomeEscola(): Promise<string> {
    try {
      const id = instituicaoIdValue() || '';
      const instituicao = id ? await db.instituicao.get(id) : undefined;
      return instituicao?.nome_escola || 'CETE';
    } catch {
      return 'CETE';
    }
  },

  // Método rápido para obter todos os dados em formato simples
  async getAllData(): Promise<Record<string, any>> {
    const instituicao = await this.getConfig();
    return {
      nome_escola: instituicao.nome_escola,
      endereco: instituicao.endereco,
      email: instituicao.email,
      telefone: instituicao.numero_telefone,
      whatsapp: instituicao.whatsapp,
      ano_lectivo: instituicao.ano_lectivo,
      valores: {
        cartao: instituicao.valor_cartao,
        confirmacao: instituicao.valor_confirmacao,
        matricula: instituicao.valor_matricula
      },
      atualizado: instituicao.updated_at
    };
  }
};
