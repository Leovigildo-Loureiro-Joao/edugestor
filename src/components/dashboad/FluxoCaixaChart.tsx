// components/dashboad/FluxoCaixaChart
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FluxoCaixa } from '../../types';

interface FluxoCaixaChartProps {
  data: FluxoCaixa[];
}

export const FluxoCaixaChart: React.FC<FluxoCaixaChartProps> = ({ data }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatText = (value: number) => {
    const abs = Math.abs(value);
    const sign = value < 0 ? '-' : '';

    if (abs >= 1_000_000_000) {
      const v = Math.round(abs / 1_000_000_000);
      return `${sign}${v} bi KZ`;
    }

    if (abs >= 1_000_000) {
      const v = Math.round(abs / 1_000_000);
      return `${sign}${v} mi KZ`;
    }

    if (abs >= 1_000) {
      const v = Math.round(abs / 1_000);
      return `${sign}${v} mil KZ`;
    }

    return `${sign}${Math.round(abs)} KZ`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-3 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg">
          <p className="font-medium text-gray-900 dark:text-white mb-2">{label}</p>
          <p className="text-sm text-green-600">Entradas: {formatCurrency(payload[0].value)}</p>
          <p className="text-sm text-red-600">Saídas: {formatCurrency(payload[1].value)}</p>
          <p className="text-sm font-semibold text-blue-600 mt-1">
            Saldo: {formatCurrency(payload[2].value)}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 10, right: 30, left: 20, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
        <XAxis dataKey="mes" tick={{ fill: '#6B7280' }} />
        <YAxis tick={{ fill: '#6B7280' }} dataKey="saldo" tickFormatter={formatText} />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Line type="monotone" dataKey="entradas" stroke="#10B981" strokeWidth={2  } dot={false} />
        <Line type="monotone" dataKey="saidas" stroke="#EF4444" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="saldo" stroke="#3B82F6" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
};
