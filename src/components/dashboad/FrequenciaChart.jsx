import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '../../services/supabase/config';

export const FrequenciaChart = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDadosFrequencia();
  }, []);

  const carregarDadosFrequencia = async () => {
    try {
      // Buscar frequências dos últimos 30 dias
      const trintaDiasAtras = new Date();
      trintaDiasAtras.setDate(trintaDiasAtras.getDate() - 30);

      const { data: frequencias, error } = await supabase
        .from('frequencias')
        .select('data_aula, presente')
        .gte('data_aula', trintaDiasAtras.toISOString().split('T')[0])
        .order('data_aula');

      if (error) throw error;

      // Agrupar por data
      const frequenciaPorDia = frequencias.reduce((acc, freq) => {
        const data = freq.data_aula;
        if (!acc[data]) {
          acc[data] = { total: 0, presentes: 0 };
        }
        acc[data].total++;
        if (freq.presente) acc[data].presentes++;
        return acc;
      }, {});

      // Preparar dados para o gráfico
      const dadosGrafico = Object.entries(frequenciaPorDia).map(([data, dados]) => ({
        data: new Date(data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
        frequencia: dados.total > 0 ? (dados.presentes / dados.total) * 100 : 0,
        presentes: dados.presentes,
        total: dados.total
      }));

      setData(dadosGrafico);

    } catch (error) {
      console.error('Erro ao carregar dados de frequência:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="data" tick={{ fontSize: 12 }} />
        <YAxis 
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => `${value}%`}
          domain={[0, 100]}
        />
        <Tooltip 
          formatter={(value, name) => [
            name === 'frequencia' ? `${value.toFixed(1)}%` : value,
            name === 'frequencia' ? 'Frequência' : 'Presentes'
          ]}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="frequencia" 
          stroke="#8884d8" 
          strokeWidth={2}
          dot={{ fill: '#8884d8', strokeWidth: 2, r: 4 }}
          activeDot={{ r: 6, fill: '#8884d8' }}
          name="Frequência"
        />
      </LineChart>
    </ResponsiveContainer>
  );
};