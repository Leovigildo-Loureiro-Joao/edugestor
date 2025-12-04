// src/services/database/mockTransacoes.ts
import { jsonLoader } from './jsonLoader';

export const mockTransacaoService = {
  async processarPagamento(dados: any) {
    await new Promise(resolve => setTimeout(resolve, 600));
    console.log('💰 Mock processar pagamento:', dados);
    return { sucesso: true, mensagem: 'Pagamento mock processado' };
  },

  async processarMensalidade(alunoId: string, dados: any) {
    await new Promise(resolve => setTimeout(resolve, 700));
    console.log('💰 Mock mensalidade:', alunoId, dados);
    return { sucesso: true, mensagem: 'Mensalidade mock processada' };
  },

  async getTransacoesPorAluno(alunoId: string) {
    await new Promise(resolve => setTimeout(resolve, 400));
    const transacoes = await jsonLoader.getTransacoes();
    return transacoes.filter(t => t.aluno_id === alunoId);
  }
};