import { AcademyConfig, PaymentConfig, TipoAvaliacao } from "../../types/config";
import { SystemConfig, SystemConfigFormData } from "../../types/config";
import { supabase } from "../supabase/config";
import { instituicaoService } from "./insitituicao";

export const configService = {
  // Buscar todas as configurações
  async getAllConfigOnly(): Promise<SystemConfig[]> {
    const {data,error}= await supabase.from("system_config")
    .select("*");
    if (error) {
        throw error
    }
    return data
  },
   async getAllConfigs() {
    const [instituicaoData, systemConfigs] = await Promise.all([
      instituicaoService.getConfig(),
      this.getAllConfigOnly() // Sua tabela system_config
    ]);

    return {
      instituicao: instituicaoData,
      system: systemConfigs
    };
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
    return config ? config.value : defaultValue;
  },

  // Buscar por categoria
  async getConfigByCategory(category: string): Promise<SystemConfig[]> {
    const {data,error}= await supabase.from("system_config")
    .select("*")
    .eq("category",category);
    if (error) {
        throw error
    }
    return data
  },

  // Buscar valor específico
  async getConfigValue<T>(category: string, key: string, defaultValue?: T): Promise<T> {
    try {
      const configs = await this.getConfigByCategory(category);
      const config = configs.find(c => c.key_name === key);
      return config ? config.value : defaultValue;
    } catch (error) {
      return defaultValue;
    }
  },

 async setConfig(dataConfig: SystemConfigFormData): Promise<void> {
    try {
      const configData = {
        ...dataConfig,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("system_config")
        .upsert(configData, { 
          onConflict: 'category,key_name'
        });

      if (error) {
        console.error(`Erro em ${dataConfig.category}.${dataConfig.key_name}:`, error);
        throw error;
      }

    } catch (error) {
      console.error('Erro em setConfig:', error);
      throw error;
    }
  }
  ,async getAcademyConfig():Promise<AcademyConfig>{
    const [instituicao, academicConfig] = await Promise.all([
      instituicaoService.getConfig(),
      this.getConfigByCategory('academic')
    ]);

    return {
      // Configurações Acadêmicas (da nova tabela system_config)
      tiposAvaliacao: this.getConfigValueFromArray<TipoAvaliacao[]>(academicConfig, 'assessment_types', [ 
         { id: 1, nome: 'Teste Escrito', notaMax: 20, cor: '#3B82F6' },
        { id: 2, nome: 'Participação', notaMax: 5, cor: '#10B981' },
        { id: 3, nome: 'Trabalho Prático', notaMax: 20, cor: '#F59E0B' }
      ]),
      horario: this.getConfigValueFromArray(academicConfig, 'working_hours', { hora_inicial: "08:00", hora_final: "17:00" }),
      maxFaltasPermitidas: this.getConfigValueFromArray(academicConfig, 'max_absences_per_student', 200),
      permitirMatriculas: this.getConfigValueFromArray(academicConfig, 'allow_new_enrollments', true),
      sistemaAvaliacao: this.getConfigValueFromArray(academicConfig, 'grading_system', { min_approval: 10, scale: 20 }),
      maxAlunosTurma: this.getConfigValueFromArray(academicConfig, 'max_students_per_class', 45)
    }
  }  
  ,async updateAcademyConfig(academicConfig:AcademyConfig):Promise<void>{

    const updates = [
      this.setConfig({
        category: 'academic',
        key_name: 'assessment_types',
        value: academicConfig.tiposAvaliacao,
        data_type: 'array',
        description: 'Tipos de avaliação disponíveis'
      }),
      this.setConfig({
        category: 'academic',
        key_name: 'max_absences_per_student',
        value: academicConfig.maxFaltasPermitidas,
        data_type: 'number',
        description: 'Maximo de faltas permitidas por aluno'
      }),
      this.setConfig({
        category: 'academic',
        key_name: 'working_hours',
        value: academicConfig.horario,
        data_type: 'object',
        description: 'Horário de funcionamento da instituição'
      }),
      
      this.setConfig({
        category: 'academic',
        key_name: 'allow_new_enrollments',
        value: academicConfig.permitirMatriculas,
        data_type: 'boolean',
        description: 'Permitir novas matrículas'
      }),
      this.setConfig({
        category: 'academic',
        key_name: 'grading_system',
        value: academicConfig.sistemaAvaliacao,
        data_type: 'object',
        description: 'Sistema de avaliação'
      }),
      this.setConfig({
        category: 'academic',
        key_name: 'max_students_per_class',
        value: academicConfig.maxAlunosTurma,
        data_type: 'number',
        description: 'Número máximo de estudantes por turma'
      })
    ];

    await Promise.all(updates);
  },
  async getPaymentConfig():Promise<PaymentConfig>{
    const [instituicao, financeConfigs] = await Promise.all([
      instituicaoService.getConfig(),
      this.getConfigByCategory('finance')
    ]);

    return {
      
      // Configurações financeiras (da nova tabela system_config)
      multaPagamento:this.getConfigValueFromArray(financeConfigs, 'allow_late_fee', false),
      valorPropina: this.getConfigValueFromArray(financeConfigs, 'propina_value', 2500),
      diaVencimento: this.getConfigValueFromArray(financeConfigs, 'payment_due_day', 10),
      diasParaMulta: this.getConfigValueFromArray(financeConfigs, 'days_until_late_fee', 5),
      mesesPagamento: this.getConfigValueFromArray(financeConfigs, 'payment_months', [
        'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
        'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
      ]),
      pagamentoPrepago: this.getConfigValueFromArray(financeConfigs, 'prepaid_payment', false),
      // Usando a versão mais robusta
      permitePagamentoAntecipado: this.getConfigValueFromArray(financeConfigs, 'allow_advance_payment', true),
      multaAtraso: this.getConfigValueFromArray(financeConfigs,  'late_fee', 500)
    }
  }
,
  async updateFinanceConfig(config: PaymentConfig): Promise<void> {
    const updates = [
      this.setConfig({
        category: 'finance',
        key_name: 'propina_value',
        value: config.valorPropina,
        data_type: 'number',
        description: 'Valor da propina padrão'
      }),
      this.setConfig({
        category: 'finance',
        key_name: 'payment_due_day',
        value: config.diaVencimento,
        data_type: 'number',
        description: 'Dia de vencimento dos pagamentos'
      }),
      this.setConfig({
        category: 'finance',
        key_name: 'prepaid_payment',
        value: config.pagamentoPrepago,
        data_type: 'boolean',
        description: 'O pagamento é prepago'
      }),
      this.setConfig({
        category: 'finance',
        key_name: 'payment_months',
        value: config.mesesPagamento,
        data_type: 'array',
        description: 'Meses que requerem pagamento'
      }),
      this.setConfig({
        category: 'finance',
        key_name: 'allow_advance_payment',
        value: config.permitePagamentoAntecipado,
        data_type: 'boolean',
        description: 'Permitir pagamento antecipado'
      }),
      this.setConfig({
        category: 'finance',
        key_name: 'auto_late_fee',
        value: config.multaPagamento,
        data_type: 'boolean',
        description: 'Aplicar multa automaticamente'
      }),
      this.setConfig({
        category: 'finance',
        key_name: 'late_fee',
        value: config.multaAtraso,
        data_type: 'number',
        description: 'Valor da multa por atraso'
      }),
      this.setConfig({
        category: 'finance',
        key_name: 'days_until_late_fee',
        value: config.diasParaMulta,
        data_type: 'number',
        description: 'Dias após vencimento para aplicar multa'
      })
    ];

    await Promise.all(updates);
  },
  // Configurações padrão do sistema
  async initializeDefaultConfigs(): Promise<void> {
    const defaultConfigs = [
     

      // Configurações Acadêmicas

      
      {
        category: 'academic',
        key_name: 'assessment_types',
        value: [ 
         { id: 1, nome: 'Teste Escrito', notaMax: 20, cor: '#3B82F6' },
        { id: 2, nome: 'Participação', notaMax: 5, cor: '#10B981' },
        { id: 3, nome: 'Trabalho Prático', notaMax: 20, cor: '#F59E0B' }
      ],
        data_type: 'array',
        description: 'Tipos de avaliação disponíveis'
      },
      {
        category: 'academic',
        key_name: 'max_absences_per_student',
        value: 15,
        data_type: 'number',
        description: 'Maximo de faltas permitidas por aluno'
      },
      {
        category: 'academic',
        key_name: 'working_hours',
        value:  { hora_inicial: "08:00", hora_final: "17:00" },
        data_type: 'object',
        description: 'Horário de funcionamento da instituição'
      },
      {
        category: 'academic',
        key_name: 'allow_new_enrollments',
        value: true,
        data_type: 'boolean',
        description: 'Permitir novas matrículas'
      },
       {
        category: 'academic',
        key_name: 'academic_shifts',
        value: ['Manhã', 'Tarde', 'Noite'],
        data_type: 'array',
        description: 'Período Letivo Padrão'
      },
       {
        category: 'academic',
        key_name: 'max_students_per_class',
        value: 45,
        data_type: 'number',
        description: 'Número máximo de estudantes por turma'
      },
      {
        category: 'academic',
        key_name: 'grading_system',
        value: { min_approval: 10, scale: 20 },
        data_type: 'object',
        description: 'Sistema de avaliação'
      },
      {
        category: 'academic',
        key_name: 'academic_periods',
        value: ['1º Trimestre', '2º Trimestre', '3º Trimestre'],
        data_type: 'array',
        description: 'Períodos académicos'
      },
      {
        category: 'academic',
        key_name: 'academic_year',
        value: new Date().getFullYear().toString(),
        data_type: 'string',
        description: 'Ano letivo atual'
      },
       // Configurações Financeiras
      {
        category: 'finance',
        key_name: 'propina_value',
        value: 2500,
        data_type: 'number',
        description: 'Valor padrão da propina mensal'
      }, 
      {
        category: 'finance',
        key_name: 'prepaid_payment',
        value: false,
        data_type: 'boolean',
        description: 'O pagamento é prepago'
      },
      {
        category: 'finance',
        key_name: 'payment_due_day',
        value: 10,
        data_type: 'number',
        description: 'Dia de vencimento dos pagamentos (1-31)'
      },
      
      {
        category: 'finance',
        key_name: 'payment_months',
        value: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
        data_type: 'array',
        description: 'Meses que requerem pagamento'
      },
      {
        category: 'finance',
        key_name: 'allow_advance_payment',
        value: true,
        data_type: 'boolean',
        description: 'Permitir pagamento antecipado'
      },
      {
        category: 'finance',
        key_name: 'auto_late_fee',
        value: false,
        data_type: 'boolean',
        description: 'Aplicar multa automaticamente'
      },
      {
        category: 'finance',
        key_name: 'late_fee',
        value: 500,
        data_type: 'number',
        description: 'Valor da multa por atraso'
      },
      {
        category: 'finance',
        key_name: 'days_until_late_fee',
        value: 5,
        data_type: 'number',
        description: 'Dias após vencimento para aplicar multa'
      },
      // Configurações Gerais
      {
        category: 'general',
        key_name: 'school_name',
        value: 'CETE - Centro de Explicacao Tia Esperanca',
        data_type: 'string',
        description: 'Nome da instituição'
      },
      {
        category: 'general',
        key_name: 'currency',
        value: 'AOA',
        data_type: 'string',
        description: 'Moeda padrão'
      },
      {
        category: 'general',
        key_name: 'school_phone',
        value: '',
        data_type: 'string',
        description: 'Telefone da escola'
      },
      {
        category: 'general',
        key_name: 'school_email',
        value: '',
        data_type: 'string',
        description: 'Email da escola'
      },
      {
        category: 'general',
        key_name: 'school_address',
        value: '',
        data_type: 'string',
        description: 'Endereço da escola'
      }
    ];
 try {
      console.log('🔄 Inicializando configurações padrão do sistema...');

      // Verificar se já existem configurações para evitar duplicação
      const existingConfigs = await this.getAllConfigs();
      
      if (existingConfigs.system.length > 0) {
        console.log('✅ Configurações já existem, pulando inicialização...');
        return;
      }

      // Salvar todas as configurações padrão
      const savePromises = defaultConfigs.map(config => 
        this.setConfig(config)
      );

      await Promise.all(savePromises);
      console.log('✅ Configurações padrão inicializadas com sucesso!');

    } catch (error) {
      console.error('❌ Erro ao inicializar configurações padrão:', error);
      throw error;
    }

  }
};