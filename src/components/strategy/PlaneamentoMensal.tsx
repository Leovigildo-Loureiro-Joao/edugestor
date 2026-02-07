// components/strategy/PlanejamentoMensal.tsx
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FiCalendar, 
  FiChevronLeft, 
  FiChevronRight,
  FiTarget,
  FiCheckCircle,
  FiBarChart2,
  FiClock,
  FiUsers,
  FiDollarSign,
  FiPlus,
  FiEdit2,
  FiDownload,
  FiShare2
} from 'react-icons/fi';
import { Meta, Tarefa } from '../../types/eventos';

interface PlanejamentoMensalProps {
  mes: Date;
  metas: Meta[];
  tarefas: Tarefa[];
  onMesChange?: (novoMes: Date) => void;
}

const PlanejamentoMensal: React.FC<PlanejamentoMensalProps> = ({ 
  mes, 
  metas, 
  tarefas,
  onMesChange 
}) => {
  const [mesAtual, setMesAtual] = useState(mes);
  const [viewMode, setViewMode] = useState<'calendario' | 'lista' | 'metas'>('calendario');
  
  // Navegação de mês
  const irParaMesAnterior = () => {
    const novoMes = new Date(mesAtual);
    novoMes.setMonth(novoMes.getMonth() - 1);
    setMesAtual(novoMes);
    onMesChange?.(novoMes);
  };
  
  const irParaMesSeguinte = () => {
    const novoMes = new Date(mesAtual);
    novoMes.setMonth(novoMes.getMonth() + 1);
    setMesAtual(novoMes);
    onMesChange?.(novoMes);
  };
  
  const irParaMesAtual = () => {
    const hoje = new Date();
    setMesAtual(hoje);
    onMesChange?.(hoje);
  };
  
  // Formatar nome do mês
  const nomeMes = mesAtual.toLocaleDateString('pt-BR', { 
    month: 'long',
    year: 'numeric'
  }).toUpperCase();
  
  // Calcular semanas do mês
  const calcularSemanasDoMes = () => {
    const primeiroDia = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1);
    const ultimoDia = new Date(mesAtual.getFullYear(), mesAtual.getMonth() + 1, 0);
    
    const semanas = [];
    let dataAtual = new Date(primeiroDia);
    
    // Ajustar para começar na segunda-feira
    const diaSemana = dataAtual.getDay();
    if (diaSemana !== 1) { // Se não for segunda
      const diff = diaSemana === 0 ? 6 : diaSemana - 1;
      dataAtual.setDate(dataAtual.getDate() - diff);
    }
    
    while (dataAtual <= ultimoDia || semanas.length < 6) {
      const semana = [];
      for (let i = 0; i < 7; i++) {
        semana.push(new Date(dataAtual));
        dataAtual.setDate(dataAtual.getDate() + 1);
      }
      semanas.push(semana);
    }
    
    return semanas;
  };
  
  const semanas = calcularSemanasDoMes();
  
  // Filtrar metas e tarefas do mês
  const metasDoMes = metas.filter(meta => {
    const dataFim = new Date(meta.data_fim);
    return dataFim.getMonth() === mesAtual.getMonth() && 
           dataFim.getFullYear() === mesAtual.getFullYear();
  });
  
  const tarefasDoMes = tarefas.filter(tarefa => {
    if (!tarefa.data_limite) return false;
    const dataLimite = new Date(tarefa.data_limite);
    return dataLimite.getMonth() === mesAtual.getMonth() && 
           dataLimite.getFullYear() === mesAtual.getFullYear();
  });
  
  // Calcular estatísticas
  const estatisticas = {
    totalMetas: metasDoMes.length,
    metasConcluidas: metasDoMes.filter(m => m.status === 'concluida').length,
    totalTarefas: tarefasDoMes.length,
    tarefasConcluidas: tarefasDoMes.filter(t => t.status === 'concluida').length,
    progressoMedio: metasDoMes.length > 0 
      ? Math.round(metasDoMes.reduce((acc, m) => acc + m.progresso, 0) / metasDoMes.length)
      : 0
  };

  return (
    <div className="p-6">
      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8">
        <div className="flex items-center space-x-4 mb-4 lg:mb-0">
          <button
            onClick={irParaMesAnterior}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <FiChevronLeft className="h-5 w-5" />
          </button>
          
          <div className="text-center">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-800">
              {nomeMes}
            </h2>
            <button
              onClick={irParaMesAtual}
              className="text-sm text-blue-600 hover:text-blue-800 mt-1"
            >
              Voltar para mês atual
            </button>
          </div>
          
          <button
            onClick={irParaMesSeguinte}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <FiChevronRight className="h-5 w-5" />
          </button>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Modos de visualização */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('calendario')}
              className={`px-4 py-2 rounded-lg ${viewMode === 'calendario' ? 'bg-white shadow' : ''}`}
            >
              Calendário
            </button>
            <button
              onClick={() => setViewMode('lista')}
              className={`px-4 py-2 rounded-lg ${viewMode === 'lista' ? 'bg-white shadow' : ''}`}
            >
              Lista
            </button>
            <button
              onClick={() => setViewMode('metas')}
              className={`px-4 py-2 rounded-lg ${viewMode === 'metas' ? 'bg-white shadow' : ''}`}
            >
              Metas
            </button>
          </div>
          
          <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <FiPlus className="mr-2" />
            Novo Planejamento
          </button>
        </div>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg mr-3">
              <FiTarget className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{estatisticas.totalMetas}</div>
              <div className="text-sm text-gray-600">Metas</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg mr-3">
              <FiCheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{estatisticas.metasConcluidas}</div>
              <div className="text-sm text-gray-600">Concluídas</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg mr-3">
              <FiBarChart2 className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{estatisticas.progressoMedio}%</div>
              <div className="text-sm text-gray-600">Progresso</div>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-xl shadow p-4">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg mr-3">
              <FiClock className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{estatisticas.totalTarefas}</div>
              <div className="text-sm text-gray-600">Tarefas</div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo Principal */}
      {viewMode === 'calendario' ? (
        <div className="bg-white rounded-xl shadow overflow-hidden">
          {/* Dias da semana */}
          <div className="grid grid-cols-7 border-b">
            {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((dia, idx) => (
              <div key={dia} className="p-3 text-center font-semibold text-gray-700">
                {dia}
              </div>
            ))}
          </div>
          
          {/* Calendário */}
          <div className="grid grid-cols-7">
            {semanas.flat().map((data, index) => {
              const isMesAtual = data.getMonth() === mesAtual.getMonth();
              const isHoje = data.toDateString() === new Date().toDateString();
              const diaNumero = data.getDate();
              
              // Contar tarefas para este dia
              const tarefasDia = tarefasDoMes.filter(t => {
                if (!t.data_limite) return false;
                const tarefaData = new Date(t.data_limite);
                return tarefaData.toDateString() === data.toDateString();
              });
              
              return (
                <div
                  key={index}
                  className={`min-h-[120px] border p-2 ${
                    !isMesAtual ? 'bg-gray-50 text-gray-400' : ''
                  } ${isHoje ? 'bg-blue-50 border-blue-200' : ''}`}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className={`font-semibold ${
                      isHoje ? 'text-blue-600' : ''
                    }`}>
                      {diaNumero}
                    </span>
                    {tarefasDia.length > 0 && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded-full">
                        {tarefasDia.length}
                      </span>
                    )}
                  </div>
                  
                  {/* Tarefas do dia */}
                  <div className="space-y-1">
                    {tarefasDia.slice(0, 3).map(tarefa => (
                      <div
                        key={tarefa.id}
                        className={`text-xs p-1 rounded truncate ${
                          tarefa.status === 'concluida' 
                            ? 'bg-green-100 text-green-800 line-through' 
                            : 'bg-gray-100 text-gray-700'
                        }`}
                        title={tarefa.titulo}
                      >
                        {tarefa.titulo}
                      </div>
                    ))}
                    {tarefasDia.length > 3 && (
                      <div className="text-xs text-gray-500 text-center">
                        +{tarefasDia.length - 3} mais
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : viewMode === 'lista' ? (
        <div className="bg-white rounded-xl shadow">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Tarefas do Mês</h3>
            <div className="space-y-3">
              {tarefasDoMes.map(tarefa => (
                <div key={tarefa.id} className="flex items-center p-3 border rounded-lg hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={tarefa.status === 'concluida'}
                    className="mr-3"
                    readOnly
                  />
                  <div className="flex-1">
                    <div className="font-medium">{tarefa.titulo}</div>
                    <div className="text-sm text-gray-600">
                      Prazo: {new Date(tarefa.data_limite!).toLocaleDateString('pt-BR')}
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    tarefa.prioridade === 'alta' ? 'bg-red-100 text-red-800' :
                    tarefa.prioridade === 'media' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {tarefa.prioridade}
                  </span>
                </div>
              ))}
              
              {tarefasDoMes.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma tarefa agendada para este mês
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow">
          <div className="p-6">
            <h3 className="text-lg font-semibold mb-4">Metas do Mês</h3>
            <div className="space-y-4">
              {metasDoMes.map(meta => (
                <div key={meta.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-lg">{meta.titulo}</h4>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      meta.status === 'concluida' ? 'bg-green-100 text-green-800' :
                      meta.status === 'em_andamento' ? 'bg-blue-100 text-blue-800' :
                      meta.status === 'atrasada' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {meta.status === 'em_andamento' ? 'Em Andamento' : 
                       meta.status === 'concluida' ? 'Concluída' : 
                       meta.status === 'atrasada' ? 'Atrasada' : 'Não Iniciada'}
                    </span>
                  </div>
                  
                  <p className="text-gray-600 mb-3">{meta.descricao}</p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center text-sm text-gray-500">
                        <FiUsers className="mr-1" />
                        {meta.responsavel_principal}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <FiClock className="mr-1" />
                        Até {new Date(meta.data_fim).toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                    
                    <div className="flex items-center">
                      <span className="font-bold mr-2">{meta.progresso}%</span>
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full"
                          style={{ width: `${meta.progresso}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {metasDoMes.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma meta agendada para este mês
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Resumo do Mês */}
      <div className="mt-8 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl shadow p-6">
        <h3 className="font-bold text-lg mb-4">Resumo de Planejamento</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Focos Principais */}
          <div>
            <h4 className="font-semibold mb-2 text-blue-700">Focos do Mês</h4>
            <ul className="space-y-2">
              <li className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                <span>Preparar período de matrículas</span>
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                <span>Revisar currículo pedagógico</span>
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                <span>Capacitação de professores</span>
              </li>
            </ul>
          </div>
          
          {/* Marcos Importantes */}
          <div>
            <h4 className="font-semibold mb-2 text-purple-700">Marcos Importantes</h4>
            <ul className="space-y-2">
              <li className="flex items-center text-sm">
                <FiCalendar className="text-purple-600 mr-2" size={14} />
                <span>Dia 05: Reunião com pais</span>
              </li>
              <li className="flex items-center text-sm">
                <FiCalendar className="text-purple-600 mr-2" size={14} />
                <span>Dia 15: Entrega de boletins</span>
              </li>
              <li className="flex items-center text-sm">
                <FiCalendar className="text-purple-600 mr-2" size={14} />
                <span>Dia 25: Fechamento mensal</span>
              </li>
            </ul>
          </div>
          
          {/* Ações Rápidas */}
          <div>
            <h4 className="font-semibold mb-2 text-green-700">Ações Rápidas</h4>
            <div className="space-y-2">
              <button className="w-full text-left p-2 bg-white rounded-lg hover:bg-gray-50 text-sm">
                Gerar relatório mensal
              </button>
              <button className="w-full text-left p-2 bg-white rounded-lg hover:bg-gray-50 text-sm">
                Revisar orçamento
              </button>
              <button className="w-full text-left p-2 bg-white rounded-lg hover:bg-gray-50 text-sm">
                Planejar próximo mês
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanejamentoMensal;