import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '../../services/supabase/config';

export const PropinasChart = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDadosPropinas();
  }, []);

  const carregarDadosPropinas = async () => {
    try {
      // Buscar propinas dos últimos 6 meses
      const seisMesesAtras = new Date();
      seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);

      const { data: propinas, error } = await supabase
        .from('propinas')
        .select('mes_referencia, estado, valor_previsto, valor_pago')
        .gte('mes_referencia', seisMesesAtras.toISOString().slice(0, 7))
        .order('mes_referencia');

      if (error) throw error;

      // Processar dados para o gráfico
      const dadosAgrupados = propinas.reduce((acc, propina) => {
        const mes = propina.mes_referencia;
        const existing = acc.find(item => item.mes === mes);
        
        if (existing) {
          existing.previsto += parseFloat(propina.valor_previsto) || 0;
          existing.pago += parseFloat(propina.valor_pago) || 0;
          if (propina.estado === 'pago') existing.quitado += parseFloat(propina.valor_pago) || 0;
          if (propina.estado === 'pendente') existing.pendente += parseFloat(propina.valor_previsto) || 0;
        } else {
          acc.push({
            mes: mes,
            previsto: parseFloat(propina.valor_previsto) || 0,
            pago: parseFloat(propina.valor_pago) || 0,
            quitado: propina.estado === 'pago' ? parseFloat(propina.valor_pago) || 0 : 0,
            pendente: propina.estado === 'pendente' ? parseFloat(propina.valor_previsto) || 0 : 0
          });
        }
        return acc;
      }, []);

      // Formatar meses para exibição
      const dadosFormatados = dadosAgrupados.map(item => ({
        ...item,
        mesFormatado: formatarMes(item.mes),
        taxaPagamento: item.previsto > 0 ? (item.pago / item.previsto) * 100 : 0
      }));

      setData(dadosFormatados);

    } catch (error) {
      console.error('Erro ao carregar dados de propinas:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatarMes = (mesString) => {
    const [ano, mes] = mesString.split('-');
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${meses[parseInt(mes) - 1]}/${ano.slice(2)}`;
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
        Nenhum dado de propina disponível
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis 
          dataKey="mesFormatado" 
          tick={{ fontSize: 12 }}
          angle={-45}
          textAnchor="end"
          height={60}
        />
        <YAxis 
          tick={{ fontSize: 12 }}
          tickFormatter={(value) => `$${value.toLocaleString('pt-BR')}`}
        />
        <Tooltip 
          formatter={(value, name) => [
            `$${parseFloat(value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
            name === 'previsto' ? 'Previsto' : 
            name === 'pago' ? 'Pago' :
            name === 'quitado' ? 'Quitado' : 'Pendente'
          ]}
          labelFormatter={(label) => `Mês: ${label}`}
        />
        <Legend />
        <Bar 
          dataKey="previsto" 
          name="Previsto" 
          fill="#8884d8" 
          radius={[2, 2, 0, 0]}
        />
        <Bar 
          dataKey="pago" 
          name="Pago" 
          fill="#82ca9d" 
          radius={[2, 2, 0, 0]}
        />
        <Bar 
          dataKey="quitado" 
          name="Quitado" 
          fill="#00C49F" 
          radius={[2, 2, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
};