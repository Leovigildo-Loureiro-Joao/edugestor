import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FiCalendar, 
  FiClock,
  FiCheckCircle,
  FiPlus,
  FiChevronLeft,
  FiChevronRight
} from 'react-icons/fi';

export const PlanejamentoSemanal = () => {
  const [dataAtual, setDataAtual] = useState(new Date());
  
  const diasDaSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const dias = Array.from({ length: 7 }, (_, i) => {
    const data = new Date(dataAtual);
    data.setDate(data.getDate() - data.getDay() + i);
    return data;
  });

  const tarefasPorDia = {
    'Seg': [
      { id: 1, titulo: 'Reunião Pedagógica', hora: '08:00', tipo: 'reuniao' },
      { id: 2, titulo: 'Aula Matemática', hora: '10:00', tipo: 'aula' }
    ],
    'Ter': [
      { id: 3, titulo: 'Planejamento Semanal', hora: '09:00', tipo: 'planejamento' }
    ]
    // ... outros dias
  };

  return (
    <div className="p-6">
      {/* Controles de navegação */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button onClick={() => {
            const novaData = new Date(dataAtual);
            novaData.setDate(novaData.getDate() - 7);
            setDataAtual(novaData);
          }}>
            <FiChevronLeft className="h-6 w-6" />
          </button>
          <h2 className="text-2xl font-bold">
            Semana {dataAtual.getDate()}-{dataAtual.getDate() + 6}/{dataAtual.getMonth() + 1}
          </h2>
          <button onClick={() => {
            const novaData = new Date(dataAtual);
            novaData.setDate(novaData.getDate() + 7);
            setDataAtual(novaData);
          }}>
            <FiChevronRight className="h-6 w-6" />
          </button>
        </div>
        <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg">
          <FiPlus className="mr-2" />
          Nova Atividade
        </button>
      </div>

      {/* Grid da semana */}
      <div className="grid grid-cols-7 gap-2">
        {dias.map((dia, index) => {
          const diaStr = diasDaSemana[index];
          const tarefas = tarefasPorDia[diaStr] || [];
          
          return (
            <div key={index} className="bg-white rounded-lg shadow p-3">
              <div className={`text-center font-semibold ${
                index === 0 || index === 6 ? 'text-red-500' : ''
              }`}>
                {diaStr}
              </div>
              <div className="text-center text-sm text-gray-500">
                {dia.getDate()}
              </div>
              
              <div className="mt-3 space-y-2">
                {tarefas.map(tarefa => (
                  <div 
                    key={tarefa.id}
                    className={`p-2 rounded text-xs ${
                      tarefa.tipo === 'reuniao' ? 'bg-blue-100' :
                      tarefa.tipo === 'aula' ? 'bg-green-100' :
                      'bg-gray-100'
                    }`}
                  >
                    <div className="font-medium">{tarefa.titulo}</div>
                    <div className="flex items-center text-gray-500">
                      <FiClock className="h-3 w-3 mr-1" />
                      {tarefa.hora}
                    </div>
                  </div>
                ))}
                
                <button className="w-full p-2 border border-dashed border-gray-300 rounded text-gray-400 hover:border-gray-400 hover:text-gray-600">
                  <FiPlus className="mx-auto" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Lista de compromissos da semana */}
      <div className="mt-6 bg-white rounded-xl shadow p-4">
        <h3 className="font-bold mb-4">Compromissos da Semana</h3>
        <div className="space-y-3">
          {[
            { id: 1, titulo: 'Planejamento Pedagógico', dia: 'Segunda', hora: '14:00', concluido: true },
            { id: 2, titulo: 'Reunião com Pais', dia: 'Quarta', hora: '16:00', concluido: false },
            { id: 3, titulo: 'Treinamento Equipe', dia: 'Sexta', hora: '10:00', concluido: false }
          ].map(item => (
            <div key={item.id} className="flex items-center p-3 border rounded-lg">
              <div className={`p-1 rounded ${
                item.concluido ? 'bg-green-100 text-green-600' : 'bg-gray-100'
              }`}>
                <FiCheckCircle className="h-5 w-5" />
              </div>
              <div className="ml-3 flex-1">
                <div className="font-medium">{item.titulo}</div>
                <div className="text-sm text-gray-500">
                  {item.dia} às {item.hora}
                </div>
              </div>
              <button className="p-2 hover:bg-gray-100 rounded">
                Editar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};