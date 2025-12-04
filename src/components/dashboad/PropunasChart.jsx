import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { supabase } from '../../services/supabase/config.js';

export const PropinasChart = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    carregarDadosPropinas();
  }, []);

  const carregarDadosPropinas = async () => {
    try {
      setLoading(true);
      
      const propinas = await supabase
        .from('propina')
        .select('mes_referencia, estado, valor_pago, valor_falta')
        .in('mes_referencia', ['Set', 'Out', 'Nov', 'Dez', 'Jan', 'Fev']) // Últimos 6 meses
        .order('mes_referencia');

      if (propinas.error) throw propinas.error;

      // Ordem correta dos meses
      const ordemMeses = ['Set', 'Out', 'Nov', 'Dez', 'Jan', 'Fev'];
      const dadosAgrupados = {};

      // Inicializar estrutura
      ordemMeses.forEach(mes => {
        dadosAgrupados[mes] = {
          mesReferencia: mes,
          quitado: 0,
          pendente: 0,
          atrasado: 0,
          total: 0
        };
      });

      // Preencher com dados
      propinas.data?.forEach(propina => {
        const mesData = dadosAgrupados[propina.mes_referencia];
        if (mesData) {
          if (propina.estado === 'pago') {
            mesData.quitado += Number(propina.valor_pago) || 0;
          } else if (propina.estado === 'pendente') {
            mesData.pendente += Number(propina.valor_falta) || 0;
          } else if (propina.estado === 'atrasado') {
            mesData.atrasado += Number(propina.valor_falta) || 0;
          }
          
          mesData.total += Number(propina.valor_pago) + Number(propina.valor_falta || 0);
        }
      });

      // Converter para array
      const dadosArray = ordemMeses.map(mes => dadosAgrupados[mes]);
      
      // Formatar para exibição
      const dadosFormatados = dadosArray.map(item => ({
        ...item,
        mesFormatado: `${item.mesReferencia}/24`, // Ajustar conforme o ano
        taxaPagamento: item.total > 0 ? (item.quitado / item.total) * 100 : 0
      }));

      console.log('Dados finais:', dadosFormatados);
      setData(dadosFormatados);

    } catch (error) {
      console.error('Erro ao carregar dados de propinas:', error);
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
            name === 'quitado' ? 'Quitado' :
            name === 'pendente' ? 'Pendente' :
            name === 'atrasado' ? 'Atrasado' : name
          ]}
          labelFormatter={(label) => `Mês: ${label}`}
        />
        <Legend />
        <Bar 
          dataKey="atrasado" 
          name="Atrasado" 
          fill="#8884d8" 
          radius={[2, 2, 0, 0]}
        />
        <Bar 
          dataKey="pendente" 
          name="Pendente" 
          fill="#f17c2d" 
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