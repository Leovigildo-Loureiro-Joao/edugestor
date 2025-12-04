// src/services/database/mockPropinas.ts
import { jsonLoader } from './jsonLoader';

export const mockPropinaService = {
  async getByAluno(alunoId: string) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const propinas = await jsonLoader.getPropinas();
    return propinas.filter(p => p.aluno_id === alunoId);
  },
  

  async getHistoricoPagamentos() {
    await new Promise(resolve => setTimeout(resolve, 500));
    const propinas = await jsonLoader.getPropinas();
    return propinas.filter(p => p.estado === 'pago');
  },

  async getMesesPagos(alunoId: string) {
    const propinas = await this.getByAluno(alunoId);
    return propinas
      .filter(p => p.estado === 'pago')
      .map(p => p.mes_referencia)
      .filter(Boolean);
  },

  async getMesesPendentes(alunoId: string) {
    const propinas = await this.getByAluno(alunoId);
    return propinas
      .filter(p => p.estado === 'pendente')
      .map(p => p.mes_referencia)
      .filter(Boolean);
  }
};