// components/dashboard/EventosPorMeta.tsx
import React, { useState, useEffect } from 'react';
import { FiCalendar, FiTarget, FiTrendingUp } from 'react-icons/fi';
import { eventoService } from '../../services/database/eventoService';
import { estrategiaService } from '../../services/database/estrategiaService';

const EventosPorMeta = () => {
  const [eventos, setEventos] = useState<any[]>([]);
  const [metas, setMetas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [eventosData, metasData] = await Promise.all([
        eventoService.listarEventos(),
        estrategiaService.getMetas()
      ]);
      
      setEventos(eventosData);
      setMetas(metasData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  // Agrupar eventos por meta
  const eventosPorMeta = metas.map(meta => {
    const eventosDaMeta = eventos.filter(e => e.meta_id === meta.id);
    
    return {
      meta,
      eventos: eventosDaMeta,
      total: eventosDaMeta.length,
      proximoEvento: eventosDaMeta
        .filter(e => new Date(e.date) >= new Date())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0]
    };
  }).filter(item => item.total > 0);

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
      <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 mb-6 flex items-center">
        <FiTarget className="mr-2 text-blue-600" />
        Eventos por Meta Estratégica
      </h3>
      
      <div className="space-y-6">
        {eventosPorMeta.map((item, index) => (
          <div key={item.meta.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:bg-gray-900">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="font-semibold text-gray-800 dark:text-gray-100">{item.meta.titulo}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Progresso: <span className="font-bold">{item.meta.progresso || 0}%</span>
                </p>
              </div>
              
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">{item.total}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">eventos</div>
              </div>
            </div>
            
            {/* Barra de progresso */}
            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
              <div 
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${item.meta.progresso || 0}%` }}
              ></div>
            </div>
            
            {/* Próximo evento */}
            {item.proximoEvento && (
              <div className="mt-4 pt-3 border-t">
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">Próximo evento:</div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{item.proximoEvento.title}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                      <FiCalendar className="mr-1" />
                      {new Date(item.proximoEvento.date).toLocaleDateString('pt-AO')} 
                      às {item.proximoEvento.time}
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded ${
                    item.proximoEvento.type === 'academic' ? 'bg-purple-100 text-purple-800' :
                    item.proximoEvento.type === 'event' ? 'bg-orange-100 text-orange-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {item.proximoEvento.type}
                  </span>
                </div>
              </div>
            )}
            
            {/* Todos os eventos */}
            {item.eventos.length > 0 && (
              <div className="mt-4 text-sm">
                <details>
                  <summary className="cursor-pointer text-blue-600 font-medium">
                    Ver todos os eventos ({item.eventos.length})
                  </summary>
                  <div className="mt-2 space-y-2">
                    {item.eventos.map(evento => (
                      <div key={evento.id} className="text-xs p-2 bg-gray-100 rounded">
                        <div className="flex justify-between">
                          <span>{evento.title}</span>
                          <span>{new Date(evento.date).toLocaleDateString('pt-AO')}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            )}
          </div>
        ))}
        
        {eventosPorMeta.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <FiCalendar className="mx-auto text-3xl mb-2" />
            <p>Nenhum evento relacionado a metas ainda</p>
            <p className="text-sm">Crie eventos e relacione com metas estratégicas</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventosPorMeta;