// components/dashboad/InadimplenciaChart
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { InadimplenciaTurma } from '../../types';

interface InadimplenciaChartProps {
  data: InadimplenciaTurma[];
}

export const InadimplenciaChart: React.FC<InadimplenciaChartProps> = ({ data }) => {
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const item = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white">{item.turma}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Inadimplentes: {item.inadimplentes}/{item.totalAlunos}
          </p>
          <p className="text-sm font-semibold text-red-600">{item.percentual.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
        <XAxis 
          dataKey="abreviacao" 
          tick={{ fill: '#6B7280', fontSize: 12 }}
          axisLine={{ stroke: '#374151' }}
        />
        <YAxis 
          tick={{ fill: '#6B7280', fontSize: 12 }}
          axisLine={{ stroke: '#374151' }}
          domain={[0, 100]}
          unit="%"
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="percentual" radius={[4, 4, 0, 0]}>
          {data.map((entry, index) => (
            <Cell 
              key={index} 
              fill={entry.percentual > 30 ? '#EF4444' : entry.percentual > 20 ? '#F59E0B' : '#10B981'} 
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};