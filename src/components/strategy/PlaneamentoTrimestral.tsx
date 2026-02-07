// components/strategy/PlanejamentoTrimestral.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FiCalendar, 
  FiChevronLeft, 
  FiChevronRight,
  FiTarget,
  FiCheckCircle,
  FiBarChart2,
  FiTrendingUp,
  FiUsers,
  FiDollarSign,
  FiPlus,
  FiEdit2,
  FiDownload,
  FiShare2,
  FiPieChart,
  FiActivity
} from 'react-icons/fi';
import { Meta, Tarefa } from '../../types/eventos';

interface PlanejamentoTrimestralProps {
  trimestre: number;
  ano: number;
  metas: Meta[];
  tarefas: Tarefa[];
  onTrimestreChange?: (trimestre: number, ano: number) => void;
}

const PlanejamentoTrimestral: React.FC<PlanejamentoTrimestralProps> = ({ 
  trimestre: trimestreInicial, 
  ano: anoInicial, 
  metas, 
  tarefas,
  onTrimestreChange 
}) => {
  const [trimestreAtual, setTrimestreAtual] = useState(trimestreInicial);
  const [anoAtual, setAnoAtual] = useState(anoInicial);
  const [viewMode, setViewMode] = useState<'visao' | 'meses' | 'metas' | 'kpis'>('visao');
  
  // Definição dos trimestres
  const trimestres = [
    { numero: 1, nome: '1º Trimestre', meses: ['Jan', 'Fev', 'Mar'] },
    { numero: 2, nome: '2º Trimestre', meses: ['Abr', 'Mai', 'Jun'] },
    { numero: 3, nome: '3º Trimestre', meses: ['Jul', 'Ago', 'Set'] },
    { numero: 4, nome: '4º Trimestre', meses: ['Out', 'Nov', 'Dez'] }
  ];
  
  const trimestreAtualInfo = trimestres.find(t => t.numero === trimestreAtual)!;
  
  // Navegação
  const irParaTrimestreAnterior = () => {
    if (trimestreAtual === 1) {
      setTrimestreAtual(4);
      setAnoAtual(anoAtual - 1);
      onTrimestreChange?.(4, anoAtual - 1);
    } else {
      setTrimestreAtual(trimestreAtual - 1);
      onTrimestreChange?.(trimestreAtual - 1, anoAtual);
    }
  };
  
  const irParaTrimestreSeguinte = () => {
    if (trimestreAtual === 4) {
      setTrimestreAtual(1);
      setAnoAtual(anoAtual + 1);
      onTrimestreChange?.(1, anoAtual + 1);
    } else {
      setTrimestreAtual(trimestreAtual + 1);
      onTrimestreChange?.(trimestreAtual + 1, anoAtual);
    }
  };
  
  // Calcular datas do trimestre
  const calcularDatasTrimestre = () => {
    const mesInicio = (trimestreAtual - 1) * 3; // 0, 3, 6, 9
    const dataInicio = new Date(anoAtual, mesInicio, 1);
    const dataFim = new Date(anoAtual, mesInicio + 3, 0);
    
    return { dataInicio, dataFim };
  };
  
  const { dataInicio, dataFim } = calcularDatasTrimestre();
  
  // Filtrar metas e tarefas do trimestre
  const metasDoTrimestre = metas.filter(meta => {
    const metaDataFim = new Date(meta.data_fim);
    return metaDataFim >= dataInicio && metaDataFim <= dataFim;
  });
  
  const tarefasDoTrimestre = tarefas.filter(tarefa => {
    if (!tarefa.data_limite) return false;
    const tarefaData = new Date(tarefa.data_limite);
    return tarefaData >= dataInicio && tarefaData <= dataFim;
  });
  
  // Calcular estatísticas
  const estatisticas = {
    totalMetas: metasDoTrimestre.length,
    metasConcluidas: metasDoTrimestre.filter(m => m.status === 'concluida').length,
    totalTarefas: tarefasDoTrimestre.length,
    tarefasConcluidas: tarefasDoTrimestre.filter(t => t.status === 'concluida').length,
    progressoMedio: metasDoTrimestre.length > 0 
      ? Math.round(metasDoTrimestre.reduce((acc, m) => acc + m.progresso, 0) / metasDoTrimestre.length)
      : 0,
    orcamentoTotal: metasDoTrimestre.reduce((acc, m) => acc + (m.orcamento_previsto || 0), 0),
    orcamentoUtilizado: metasDoTrimestre.reduce((acc, m) => acc + (m.orcamento_alocado || 0), 0)
  };

  // Agrupar metas por tipo
  const metasPorTipo = metasDoTrimestre.reduce((acc, meta) => {
    acc[meta.tipo] = (acc[meta.tipo] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Calcular progresso por mês
  const calcularProgressoPorMes = () => {
    const meses = trimestreAtualInfo.meses;
    const progressos = meses.map((mes, index) => {
      const mesNumero = (trimestreAtual - 1) * 3 + index;
      const metasDoMes = metas.filter(meta => {
        const metaDataFim = new Date(meta.data_fim);
        return metaDataFim.getMonth() === mesNumero && 
               metaDataFim.getFullYear() === anoAtual;
      });
      
      return metasDoMes.length > 0
        ? Math.round(metasDoMes.reduce((acc, m) => acc + m.progresso, 0) / metasDoMes.length)
        : 0;
    });
    
    return progressos;
  };
  
  const progressoPorMes = calcularProgressoPorMes();

  return (
    <div className="p-6">
      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8">
        <div className="flex items-center space-x-4 mb-4 lg:mb-0">
          <button
            onClick={irParaTrimestreAnterior}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <FiChevronLeft className="h-5 w-5" />
          </button>
          
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
              {trimestreAtualInfo.nome} {anoAtual}
            </h2>
            <p className="text-gray-600">
              {dataInicio.toLocaleDateString('pt-BR')} - {dataFim.toLocaleDateString('pt-BR')}
            </p>
          </div>
          
          <button
            onClick={irParaTrimestreSeguinte}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <FiChevronRight className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Modos de visualização */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('visao')}
              className={`px-4 py-2 rounded-lg ${viewMode === 'visao' ? 'bg-white shadow' : ''}`}
            >
              Visão Geral
            </button>
            <button
              onClick={() => setViewMode('meses')}
              className={`px-4 py-2 rounded-lg ${viewMode === 'meses' ? 'bg-white shadow' : ''}`}
            >
              Por Mês
            </button>
            <button
              onClick={() => setViewMode('metas')}
              className={`px-4 py-2 rounded-lg ${viewMode === 'metas' ? 'bg-white shadow' : ''}`}
            >
              Metas
            </button>
            <button
              onClick={() => setViewMode('kpis')}
              className={`px-4 py-2 rounded-lg ${viewMode === 'kpis' ? 'bg-white shadow' : ''}`}
            >
              KPIs
            </button>
          </div>
          
          <button className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700">
            <FiPlus className="mr-2" />
            Novo Trimestre
          </button>
        </div>
      </div>

      {/* Estatísticas do Trimestre */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{estatisticas.totalMetas}</div>
            <div className="text-sm text-gray-600">Metas</div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{estatisticas.metasConcluidas}</div>
            <div className="text-sm text-gray-600">Concluídas</div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{estatisticas.progressoMedio}%</div>
            <div className="text-sm text-gray-600">Progresso</div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{estatisticas.totalTarefas}</div>
            <div className="text-sm text-gray-600">Tarefas</div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-teal-600">
              {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(estatisticas.orcamentoTotal)}
            </div>
            <div className="text-sm text-gray-600">Orçamento</div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow p-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {estatisticas.orcamentoTotal > 0 
                ? Math.round((estatisticas.orcamentoUtilizado / estatisticas.orcamentoTotal) * 100)
                : 0}%
            </div>
            <div className="text-sm text-gray-600">Utilizado</div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      {viewMode === 'visao' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Progresso por Mês */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow p-6">
            <h3 className="font-bold text-lg mb-6">Progresso por Mês</h3>
            <div className="space-y-6">
              {trimestreAtualInfo.meses.map((mes, index) => (
                <div key={mes}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-semibold">{mes}</span>
                    <span className="font-bold">{progressoPorMes[index]}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`h-3 rounded-full ${
                        progressoPorMes[index] >= 80 ? 'bg-green-500' :
                        progressoPorMes[index] >= 50 ? 'bg-blue-500' :
                        progressoPorMes[index] >= 30 ? 'bg-yellow-500' : 'bg-red-500'
                      }`}
                      style={{ width: `${progressoPorMes[index]}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {/* Distribuição por Tipo */}
          <div className="bg-white rounded-xl shadow p-6">
            <h3 className="font-bold text-lg mb-6">Metas por Área</h3>
            <div className="space-y-4">
              {Object.entries(metasPorTipo).map(([tipo, quantidade]) => {
                const porcentagem = (quantidade / estatisticas.totalMetas) * 100;
                const cores = {
                  academica: 'bg-blue-500',
                  financeira: 'bg-green-500',
                  operacional: 'bg-purple-500',
                  marketing: 'bg-orange-500',
                  infraestrutura: 'bg-teal-500',
                  qualidade: 'bg-indigo-500'
                };
                
                return (
                  <div key={tipo}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize">{tipo}</span>
                      <span>{quantidade} ({porcentagem.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${cores[tipo as keyof typeof cores] || 'bg-gray-500'}`}
                        style={{ width: `${porcentagem}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Timeline do Trimestre */}
          <div className="lg:col-span-3 bg-white rounded-xl shadow p-6">
            <h3 className="font-bold text-lg mb-6">Timeline do Trimestre</h3>
            <div className="relative">
              {/* Linha do tempo */}
              <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-gray-300"></div>
              
              <div className="relative flex justify-between">
                {trimestreAtualInfo.meses.map((mes, index) => {
                  const marco = index === 1; // Marco do meio do trimestre
                  
                  return (
                    <div key={mes} className="relative text-center w-32">
                      <div className={`w-6 h-6 rounded-full mx-auto mb-2 ${
                        marco ? 'bg-blue-500' : 'bg-gray-400'
                      }`}></div>
                      <div className="font-semibold">{mes}</div>
                      {marco && (
                        <div className="mt-1 text-sm text-blue-600 font-medium">
                          Revisão do Trimestre
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : viewMode === 'meses' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {trimestreAtualInfo.meses.map((mes, index) => {
            const mesNumero = (trimestreAtual - 1) * 3 + index;
            const metasDoMes = metas.filter(meta => {
              const metaDataFim = new Date(meta.data_fim);
              return metaDataFim.getMonth() === mesNumero && 
                     metaDataFim.getFullYear() === anoAtual;
            });
            
            return (
              <div key={mes} className="bg-white rounded-xl shadow overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-4 text-white">
                  <h3 className="font-bold text-lg">{mes}</h3>
                  <p className="text-blue-100">
                    {metasDoMes.length} metas • {progressoPorMes[index]}% concluído
                  </p>
                </div>
                
                <div className="p-4">
                  <div className="space-y-3">
                    {metasDoMes.slice(0, 5).map(meta => (
                      <div key={meta.id} className="border-l-4 border-blue-500 pl-3 py-2">
                        <div className="font-medium">{meta.titulo}</div>
                        <div className="text-sm text-gray-600">
                          Progresso: {meta.progresso}%
                        </div>
                      </div>
                    ))}
                    
                    {metasDoMes.length > 5 && (
                      <div className="text-center text-blue-600 text-sm">
                        +{metasDoMes.length - 5} metas
                      </div>
                    )}
                    
                    {metasDoMes.length === 0 && (
                      <div className="text-center text-gray-500 py-4">
                        Nenhuma meta neste mês
                      </div>
                    )}
                  </div>
                  
                  <button className="w-full mt-4 p-2 border border-dashed border-gray-300 rounded text-gray-400 hover:border-gray-400 hover:text-gray-600">
                    <FiPlus className="mx-auto" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : viewMode === 'metas' ? (
        <div className="bg-white rounded-xl shadow">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-lg">Metas do Trimestre</h3>
              <div className="text-sm text-gray-600">
                {metasDoTrimestre.length} metas encontradas
              </div>
            </div>
            
            <div className="space-y-4">
              {metasDoTrimestre.map(meta => (
                <motion.div
                  key={meta.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <div className={`p-2 rounded-lg mr-3 ${
                        meta.tipo === 'academica' ? 'bg-blue-100' :
                        meta.tipo === 'financeira' ? 'bg-green-100' :
                        meta.tipo === 'operacional' ? 'bg-purple-100' :
                        'bg-gray-100'
                      }`}>
                        <FiTarget className={`${
                          meta.tipo === 'academica' ? 'text-blue-600' :
                          meta.tipo === 'financeira' ? 'text-green-600' :
                          meta.tipo === 'operacional' ? 'text-purple-600' :
                          'text-gray-600'
                        }`} />
                      </div>
                      <div>
                        <h4 className="font-bold">{meta.titulo}</h4>
                        <p className="text-sm text-gray-600">{meta.descricao}</p>
                      </div>
                    </div>
                    
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                      meta.prioridade === 'critica' ? 'bg-red-100 text-red-800' :
                      meta.prioridade === 'alta' ? 'bg-orange-100 text-orange-800' :
                      meta.prioridade === 'media' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {meta.prioridade}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-gray-600">
                      <span className="flex items-center">
                        <FiUsers className="mr-1" />
                        {meta.responsavel_principal}
                      </span>
                      <span className="flex items-center">
                        <FiCalendar className="mr-1" />
                        {new Date(meta.data_fim).toLocaleDateString('pt-BR')}
                      </span>
                      {meta.orcamento_previsto && (
                        <span className="flex items-center">
                          <FiDollarSign className="mr-1" />
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(meta.orcamento_previsto)}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center">
                      <span className="font-bold mr-3">{meta.progresso}%</span>
                      <div className="w-24 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            meta.progresso >= 80 ? 'bg-green-500' :
                            meta.progresso >= 50 ? 'bg-blue-500' :
                            meta.progresso >= 30 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${meta.progresso}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              
              {metasDoTrimestre.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <FiTarget className="mx-auto h-12 w-12 mb-3 opacity-50" />
                  <p>Nenhuma meta planejada para este trimestre</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-bold text-lg mb-6">Indicadores do Trimestre</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* KPIs Acadêmicos */}
            <div>
              <h4 className="font-semibold mb-4 text-blue-700 flex items-center">
                <FiActivity className="mr-2" />
                Indicadores Acadêmicos
              </h4>
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Taxa de Aprovação</span>
                    <span className="font-bold">92%</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '92%' }} />
                  </div>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Frequência Média</span>
                    <span className="font-bold">95%</span>
                  </div>
                  <div className="w-full bg-blue-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full" style={{ width: '95%' }} />
                  </div>
                </div>
              </div>
            </div>
            
            {/* KPIs Financeiros */}
            <div>
              <h4 className="font-semibold mb-4 text-green-700 flex items-center">
                <FiTrendingUp className="mr-2" />
                Indicadores Financeiros
              </h4>
              <div className="space-y-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Receita vs Orçamento</span>
                    <span className="font-bold">105%</span>
                  </div>
                  <div className="w-full bg-green-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '105%' }} />
                  </div>
                </div>
                
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex justify-between mb-2">
                    <span className="font-medium">Custos Controlados</span>
                    <span className="font-bold">97%</span>
                  </div>
                  <div className="w-full bg-green-200 rounded-full h-2">
                    <div className="bg-green-600 h-2 rounded-full" style={{ width: '97%' }} />
                  </div>
                </div>
              </div>
            </div>
            
            {/* KPIs Operacionais */}
            <div className="md:col-span-2">
              <h4 className="font-semibold mb-4 text-purple-700 flex items-center">
                <FiPieChart className="mr-2" />
                Indicadores de Satisfação
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">4.8</div>
                    <div className="text-sm text-gray-600">Satisfação dos Pais</div>
                  </div>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">4.9</div>
                    <div className="text-sm text-gray-600">Satisfação dos Alunos</div>
                  </div>
                </div>
                
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-purple-600">94%</div>
                    <div className="text-sm text-gray-600">Retenção de Alunos</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ações do Trimestre */}
      <div className="mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg">Ações do Trimestre</h3>
          <div className="flex space-x-2">
            <button className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 flex items-center">
              <FiDownload className="mr-2" />
              Exportar
            </button>
            <button className="px-4 py-2 bg-white text-purple-600 rounded-lg hover:bg-purple-50 flex items-center">
              <FiShare2 className="mr-2" />
              Compartilhar
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold mb-3 text-indigo-700">Próximas Revisões</h4>
            <div className="space-y-3">
              <div className="bg-white p-3 rounded-lg border">
                <div className="font-medium">Revisão do Trimestre</div>
                <div className="text-sm text-gray-600">
                  Data: 15/{trimestreAtualInfo.meses[1]}/{anoAtual}
                </div>
              </div>
              <div className="bg-white p-3 rounded-lg border">
                <div className="font-medium">Planejamento Próximo Trimestre</div>
                <div className="text-sm text-gray-600">
                  Última semana do trimestre
                </div>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold mb-3 text-purple-700">Relatórios Pendentes</h4>
            <div className="space-y-3">
              <div className="bg-white p-3 rounded-lg border">
                <div className="font-medium">Relatório Financeiro Trimestral</div>
                <div className="text-sm text-gray-600">
                  Prazo: 10 dias após fim do trimestre
                </div>
              </div>
              <div className="bg-white p-3 rounded-lg border">
                <div className="font-medium">Relatório Pedagógico</div>
                <div className="text-sm text-gray-600">
                  Prazo: 5 dias após fim do trimestre
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanejamentoTrimestral;