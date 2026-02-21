// components/ui/AreaChart.tsx - VERSÃO COM RECHARTS
import React from 'react';
import { 
  AreaChart as RechartsAreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { FiInfo } from 'react-icons/fi';

interface AreaChartProps {
  data: Array<{
    periodo: string;
    valor: number;
    categoria?: string;
  }>;
  titulo?: string;
  descricao?: string;
  altura?: number;
  cores?: string[];
  mostrarLegenda?: boolean;
  tipo?: 'area' | 'line';
}

const AreaChart: React.FC<AreaChartProps> = ({
  data,
  titulo,
  descricao,
  altura = 300,
  cores = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'],
  mostrarLegenda = false,
  tipo = 'area'
}) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500" style={{ height: `${altura}px` }}>
        Sem dados disponíveis
      </div>
    );
  }

  // Format data for Recharts
  const chartData = data.map(item => ({
    name: item.periodo,
    value: item.valor,
    ...(item.categoria && { [item.categoria]: item.valor })
  }));

  // Determine categories for multiple lines/areas
  const categories = [...new Set(data.filter(d => d.categoria).map(d => d.categoria))];
  const hasMultipleCategories = categories.length > 0;

  return (
    <div className="p-1">
      {titulo && (
        <div className="mb-4">
          <h3 className="font-bold text-gray-800 dark:text-white flex items-center">
            {titulo}
            {descricao && (
              <span className="ml-2" title={descricao}>
                <FiInfo className="h-4 w-4 text-gray-400" />
              </span>
            )}
          </h3>
        </div>
      )}
      
      <div style={{ height: `${altura}px`, width: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsAreaChart
            data={chartData}
            margin={{
              top: 10,
              right: 30,
              left: 0,
              bottom: 0,
            }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              stroke="#f0f0f0" 
              vertical={false}
            />
            
            <XAxis 
              dataKey="name" 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6B7280', fontSize: 12 }}
              padding={{ left: 10, right: 10 }}
            />
            
            <YAxis 
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#6B7280', fontSize: 12 }}
              domain={[0, 'auto']}
              tickFormatter={(value) => Number.isInteger(value) ? value.toString() : value.toFixed(1)}
            />
            
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #E5E7EB',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
              }}
              formatter={(value: number) => [value, 'Valor']}
              labelFormatter={(label) => `Período: ${label}`}
            />
            
            {mostrarLegenda && hasMultipleCategories && (
              <Legend 
                verticalAlign="top"
                height={36}
                iconType="circle"
                iconSize={8}
              />
            )}
            
            {hasMultipleCategories ? (
              // Múltiplas categorias (múltiplas áreas/lines)
              categories.map((category, index) => (
                tipo === 'area' ? (
                  <Area
                    key={category}
                    type="monotone"
                    dataKey={category}
                    stroke={cores[index % cores.length]}
                    fill={cores[index % cores.length]}
                    fillOpacity={0.3}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                ) : (
                  <Area
                    key={category}
                    type="monotone"
                    dataKey={category}
                    stroke={cores[index % cores.length]}
                    fill="transparent"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                  />
                )
              ))
            ) : (
              // Apenas uma categoria (área simples)
              tipo === 'area' ? (
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={cores[0]}
                  fill={cores[0]}
                  fillOpacity={0.3}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              ) : (
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={cores[0]}
                  fill="transparent"
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              )
            )}
          </RechartsAreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default AreaChart;
