import db from "./db";
import { Instituicao } from "../../types";
import { profileService } from "./profileService";
import { instituicaoIdValue } from "../../utils/getInsitituicaoID";

const DEFAULT_INSTITUICAO_ID = "local_default_instituicao";

export const instituicaoService = {
  async resolveActiveInstituicaoId(): Promise<string> {
    const active = instituicaoIdValue();
    if (active && active !== DEFAULT_INSTITUICAO_ID) return active;

    const profile = await profileService.getLocalProfile();
    if (profile?.instituicao_id) {
      localStorage.setItem("active_instituicao_id", profile.instituicao_id);
      return profile.instituicao_id;
    }

    const existentes = await db.instituicao
      .filter((item) => !item.deleted)
      .toArray();

    if (existentes.length > 0) {
      const [maisRecente] = existentes.sort(
        (a, b) =>
          new Date(b.updated_at || b.created_at || 0).getTime() -
          new Date(a.updated_at || a.created_at || 0).getTime()
      );
      if (maisRecente?.id) {
        localStorage.setItem("active_instituicao_id", maisRecente.id);
        return maisRecente.id;
      }
    }

    if (!active) {
      localStorage.setItem("active_instituicao_id", DEFAULT_INSTITUICAO_ID);
    }
    return active || DEFAULT_INSTITUICAO_ID;
  },

  
  async getConfig(): Promise<Instituicao> {
    try {
      const activeId = await this.resolveActiveInstituicaoId();
      const instituicao = await db.instituicao.get(activeId);
      
      if (!instituicao || instituicao.deleted) {
        
        return await this.createDefaultConfig(activeId);
      }
      
      localStorage.setItem("active_instituicao_id", instituicao.id);
      return instituicao;
    } catch (error) {
      console.error('Erro ao buscar configuração da instituição:', error);
      const fallbackId = await this.resolveActiveInstituicaoId();
      return await this.createDefaultConfig(fallbackId);
    }
  },

  
  async updateConfig(config: Partial<Instituicao>): Promise<Instituicao> {
    try {
      const now = new Date().toISOString();
      
      
      const id = config.id || (await this.resolveActiveInstituicaoId());
      const existingConfig = id ? await db.instituicao.get(id) : undefined;

      const currentYear = new Date().getFullYear();
      const defaultAnoLectivo = `${currentYear - 1}-${currentYear}`;
      
      const instituicaoAtualizada: Instituicao = {
        
        nome_escola: existingConfig?.nome_escola || 'CETE',
        endereco: existingConfig?.endereco || '',
        email: existingConfig?.email || '',
        numero_telefone: existingConfig?.numero_telefone || '',
        whatsapp: existingConfig?.whatsapp || '',
        ano_lectivo: existingConfig?.ano_lectivo || defaultAnoLectivo,
        valor_cartao: existingConfig?.valor_cartao || 0,
        valor_confirmacao: existingConfig?.valor_confirmacao || 0,
        valor_matricula: existingConfig?.valor_matricula || 0,
        
        
        
        ...config,
        id: existingConfig?.id || id,
        sync_status:existingConfig?.sync_status||"pending",

        
        created_at: existingConfig?.created_at || now,
        updated_at: now
      };

      await db.instituicao.put(instituicaoAtualizada);
      localStorage.setItem("active_instituicao_id", instituicaoAtualizada.id);

      
      await db.syncQueue.add({
        table: 'instituicao',
        instituicao_id: instituicaoAtualizada.id,
        record_id: instituicaoAtualizada.id,
        operation: 'upsert',
        status: 'pending',
        created_at: now
      });

      return instituicaoAtualizada;
    } catch (error) {
      console.error('Erro ao atualizar configuração da instituição:', error);
      throw error;
    }
  },

  
  async createDefaultConfig(preferredId?: string): Promise<Instituicao> {
    try {
      const now = new Date().toISOString();
      const currentYear = new Date().getFullYear();
      const id = preferredId || (await this.resolveActiveInstituicaoId()) || DEFAULT_INSTITUICAO_ID;
      const existente = await db.instituicao.get(id);
      if (existente && !existente.deleted) {
        localStorage.setItem("active_instituicao_id", existente.id);
        return existente;
      }

      const defaultConfig: Instituicao = {
        nome_escola: 'CETE - Centro de Explicação Tia Esperança',
        endereco: '',
        email: '',
        numero_telefone: '',
        whatsapp: '',
        ano_lectivo: `${currentYear - 1}-${currentYear}`,
        valor_cartao: 500,
        valor_confirmacao: 1000,
        valor_matricula: 2500,
        created_at: now,
        updated_at: now,
        id: id,
        sync_status: "pending"
      };

      await db.instituicao.put(defaultConfig);
      localStorage.setItem("active_instituicao_id", id);

      
      await db.syncQueue.add({
        table: 'instituicao',
        record_id: id,
        instituicao_id: id,
        operation: 'upsert',
        status: 'pending',
        created_at: now
      });

      return defaultConfig;
    } catch (error) {
      console.error('❌ Erro ao criar configuração padrão:', error);
      
      const fallbackId = preferredId || instituicaoIdValue() || DEFAULT_INSTITUICAO_ID;
      localStorage.setItem("active_instituicao_id", fallbackId);
      return {
        id: fallbackId,
        sync_status:"pending",
        nome_escola: 'CETE',
        ano_lectivo: `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }
  },

  
  async syncInstituicao(): Promise<void> {
    try {
      const id = instituicaoIdValue() || "";
      const instituicao = await db.instituicao.get(id);
      
      if (!instituicao) {
        return;
      }

      try {
        
        
        
        
        
        
        
        
        

        
        await db.syncQueue
          .where('record_id')
          .equals(id)
          .delete();

        } catch (syncError) {
        console.error('❌ Erro ao sincronizar instituição:', syncError);
        throw syncError;
      }
    } catch (error) {
      console.error('❌ Erro ao sincronizar instituição:', error);
      throw error;
    }
  },

  

  
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

  
  async updateValores(valores: {
    valor_cartao?: number;
    valor_confirmacao?: number;
    valor_matricula?: number;
  }): Promise<Instituicao> {
    return this.updateConfig(valores);
  },

  
  async updateContato(contato: {
    endereco?: string;
    email?: string;
    numero_telefone?: string;
    whatsapp?: string;
  }): Promise<Instituicao> {
    return this.updateConfig(contato);
  },

  
  async getAnoLectivo(): Promise<string> {
    const instituicao = await this.getConfig();
    const ano = instituicao.ano_lectivo || '';
    const match = ano.match(/(\d{4})\D+(\d{4})/);
    if (match) return `${match[1]}-${match[2]}`;
    const year = Number(ano);
    if (Number.isFinite(year) && year > 0) return `${year - 1}-${year}`;
    const currentYear = new Date().getFullYear();
    return `${currentYear - 1}-${currentYear}`;
  },

  
  async updateAnoLectivo(ano: string): Promise<Instituicao> {
    return this.updateConfig({ ano_lectivo: ano });
  },

  
  async hasMinimalInfo(): Promise<boolean> {
    const instituicao = await this.getConfig();
    return !!(instituicao.nome_escola && instituicao.ano_lectivo);
  },

  
  async clearConfig(): Promise<void> {
    if (confirm('TEM CERTEZA? Isso apaga a configuração da instituição!')) {
      const id = instituicaoIdValue() || '';
      if (!id) return;
      await db.instituicao.delete(id);
      await db.syncQueue
        .where('record_id')
        .equals(id)
        .delete();
      }
  },

  
  async getNomeEscola(): Promise<string> {
    try {
      const id = instituicaoIdValue() || '';
      const instituicao = id ? await db.instituicao.get(id) : undefined;
      return instituicao?.nome_escola || 'CETE';
    } catch {
      return 'CETE';
    }
  },

  
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
