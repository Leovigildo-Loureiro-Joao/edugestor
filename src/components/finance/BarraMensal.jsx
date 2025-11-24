import { useState } from 'react';
import { FiTrendingUp, FiTrendingDown, FiInfo } from 'react-icons/fi';

export const GraficoBarrasLucro = ({ dados }) => {
  const [barraAtiva, setBarraAtiva] = useState(null);
  
  const valores = dados.map(d => d.lucro);
  
  // Calcula estatísticas
  const totalLucro = valores.reduce((a, b) => a + b, 0);
  const mediaLucro = totalLucro / dados.length;
  const mesesPositivos = valores.filter(v => v >= 0).length;
  const percentualPositivo = (mesesPositivos / dados.length) * 100;

  // Encontra pontos altos e baixos
  const maiorLucro = Math.max(...valores);
  const menorLucro = Math.min(...valores);
  const mesMaiorLucro = dados[valores.indexOf(maiorLucro)]?.mes;
  const mesMenorLucro = dados[valores.indexOf(menorLucro)]?.mes;

  // Normaliza alturas para o gráfico (máximo 200px)
  const maxAbsoluto = Math.max(Math.abs(maiorLucro), Math.abs(menorLucro));
  const getAlturaBarra = (valor) => {
    if (maxAbsoluto === 0) return 0;
    return (Math.abs(valor) / maxAbsoluto) * 160; // Máximo 160px
  };

  const getCorBarra = (valor) => {
    if (valor > 0) return 'bg-green-500 hover:bg-green-600';
    if (valor < 0) return 'bg-red-500 hover:bg-red-600';
    return 'bg-gray-400 hover:bg-gray-500';
  };

  const getCorTexto = (valor) => {
    if (valor > 0) return 'text-green-600';
    if (valor < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="bg-white rounded-lg p-6">
      {/* Cabeçalho com Estatísticas */}
      <div className="flex flex-wrap justify-between items-start mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Evolução do Lucro Mensal</h3>
          <p className="text-sm text-gray-600">Performance financeira por mês</p>
        </div>
        
        <div className="flex flex-wrap gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">
              {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(totalLucro)}
            </div>
            <div className="text-xs text-gray-500">Lucro Total</div>
          </div>
          
          <div className="text-center">
            <div className={`text-lg font-semibold ${mediaLucro >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(mediaLucro)}
            </div>
            <div className="text-xs text-gray-500">Média Mensal</div>
          </div>
          
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">
              {percentualPositivo.toFixed(0)}%
            </div>
            <div className="text-xs text-gray-500">Meses Positivos</div>
          </div>
        </div>
      </div>

      {/* Gráfico de Barras */}
      <div className="h-80 relative">
        {/* Linha do zero */}
        <div className="absolute left-0 right-0 top-1/2 border-t-2 border-gray-300 z-0"></div>
        
        {/* Grade de fundo */}
        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
          {[0, 25, 50, 75, 100].map((percent) => (
            <div key={percent} className="border-t border-gray-100"></div>
          ))}
        </div>

        {/* Barras */}
        <div className="relative h-full flex items-end justify-between px-4 z-10">
          {dados.map((item, index) => {
            const altura = getAlturaBarra(item.lucro);
            const isPositivo = item.lucro >= 0;
            const isAtivo = barraAtiva === index;
            
            return (
              <div 
                key={index} 
                className="flex flex-col items-center space-y-2 relative group"
                onMouseEnter={() => setBarraAtiva(index)}
                onMouseLeave={() => setBarraAtiva(null)}
              >
                {/* Tooltip */}
                {isAtivo && (
                  <div className="absolute -top-16 bg-gray-900 text-white px-3 py-2 rounded-lg text-sm whitespace-nowrap z-20 shadow-lg">
                    <div className="font-semibold">{item.mes}</div>
                    <div className={isPositivo ? 'text-green-300' : 'text-red-300'}>
                      {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(item.lucro)}
                    </div>
                    <div className="w-3 h-3 bg-gray-900 rotate-45 absolute -bottom-1 left-1/2 transform -translate-x-1/2"></div>
                  </div>
                )}

                {/* Valor acima da barra */}
                <div className={`text-xs font-semibold ${getCorTexto(item.lucro)} opacity-0 group-hover:opacity-100 transition-opacity`}>
                  {new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(item.lucro)}
                </div>

                {/* Barra vertical */}
                <div 
                  className={`w-8 rounded-t transition-all duration-300 relative cursor-pointer ${
                    getCorBarra(item.lucro)
                  } ${isAtivo ? 'ring-4 ring-opacity-30 shadow-lg' : 'shadow-md'} ${
                    isPositivo ? 'ring-green-500' : 'ring-red-500'
                  }`}
                  style={{ 
                    height: `${altura}px`,
                    marginTop: isPositivo ? 'auto' : `${altura}px`,
                    transform: isPositivo ? 'none' : 'translateY(-100%)'
                  }}
                  title={`${item.mes}: ${new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(item.lucro)}`}
                >
                  {/* Efeito de brilho no hover */}
                  <div className={`absolute inset-0 rounded-t opacity-0 group-hover:opacity-20 transition-opacity ${
                    isPositivo ? 'bg-white' : 'bg-gray-100'
                  }`}></div>
                </div>

                {/* Label do mês */}
                <div className={`text-xs font-medium transition-colors ${
                  isAtivo ? 'text-gray-900 font-semibold' : 'text-gray-500'
                }`}>
                  {item.mes}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legenda lateral (valores) */}
        <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-xs text-gray-400 py-4">
          <div>+{new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(maxAbsoluto)}</div>
          <div>+{new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(maxAbsoluto * 0.75)}</div>
          <div>+{new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(maxAbsoluto * 0.5)}</div>
          <div>+{new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(maxAbsoluto * 0.25)}</div>
          <div className="text-gray-600 font-medium">Kz 0</div>
          <div>-{new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(maxAbsoluto * 0.25)}</div>
          <div>-{new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(maxAbsoluto * 0.5)}</div>
          <div>-{new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(maxAbsoluto * 0.75)}</div>
          <div>-{new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(maxAbsoluto)}</div>
        </div>
      </div>

      {/* Insights e Análises */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center gap-2 mb-2">
          <FiInfo className="text-blue-500" />
          <h4 className="font-semibold text-blue-900">Insights do Período</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <FiTrendingUp className="text-green-500" />
            <span>
              <strong>Melhor mês:</strong> {mesMaiorLucro} ({new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(maiorLucro)})
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <FiTrendingDown className="text-red-500" />
            <span>
              <strong>Mês crítico:</strong> {mesMenorLucro} ({new Intl.NumberFormat('pt-AO', { style: 'currency', currency: 'AOA' }).format(menorLucro)})
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>
              <strong>{mesesPositivos}</strong> de <strong>{dados.length}</strong> meses positivos
            </span>
          </div>
        </div>
      </div>

      {/* Legenda de Cores */}
      <div className="mt-4 flex justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span className="text-gray-700">Lucro Positivo</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span className="text-gray-700">Prejuízo</span>
        </div>
      </div>
    </div>
  );
};

export default GraficoBarrasLucro;