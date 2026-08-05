
import React from 'react';
import { FiInfo } from 'react-icons/fi';

interface HeatmapCell {
  dia: string;
  horario: string;
  count: number;
  intensity: number; 
}

interface HeatmapHorariosProps {
  data: {
    dia: string;
    horario: string;
    aulas: number;
    turmas?: string[];
  }[];
}

export const HeatmapHorarios: React.FC<HeatmapHorariosProps> = ({ data }) => {
  
  const dias = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  
  
  const horarios = [
    '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
  ];

  
  const prepararHeatmapData = () => {
    const heatmapData: HeatmapCell[][] = [];
    
    
    horarios.forEach((horario, horarioIndex) => {
      heatmapData[horarioIndex] = [];
      dias.forEach((dia, diaIndex) => {
        
        const aulasNoSlot = data.filter(item => 
          item.dia === dia && 
          item.horario === horario
        );
        
        const totalAulas = aulasNoSlot.reduce((sum, item) => sum + item.aulas, 0);
        
        
        const maxAulas = Math.max(...horarios.map(h => 
          data.filter(d => d.horario === h).reduce((sum, item) => sum + item.aulas, 0)
        ), 1);
        
        const intensity = totalAulas / maxAulas;
        
        heatmapData[horarioIndex][diaIndex] = {
          dia,
          horario,
          count: totalAulas,
          intensity
        };
      });
    });
    
    return heatmapData;
  };

  const heatmapData = prepararHeatmapData();

  
  const getCellColor = (intensity: number) => {
    if (intensity === 0) return 'bg-gray-100 dark:bg-gray-800';
    
    
    if (intensity < 0.25) return 'bg-blue-100 dark:bg-blue-900/30';
    if (intensity < 0.5) return 'bg-blue-200 dark:bg-blue-800/50';
    if (intensity < 0.75) return 'bg-blue-300 dark:bg-blue-700/60';
    return 'bg-blue-500 dark:bg-blue-600';
  };

  
  const getTextColor = (intensity: number) => {
    if (intensity < 0.5) return 'text-gray-800 dark:text-gray-200';
    return 'text-white';
  };

  
  const Tooltip = ({ cell, x, y }: { cell: HeatmapCell; x: number; y: number }) => {
    if (cell.count === 0) return null;
    
    return (
      <div 
        className="absolute z-50 bg-gray-900 text-white p-3 rounded-lg shadow-xl min-w-[200px] transform -translate-x-1/2 -translate-y-full"
        style={{ left: x, top: y - 10 }}
      >
        <div className="text-sm font-medium mb-1">
          {cell.dia} - {cell.horario}
        </div>
        <div className="text-xs opacity-90">
          {cell.count} aula{cell.count !== 1 ? 's' : ''} agendada{cell.count !== 1 ? 's' : ''}
        </div>
        <div className="text-xs mt-1 text-blue-300">
          {cell.intensity * 100}% de ocupação neste horário
        </div>
      </div>
    );
  };

  const [hoveredCell, setHoveredCell] = React.useState<{cell: HeatmapCell; x: number; y: number} | null>(null);

  return (
    <div className="w-full h-full">
      {/* Legenda */}
      <div className="flex justify-between items-center mb-4">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Distribuição de aulas por horário e dia
        </div>
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-gray-100 dark:bg-gray-800 rounded"></div>
            <span>Vazio</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-100 dark:bg-blue-900/30 rounded"></div>
            <span>Baixa</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-300 dark:bg-blue-700/60 rounded"></div>
            <span>Média</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 dark:bg-blue-600 rounded"></div>
            <span>Alta</span>
          </div>
        </div>
      </div>

      {/* Grid do Heatmap */}
      <div className="relative">
        {/* Eixo Y - Horários */}
        <div className="flex">
          <div className="w-20 flex-shrink-0"></div>
          {/* Eixo X - Dias */}
          <div className="flex-1 grid grid-cols-6 gap-1 mb-1">
            {dias.map(dia => (
              <div key={dia} className="text-center text-sm font-medium text-gray-700 dark:text-gray-300 py-2">
                {dia}
              </div>
            ))}
          </div>
        </div>

        {/* Células do Heatmap */}
        <div className="flex">
          {/* Eixo Y - Horários */}
          <div className="w-20 flex-shrink-0">
            {horarios.map(horario => (
              <div key={horario} className="h-12 flex items-center justify-end pr-3 text-sm text-gray-600 dark:text-gray-400">
                {horario}
              </div>
            ))}
          </div>

          {/* Células */}
          <div className="flex-1">
            {heatmapData.map((row, rowIndex) => (
              <div key={rowIndex} className="grid grid-cols-6 gap-1 mb-1">
                {row.map((cell, colIndex) => {
                  const cellRef = React.useRef<HTMLDivElement>(null);
                  
                  return (
                    <div
                      key={`${rowIndex}-${colIndex}`}
                      ref={cellRef}
                      className={`h-12 rounded-md flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-105 hover:shadow-lg ${getCellColor(cell.intensity)}`}
                      onMouseEnter={(e) => {
                        const rect = cellRef.current?.getBoundingClientRect();
                        if (rect) {
                          setHoveredCell({
                            cell,
                            x: rect.left + rect.width / 2,
                            y: rect.top
                          });
                        }
                      }}
                      onMouseLeave={() => setHoveredCell(null)}
                    >
                      <span className={`text-sm font-medium ${getTextColor(cell.intensity)}`}>
                        {cell.count > 0 ? cell.count : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Tooltip */}
        {hoveredCell && (
          <Tooltip 
            cell={hoveredCell.cell} 
            x={hoveredCell.x} 
            y={hoveredCell.y} 
          />
        )}
      </div>

      {/* Estatísticas resumidas */}
      <div className="mt-6 grid grid-cols-3 gap-4 text-sm">
        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
          <div className="font-medium text-gray-700 dark:text-gray-300">Horário Mais Ocupado</div>
          <div className="text-lg font-bold mt-1">
            {(() => {
              const maxRow = heatmapData.reduce((max, row) => {
                const rowTotal = row.reduce((sum, cell) => sum + cell.count, 0);
                return rowTotal > max.total ? { total: rowTotal, horario: row[0]?.horario } : max;
              }, { total: 0, horario: '' });
              return maxRow.horario || 'N/A';
            })()}
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
          <div className="font-medium text-gray-700 dark:text-gray-300">Dia Mais Ocupado</div>
          <div className="text-lg font-bold mt-1">
            {(() => {
              const diaTotals = dias.map((dia, index) => ({
                dia,
                total: heatmapData.reduce((sum, row) => sum + row[index]?.count || 0, 0)
              }));
              const maxDia = diaTotals.reduce((max, curr) => curr.total > max.total ? curr : max);
              return maxDia.dia || 'N/A';
            })()}
          </div>
        </div>
        
        <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
          <div className="font-medium text-gray-700 dark:text-gray-300">Total de Slots Ocupados</div>
          <div className="text-lg font-bold mt-1">
            {heatmapData.flat().filter(cell => cell.count > 0).length} / {heatmapData.flat().length}
          </div>
        </div>
      </div>

      {/* Informações */}
      <div className="mt-4 flex items-start text-sm text-gray-600 dark:text-gray-400">
        <FiInfo className="mt-0.5 mr-2 flex-shrink-0" />
        <div>
          <p>
            Este heatmap mostra a distribuição das aulas ao longo da semana. 
            Cores mais escuras indicam maior concentração de aulas.
          </p>
          <p className="mt-1">
            Ideal para identificar horários sobrecarregados e otimizar a distribuição.
          </p>
        </div>
      </div>
    </div>
  );
};