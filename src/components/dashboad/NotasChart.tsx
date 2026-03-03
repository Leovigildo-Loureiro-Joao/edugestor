// components/dashboad/NotasChart
import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { NotaDisciplina } from '../../types';

interface NotasChartProps {
  data: NotaDisciplina[];
}

export const NotasChart: React.FC<NotasChartProps> = ({ data }) => {
  const chartData = data.map(item => ({
    subject: item.disciplina,
    value: item.media,
    fullMark: 20
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
        <PolarGrid stroke="#374151" strokeDasharray="3 3" />
        <PolarAngleAxis 
          dataKey="subject" 
          tick={{ fill: '#6B7280', fontSize: 11 }}
        />
        <PolarRadiusAxis 
          angle={30} 
          domain={[0, 20]} 
          tick={{ fill: '#6B7280', fontSize: 10 }}
        />
        <Radar
          name="Média"
          dataKey="value"
          stroke="#3B82F6"
          fill="#3B82F6"
          fillOpacity={0.5}
        />
        <Tooltip 
          contentStyle={{ 
            backgroundColor: '#1F2937', 
            border: 'none',
            borderRadius: '8px',
            color: '#fff'
          }}
        />
      </RadarChart>
    </ResponsiveContainer>
  );
};