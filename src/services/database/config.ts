import db from "./db";

import { 

  AcademyConfig, 
  PaymentConfig, 
  TipoAvaliacao,
  HorarioConfig,
  SistemaAvaliacao, 
  SystemConfig,
  SystemConfigFormData
} from "../../types/config";
import { instituicaoService } from "./insitituicao";
import { profileService } from "./profileService";
import { instituicaoIdValue } from "../../utils/getInsitituicaoID";

export const configService = {
  normalizeIdentityPart(value: string): string {
    return (value || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");
  },

  buildConfigIdentityId(instituicaoId: string, category: string, keyName: string): string {
    const inst = this.normalizeIdentityPart(instituicaoId);
    const cat = this.normalizeIdentityPart(category);
    const key = this.normalizeIdentityPart(keyName);
    return `local_cfg_${inst}_${cat}_${key}`;
  },

  isUuid(value?: string | null): boolean {
    if (!value) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  },

  async resolveUpdatedByUuid(rawUpdatedBy?: string): Promise<string | undefined> {
    if (this.isUuid(rawUpdatedBy)) return rawUpdatedBy;

    const localUserId = localStorage.getItem('user_id');
    if (this.isUuid(localUserId)) return localUserId as string;

    const instituicaoId = instituicaoIdValue();
    if (this.isUuid(instituicaoId)) return instituicaoId;

    const userProfileRaw = localStorage.getItem('user_profile');
    if (userProfileRaw) {
      try {
        const userProfile = JSON.parse(userProfileRaw);
        if (this.isUuid(userProfile?.id)) return userProfile.id;
      } catch {
        
      }
    }

    const profile = await profileService.getLocalProfile();
    if (this.isUuid(profile?.id)) return profile?.id;

    return undefined;
  },

  async resolveInstituicaoId(preferredId?: string): Promise<string> {
    const defaultId = "local_default_instituicao";
    if (preferredId) {
      localStorage.setItem("active_instituicao_id", preferredId);
      return preferredId;
    }

    const active = instituicaoIdValue();
    if (active && active !== defaultId) return active;

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
      localStorage.setItem("active_instituicao_id", defaultId);
    }
    return active || defaultId;
  },

  
  async getAllConfigOnly(): Promise<SystemConfig[]> {
    try {
      const instituicaoId = await this.resolveInstituicaoId();
      const configs = await db.system_config
        .where('instituicao_id')
        .equals(instituicaoId)
        .and(config=> !config.deleted)
        .toArray();
      
      return configs || [];
    } catch (error) {
      console.error('Erro ao buscar configurações:', error);
      throw error;
    }
  },

  async getAllConfigs() {
    try {
      const [instituicaoData, system_configs] = await Promise.all([
        instituicaoService.getConfig(),
        this.getAllConfigOnly()
      ]);

      return {
        instituicao: instituicaoData,
        system: system_configs
      };
    } catch (error) {
      console.error('Erro ao buscar todas as configurações:', error);
      throw error;
    }
  },

  
  getConfigValueFromArray<T>(
    configArray: SystemConfig[], 
    key: string, 
    defaultValue: T
  ): T {
    if (!configArray || !Array.isArray(configArray)) {
      return defaultValue;
    }
    
    const config = configArray.find(item => item.key_name === key);
    
    if (!config || config.value === undefined || config.value === null) {
      return defaultValue;
    }
    
    
    try {
      switch (config.data_type) {
        case 'number':
          return Number(config.value) as T;
        case 'boolean':
          return Boolean(config.value) as T;
        case 'array':
          return Array.isArray(config.value) ? config.value as T : defaultValue;
        case 'object':
          return typeof config.value === 'object' && config.value !== null ? config.value as T : defaultValue;
        default:
          return config.value as T;
      }
    } catch {
      return defaultValue;
    }
  },

  
  async getConfigByCategory(category: string): Promise<SystemConfig[]> {
    try {
      const instituicaoId = await this.resolveInstituicaoId();
      const configs = await db.system_config
        .where('category')
        .equals(category)
        .and(config=> !config.deleted && instituicaoId===config.instituicao_id)
        .toArray();
      
      return configs || [];
    } catch (error) {
      console.error(`Erro ao buscar configurações da categoria ${category}:`, error);
      throw error;
    }
  },

  
  async getConfigValue<T>(
    category: string, 
    key: string, 
    defaultValue?: T
  ): Promise<T> {
    try {
     const instituicaoId = await this.resolveInstituicaoId();
     const config = await db.system_config
      .where('category')
      .equals(category)
      .and(item => item.key_name === key && item.deleted === false && item.instituicao_id === instituicaoId)
      .first();

      if (!config || config.value === undefined) {
        return defaultValue as T;
      }

      
      switch (config.data_type) {
        case 'number':
          return Number(config.value) as T;
        case 'boolean':
          return Boolean(config.value) as T;
        case 'array':
          return (Array.isArray(config.value) ? config.value : defaultValue) as T;
        case 'object':
          return (typeof config.value === 'object' && config.value !== null ? config.value : defaultValue) as T;
        default:
          return config.value as T;
      }
    } catch (error) {
      console.error(`Erro ao buscar ${category}.${key}:`, error);
      return defaultValue as T;
    }
  },

  
  async setConfig(dataConfig: SystemConfigFormData): Promise<void> {
    try {
      const now = new Date().toISOString();
      const instituicaoId = await this.resolveInstituicaoId(dataConfig.instituicao_id);
      const updatedBy = await this.resolveUpdatedByUuid(dataConfig.updated_by);
      const deterministicId = this.buildConfigIdentityId(
        instituicaoId,
        dataConfig.category,
        dataConfig.key_name
      );
      
      
      const sameIdentityConfigs = await db.system_config
        .where('category')
        .equals(dataConfig.category)
        .and((item) =>
          item.key_name === dataConfig.key_name &&
          item.instituicao_id === instituicaoId
        )
        .toArray();

      const activeConfigs = sameIdentityConfigs.filter((item) => !item.deleted);
      const [existingConfig] = activeConfigs.sort((a, b) => {
        const aTime = new Date(a.updated_at || a.created_at || 0).getTime();
        const bTime = new Date(b.updated_at || b.created_at || 0).getTime();
        return bTime - aTime;
      });

      const configToSave = {
        ...dataConfig,
        instituicao_id: instituicaoId,
        updated_at: now,
        sync_status: 'pending' as const,
        deleted: false,
        updated_by: updatedBy
      } as SystemConfig;

      if (existingConfig) {
        
        configToSave.id = existingConfig.id;
        configToSave.created_at = existingConfig.created_at;
      } else {
        
        configToSave.id = deterministicId;
        configToSave.created_at = now;
      }

      await db.system_config.put(configToSave as SystemConfig);

      
      const duplicateIds = activeConfigs
        .map((item) => item.id)
        .filter((id) => id !== configToSave.id);
      if (duplicateIds.length > 0) {
        await db.system_config.bulkDelete(duplicateIds);
        for (const duplicateId of duplicateIds) {
          await db.syncQueue
            .where('record_id')
            .equals(duplicateId)
            .and((item) => item.instituicao_id === instituicaoId)
            .delete();
        }
      }

      
      const hasPendingUpsert = await db.syncQueue
        .where('table')
        .equals('system_config')
        .and((item) =>
          item.record_id === configToSave.id &&
          item.operation === 'upsert' &&
          item.status === 'pending' &&
          item.instituicao_id === instituicaoId
        )
        .first();

      if (!hasPendingUpsert) {
      await db.syncQueue.add({
        table: 'system_config',
        
        record_id: configToSave.id,
        operation: 'upsert',
        status: 'pending',
        instituicao_id: instituicaoId,
        created_at: now
      });
      }

      } catch (error) {
      console.error(`Erro em ${dataConfig.category}.${dataConfig.key_name}:`, error);
      throw error;
    }
  },

  
  async getAcademyConfig(): Promise<AcademyConfig> {
    try {
      const [instituicao, academicConfig] = await Promise.all([
        instituicaoService.getConfig(),
        this.getConfigByCategory('academic')
      ]);

      return {
        tiposAvaliacao: this.getConfigValueFromArray<TipoAvaliacao[]>(
          academicConfig, 
          'assessment_types', 
          [
            { id: 1, nome: 'Teste Escrito', notaMax: 20, cor: '#3B82F6' },
            { id: 2, nome: 'Participação', notaMax: 5, cor: '#10B981' },
            { id: 3, nome: 'Trabalho Prático', notaMax: 20, cor: '#F59E0B' }
          ]
        ),
        horario: this.getConfigValueFromArray<HorarioConfig>(
          academicConfig, 
          'working_hours', 
          { hora_inicial: "08:00", hora_final: "17:00" }
        ),
        maxFaltasPermitidas: this.getConfigValueFromArray<number>(
          academicConfig, 
          'max_absences_per_student', 
          200
        ),
        permitirMatriculas: this.getConfigValueFromArray<boolean>(
          academicConfig, 
          'allow_new_enrollments', 
          true
        ),
        sistemaAvaliacao: this.getConfigValueFromArray<SistemaAvaliacao>(
          academicConfig, 
          'grading_system', 
          { min_approval: 10, scale: 20 }
        ),
        maxAlunosTurma: this.getConfigValueFromArray<number>(
          academicConfig, 
          'max_students_per_class', 
          45
        ),
        usarFrequenciaNaSituacaoNotas: this.getConfigValueFromArray<boolean>(
          academicConfig,
          'use_attendance_in_grade_status',
          false
        ),
        frequenciaMinimaAprovacao: this.getConfigValueFromArray<number>(
          academicConfig,
          'minimum_attendance_for_approval',
          0
        )
      };
    } catch (error) {
      console.error('Erro ao buscar configurações acadêmicas:', error);
      return this.getDefaultAcademyConfig();
    }
  },

  async updateAcademyConfig(academicConfig: AcademyConfig): Promise<void> {
    try {
      const updates = [
        this.setConfig({
          category: 'academic',
          key_name: 'assessment_types',
          value: academicConfig.tiposAvaliacao,
          data_type: 'array',
          description: 'Tipos de avaliação disponíveis',
          updated_by: 'user',
          instituicao_id:instituicaoIdValue()||""
        }),
        this.setConfig({
          category: 'academic',
          key_name: 'max_absences_per_student',
          value: academicConfig.maxFaltasPermitidas,
          data_type: 'number',
          description: 'Máximo de faltas permitidas por aluno',
          updated_by: 'user',
          instituicao_id:instituicaoIdValue()||""
        }),
        this.setConfig({
          category: 'academic',
          key_name: 'working_hours',
          value: academicConfig.horario,
          data_type: 'object',
          description: 'Horário de funcionamento da instituição',
          updated_by: 'user',
          instituicao_id:instituicaoIdValue()||""
        }),
        this.setConfig({
          category: 'academic',
          key_name: 'allow_new_enrollments',
          value: academicConfig.permitirMatriculas,
          data_type: 'boolean',
          description: 'Permitir novas matrículas',
          updated_by: 'user',
          instituicao_id:instituicaoIdValue()||""
        }),
        this.setConfig({
          category: 'academic',
          key_name: 'grading_system',
          value: academicConfig.sistemaAvaliacao,
          data_type: 'object',
          description: 'Sistema de avaliação',
          updated_by: 'user',
          instituicao_id:instituicaoIdValue()||""
        }),
        this.setConfig({
          category: 'academic',
          key_name: 'max_students_per_class',
          value: academicConfig.maxAlunosTurma,
          data_type: 'number',
          description: 'Número máximo de estudantes por turma',
          updated_by: 'user',
          instituicao_id:instituicaoIdValue()||""
        }),
        this.setConfig({
          category: 'academic',
          key_name: 'use_attendance_in_grade_status',
          value: academicConfig.usarFrequenciaNaSituacaoNotas,
          data_type: 'boolean',
          description: 'Controla se a frequência afeta a situação de notas',
          updated_by: 'user',
          instituicao_id: instituicaoIdValue() || ""
        }),
        this.setConfig({
          category: 'academic',
          key_name: 'minimum_attendance_for_approval',
          value: academicConfig.frequenciaMinimaAprovacao,
          data_type: 'number',
          description: 'Percentual mínimo de frequência para aprovação quando a regra estiver ativa',
          updated_by: 'user',
          instituicao_id: instituicaoIdValue() || ""
        })
      ];

      await Promise.all(updates);
      } catch (error) {
      console.error('Erro ao atualizar configurações acadêmicas:', error);
      throw error;
    }
  },

  
  async getPaymentConfig(): Promise<PaymentConfig> {
    try {
      const [instituicao, financeConfigs] = await Promise.all([
        instituicaoService.getConfig(),
        this.getConfigByCategory('finance')
      ]);

      return {
        multaPagamento: this.getConfigValueFromArray<boolean>(
          financeConfigs, 
          'allow_late_fee', 
          false
        ),
        valorPropina: this.getConfigValueFromArray<number>(
          financeConfigs, 
          'propina_value', 
          2500
        ),
        diaVencimento: this.getConfigValueFromArray<number>(
          financeConfigs, 
          'payment_due_day', 
          10
        ),
        diasParaMulta: this.getConfigValueFromArray<number>(
          financeConfigs, 
          'days_until_late_fee', 
          5
        ),
        mesesPagamento: this.getConfigValueFromArray<string[]>(
          financeConfigs, 
          'payment_months', 
          [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
          ]
        ),
        pagamentoPrepago: this.getConfigValueFromArray<boolean>(
          financeConfigs, 
          'prepaid_payment', 
          false
        ),
        permitePagamentoAntecipado: this.getConfigValueFromArray<boolean>(
          financeConfigs, 
          'allow_advance_payment', 
          true
        ),
        multaAtraso: this.getConfigValueFromArray<number>(
          financeConfigs, 
          'late_fee', 
          500
        )
      };
    } catch (error) {
      console.error('Erro ao buscar configurações financeiras:', error);
      return this.getDefaultPaymentConfig();
    }
  },

  async updateFinanceConfig(config: PaymentConfig): Promise<void> {
    try {
      const updates = [
        this.setConfig({
          category: 'finance',
          key_name: 'propina_value',
          value: config.valorPropina,
          data_type: 'number',
          description: 'Valor da propina padrão',
          updated_by: 'user',
          instituicao_id:instituicaoIdValue()||""
        }),
        this.setConfig({
          category: 'finance',
          key_name: 'payment_due_day',
          value: config.diaVencimento,
          data_type: 'number',
          description: 'Dia de vencimento dos pagamentos',
          updated_by: 'user',
          instituicao_id:instituicaoIdValue()||""
        }),
        this.setConfig({
          category: 'finance',
          key_name: 'prepaid_payment',
          value: config.pagamentoPrepago,
          data_type: 'boolean',
          description: 'O pagamento é prepago',
          updated_by: 'user',
          instituicao_id:instituicaoIdValue()||""
        }),
        this.setConfig({
          category: 'finance',
          key_name: 'payment_months',
          value: config.mesesPagamento,
          data_type: 'array',
          description: 'Meses que requerem pagamento',
          updated_by: 'user',
          instituicao_id:instituicaoIdValue()||""
        }),
        this.setConfig({
          category: 'finance',
          key_name: 'allow_advance_payment',
          value: config.permitePagamentoAntecipado,
          data_type: 'boolean',
          description: 'Permitir pagamento antecipado',
          updated_by: 'user',
          instituicao_id:instituicaoIdValue()||""
        }),
        this.setConfig({
          category: 'finance',
          key_name: 'auto_late_fee',
          value: config.multaPagamento,
          data_type: 'boolean',
          description: 'Aplicar multa automaticamente',
          updated_by: 'user',
          instituicao_id:instituicaoIdValue()||""
        }),
        this.setConfig({
          category: 'finance',
          key_name: 'late_fee',
          value: config.multaAtraso,
          data_type: 'number',
          description: 'Valor da multa por atraso',
          updated_by: 'user',
          instituicao_id:instituicaoIdValue()||""
        }),
        this.setConfig({
          category: 'finance',
          key_name: 'days_until_late_fee',
          value: config.diasParaMulta,
          data_type: 'number',
          description: 'Dias após vencimento para aplicar multa',
          updated_by: 'user',
          instituicao_id:instituicaoIdValue()||""
        })
      ];

      await Promise.all(updates);
      } catch (error) {
      console.error('Erro ao atualizar configurações financeiras:', error);
      throw error;
    }
  },

  
  async initializeDefaultConfigs(): Promise<void> {
    try {
      const instituicaoId = await this.resolveInstituicaoId();

      
      const existingCount = await db.system_config
        .where('instituicao_id')
        .equals(instituicaoId)
        .and((item) => !item.deleted)
        .count();
      
      if (existingCount > 0) {
        return;
      }
      const defaultConfigs = [
        
        
        {
          category: 'academic',
          key_name: 'assessment_types',
          value: [ 
            { id: 1, nome: 'Teste Escrito', notaMax: 20, cor: '#3B82F6' },
            { id: 2, nome: 'Participação', notaMax: 5, cor: '#10B981' },
            { id: 3, nome: 'Trabalho Prático', notaMax: 20, cor: '#F59E0B' }
          ],
          data_type: 'array',
          description: 'Tipos de avaliação disponíveis',
          updated_by: 'system',
          instituicao_id:instituicaoIdValue()||""
        },
        {
          category: 'academic',
          key_name: 'max_absences_per_student',
          value: 200,
          data_type: 'number',
          description: 'Máximo de faltas permitidas por aluno',
          updated_by: 'system',
          instituicao_id:instituicaoIdValue()||""
        },
        {
          category: 'academic',
          key_name: 'working_hours',
          value: { hora_inicial: "08:00", hora_final: "17:00" },
          data_type: 'object',
          description: 'Horário de funcionamento da instituição',
          updated_by: 'system',
          instituicao_id:instituicaoIdValue()||""
        },
        {
          category: 'academic',
          key_name: 'allow_new_enrollments',
          value: true,
          data_type: 'boolean',
          description: 'Permitir novas matrículas',
          updated_by: 'system',
          instituicao_id:instituicaoIdValue()||""
        },
        {
          category: 'academic',
          key_name: 'academic_shifts',
          value: ['Manhã', 'Tarde', 'Noite'],
          data_type: 'array',
          description: 'Período Letivo Padrão',
          updated_by: 'system',
          instituicao_id:instituicaoIdValue()||""
        },
        {
          category: 'academic',
          key_name: 'max_students_per_class',
          value: 45,
          data_type: 'number',
          description: 'Número máximo de estudantes por turma',
          updated_by: 'system',
          instituicao_id:instituicaoIdValue()||""
        },
        {
          category: 'academic',
          key_name: 'grading_system',
          value: { min_approval: 10, scale: 20 },
          data_type: 'object',
          description: 'Sistema de avaliação',
          updated_by: 'system',
          instituicao_id:instituicaoIdValue()||""
        },
        {
          category: 'academic',
          key_name: 'academic_periods',
          value: ['1º Trimestre', '2º Trimestre', '3º Trimestre'],
          data_type: 'array',
          description: 'Períodos académicos',
          updated_by: 'system',
          instituicao_id:instituicaoIdValue()||""
        },
        {
          category: 'academic',
          key_name: 'academic_year',
          value: `${new Date().getFullYear() - 1}-${new Date().getFullYear()}`,
          data_type: 'string',
          description: 'Ano letivo atual',
          updated_by: 'system',
          instituicao_id:instituicaoIdValue()||""
        },
        {
          category: 'academic',
          key_name: 'use_attendance_in_grade_status',
          value: false,
          data_type: 'boolean',
          description: 'Controla se a frequência afeta a situação de notas',
          updated_by: 'system',
          instituicao_id:instituicaoIdValue()||""
        },
        {
          category: 'academic',
          key_name: 'minimum_attendance_for_approval',
          value: 0,
          data_type: 'number',
          description: 'Percentual mínimo de frequência para aprovação quando a regra estiver ativa',
          updated_by: 'system',
          instituicao_id:instituicaoIdValue()||""
        },
        
        {
          category: 'finance',
          key_name: 'propina_value',
          value: 2500,
          data_type: 'number',
          description: 'Valor padrão da propina mensal',
          updated_by: 'system',
          instituicao_id:instituicaoIdValue()||""
        },
        {
          category: 'finance',
          key_name: 'prepaid_payment',
          value: false,
          data_type: 'boolean',
          description: 'O pagamento é prepago',
          updated_by: 'system',
          instituicao_id:instituicaoIdValue()||""
        },
        {
          category: 'finance',
          key_name: 'payment_due_day',
          value: 10,
          data_type: 'number',
          description: 'Dia de vencimento dos pagamentos (1-31)',
          updated_by: 'system',
          instituicao_id:instituicaoIdValue()||""
        },
        {
          category: 'finance',
          key_name: 'payment_months',
          value: [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
          ],
          data_type: 'array',
          description: 'Meses que requerem pagamento',
          updated_by: 'system',
          instituicao_id:instituicaoIdValue()||""
        },
        {
          category: 'finance',
          key_name: 'allow_advance_payment',
          value: true,
          data_type: 'boolean',
          description: 'Permitir pagamento antecipado',
          updated_by: 'system',
          instituicao_id:instituicaoIdValue()||""
        },
        {
          category: 'finance',
          key_name: 'auto_late_fee',
          value: false,
          data_type: 'boolean',
          description: 'Aplicar multa automaticamente',
          updated_by: 'system',
          instituicao_id:instituicaoIdValue()||""
        },
        {
          category: 'finance',
          key_name: 'late_fee',
          value: 500,
          data_type: 'number',
          description: 'Valor da multa por atraso',
          updated_by: 'system',
          instituicao_id:instituicaoIdValue()||""
        },
        {
          category: 'finance',
          key_name: 'days_until_late_fee',
          value: 5,
          data_type: 'number',
          description: 'Dias após vencimento para aplicar multa',
          updated_by: 'system',
          instituicao_id:instituicaoIdValue()||""
        },
        
        {
          category: 'general',
          key_name: 'school_name',
          value: 'CETE - Centro de Explicacao Tia Esperanca',
          data_type: 'string',
          description: 'Nome da instituição',
          updated_by: 'system',
          instituicao_id:instituicaoIdValue()||""
        },
        {
          category: 'general',
          key_name: 'currency',
          value: 'AOA',
          data_type: 'string',
          description: 'Moeda padrão',
          updated_by: 'system',
          instituicao_id:instituicaoIdValue()||""
        },
        {
          category: 'general',
          key_name: 'school_phone',
          value: '',
          data_type: 'string',
          description: 'Telefone da escola',
          updated_by: 'system',
          instituicao_id:instituicaoIdValue()||""
        },
        {
          category: 'general',
          key_name: 'school_email',
          value: '',
          data_type: 'string',
          description: 'Email da escola',
          updated_by: 'system',
          instituicao_id:instituicaoIdValue()||""
        },
        {
          category: 'general',
          key_name: 'school_address',
          value: '',
          data_type: 'string',
          description: 'Endereço da escola',
          updated_by: 'system',
          instituicao_id:instituicaoIdValue()||""
        }
      ];

      
      const savePromises = defaultConfigs.map(config => 
        this.setConfig(config)
      );

      await Promise.all(savePromises);
      } catch (error) {
      console.error('❌ Erro ao inicializar configurações padrão:', error);
      throw error;
    }
  },

  
  getDefaultAcademyConfig(): AcademyConfig {
    return {
      tiposAvaliacao: [
        { id: 1, nome: 'Teste Escrito', notaMax: 20, cor: '#3B82F6' },
        { id: 2, nome: 'Participação', notaMax: 5, cor: '#10B981' },
        { id: 3, nome: 'Trabalho Prático', notaMax: 20, cor: '#F59E0B' }
      ],
      horario: { hora_inicial: "08:00", hora_final: "17:00" },
      maxFaltasPermitidas: 200,
      permitirMatriculas: true,
      sistemaAvaliacao: { min_approval: 10, scale: 20 },
      maxAlunosTurma: 45,
      usarFrequenciaNaSituacaoNotas: false,
      frequenciaMinimaAprovacao: 0
    };
  },

  getDefaultPaymentConfig(): PaymentConfig {
    return {
      valorPropina: 2500,
      diaVencimento: 10,
      mesesPagamento: [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ],
      permitePagamentoAntecipado: true,
      multaPagamento: false,
      multaAtraso: 500,
      diasParaMulta: 5,
      pagamentoPrepago: false
    };
  },

  
  async syncConfigs(): Promise<void> {
    try {
      const configsToSync = await db.system_config
        .where('sync_status')
        .anyOf(['pending', 'pending_delete'])
        .toArray();

      for (const config of configsToSync) {
        try {
          
          if (config.sync_status === 'pending_delete') {
            } else {
            }

          
          await db.system_config.update(config.id, {
            sync_status: 'synced',
            updated_at: new Date().toISOString()
          });

          
          await db.syncQueue
            .where('record_id')
            .equals(config.id)
            .delete();

        } catch (syncError) {
          console.error(`Erro ao sincronizar configuração ${config.id}:`, syncError);
          await db.system_config.update(config.id, {
            sync_status: 'failed',
            updated_at: new Date().toISOString()
          });
        }
      }

      } catch (error) {
      console.error('❌ Erro ao sincronizar configurações:', error);
      throw error;
    }
  },

  
  async clearConfigs(): Promise<number> {
    try {
      await db.system_config.clear();
      
      await this.initializeDefaultConfigs();
      
      return 1;
    } catch (error) {
      console.error('❌ Erro ao limpar configurações:', error);
      throw error;
    }
  },

  
  async validateConfigs(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      const configs = await this.getAllConfigOnly();
      
      if (configs.length === 0) {
        errors.push('Nenhuma configuração encontrada');
      }

      
      const requiredConfigs = [
        { category: 'academic', key: 'assessment_types' },
        { category: 'academic', key: 'grading_system' },
        { category: 'finance', key: 'propina_value' },
        { category: 'general', key: 'school_name' },
        { category: 'general', key: 'currency' }
      ];

      for (const required of requiredConfigs) {
        const exists = configs.some(c => 
          c.category === required.category && 
          c.key_name === required.key && 
          !c.deleted
        );
        
        if (!exists) {
          errors.push(`Configuração obrigatória ausente: ${required.category}.${required.key}`);
        }
      }

      return {
        valid: errors.length === 0,
        errors
      };
    } catch (error) {
      errors.push(`Erro na validação: ${error}`);
      return { valid: false, errors };
    }
  }
};
