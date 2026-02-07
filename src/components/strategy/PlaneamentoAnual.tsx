import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  FiCalendar, 
  FiChevronLeft, 
  FiChevronRight,
  FiPlus,
  FiBarChart2,
  FiCheckCircle
} from 'react-icons/fi';
import { Meta } from '../../types/eventos';

interface PlanejamentoAnualProps {
  ano: number;
  metasAnuais: Meta[];
}

export const PlanejamentoAnual = ({ ano, metasAnuais }: PlanejamentoAnualProps) => {
  const [anoAtual, setAnoAtual] = useState(new Date().getFullYear());
  
  const meses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return (
    <div className="p-6">
      {/* Cabeçalho com navegação de ano */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <button onClick={() => setAnoAtual(anoAtual - 1)}>
            <FiChevronLeft className="h-6 w-6" />
          </button>
          <h2 className="text-2xl font-bold">{anoAtual}</h2>
          <button onClick={() => setAnoAtual(anoAtual + 1)}>
            <FiChevronRight className="h-6 w-6" />
          </button>
        </div>
        <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg">
          <FiPlus className="mr-2" />
          Nova Meta Anual
        </button>
      </div>

      {/* Visão por trimestre */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {[
          { nome: '1º Trimestre', meses: [0, 1, 2], progresso: 75 },
          { nome: '2º Trimestre', meses: [3, 4, 5], progresso: 50 },
          { nome: '3º Trimestre', meses: [6, 7, 8], progresso: 25 },
          { nome: '4º Trimestre', meses: [9, 10, 11], progresso: 10 }
        ].map((trimestre, idx) => (
          <div key={idx} className="bg-white rounded-xl shadow p-4">
            <h3 className="font-bold mb-2">{trimestre.nome}</h3>
            <div className="text-2xl font-bold mb-2">{trimestre.progresso}%</div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${trimestre.progresso}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Timeline anual */}
      <div className="bg-white rounded-xl shadow overflow-hidden">
        <div className="p-4 border-b">
          <h3 className="font-bold">Timeline do Ano</h3>
        </div>
        <div className="p-4">
          <div className="flex overflow-x-auto pb-4">
            {meses.map((mes, index) => (
              <div key={index} className="flex-shrink-0 w-40 mx-2">
                <div className="text-center font-semibold mb-2">{mes}</div>
                <div className="bg-gray-100 rounded-lg p-3 h-32">
                  {/* Eventos/marcos do mês */}
                  <div className="text-xs space-y-1">
                    <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      Reunião Pedagógica
                    </div>
                    <div className="bg-green-100 text-green-800 px-2 py-1 rounded">
                      Avaliações
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};