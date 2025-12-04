// src/services/database/mockStudents.ts
import { StudentFormData } from '../../types';
import { jsonLoader } from './jsonLoader';

export const mockStudentsService = {
  async getStudents() {
    await new Promise(resolve => setTimeout(resolve, 500));
    const [alunos, turmas] = await Promise.all([
      jsonLoader.getAlunos(),
      jsonLoader.getTurmas()
    ]);

    return alunos.map(aluno => ({
      ...aluno,
      // Replicando a estrutura do select real com join
      turmas: turmas.find(t => t.id === aluno.turma_id) ? {
        nome_turma: turmas.find(t => t.id === aluno.turma_id)?.nome_turma,
        professor: turmas.find(t => t.id === aluno.turma_id)?.professor
      } : null
    }));
  },

  async getStudentById(id: string) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const [alunos, turmas] = await Promise.all([
      jsonLoader.getAlunos(),
      jsonLoader.getTurmas()
    ]);

    const aluno = alunos.find(a => a.id === id);
    if (!aluno) return null;

    return {
      ...aluno,
      // Replicando a estrutura do select real com join
      turmas: turmas.find(t => t.id === aluno.turma_id) ? {
        nome_turma: turmas.find(t => t.id === aluno.turma_id)?.nome_turma,
        professor: turmas.find(t => t.id === aluno.turma_id)?.professor
      } : null
    };
  },

  async getStudentByIdOnly(id: string) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const alunos = await jsonLoader.getAlunos();
    
    const aluno = alunos.find(a => a.id === id);
    if (!aluno) return null;

    return aluno; // Retorna apenas os dados do aluno sem join
  },

  async getAlunosPorTurma(turmaId: string) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const alunos = await jsonLoader.getAlunos();
    
    return alunos
      .filter(aluno => aluno.turma_id === turmaId)
      .map(aluno => ({
        id: aluno.id,
        nome_completo: aluno.nome_completo,
        turma_id: aluno.turma_id,
        estado: aluno.estado,
        numero_estudante: aluno.numero_estudante
      }))
      .sort((a, b) => a.nome_completo.localeCompare(b.nome_completo));
  },

  async atualizarStatusMatricula(id: string, status: boolean) {
    await new Promise(resolve => setTimeout(resolve, 300));
    console.log('📝 Mock atualizar matricula:', id, status);
    return { success: true };
  },

  async atualizarCartaoPago(id: string, cartaoPago: boolean) {
    await new Promise(resolve => setTimeout(resolve, 300));
    console.log('💳 Mock atualizar cartão pago:', id, cartaoPago);
    return { success: true };
  },

  async updateStudent(id: string, studentData: any) {
    await new Promise(resolve => setTimeout(resolve, 400));
    console.log('📝 Mock update student:', id, studentData);
    return { success: true };
  },

  async deleteStudent(id: string) {
    await new Promise(resolve => setTimeout(resolve, 400));
    console.log('🗑️ Mock delete student:', id);
    return { success: true };
  },

  // ✅ Métodos adicionais para replicar o studentsService completo
  async getMaiorNumeroEstudante() {
    await new Promise(resolve => setTimeout(resolve, 200));
    const alunos = await jsonLoader.getAlunos();
    
    if (alunos.length === 0) return 0;
    
    const maiorNumero = Math.max(...alunos.map(a => a.numero_estudante));
    return maiorNumero || 0;
  },

  async gerarProximoNumeroEstudante() {
    try {
      const maiorNumero = await this.getMaiorNumeroEstudante();
      const proximoNumero = maiorNumero + 1;
      console.log(`🎯 Mock gerando número de estudante: ${maiorNumero} + 1 = ${proximoNumero}`);
      return proximoNumero;
    } catch (error) {
      console.error('Erro ao gerar próximo número de estudante:', error);
      return Math.floor(Date.now() / 1000);
    }
  }
, async analiseDoPrimeiroPagamentoMensal(id: string) {
    try {
      const aluno = await this.getStudentByIdOnly(id);
      
      if (!aluno.data_matricula) {
        console.log('❌ Aluno sem data de matrícula');
        return 'pendente'; // ou 'indefinido' conforme sua regra
      }

      const dataMatricula = new Date(aluno.data_matricula);
      
      // Verifica se a data é válida
      if (isNaN(dataMatricula.getTime())) {
        console.log('❌ Data de matrícula inválida');
        return 'pendente';
      }

      // Obtém o dia do mês (1-31)
      const diaDoMes = dataMatricula.getDate();
      
   

      // Se a matrícula foi nos primeiros 10 dias do mês
      if (diaDoMes-new Date().getDate() <= 10) {
        return 'pago';
      } else {
        console.log('❌ Matrícula após os 10 dias - considerado "pendente"');
        return 'pendente';
      }
      
    } catch (error) {
      console.error('Erro ao analisar primeiro pagamento mensal:', error);
      return 'pendente'; // Retorna pendente em caso de erro
    }
  },

  async createStudent(studentData: any) {
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Simular geração automática de número de estudante se não fornecido
    let numeroEstudante = studentData.numero_estudante;
    
    if (!numeroEstudante || numeroEstudante === 0) {
      numeroEstudante = await this.gerarProximoNumeroEstudante();
      console.log(`🔢 Mock número de estudante gerado automaticamente: ${numeroEstudante}`);
    }

    const novoAluno = {
      id: `mock-${Date.now()}`,
      ...studentData,
      numero_estudante: numeroEstudante,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    console.log('📤 Mock criando aluno:', novoAluno);
    return novoAluno.id;
  },

  async getStudentByNumeroEstudante(numeroEstudante: string) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const alunos = await jsonLoader.getAlunos();
    
    const aluno = alunos.find(a => a.numero_estudante.toString() === numeroEstudante);
    if (!aluno) return null;

    return {
      id: aluno.id,
      nome_completo: aluno.nome_completo
    };
  }
};