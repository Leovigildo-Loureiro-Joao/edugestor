import { useState, useMemo } from 'react';
import { FiTrendingUp, FiTrendingDown, FiDollarSign, FiPieChart, FiBarChart2, FiActivity } from 'react-icons/fi';

export const GraficoBarrasDuplas = ({ dados }) => {
  const [mesAtivo, setMesAtivo] = useState(null);
  const [tipoVisualizacao, setTipoVisualizacao] = useState('barras');
  const [pontoAtivo, setPontoAtivo] = useState(null);
  
  const maxValor = Math.max(...dados.map(d => Math.max(d.receita, d.despesa)));
  const totais = dados.reduce((acc, item) => ({
    receita: acc.receita + item.receita,
    despesa: acc.despesa + item.despesa,
    lucro: acc.lucro + (item.receita - item.despesa)
  }), { receita: 0, despesa: 0, lucro: 0 });

  // FILTRAR: Só mostrar meses com dados
  const dadosFiltrados = dados.filter(item => item.receita > 0 || item.despesa > 0);

  const getCorLucro = (receita, despesa) => {
    const lucro = receita - despesa;
    if (lucro > 0) return 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800';
    if (lucro < 0) return 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800';
    return 'text-gray-600 bg-gray-50 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700';
  };

  const getDiferencaPercentual = (receita, despesa) => {
    if (despesa === 0) return 100;
    return ((receita - despesa) / despesa) * 100;
  };

  // Preparar dados para o gráfico de linhas
  const pontosGraficoLinhas = useMemo(() => {
    const pontos = [];
    const width = 800; // Largura virtual para cálculos
    const height = 250;
    const padding = 40;
    
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    
    const stepX = chartWidth / (dadosFiltrados.length - 1 || 1);
    
    dadosFiltrados.forEach((item, index) => {
      const x = padding + index * stepX;
      
      // Ponto da receita
      const yReceita = padding + chartHeight - (item.receita / maxValor) * chartHeight;
      pontos.push({
        mes: item.mes,
        receita: item.receita,
        despesa: item.despesa,
        x,
        yReceita,
        yDespesa: padding + chartHeight - (item.despesa / maxValor) * chartHeight,
        index
      });
    });
    
    return pontos;
  }, [dadosFiltrados, maxValor]);

  // COMPONENTE DE BARRAS
  const VisualizacaoBarras = () => (
    <div className="space-y-4">
      {dadosFiltrados.map((item, index) => {
        const lucro = item.receita - item.despesa;
        const percentualReceita = (item.receita / maxValor) * 100;
        const percentualDespesa = (item.despesa / maxValor) * 100;
        const isAtivo = mesAtivo === index;
        const diferencaPercentual = getDiferencaPercentual(item.receita, item.despesa);

        return (
          <div 
            key={index}
            className={`flex items-center space-x-4 p-3 rounded-lg transition-all cursor-pointer ${
              isAtivo ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800' : 'hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
            onMouseEnter={() => setMesAtivo(index)}
            onMouseLeave={() => setMesAtivo(null)}
          >
            {/* Mês */}
            <div className="w-16">
              <div className="text-sm font-semibold text-gray-900 dark:text-white">{item.mes}</div>
              <div className={`text-xs px-2 py-1 rounded-full border ${getCorLucro(item.receita, item.despesa)}`}>
                {lucro >= 0 ? '+' : ''}{new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(lucro)}
              </div>
            </div>

            {/* Barras */}
            <div className="flex-1 space-y-2">
              {/* Receita */}
              <div className="flex items-center group">
                <div className="flex items-center w-full">
                  <div 
                    className="bg-green-500 h-6 rounded-l-lg transition-all duration-500 relative group-hover:bg-green-600 dark:bg-green-600 dark:group-hover:bg-green-700"
                    style={{ width: `${percentualReceita}%` }}
                  >
                    {isAtivo && (
                      <div className="absolute -top-8 -left-2 bg-gray-900 dark:bg-gray-800 text-white px-2 py-1 rounded text-xs whitespace-nowrap z-10 shadow-lg">
                        Receita: {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(item.receita)}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 font-medium min-w-[80px]">
                    {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(item.receita)}
                  </span>
                </div>
              </div>

              {/* Despesa */}
              <div className="flex items-center group">
                <div className="flex items-center w-full">
                  <div 
                    className="bg-red-500 h-6 rounded-l-lg transition-all duration-500 relative group-hover:bg-red-600 dark:bg-red-600 dark:group-hover:bg-red-700"
                    style={{ width: `${percentualDespesa}%` }}
                  >
                    {isAtivo && (
                      <div className="absolute -top-8 -left-2 bg-gray-900 dark:bg-gray-800 text-white px-2 py-1 rounded text-xs whitespace-nowrap z-10 shadow-lg">
                        Despesa: {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(item.despesa)}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 font-medium min-w-[80px]">
                    {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(item.despesa)}
                  </span>
                </div>
              </div>
            </div>

            {/* Indicador de Performance */}
            <div className="w-20 text-right">
              <div className={`text-sm font-semibold ${
                diferencaPercentual > 20 ? 'text-green-600 dark:text-green-400' :
                diferencaPercentual > 0 ? 'text-yellow-600 dark:text-yellow-400' :
                'text-red-600 dark:text-red-400'
              }`}>
                {diferencaPercentual > 0 ? '+' : ''}{diferencaPercentual.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Performance</div>
            </div>
          </div>
        );
      })}
    </div>
  );

  // COMPONENTE DE LINHAS (COMPLETO)
  const VisualizacaoLinhas = () => (
    <div className="relative">
      {/* Área do Gráfico */}
      <div className="relative h-80 bg-gray-50 dark:bg-gray-800 rounded-lg p-4 overflow-x-auto">
        <svg 
          width="100%" 
          height="100%" 
          viewBox="0 0 800 300" 
          preserveAspectRatio="xMidYMid meet"
          className="overflow-visible"
        >
          {/* Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((percent, i) => {
            const y = 40 + (200 * (1 - percent));
            const valor = maxValor * percent;
            return (
              <g key={i}>
                <line
                  x1="40"
                  y1={y}
                  x2="760"
                  y2={y}
                  stroke="#e5e7eb"
                  strokeDasharray="5,5"
                  className="dark:stroke-gray-700"
                />
                <text
                  x="35"
                  y={y - 5}
                  fontSize="10"
                  fill="#6b7280"
                  className="dark:fill-gray-400"
                  textAnchor="end"
                >
                  {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', minimumFractionDigits: 0 }).format(valor)}
                </text>
              </g>
            );
          })}

          {/* Linhas de Conexão - Receita (verde) */}
          <polyline
            points={pontosGraficoLinhas.map(p => `${p.x},${p.yReceita}`).join(' ')}
            fill="none"
            stroke="#22c55e"
            strokeWidth="3"
            className="dark:stroke-green-500"
          />

          {/* Linhas de Conexão - Despesa (vermelha) */}
          <polyline
            points={pontosGraficoLinhas.map(p => `${p.x},${p.yDespesa}`).join(' ')}
            fill="none"
            stroke="#ef4444"
            strokeWidth="3"
            className="dark:stroke-red-500"
          />

          {/* Pontos e Tooltips */}
          {pontosGraficoLinhas.map((ponto, index) => {
            const isAtivo = pontoAtivo === index;
            const diferencaPercentual = getDiferencaPercentual(ponto.receita, ponto.despesa);
            
            return (
              <g 
                key={index}
                onMouseEnter={() => setPontoAtivo(index)}
                onMouseLeave={() => setPontoAtivo(null)}
                className="cursor-pointer"
              >
                {/* Ponto da Receita */}
                <circle
                  cx={ponto.x}
                  cy={ponto.yReceita}
                  r={isAtivo ? 8 : 6}
                  fill={isAtivo ? "#22c55e" : "white"}
                  stroke="#22c55e"
                  strokeWidth="2"
                  className="dark:fill-green-500 dark:stroke-green-400 transition-all"
                />
                
                {/* Ponto da Despesa */}
                <circle
                  cx={ponto.x}
                  cy={ponto.yDespesa}
                  r={isAtivo ? 8 : 6}
                  fill={isAtivo ? "#ef4444" : "white"}
                  stroke="#ef4444"
                  strokeWidth="2"
                  className="dark:fill-red-500 dark:stroke-red-400 transition-all"
                />

                {/* Tooltip */}
                {isAtivo && (
                  <g>
                    {/* Fundo do tooltip */}
                    <rect
                      x={ponto.x - 80}
                      y={Math.min(ponto.yReceita, ponto.yDespesa) - 70}
                      width="160"
                      height="60"
                      rx="4"
                      fill="#1f2937"
                      className="dark:fill-gray-800"
                    />
                    
                    {/* Mês */}
                    <text
                      x={ponto.x}
                      y={Math.min(ponto.yReceita, ponto.yDespesa) - 55}
                      fontSize="12"
                      fontWeight="bold"
                      fill="white"
                      textAnchor="middle"
                    >
                      {ponto.mes}
                    </text>
                    
                    {/* Receita */}
                    <text
                      x={ponto.x - 70}
                      y={Math.min(ponto.yReceita, ponto.yDespesa) - 40}
                      fontSize="10"
                      fill="#22c55e"
                    >
                      R: {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', minimumFractionDigits: 0 }).format(ponto.receita)}
                    </text>
                    
                    {/* Despesa */}
                    <text
                      x={ponto.x - 70}
                      y={Math.min(ponto.yReceita, ponto.yDespesa) - 25}
                      fontSize="10"
                      fill="#ef4444"
                    >
                      D: {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', minimumFractionDigits: 0 }).format(ponto.despesa)}
                    </text>
                    
                    {/* Performance */}
                    <text
                      x={ponto.x - 70}
                      y={Math.min(ponto.yReceita, ponto.yDespesa) - 10}
                      fontSize="10"
                      fill={diferencaPercentual >= 0 ? "#22c55e" : "#ef4444"}
                    >
                      {diferencaPercentual >= 0 ? '+' : ''}{diferencaPercentual.toFixed(1)}%
                    </text>
                  </g>
                )}
              </g>
            );
          })}

          {/* Labels dos meses */}
          {pontosGraficoLinhas.map((ponto, index) => (
            <text
              key={`label-${index}`}
              x={ponto.x}
              y="280"
              fontSize="10"
              fill="#6b7280"
              className="dark:fill-gray-400"
              textAnchor="middle"
            >
              {ponto.mes}
            </text>
          ))}
        </svg>
      </div>

      {/* Legenda interativa */}
      <div className="flex items-center justify-center gap-8 mt-4">
        <div className="flex items-center gap-2 group cursor-pointer"
             onMouseEnter={() => {/* Destacar linha de receita */}}
             onMouseLeave={() => {/* Remover destaque */}}>
          <div className="w-4 h-4 bg-green-500 rounded-full group-hover:scale-110 transition-transform"></div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Receitas</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', minimumFractionDigits: 0 }).format(totais.receita)}
          </span>
        </div>
        <div className="flex items-center gap-2 group cursor-pointer"
             onMouseEnter={() => {/* Destacar linha de despesa */}}
             onMouseLeave={() => {/* Remover destaque */}}>
          <div className="w-4 h-4 bg-red-500 rounded-full group-hover:scale-110 transition-transform"></div>
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Despesas</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', minimumFractionDigits: 0 }).format(totais.despesa)}
          </span>
        </div>
      </div>

      {/* Instrução */}
      <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-2">
        Passe o mouse sobre os pontos para ver detalhes
      </p>
    </div>
  );

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700">
      {/* Cabeçalho com Controles */}
      <div className="flex flex-wrap justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Receitas vs Despesas</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">Comparativo mensal detalhado</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Toggle Visualização */}
          <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setTipoVisualizacao('barras')}
              className={`flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium transition-all ${
                tipoVisualizacao === 'barras'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <FiBarChart2 size={14} />
              Barras
            </button>
            <button
              onClick={() => setTipoVisualizacao('linhas')}
              className={`flex items-center gap-1 px-3 py-1 rounded-md text-sm font-medium transition-all ${
                tipoVisualizacao === 'linhas'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <FiActivity size={14} />
              Linhas
            </button>
          </div>

          {/* Totais */}
          <div className="flex items-center gap-6 text-sm">
            <div className="text-center">
              <div className="flex items-center gap-1 text-green-600 dark:text-green-400 font-semibold">
                <FiTrendingUp size={14} />
                {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', minimumFractionDigits: 0 }).format(totais.receita)}
              </div>
              <div className="text-gray-500 dark:text-gray-400 text-xs">Total Receita</div>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1 text-red-600 dark:text-red-400 font-semibold">
                <FiTrendingDown size={14} />
                {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', minimumFractionDigits: 0 }).format(totais.despesa)}
              </div>
              <div className="text-gray-500 dark:text-gray-400 text-xs">Total Despesa</div>
            </div>
          </div>
        </div>
      </div>

      {/* Legenda base (para visualização de barras) */}
      {tipoVisualizacao === 'barras' && (
        <div className="flex items-center justify-center gap-6 mb-6">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Receitas</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Despesas</span>
          </div>
        </div>
      )}

      {/* GRÁFICO DINÂMICO */}
      {tipoVisualizacao === 'barras' ? <VisualizacaoBarras /> : <VisualizacaoLinhas />}

      {/* Rodapé com Estatísticas */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className={`text-2xl font-bold ${totais.lucro >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA', minimumFractionDigits: 0 }).format(totais.lucro)}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Lucro Líquido</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {totais.receita > 0 ? ((totais.receita - totais.despesa) / totais.receita * 100).toFixed(1) : 0}%
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Margem Líquida</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {dadosFiltrados.filter(d => d.receita > d.despesa).length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Meses Lucrativos</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900 dark:text-white">
              {dadosFiltrados.filter(d => d.receita < d.despesa).length}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">Meses em Prejuízo</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GraficoBarrasDuplas;