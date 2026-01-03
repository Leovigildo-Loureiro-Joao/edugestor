import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { CustomPieChartProps } from '../../types';

export const CustomPieChart = ({ dados, tipo = 'pagamentos', title }: CustomPieChartProps) => {
  const cores = tipo === 'despesas' 
    ? ['#EF4444', '#F59E0B', '#8B5CF6', '#06B6D4', '#84CC16', '#EC4899', '#6366F1', '#F97316']
    : ['#10B981', '#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#84CC16', '#06B6D4', '#EC4899'];

  const total = dados.reduce((sum, item) => sum + item.value, 0);

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-sm">
          <p className="font-semibold text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-600">
            Valor: {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(data.value)}
          </p>
          <p className="text-sm text-gray-600">
            Percentagem: {data.porcentagem.toFixed(1)}%
          </p>
        </div>
      );
    }
    return null;
  };

  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex flex-wrap justify-center gap-4 mt-4">
        {payload.map((entry: any, index: number) => (
          <div key={`legend-${index}`} className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-sm text-gray-700">{entry.value}</span>
            <span className="text-sm font-semibold text-gray-900">
              ({dados[index]?.porcentagem.toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    );
  };

  console.log(dados)

  return (
    <div className="bg-white p-6">
      {title && (
        <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
          {title}
        </h3>
      )}
      
      <div className="flex flex-col lg:flex-row items-center justify-between">
        {/* Gráfico */}
        <div className="w-full lg:w-1/2 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={dados}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={2}
                dataKey="value"
                label={({ name, porcentagem }) => `${name} (${porcentagem.toFixed(1)}%)`}
                labelLine={false}
              >
                {dados.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={cores[index % cores.length]}
                    stroke="#FFFFFF"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend content={renderLegend} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Tabela de dados */}
        <div className="w-full lg:w-1/2 lg:pl-6">
          <div className="space-y-3">
            {dados.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: cores[index % cores.length] }}
                  />
                  <span className="font-medium text-gray-900">{item.name}</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-900">
                    {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(item.value)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {item.porcentagem.toFixed(1)}% do total
                  </div>
                </div>
              </div>
            ))}
            
            {/* Total */}
            <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
              <span className="font-semibold text-purple-900">TOTAL</span>
              <span className="font-bold text-purple-900 text-lg">
                {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(total)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};