import { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { PieChartTurmaAlunosState } from '../../services/dashboard/chartsService';

export const AlunosTurmaChart = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTurma, setSelectedTurma] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  // Detectar se é mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      const { data: dados } = await PieChartTurmaAlunosState();
      
      // Ordenar por quantidade de alunos (maior para menor)
      const dadosOrdenados = dados.sort((a, b) => b.value - a.value);
      
      // Se tiver muitas turmas, agrupar as menores em "Outras Turmas"
      if (dadosOrdenados.length > 6) {
        const principais = dadosOrdenados.slice(0, 5);
        const outras = dadosOrdenados.slice(5);
        const totalOutras = outras.reduce((sum, turma) => sum + turma.value, 0);
        const ativosOutras = outras.reduce((sum, turma) => sum + (turma.ativos || 0), 0);
        const inativosOutras = outras.reduce((sum, turma) => sum + (turma.inativos || 0), 0);
        
        principais.push({
          name: 'Outras Turmas',
          value: totalOutras,
          ativos: ativosOutras,
          inativos: inativosOutras,
          fill: '#9CA3AF' // Cinza para "Outras"
        });
        
        setData(principais);
      } else {
        setData(dadosOrdenados);
      }
      
      setLoading(false);
    };

    carregarDados();
  }, []);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-w-[200px] sm:max-w-none">
          <p className="font-bold text-gray-900 mb-2 dark:text-gray-300 text-sm sm:text-base">{data.name}</p>
          <div className="space-y-1 text-xs sm:text-sm">
            <div className="flex justify-between gap-2 sm:gap-4">
              <span className="text-gray-600 dark:text-gray-300">Total:</span>
              <span className="font-semibold dark:text-white">{data.value} alunos</span>
            </div>
            <div className="flex justify-between gap-2 sm:gap-4">
              <span className="text-green-600">Ativos:</span>
              <span className="font-semibold dark:text-white">{data.ativos || 0}</span>
            </div>
            <div className="flex justify-between gap-2 sm:gap-4">
              <span className="text-red-600">Inativos:</span>
              <span className="font-semibold dark:text-white">{data.inativos || 0}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomLegend = ({ payload }) => (
    <div className="flex flex-wrap justify-center gap-1 sm:gap-2 mt-4 px-2">
      {payload.map((entry, index) => (
        <div
          key={`legend-${index}`}
          className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 bg-gray-50 dark:bg-gray-700 rounded-full text-[10px] sm:text-xs cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          onClick={() => setSelectedTurma(selectedTurma === entry.value ? null : entry.value)}
        >
          <div
            className="w-2 h-2 sm:w-3 sm:h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className={`font-medium truncate max-w-[70px] sm:max-w-none ${selectedTurma === entry.value ? 'text-primary-600' : 'text-gray-700 dark:text-gray-50'}`}>
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  );

  // Versão mobile: tabela em vez de gráfico
  const MobileTableView = () => (
    <div className="h-full flex flex-col">
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Turma</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Total</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Ativos</th>
              <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Inativos</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {data.map((turma, index) => (
              <tr 
                key={index}
                className="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                onClick={() => setSelectedTurma(selectedTurma === turma.name ? null : turma.name)}
              >
                <td className="px-3 py-2 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: turma.fill || COLORS[index % COLORS.length] }}
                    />
                    <span className="truncate max-w-[100px]">{turma.name}</span>
                  </div>
                </td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-gray-500 dark:text-gray-400">{turma.value}</td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-green-600">{turma.ativos || 0}</td>
                <td className="px-3 py-2 whitespace-nowrap text-sm text-right text-red-600">{turma.inativos || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="h-64 flex flex-col items-center justify-center space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        <p className="text-sm text-gray-500 dark:text-gray-400">Carregando dados das turmas...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="h-64 flex flex-col items-center justify-center space-y-3 text-gray-500 dark:text-gray-400">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
          <span className="text-2xl">📊</span>
        </div>
        <p className='dark:text-white'>Nenhum dado de alunos disponível</p>
        <p className="text-sm dark:text-gray-300">Adicione turmas e alunos para ver as estatísticas</p>
      </div>
    );
  }

  // Cores consistentes para o gráfico
  const COLORS = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', 
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
  ];

  return (
    <div className="w-full h-full flex flex-col">
      {/* Header com título */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 px-2 sm:px-0">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
          Distribuição por Turma
        </h3>
        <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-200 bg-gray-50 dark:bg-gray-700 px-3 py-1 rounded-full">
          {data.reduce((total, turma) => total + turma.value, 0)} alunos
        </span>
      </div>

      {/* Gráfico ou Tabela Mobile */}
      <div className="flex-1 min-h-0" style={{ minHeight: isMobile ? '300px' : '400px' }}>
        {isMobile ? (
          <MobileTableView />
        ) : (
          <ResponsiveContainer width="100%" height="100%" debounce={1}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                paddingAngle={2}
                labelLine={false}
                label={({ name, percent }) => 
                  percent > 0.05 ? (window.innerWidth < 768 ? `${(percent * 100).toFixed(0)}%` : `${name}\n${(percent * 100).toFixed(0)}%`) : ''
                }
                outerRadius={selectedTurma ? 70 : 80}
                innerRadius={selectedTurma ? 40 : 0}
                fill="#8884d8"
                dataKey="value"
                animationDuration={500}
                onClick={(data) => setSelectedTurma(selectedTurma === data.name ? null : data.name)}
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.fill || COLORS[index % COLORS.length]}
                    stroke="#FFFFFF"
                    strokeWidth={2}
                    opacity={selectedTurma && selectedTurma !== entry.name ? 0.3 : 1}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={<CustomLegend />} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
