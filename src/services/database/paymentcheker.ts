// services/paymentChecker.ts
import { propinaService } from './propinas';
import { alunosService } from './students';
import { configService } from './config';
import { Student } from '../../types';

export const paymentChecker = {
  async verificarPagamentosAtrasados(): Promise<void> {
    try {
      console.log('🔄 Verificando pagamentos atrasados...');
      
      // 1. Buscar configurações
      const financeConfig = await configService.getPaymentConfig();
      const diaVencimento = financeConfig.diaVencimento;
      const hoje = new Date();
      
      // 2. Se não for dia de verificação (ex: dia 1 de cada mês), sai
      if (hoje.getDate() !== 1) { // Pode ajustar frequência
        console.log('⏭️ Não é dia de verificação mensal');
        return;
      }
      
      // 3. Buscar todos os alunos
      const alunos = await alunosService.getAllStudents();
      
      // 4. Para cada aluno, verificar pagamentos
      for (const aluno of alunos) {
        await this.verificarAluno(aluno, diaVencimento, hoje);
      }
      
      console.log('✅ Verificação de pagamentos concluída');
      
    } catch (error) {
      console.error('❌ Erro ao verificar pagamentos:', error);
    }
  },
  
  async verificarAluno(aluno: Student, diaVencimento: number, dataVerificacao: Date): Promise<void> {
    try {
      // 1. Buscar pagamentos do aluno
      const pagamentosAluno = await propinaService.getByAluno(aluno.id);
      
      // 2. Determinar mês atual para verificação
      const mesAtual = dataVerificacao.getMonth(); // 0-11
      const anoAtual = dataVerificacao.getFullYear();
      
      const mapaMeses: {[key: string]: string} = {
        'Jan': 'Janeiro', 'Fev': 'Fevereiro', 'Mar': 'Março', 'Abr': 'Abril',
        'Mai': 'Maio', 'Jun': 'Junho', 'Jul': 'Julho', 'Ago': 'Agosto',
        'Set': 'Setembro', 'Out': 'Outubro', 'Nov': 'Novembro', 'Dez': 'Dezembro'
      };
      
      const meses = Object.values(mapaMeses);
      const mesAtualNome = meses[mesAtual];
      const mesAtualAbreviado = Object.keys(mapaMeses)[mesAtual];
      
      // 3. Verificar se pagou o mês atual
      const pagouMesAtual = pagamentosAluno.some(p => 
        p.estado === 'pago' && 
        p.mes_referencia === mesAtualAbreviado
      );
      
      // 4. Verificar se já passou do vencimento
      const dataVencimento = new Date(anoAtual, mesAtual, diaVencimento);
      const vencimentoPassou = dataVerificacao > dataVencimento;
      
      // 5. Atualizar status do aluno
      if (!pagouMesAtual && vencimentoPassou) {
        // Aluno está em atraso
        await alunosService.updateStudent(aluno.id, {
          ...aluno,
          pagamento_em_dia: false,
          ultima_verificacao_pagamento: new Date().toISOString()
        });
        
        console.log(`⚠️ Aluno ${aluno.nome_completo} em atraso para ${mesAtualNome}`);
        
        // 6. OPÇÃO: Criar notificação/registro de atraso
        await this.criarRegistroAtraso(aluno.id, mesAtualNome, dataVencimento);
        
      } else if (pagouMesAtual) {
        // Aluno está em dia
        await alunosService.updateStudent(aluno.id, {
          ...aluno,
          pagamento_em_dia: true,
          ultima_verificacao_pagamento: new Date().toISOString()
        });
      }
      
    } catch (error) {
      console.error(`Erro ao verificar aluno ${aluno.id}:`, error);
    }
  },
  
  async criarRegistroAtraso(alunoId: string, mes: string, dataVencimento: Date): Promise<void> {
    // Implementar registro de atraso (logs, notificações, etc.)
    console.log(`📝 Registro de atraso: aluno ${alunoId}, mês ${mes}`);
  }
};