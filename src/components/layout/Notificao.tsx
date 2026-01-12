// components/NotificacoesBell.tsx
import React, { useState, useEffect } from 'react';
import { Bell, Check, Trash2, Settings } from 'lucide-react';
import { notificacaoService } from '../../services/database/notificacaoService';

export const NotificacoesBell: React.FC = () => {
  const [notificacao, setNotificacoes] = useState<any[]>([]);
  const [countNaoLidas, setCountNaoLidas] = useState(0);
  const [aberto, setAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    carregarNotificacoes();
    // Atualizar a cada 30 segundos
    const intervalo = setInterval(carregarNotificacoes, 30000);
    return () => clearInterval(intervalo);
  }, []);

  const carregarNotificacoes = async () => {
    try {
      const [lista, count] = await Promise.all([
        notificacaoService.listarNotificacoes(),
        notificacaoService.contarNotificacoesNaoLidas()
      ]);
      setNotificacoes(lista);
      setCountNaoLidas(count);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    }
  };

  const marcarComoLida = async (id: string) => {
    try {
      await notificacaoService.marcarComoLida(id);
      await carregarNotificacoes();
    } catch (error) {
      console.error('Erro ao marcar como lida:', error);
    }
  };

  const marcarTodasComoLidas = async () => {
    setCarregando(true);
    try {
      await notificacaoService.marcarTodasComoLidas();
      await carregarNotificacoes();
    } catch (error) {
      console.error('Erro ao marcar todas como lidas:', error);
    } finally {
      setCarregando(false);
    }
  };

  const deletarNotificacao = async (id: string) => {
    try {
      await notificacaoService.deletarNotificacao(id);
      await carregarNotificacoes();
    } catch (error) {
      console.error('Erro ao deletar notificação:', error);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setAberto(!aberto)}
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '8px',
          borderRadius: '8px',
          backgroundColor: aberto ? '#f1f5f9' : 'transparent'
        }}
      >
        <Bell size={20} color="#64748B" />
        {countNaoLidas > 0 && (
          <span style={{
            position: 'absolute',
            top: '-2px',
            right: '-2px',
            backgroundColor: '#EF4444',
            color: 'white',
            borderRadius: '50%',
            width: '16px',
            height: '16px',
            fontSize: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: '600'
          }}>
            {countNaoLidas}
          </span>
        )}
      </button>

      {aberto && (
        <div style={{
          position: 'absolute',
          right: 0,
          top: '40px',
          width: '350px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          border: '1px solid #e2e8f0',
          zIndex: 4000,
          perspective:40
        }}>
          <div style={{
            padding: '16px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>
              Notificações
              {countNaoLidas > 0 && (
                <span style={{
                  backgroundColor: '#3B82F6',
                  color: 'white',
                  borderRadius: '8px',
                  padding: '2px 8px',
                  fontSize: '12px',
                  marginLeft: '8px'
                }}>
                  {countNaoLidas} nova(s)
                </span>
              )}
            </h3>
            
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={marcarTodasComoLidas}
                disabled={carregando || countNaoLidas === 0}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: carregando || countNaoLidas === 0 ? 'not-allowed' : 'pointer',
                  padding: '4px',
                  opacity: carregando || countNaoLidas === 0 ? 0.5 : 1
                }}
                title="Marcar todas como lidas"
              >
                <Check size={16} color="#10B981" />
              </button>
              
              <button
                onClick={() => console.log('Configurações')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px'
                }}
                title="Configurações"
              >
                <Settings size={16} color="#64748B" />
              </button>
            </div>
          </div>

          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {notificacao.length === 0 ? (
              <div style={{
                padding: '32px 16px',
                textAlign: 'center',
                color: '#64748B'
              }}>
                Nenhuma notificação
              </div>
            ) : (
              notificacao.slice(0, 10).map((notif) => (
                <div
                  key={notif.id}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f1f5f9',
                    backgroundColor: !notif.lida ? '#f0f9ff' : 'transparent',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontSize: '14px', 
                        fontWeight: !notif.lida ? '600' : '400',
                        color: !notif.lida ? '#1E293B' : '#64748B',
                        marginBottom: '4px'
                      }}>
                        {notif.titulo}
                      </div>
                      <div style={{ 
                        fontSize: '13px', 
                        color: '#64748B',
                        marginBottom: '4px'
                      }}>
                        {notif.corpo}
                      </div>
                      <div style={{ 
                        fontSize: '11px', 
                        color: '#94A3B8',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span>
                          {new Date(notif.data_envio).toLocaleDateString('pt-BR', {
                            day: '2-digit',
                            month: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        <span style={{
                          backgroundColor: notif.tipo === 'alerta' ? '#FEF3C7' : 
                                         notif.tipo === 'erro' ? '#FEE2E2' : '#E0F2FE',
                          color: notif.tipo === 'alerta' ? '#92400E' : 
                                notif.tipo === 'erro' ? '#991B1B' : '#0C4A6E',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '10px',
                          fontWeight: '500'
                        }}>
                          {notif.tipo}
                        </span>
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginLeft: '8px' }}>
                      {!notif.lida && (
                        <button
                          onClick={() => marcarComoLida(notif.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '4px'
                          }}
                          title="Marcar como lida"
                        >
                          <Check size={14} color="#10B981" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => deletarNotificacao(notif.id)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px'
                        }}
                        title="Deletar"
                      >
                        <Trash2 size={14} color="#EF4444" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {notificacao.length > 10 && (
            <div style={{
              padding: '12px 16px',
              borderTop: '1px solid #e2e8f0',
              textAlign: 'center'
            }}>
              <button
                onClick={() => console.log('Ver todas')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#3B82F6',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Ver todas as notificações
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};