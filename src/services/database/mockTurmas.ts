import { jsonLoader } from './jsonLoader';
import { TurmaFormData } from '../../types/turma';

export const mockTurmaService = {
  // Criar turma
  async createTurma(turmaData: TurmaFormData) {
    await new Promise(resolve => setTimeout(resolve, 600));
    console.log('📝 Mock create turma:', turmaData);
    
    // Simula a criação com ID novo
    const newTurma = {
      ...turmaData,
      id: Date.now().toString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      cursos: { nome: turmaData.curso }
    };
    
    return [newTurma];
  },

  // Buscar todas as turmas com cursos
  async getTurmas() {
    await new Promise(resolve => setTimeout(resolve, 400));
    const turmas = await jsonLoader.getTurmas();
    
    // Garante que cada turma tem o relacionamento com cursos
    return turmas.map(turma => ({
      ...turma,
      cursos: turma.cursos || { nome: turma.curso }
    }));
  },

  // Buscar apenas nomes das turmas
  async getTurma() {
    await new Promise(resolve => setTimeout(resolve, 300));
    const turmas = await jsonLoader.getTurmas();
    
    return {
      data: turmas.map(t => ({ nome_turma: t.nome_turma }))
    };
  },

  // Buscar ID por nome da turma
  async getId(nome: string) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const turmas = await jsonLoader.getTurmas();
    const turma = turmas.find(t => t.nome_turma === nome);
    
    return turma ? [{ id: turma.id }] : [];
  },

  // Buscar turma por ID
  async findBy(id: string) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const turmas = await jsonLoader.getTurmas();
    const turma = turmas.find(t => t.id === id);
    
    return turma ? [turma] : [];
  },

  // Buscar turma por ID (single)
  async getTurmaById(id: string) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const turmas = await jsonLoader.getTurmas();
    return turmas.find(t => t.id === id) || null;
  },

  // Deletar turma
  async deleteTurma(id: string) {
    await new Promise(resolve => setTimeout(resolve, 400));
    console.log('🗑️ Mock delete turma:', id);
    return { success: true };
  },

  // Editar turma
  async editTurma(id: string, turmaData: TurmaFormData) {
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('📝 Mock edit turma:', id, turmaData);
    return { success: true };
  },

  // Métodos adicionais úteis
  async getTurmasPorCurso(cursoId: string) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const turmas = await jsonLoader.getTurmas();
    return turmas.filter(t => t.curso_id === cursoId);
  },

  async getTurmasAtivas() {
    await new Promise(resolve => setTimeout(resolve, 300));
    const turmas = await jsonLoader.getTurmas();
    return turmas.filter(t => t.ativa !== false); // Considera ativa se não for explicitamente false
  }
};