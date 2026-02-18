import React from 'react';
import { FiBook, FiCalendar, FiCheckCircle, FiUsers } from 'react-icons/fi';
import { StatCard } from '../students/StatCard';
import { Aula } from '../../types/aula';

interface AulasStatsGridProps {
  aulas: Aula[];
}

export const AulasStatsGrid: React.FC<AulasStatsGridProps> = ({ aulas }) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <StatCard
        color="blue"
        icon={FiBook}
        value={aulas.length}
        subtitle={`${aulas.filter((a) => a.status === 'ministrada').length} ministradas`}
        title="Total de Aulas"
      />
      <StatCard
        color="green"
        icon={FiCalendar}
        value={aulas.filter((a) => new Date(a.data_aula) >= new Date() && a.status === 'planeada').length}
        subtitle="Para os próximos dias"
        title="Próximas Aulas"
      />
      <StatCard
        color="purple"
        icon={FiUsers}
        value={[...new Set(aulas.map((a) => a.turma_id))].length}
        subtitle="Com aulas agendadas"
        title="Turmas Ativas"
      />
      <StatCard
        color="orange"
        icon={FiCheckCircle}
        value={aulas.length > 0 ? `${Math.round((aulas.filter((a) => a.status === 'ministrada').length / aulas.length) * 100)}%` : '0%'}
        subtitle="Aulas concluídas"
        title="Taxa Conclusão"
      />
    </div>
  );
};

