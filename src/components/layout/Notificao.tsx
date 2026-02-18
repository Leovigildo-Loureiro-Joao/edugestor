import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2, Settings, AlertCircle, Info, Clock, DollarSign, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { notificacaoService, TipoNotificacao, PrioridadeNotificacao } from '../../services/database/notificacaoService';
import { useNavigate } from 'react-router-dom';

interface NotificacoesBellProps {
  userRole: 'aluno' | 'professor' | 'admin' | 'responsavel';
  userId?: string;
  alunoId?: string;
}

export const NotificacoesBellInteligente: React.FC<NotificacoesBellProps> = ({ 
  userRole, 
  userId, 
  alunoId 
}) => {
  const navigate = useNavigate();
  const [notificacoes, setNotificacoes] = useState<any[]>([]);
  const [countNaoLidas, setCountNaoLidas] = useState(0);
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    carregarNotificacoes();
    
    const handleNovaNotificacao = (event: any) => {
      if (event.detail) {
        carregarNotificacoes();
        if (event.detail.prioridade === PrioridadeNotificacao.URGENTE) {
          mostrarToast(event.detail);
        }
      }
    };

    window.addEventListener('nova-notificacao', handleNovaNotificacao);
    
    const intervalo = setInterval(() => {
      if (aberto) {
        carregarNotificacoes();
      }
    }, 60000);
    
    return () => {
      clearInterval(intervalo);
      window.removeEventListener('nova-notificacao', handleNovaNotificacao);
    };
  }, [userRole, userId, alunoId, aberto]);

  const mostrarToast = (notif: any) => {
    // Implemente seu sistema de toast aqui
    console.log(`🔔 ${notif.titulo}: ${notif.corpo}`);
  };

  const carregarNotificacoes = async () => {
    try {
      const [lista, count] = await Promise.all([
        notificacaoService.listarNotificacoesUsuario(userRole, userId, alunoId),
        notificacaoService.contarNotificacoesUsuario(userRole, userId, alunoId)
      ]);
      setNotificacoes(lista);
      setCountNaoLidas(count);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    }
  };

  const abrirNotificacao = async (notif: any) => {
    try {
      if (!notif.lida) {
        await notificacaoService.marcarComoLida(notif.id);
      }
      setAberto(false);

      if (notif.link && typeof notif.link === 'string') {
        navigate(notif.link);
        return;
      }

      await carregarNotificacoes();
    } catch (error) {
      console.error('Erro ao abrir notificação:', error);
    }
  };

  const marcarTodasComoLidas = async () => {
    setCarregando(true);
    try {
      await notificacaoService.marcarTodasComoLidas(userRole, userId);
      await carregarNotificacoes();
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    } finally {
      setCarregando(false);
    }
  };

  const deletarNotificacao = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificacaoService.deletarNotificacao(id);
      await carregarNotificacoes();
    } catch (error) {
      console.error('Erro ao deletar notificação:', error);
    }
  };

  const getIconePorTipo = (tipo: TipoNotificacao) => {
    switch (tipo) {
      case TipoNotificacao.ALERTA:
      case TipoNotificacao.ERRO:
        return <AlertCircle className="w-3.5 h-3.5" />;
      case TipoNotificacao.ALUNO_AVALIACAO:
      case TipoNotificacao.PROF_AVALIACAO:
        return <Clock className="w-3.5 h-3.5" />;
      case TipoNotificacao.ALUNO_FINANCEIRO:
      case TipoNotificacao.ADMIN_FINANCEIRO:
        return <DollarSign className="w-3.5 h-3.5" />;
      default:
        return <Info className="w-3.5 h-3.5" />;
    }
  };

  const getCorClassesPorPrioridade = (prioridade: PrioridadeNotificacao) => {
    switch (prioridade) {
      case PrioridadeNotificacao.URGENTE:
        return 'text-red-600 bg-red-50 border-red-100';
      case PrioridadeNotificacao.ALTA:
        return 'text-amber-600 bg-amber-50 border-amber-100';
      case PrioridadeNotificacao.MEDIA:
        return 'text-blue-600 bg-blue-50 border-blue-100';
      default:
        return 'text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border-gray-100';
    }
  };

  const getBadgeClassesPorPrioridade = (prioridade: PrioridadeNotificacao) => {
    switch (prioridade) {
      case PrioridadeNotificacao.URGENTE:
        return 'bg-red-100 text-red-800';
      case PrioridadeNotificacao.ALTA:
        return 'bg-amber-100 text-amber-800';
      case PrioridadeNotificacao.MEDIA:
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800 dark:text-gray-100';
    }
  };

  return (
    <div className="relative">
      {/* Botão do sino */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setAberto(!aberto)}
        className={`relative p-2 rounded-lg transition-colors ${
          aberto ? 'bg-gray-100' : 'hover:bg-gray-50 dark:bg-gray-900'
        }`}
        title={`${countNaoLidas} notificação(ões) não lida(s)`}
      >
        <Bell className={`w-5 h-5 ${countNaoLidas > 0 ? 'text-blue-500' : 'text-gray-400'}`} />
        
        {/* Badge de contagem */}
        {countNaoLidas > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 min-w-4 h-4 flex items-center justify-center text-xs font-semibold text-white rounded-full px-1"
            style={{
              backgroundColor: countNaoLidas > 5 ? '#EF4444' : '#3B82F6'
            }}
          >
            {countNaoLidas > 9 ? '9+' : countNaoLidas}
          </motion.span>
        )}
      </motion.button>

      {/* Dropdown de notificações */}
      <AnimatePresence>
        {aberto && (
          <>
            {/* Overlay de fundo */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAberto(false)}
              className="fixed inset-0 bg-black/20 z-30"
            />
            
            {/* Painel de notificações */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              transition={{ duration: 0.2 }}
              className="absolute right-0 top-12 w-96 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-40 max-h-[500px] flex flex-col"
            >
              {/* Cabeçalho */}
              <div className="px-4 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-t-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Notificações
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {countNaoLidas > 0 && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={marcarTodasComoLidas}
                        disabled={carregando}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium ${
                          carregando 
                            ? 'bg-green-400 cursor-not-allowed' 
                            : 'bg-green-500 hover:bg-green-600'
                        } text-white transition-colors`}
                      >
                        <Check className="w-3.5 h-3.5" />
                        {carregando ? 'Processando...' : 'Marcar todas'}
                      </motion.button>
                    )}
                    
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => notificacaoService.verificarNotificacoesAutomaticas()}
                      className="p-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                      title="Verificar agora"
                    >
                      <Settings className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </motion.button>
                    
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setAberto(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                    </motion.button>
                  </div>
                </div>
              </div>

              {/* Lista de notificações */}
              <div className="flex-1 overflow-y-auto max-h-[350px]">
                {notificacoes.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="px-6 py-16 text-center"
                  >
                    <Bell className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 dark:text-gray-400 font-medium">
                      Nenhuma notificação no momento
                    </p>
                    <p className="text-gray-400 text-sm mt-2">
                      As notificações importantes aparecerão aqui
                    </p>
                  </motion.div>
                ) : (
                  <AnimatePresence initial={false}>
                    {notificacoes.slice(0, 15).map((notif, index) => (
                      <motion.div
                        key={notif.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => abrirNotificacao(notif)}
                        className={`px-4 py-4 border-b border-gray-100 cursor-pointer transition-colors ${
                          !notif.lida ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50 dark:bg-gray-900'
                        }`}
                      >
                        <div className="flex gap-3">
                          {/* Ícone */}
                          <div className={`flex-shrink-0 mt-1 p-2 rounded-lg ${getCorClassesPorPrioridade(notif.prioridade)}`}>
                            {getIconePorTipo(notif.tipo)}
                          </div>
                          
                          {/* Conteúdo */}
                          <div className="flex-1 min-w-0">
                            <div className={`font-medium mb-2 line-clamp-2 ${
                              !notif.lida ? 'text-gray-900 dark:text-white' : 'text-gray-600 dark:text-gray-400'
                            }`}>
                              {notif.titulo}
                            </div>
                            
                            <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">
                              {notif.corpo}
                            </p>

                            {notif.link && (
                              <p className="text-xs text-blue-600 mb-2">Clique para abrir</p>
                            )}
                            
                            {/* Meta informações */}
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-400">
                                  {new Date(notif.data_envio).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                                
                                <span className={`text-xs px-2 py-1 rounded-full ${getBadgeClassesPorPrioridade(notif.prioridade)}`}>
                                  {notif.prioridade}
                                </span>
                              </div>
                              
                              {/* Botões de ação */}
                              <motion.div
                                initial={{ opacity: 0 }}
                                whileHover={{ opacity: 1 }}
                                className="flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <motion.button
                                  whileHover={{ scale: 1.1 }}
                                  whileTap={{ scale: 0.9 }}
                                  onClick={(e) => deletarNotificacao(notif.id, e)}
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors"
                                  title="Deletar"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </motion.button>
                              </motion.div>
                            </div>
                          </div>
                          
                          {/* Indicador de não lida */}
                          {!notif.lida && (
                            <div className="absolute right-3 top-3 w-2 h-2 bg-blue-500 rounded-full" />
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>

              {/* Rodapé */}
              {notificacoes.length > 0 && (
                <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 rounded-b-xl">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      Mostrando {Math.min(notificacoes.length, 15)} de {notificacoes.length}
                    </span>
                    
                    {notificacoes.length > 15 && (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => console.log('Ver todas')}
                        className="text-sm text-blue-500 hover:text-blue-600 font-medium underline transition-colors"
                      >
                        Ver todas
                      </motion.button>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
