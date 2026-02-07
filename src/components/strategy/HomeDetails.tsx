// components/strategy/DashboardIntegrado.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { 
  FiCalendar, 
  FiTarget,
  FiCheckCircle,
  FiClock,
  FiUsers,
  FiTrendingUp,
  FiBarChart2,
  FiDollarSign,
  FiActivity,
  FiAward,
  FiBookOpen,
  FiHome,
  FiAlertCircle,
  FiChevronRight
} from 'react-icons/fi';
import { Meta, Tarefa } from '../../types/eventos';
import AreaChart from '../ui/AreaChart';

interface DashboardIntegradoProps {
  metas: Meta[];
  tarefas: Tarefa[];
}

const DashboardIntegrado: React.FC<DashboardIntegradoProps> = ({ metas, tarefas }) => {
  // DADOS HIPOTÉTICOS PARA AREACHART - EVOLUÇÃO ANUAL
  const dadosEvolucaoAnual = [
    { periodo: 'Jan', valor: 15, categoria: 'Progresso' },
    { periodo: 'Fev', valor: 28, categoria: 'Progresso' },
    { periodo: 'Mar', valor: 42, categoria: 'Progresso' },
    { periodo: 'Abr', valor: 55, categoria: 'Progresso' },
    { periodo: 'Mai', valor: 68, categoria: 'Progresso' },
    { periodo: 'Jun', valor: 75, categoria: 'Progresso' },
    { periodo: 'Jul', valor: 82, categoria: 'Progresso' },
    { periodo: 'Ago', valor: 88, categoria: 'Progresso' },
    { periodo: 'Set', valor: 92, categoria: 'Progresso' },
    { periodo: 'Out', valor: 95, categoria: 'Progresso' },
    { periodo: 'Nov', valor: 97, categoria: 'Progresso' },
    { periodo: 'Dez', valor: 100, categoria: 'Progresso' },
  ];

  // DADOS HIPOTÉTICOS - MATRÍCULAS POR MÊS
  const dadosMatriculasAnuais = [
    { periodo: 'Jan', valor: 185, categoria: 'Matrículas' },
    { periodo: 'Fev', valor: 95, categoria: 'Matrículas' },
    { periodo: 'Mar', valor: 45, categoria: 'Matrículas' },
    { periodo: 'Abr', valor: 22, categoria: 'Matrículas' },
    { periodo: 'Mai', valor: 18, categoria: 'Matrículas' },
    { periodo: 'Jun', valor: 15, categoria: 'Matrículas' },
    { periodo: 'Jul', valor: 65, categoria: 'Matrículas' },
    { periodo: 'Ago', valor: 35, categoria: 'Matrículas' },
    { periodo: 'Set', valor: 28, categoria: 'Matrículas' },
    { periodo: 'Out', valor: 42, categoria: 'Matrículas' },
    { periodo: 'Nov', valor: 105, categoria: 'Matrículas' },
    { periodo: 'Dez', valor: 150, categoria: 'Matrículas' },
  ];

  // DADOS HIPOTÉTICOS - SATISFAÇÃO POR TRIMESTRE
  const dadosSatisfacaoTrimestral = [
    { periodo: '1º Tri', valor: 4.5, categoria: 'Satisfação' },
    { periodo: '2º Tri', valor: 4.6, categoria: 'Satisfação' },
    { periodo: '3º Tri', valor: 4.7, categoria: 'Satisfação' },
    { periodo: '4º Tri', valor: 4.8, categoria: 'Satisfação' },
  ];

  // DADOS HIPOTÉTICOS - FREQUÊNCIA MENSAL
  const dadosFrequenciaMensal = [
    { periodo: 'Jan', valor: 94, categoria: 'Frequência' },
    { periodo: 'Fev', valor: 92, categoria: 'Frequência' },
    { periodo: 'Mar', valor: 95, categoria: 'Frequência' },
    { periodo: 'Abr', valor: 96, categoria: 'Frequência' },
    { periodo: 'Mai', valor: 95, categoria: 'Frequência' },
    { periodo: 'Jun', valor: 94, categoria: 'Frequência' },
    { periodo: 'Jul', valor: 88, categoria: 'Frequência' },
    { periodo: 'Ago', valor: 94, categoria: 'Frequência' },
    { periodo: 'Set', valor: 96, categoria: 'Frequência' },
    { periodo: 'Out', valor: 95, categoria: 'Frequência' },
    { periodo: 'Nov', valor: 94, categoria: 'Frequência' },
    { periodo: 'Dez', valor: 90, categoria: 'Frequência' },
  ];

  // Estatísticas calculadas
  const estatisticas = {
    totalMetas: metas.length,
    metasConcluidas: metas.filter(m => m.status === 'concluida').length,
    metasAndamento: metas.filter(m => m.status === 'em_andamento').length,
    metasAtrasadas: metas.filter(m => m.status === 'atrasada').length,
    tarefasPendentes: tarefas.filter(t => !t.concluida).length,
    tarefasHoje: tarefas.filter(t => {
      if (!t.data_limite) return false;
      const hoje = new Date().toDateString();
      const dataTarefa = new Date(t.data_limite).toDateString();
      return hoje === dataTarefa;
    }).length,
  };

  // Compromissos da semana (dados hipotéticos)
  const compromissosSemana = [
    { id: 1, dia: 'Seg', titulo: 'Reunião Pedagógica', hora: '14:00', tipo: 'reuniao' },
    { id: 2, dia: 'Ter', titulo: 'Visita de Pais', hora: '10:00', tipo: 'visita' },
    { id: 3, dia: 'Qua', titulo: 'Capacitação Professores', hora: '09:00', tipo: 'capacitacao' },
    { id: 4, dia: 'Qui', titulo: 'Conselho de Classe', hora: '16:00', tipo: 'reuniao' },
    { id: 5, dia: 'Sex', titulo: 'Evento Cultural', hora: '18:00', tipo: 'evento' },
  ];

  // Agenda de hoje (dados hipotéticos)
  const agendaHoje = [
    { id: 1, hora: '08:00', titulo: 'Abertura da Escola', descricao: 'Receber alunos' },
    { id: 2, hora: '10:00', titulo: 'Reunião com Coordenação', descricao: 'Planejamento semanal' },
    { id: 3, hora: '14:00', titulo: 'Visita de Fornecedor', descricao: 'Material didático' },
    { id: 4, hora: '16:00', titulo: 'Entrega de Relatórios', descricao: 'Mensalidade' },
  ];

  // Metas prioritárias
  const metasPrioritarias = metas
    .filter(m => m.prioridade === 'alta' || m.prioridade === 'critica')
    .slice(0, 3);

  return (
    <div className="p-6">
      {/* Cabeçalho do Dashboard */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2 flex items-center">
          <FiHome className="mr-3 text-blue-600" />
          Dashboard Integrado
        </h1>
        <p className="text-gray-600">
          Visão completa do planejamento escolar em todos os níveis
        </p>
      </motion.div>

      
      {/* Conteúdo Principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Visão Anual com AreaChart */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg flex items-center">
                <FiTrendingUp className="mr-2 text-blue-600" />
                Evolução Anual do Progresso
              </h3>
              <span className="text-sm text-gray-500">2024</span>
            </div>
            
            <AreaChart
              data={dadosEvolucaoAnual}
              titulo="Progresso Cumulativo das Metas"
              descricao="Evolução mensal do cumprimento de metas estratégicas"
              altura={250}
              cores={['#3B82F6']}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <div className="text-sm text-blue-700 mb-1">Meta do Ano</div>
                <div className="text-2xl font-bold">100%</div>
                <div className="text-xs text-blue-600">Progresso atual: 68%</div>
              </div>
              
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-sm text-green-700 mb-1">Média Mensal</div>
                <div className="text-2xl font-bold">85%</div>
                <div className="text-xs text-green-600">Acima da meta (80%)</div>
              </div>
              
              <div className="bg-purple-50 p-4 rounded-lg">
                <div className="text-sm text-purple-700 mb-1">Trimestre Atual</div>
                <div className="text-2xl font-bold">92%</div>
                <div className="text-xs text-purple-600">2º Trimestre</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Semana Atual */}
        <div>
          <div className="bg-white rounded-xl shadow p-6 h-full">
            <h3 className="font-bold text-lg mb-6 flex items-center">
              <FiCalendar className="mr-2 text-green-600" />
              Esta Semana
            </h3>
            
            <div className="space-y-3">
              {compromissosSemana.map(compromisso => (
                <motion.div
                  key={compromisso.id}
                  whileHover={{ x: 5 }}
                  className="border-l-4 border-green-500 pl-4 py-3 bg-green-50"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{compromisso.titulo}</div>
                      <div className="text-sm text-gray-600 flex items-center mt-1">
                        <FiClock className="mr-1 h-3 w-3" />
                        {compromisso.hora} • {compromisso.dia}
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      compromisso.tipo === 'reuniao' ? 'bg-blue-100 text-blue-800' :
                      compromisso.tipo === 'visita' ? 'bg-purple-100 text-purple-800' :
                      compromisso.tipo === 'capacitacao' ? 'bg-orange-100 text-orange-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {compromisso.tipo}
                    </span>
                  </div>
                </motion.div>
              ))}
            </div>
            
            <div className="mt-6 pt-4 border-t">
              <h4 className="font-semibold mb-3 text-gray-700">Metas da Semana</h4>
              <div className="space-y-2">
                {metasPrioritarias.map(meta => (
                  <div key={meta.id} className="flex items-center text-sm">
                    <div className={`w-2 h-2 rounded-full mr-2 ${
                      meta.status === 'concluida' ? 'bg-green-500' :
                      meta.status === 'em_andamento' ? 'bg-blue-500' :
                      meta.status === 'atrasada' ? 'bg-red-500' : 'bg-gray-500'
                    }`} />
                    <span className="truncate flex-1">{meta.titulo}</span>
                    <span className="font-bold">{meta.progresso}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Segunda Linha - Gráficos Adicionais */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Matrículas Anuais */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-bold text-lg mb-6 flex items-center">
            <FiUsers className="mr-2 text-green-600" />
            Matrículas por Mês
          </h3>
          <AreaChart
            data={dadosMatriculasAnuais}
            titulo="Novas Matrículas Mensais"
            descricao="Quantidade de novas matrículas realizadas por mês"
            altura={200}
            cores={['#10B981']}
          />
          <div className="mt-4 text-center">
            <div className="text-2xl font-bold text-gray-800">782</div>
            <div className="text-sm text-gray-600">Total de matrículas em 2024</div>
          </div>
        </div>
        
        {/* Satisfação Trimestral */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-bold text-lg mb-6 flex items-center">
            <FiAward className="mr-2 text-orange-600" />
            Satisfação por Trimestre
          </h3>
          <AreaChart
            data={dadosSatisfacaoTrimestral}
            titulo="Índice de Satisfação"
            descricao="Avaliação média de pais e alunos (escala 1-5)"
            altura={200}
            cores={['#F59E0B']}
          />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="text-center">
              <div className="text-xl font-bold">4.65</div>
              <div className="text-xs text-gray-600">Média Anual</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-green-600">+0.3</div>
              <div className="text-xs text-gray-600">vs Ano Anterior</div>
            </div>
          </div>
        </div>
        
        {/* Frequência Mensal */}
        <div className="bg-white rounded-xl shadow p-6">
          <h3 className="font-bold text-lg mb-6 flex items-center">
            <FiActivity className="mr-2 text-purple-600" />
            Frequência Mensal
          </h3>
          <AreaChart
            data={dadosFrequenciaMensal}
            titulo="Taxa de Frequência (%)"
            descricao="Percentual médio de frequência dos alunos"
            altura={200}
            cores={['#8B5CF6']}
          />
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="text-center">
              <div className="text-xl font-bold">94.1%</div>
              <div className="text-xs text-gray-600">Média Anual</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-green-600">+1.5%</div>
              <div className="text-xs text-gray-600">vs Ano Anterior</div>
            </div>
          </div>
        </div>
      </div>

      {/* Hoje */}
      <div className="lg:col-span-3">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg flex items-center">
              <FiClock className="mr-2 text-blue-600" />
              Hoje - {new Date().toLocaleDateString('pt-BR', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long' 
              })}
            </h3>
            <div className="text-sm text-gray-600">
              {estatisticas.tarefasHoje} tarefas para hoje
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {agendaHoje.map(item => (
              <div key={item.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center mb-2">
                  <div className="p-2 bg-blue-100 rounded-lg mr-3">
                    <FiCalendar className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-bold text-lg">{item.hora}</div>
                    <div className="text-sm text-gray-500">Horário</div>
                  </div>
                </div>
                <h4 className="font-semibold mt-2">{item.titulo}</h4>
                <p className="text-sm text-gray-600 mt-1">{item.descricao}</p>
              </div>
            ))}
          </div>
          
          {/* Tarefas Urgentes de Hoje */}
          <div className="mt-6 pt-6 border-t">
            <h4 className="font-semibold mb-4 text-gray-700">Tarefas Urgentes</h4>
            <div className="space-y-3">
              {tarefas
                .filter(t => {
                  if (!t.data_limite) return false;
                  const hoje = new Date().toDateString();
                  const dataTarefa = new Date(t.data_limite).toDateString();
                  return hoje === dataTarefa && t.prioridade === 'alta';
                })
                .slice(0, 3)
                .map(tarefa => (
                  <div key={tarefa.id} className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-lg">
                    <div className="flex items-center">
                      <FiAlertCircle className="text-red-500 mr-3" />
                      <div>
                        <div className="font-medium">{tarefa.titulo}</div>
                        <div className="text-sm text-gray-600">{tarefa.responsavel_nome}</div>
                      </div>
                    </div>
                    <button className="text-sm bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200">
                      Resolver
                    </button>
                  </div>
                ))}
              
              {tarefas.filter(t => {
                if (!t.data_limite) return false;
                const hoje = new Date().toDateString();
                const dataTarefa = new Date(t.data_limite).toDateString();
                return hoje === dataTarefa && t.prioridade === 'alta';
              }).length === 0 && (
                <div className="text-center py-4 text-gray-500">
                  Nenhuma tarefa urgente para hoje
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Resumo de Áreas */}
      <div className="mt-6 bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl shadow p-6">
        <h3 className="font-bold text-lg mb-6">Resumo por Área</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { area: 'Acadêmica', progresso: 85, metas: 12, icon: <FiBookOpen className="text-blue-600" /> },
            { area: 'Financeira', progresso: 72, metas: 8, icon: <FiDollarSign className="text-green-600" /> },
            { area: 'Operacional', progresso: 90, metas: 15, icon: <FiActivity className="text-purple-600" /> },
            { area: 'Marketing', progresso: 78, metas: 5, icon: <FiTrendingUp className="text-orange-600" /> },
            { area: 'Infraestrutura', progresso: 65, metas: 6, icon: <FiHome className="text-teal-600" /> },
            { area: 'Qualidade', progresso: 88, metas: 10, icon: <FiAward className="text-indigo-600" /> },
          ].map((area, idx) => (
            <div key={idx} className="bg-white rounded-lg p-4 text-center">
              <div className="inline-block p-3 rounded-full bg-gray-100 mb-3">
                {area.icon}
              </div>
              <div className="font-bold text-2xl">{area.progresso}%</div>
              <div className="text-sm text-gray-600 mb-2">{area.area}</div>
              <div className="text-xs text-gray-500">{area.metas} metas</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DashboardIntegrado;