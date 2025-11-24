import { useState } from 'react';
import { FiTrendingUp, FiTrendingDown, FiDollarSign, FiPieChart } from 'react-icons/fi';

export const GraficoBarrasDuplas = ({ dados }) => {
  const [mesAtivo, setMesAtivo] = useState(null);
  const [tipoVisualizacao, setTipoVisualizacao] = useState('barras');
  
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
    if (lucro > 0) return 'text-green-600 bg-green-50 border-green-200';
    if (lucro < 0) return 'text-red-600 bg-red-50 border-red-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getDiferencaPercentual = (receita, despesa) => {
    if (despesa === 0) return 100;
    return ((receita - despesa) / despesa) * 100;
  };

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
              isAtivo ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
            }`}
            onMouseEnter={() => setMesAtivo(index)}
            onMouseLeave={() => setMesAtivo(null)}
          >
            {/* Mês */}
            <div className="w-16">
              <div className="text-sm font-semibold text-gray-900">{item.mes}</div>
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
                    className="bg-green-500 h-6 rounded-l-lg transition-all duration-500 relative group-hover:bg-green-600"
                    style={{ width: `${percentualReceita}%` }}
                  >
                    {isAtivo && (
                      <div className="absolute -top-8 -left-2 bg-gray-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
                        Receita: {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(item.receita)}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 ml-2 font-medium min-w-[80px]">
                    {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(item.receita)}
                  </span>
                </div>
              </div>

              {/* Despesa */}
              <div className="flex items-center group">
                <div className="flex items-center w-full">
                  <div 
                    className="bg-red-500 h-6 rounded-l-lg transition-all duration-500 relative group-hover:bg-red-600"
                    style={{ width: `${percentualDespesa}%` }}
                  >
                    {isAtivo && (
                      <div className="absolute -top-8 -left-2 bg-gray-900 text-white px-2 py-1 rounded text-xs whitespace-nowrap">
                        Despesa: {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(item.despesa)}
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-gray-500 ml-2 font-medium min-w-[80px]">
                    {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(item.despesa)}
                  </span>
                </div>
              </div>
            </div>

            {/* Indicador de Performance */}
            <div className="w-20 text-right">
              <div className={`text-sm font-semibold ${
                diferencaPercentual > 20 ? 'text-green-600' :
                diferencaPercentual > 0 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {diferencaPercentual > 0 ? '+' : ''}{diferencaPercentual.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-500">Performance</div>
            </div>
          </div>
        );
      })}
    </div>
  );

  // COMPONENTE DE LINHAS (SIMPLIFICADO)
  const VisualizacaoLinhas = () => (
    <div className="h-80 relative bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-center h-full text-gray-500">
        <div className="text-center">
          <FiTrendingUp className="mx-auto text-4xl mb-2 text-gray-400" />
          <p className="font-medium">Visualização em Linhas</p>
          <p className="text-sm">Em desenvolvimento</p>
          <button 
            onClick={() => setTipoVisualizacao('barras')}
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
          >
            Voltar para Barras
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white p-6">
      {/* Cabeçalho com Controles */}
      <div className="flex flex-wrap justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Receitas vs Despesas</h3>
          <p className="text-sm text-gray-600">Comparativo mensal detalhado</p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Toggle Visualização FUNCIONAL */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setTipoVisualizacao('barras')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                tipoVisualizacao === 'barras'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Barras
            </button>
            <button
              onClick={() => setTipoVisualizacao('linhas')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-all ${
                tipoVisualizacao === 'linhas'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Linhas
            </button>
          </div>

          {/* Totais */}
          <div className="flex items-center gap-6 text-sm">
            <div className="text-center">
              <div className="flex items-center gap-1 text-green-600 font-semibold">
                <FiTrendingUp size={14} />
                {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(totais.receita)}
              </div>
              <div className="text-gray-500">Total Receita</div>
            </div>
            <div className="text-center">
              <div className="flex items-center gap-1 text-red-600 font-semibold">
                <FiTrendingDown size={14} />
                {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(totais.despesa)}
              </div>
              <div className="text-gray-500">Total Despesa</div>
            </div>
          </div>
        </div>
      </div>

      {/* Legenda */}
      <div className="flex items-center justify-center gap-6 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-sm font-medium text-gray-700">Receitas</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span className="text-sm font-medium text-gray-700">Despesas</span>
        </div>
      </div>

      {/* GRÁFICO DINÂMICO */}
      {tipoVisualizacao === 'barras' ? <VisualizacaoBarras /> : <VisualizacaoLinhas />}

      {/* Rodapé com Estatísticas */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">
              {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(totais.lucro)}
            </div>
            <div className="text-sm text-gray-500">Lucro Líquido</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {totais.receita > 0 ? ((totais.receita - totais.despesa) / totais.receita * 100).toFixed(1) : 0}%
            </div>
            <div className="text-sm text-gray-500">Margem Líquida</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {dadosFiltrados.filter(d => d.receita > d.despesa).length}
            </div>
            <div className="text-sm text-gray-500">Meses Lucrativos</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {dadosFiltrados.filter(d => d.receita < d.despesa).length}
            </div>
            <div className="text-sm text-gray-500">Meses em Prejuízo</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GraficoBarrasDuplas;