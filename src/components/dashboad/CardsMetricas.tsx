// components/dashboard/CardsMetricas
import React from 'react';
import { CheckCircle, Target, Clock, TrendingUp, AlertCircle } from 'lucide-react';

interface CardMetricaProps {
  titulo: string;
  valor: number;
  variacao: number;
  icon: React.ReactNode;
  cor: string;
  descricao?: string;
}

const CardMetrica: React.FC<CardMetricaProps> = ({ 
  titulo, 
  valor, 
  variacao, 
  icon, 
  cor,
  descricao 
}) => {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '20px',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      transition: 'all 0.3s ease',
      borderLeft: `4px solid ${cor}`,
      height: '100%'
    }}
    className="card-metrica"
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ 
            color: '#64748B', 
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '4px',
            fontFamily: "'Inter', sans-serif"
          }}>
            {titulo}
          </div>
          <div style={{ 
            color: '#1E293B', 
            fontSize: '28px',
            fontWeight: '600',
            marginBottom: '8px',
            fontFamily: "'Inter', sans-serif"
          }}>
            {valor.toLocaleString()}
          </div>
          
          {descricao && (
            <div style={{ 
              color: '#64748B', 
              fontSize: '12px',
              marginBottom: '12px',
              fontFamily: "'Inter', sans-serif"
            }}>
              {descricao}
            </div>
          )}
        </div>
        
        <div style={{
          backgroundColor: `${cor}15`,
          borderRadius: '10px',
          width: '44px',
          height: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          {icon}
        </div>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', marginTop: '12px' }}>
        <div style={{ 
          color: variacao >= 0 ? '#10B981' : '#EF4444',
          fontSize: '13px',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          fontFamily: "'Inter', sans-serif"
        }}>
          <TrendingUp size={14} style={{ marginRight: '4px' }} />
          {variacao >= 0 ? '+' : ''}{variacao}%
        </div>
        <div style={{ 
          color: '#64748B', 
          fontSize: '12px',
          marginLeft: '8px',
          fontFamily: "'Inter', sans-serif"
        }}>
          vs período anterior
        </div>
      </div>
    </div>
  );
};

interface CardsMetricasProps {
  dados: {
    tarefasConcluidas: number;
    tarefasPendentes: number;
    metasConcluidas: number;
    metasAtrasadas: number;
    rotinasExecutadas: number;
  };
}

export const CardsMetricas: React.FC<CardsMetricasProps> = ({ dados }) => {
  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
      gap: '20px',
      marginBottom: '30px'
    }}>
      <CardMetrica
        titulo="Tarefas Concluídas"
        valor={dados.tarefasConcluidas}
        variacao={12}
        icon={<CheckCircle size={20} color="#3B82F6" />}
        cor="#3B82F6"
        descricao="Tarefas finalizadas esta semana"
      />
      
      <CardMetrica
        titulo="Metas Alcançadas"
        valor={dados.metasConcluidas}
        variacao={8}
        icon={<Target size={20} color="#10B981" />}
        cor="#10B981"
        descricao="Metas concluídas no período"
      />
      
      <CardMetrica
        titulo="Tarefas Pendentes"
        valor={dados.tarefasPendentes}
        variacao={-5}
        icon={<Clock size={20} color="#F59E0B" />}
        cor="#F59E0B"
        descricao="Aguardando execução"
      />
      
      <CardMetrica
        titulo="Metas Atrasadas"
        valor={dados.metasAtrasadas}
        variacao={-3}
        icon={<AlertCircle size={20} color="#EF4444" />}
        cor="#EF4444"
        descricao="Precisam de atenção"
      />
    </div>
  );
};