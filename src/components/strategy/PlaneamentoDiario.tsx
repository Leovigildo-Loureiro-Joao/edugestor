import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FiClock,
  FiCalendar,
  FiCheckCircle,
  FiPlus,
  FiBell,
  FiChevronLeft,
  FiChevronRight
} from 'react-icons/fi';

export const PlanejamentoDiario = () => {
  const [dataAtual, setDataAtual] = useState(new Date());
  
  const horarios = Array.from({ length: 12 }, (_, i) => {
    const hora = i + 7; // Das 7h às 18h
    return {
      hora: `${hora}:00`,
      compromissos: [
        ...(hora === 8 ? [{ id: 1, titulo: 'Reunião Equipe', duracao: 60 }] : []),
        ...(hora === 10 ? [{ id: 2, titulo: 'Aula Matemática', duracao: 45 }] : []),
        ...(hora === 14 ? [{ id: 3, titulo: 'Planejamento', duracao: 90 }] : [])
      ]
    };
  });

  return (
    <div className="p-6">
      {/* Cabeçalho do dia */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button onClick={() => {
            const novaData = new Date(dataAtual);
            novaData.setDate(novaData.getDate() - 1);
            setDataAtual(novaData);
          }}>
            <FiChevronLeft className="h-6 w-6" />
          </button>
          <div>
            <h2 className="text-2xl font-bold">
              {dataAtual.toLocaleDateString('pt-BR', { weekday: 'long' })}
            </h2>
            <p className="text-gray-600">
              {dataAtual.toLocaleDateString('pt-BR', { 
                day: '2-digit',
                month: 'long',
                year: 'numeric'
              })}
            </p>
          </div>
          <button onClick={() => {
            const novaData = new Date(dataAtual);
            novaData.setDate(novaData.getDate() + 1);
            setDataAtual(novaData);
          }}>
            <FiChevronRight className="h-6 w-6" />
          </button>
        </div>
        
        <div className="flex items-center space-x-3">
          <button className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg">
            <FiCheckCircle className="mr-2" />
            Finalizar Dia
          </button>
          <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg">
            <FiPlus className="mr-2" />
            Nova Tarefa
          </button>
        </div>
      </div>

      {/* Agenda do dia */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline do dia */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow">
          <div className="p-4 border-b">
            <h3 className="font-bold">Agenda do Dia</h3>
          </div>
          <div className="p-4">
            <div className="space-y-4">
              {horarios.map((bloco, index) => (
                <div key={index} className="flex">
                  <div className="w-20 flex-shrink-0 text-right pr-4 pt-1">
                    <div className="font-medium">{bloco.hora}</div>
                  </div>
                  
                  <div className="flex-1 border-l-2 border-gray-200 pl-4 pb-4">
                    {bloco.compromissos.length > 0 ? (
                      bloco.compromissos.map(compromisso => (
                        <motion.div
                          key={compromisso.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded-r-lg mb-2"
                        >
                          <div className="font-medium">{compromisso.titulo}</div>
                          <div className="text-sm text-gray-600">
                            {compromisso.duracao} minutos
                          </div>
                        </motion.div>
                      ))
                    ) : (
                      <div className="h-12 flex items-center">
                        <span className="text-gray-400 text-sm">Horário livre</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Painel lateral */}
        <div className="space-y-4">
          {/* Tarefas rápidas */}
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="font-bold mb-3">Tarefas Rápidas</h3>
            <div className="space-y-2">
              {[
                { id: 1, titulo: 'Enviar relatório', concluido: false },
                { id: 2, titulo: 'Ligar para fornecedor', concluido: true },
                { id: 3, titulo: 'Revisar planejamento', concluido: false }
              ].map(tarefa => (
                <div key={tarefa.id} className="flex items-center">
                  <input
                    type="checkbox"
                    checked={tarefa.concluido}
                    className="mr-3"
                    onChange={() => {}}
                  />
                  <span className={tarefa.concluido ? 'line-through text-gray-400' : ''}>
                    {tarefa.titulo}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Lembretes */}
          <div className="bg-white rounded-xl shadow p-4">
            <div className="flex items-center mb-3">
              <FiBell className="text-yellow-500 mr-2" />
              <h3 className="font-bold">Lembretes</h3>
            </div>
            <div className="space-y-2">
              <div className="text-sm p-2 bg-yellow-50 border border-yellow-200 rounded">
                Reunião às 14:00 - Sala 3
              </div>
              <div className="text-sm p-2 bg-red-50 border border-red-200 rounded">
                Prazo relatório: hoje às 18:00
              </div>
            </div>
          </div>

          {/* Progresso do dia */}
          <div className="bg-white rounded-xl shadow p-4">
            <h3 className="font-bold mb-3">Progresso do Dia</h3>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">65%</div>
              <div className="text-gray-600">Concluído</div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div className="bg-green-500 h-2 rounded-full" style={{ width: '65%' }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};