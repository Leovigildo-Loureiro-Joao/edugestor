import { alunosService } from "../database";
import db, { supabase } from "../database/db";

const gerarCor = (turma, index) => {
  const cores = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', 
    '#8884D8', '#82CA9D', '#FFC658', '#8DD1E1',
    '#D084D0', '#FF6B6B', '#4ECDC4', '#45B7D1',
    '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8C471'
  ];
  
  let hash = 0;
  if (turma !== 'Sem Turma') {
    for (let i = 0; i < turma.length; i++) {
      hash = turma.charCodeAt(i) + ((hash << 5) - hash);
    }
  } else {
    hash = index;
  }
  
  const corIndex = Math.abs(hash) % cores.length;
  return cores[corIndex];
};

export async function PieChartTurmaAlunosState() {
  try {
    const alunos= await alunosService.getAllStudents()

    // Agrupar alunos por turma
    const alunosPorTurma = alunos.reduce((acc, aluno) => {
      // CORREÇÃO: Acessar o nome da turma corretamente
      const nomeTurma = aluno.turma_nome || 'Sem Turma';
      
      if (!acc[nomeTurma]) {
        acc[nomeTurma] = { total: 0, ativos: 0 };
      }
      acc[nomeTurma].total++;
      if (aluno.estado === 'ativo') {
        acc[nomeTurma].ativos++;
      }
      return acc;
    }, {});

    // Preparar dados para o gráfico
    const dadosGrafico = Object.entries(alunosPorTurma).map(([turma, dados], index) => ({
      name: turma, // Já é o nome da turma
      value: dados.total,
      ativos: dados.ativos,
      inativos: dados.total - dados.ativos,
      fill: gerarCor(turma, index)
    }));

    return { data: dadosGrafico, loading: false };

  } catch (error) {
    console.error('Erro ao carregar dados de alunos:', error);
    return { data: [], loading: false, error };
  }
}