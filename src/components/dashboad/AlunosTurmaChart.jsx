import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { supabase } from '../../services/supabase/config';

export const AlunosTurmaChart = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDadosAlunos();
  }, []);

  const carregarDadosAlunos = async () => {
    try {
      const { data: alunos, error } = await supabase
        .from('alunos')
        .select('turma_id, estado');

      if (error) throw error;

      // Agrupar alunos por turma
      const alunosPorTurma = alunos.reduce((acc, aluno) => {
        const turma = aluno.turma_id || 'Sem Turma';
        if (!acc[turma]) {
          acc[turma] = { total: 0, ativos: 0 };
        }
        acc[turma].total++;
        if (aluno.estado === 'ativo') {
          acc[turma].ativos++;
        }
        return acc;
      }, {});

      // Preparar dados para o gráfico
      const dadosGrafico = Object.entries(alunosPorTurma).map(([turma, dados], index) => ({
        name: `Turma ${turma}`,
        value: dados.total,
        ativos: dados.ativos,
        inativos: dados.total - dados.ativos,
        fill: gerarCor(turma, index) // Passa o índice como fallback
      }));

      setData(dadosGrafico);

    } catch (error) {
      console.error('Erro ao carregar dados de alunos:', error);
    } finally {
      setLoading(false);
    }
  };

  // Gerar cores únicas para cada turma
  const gerarCor = (turma, index) => {
    const cores = [
      '#0088FE', '#00C49F', '#FFBB28', '#FF8042', 
      '#8884D8', '#82CA9D', '#FFC658', '#8DD1E1',
      '#D084D0', '#FF6B6B', '#4ECDC4', '#45B7D1',
      '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8',
      '#F7DC6F', '#BB8FCE', '#85C1E9', '#F8C471'
    ];
    
    // Usa o hash da turma ou o índice como fallback
    let hash = 0;
    if (turma !== 'Sem Turma') {
      for (let i = 0; i < turma.length; i++) {
        hash = turma.charCodeAt(i) + ((hash << 5) - hash);
      }
    } else {
      hash = index; // Para "Sem Turma", usa o índice
    }
    
    const corIndex = Math.abs(hash) % cores.length;
    return cores[corIndex];
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-300 rounded shadow-lg">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm">Total: {data.value} alunos</p>
          <p className="text-sm text-green-600">Ativos: {data.ativos}</p>
          <p className="text-sm text-red-600">Inativos: {data.inativos}</p>
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-gray-500">
        Nenhum dado de alunos disponível
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
};