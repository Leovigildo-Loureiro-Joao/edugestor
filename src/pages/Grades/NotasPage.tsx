import React, { useEffect, useMemo, useState } from 'react';
import { FiBarChart2, FiBookOpen, FiEdit3, FiEye, FiFilter, FiSearch, FiTrendingUp, FiUsers } from 'react-icons/fi';
import { StudentModal } from '../../components/students/StudentModal';
import { SelectTyped } from '../../components/students/StudentForm';
import { alunosService } from '../../services/database/alunosService';
import { AnimatePresence, motion } from 'framer-motion';
import db from '../../services/database/db';
import { SyncStatusBadge } from '../../components/ui/SyncStatusBadge';
import { SyncDataDetail } from '../../components/ui/SyncDataDetail';
import { getPendingCount } from '../../utils/emitPendingSync';
import type { Avaliacao } from '../../types/avaliacao';

import { avaliacaoService } from '../../services/database/avaliacao';
import { StatCard } from '../../components/students/StatCard';
import { instituicaoIdValue } from '../../utils/getInsitituicaoID';
import { AlunoDesempenho } from '../../types/aluno';
import { NotasTable } from '../../components/notas/NotasTable';
import { PageLoader } from '../../components/ui/PageLoader';
import { profileService } from '../../services/database/profileService';
import { frequenciaService } from '../../services/database';
import { configService } from '../../services/database/config';
import { useConfirmModal } from '../../components/ui/ComfirmModal';

type SituacaoNota = 'aprovado' | 'recuperacao' | 'reprovado' | 'pendente';

type AlunoNotas = AlunoDesempenho & {
  avaliacao: Avaliacao[];
  situacao_notas: SituacaoNota;
};

type RegraFrequenciaNotas = {
  usarFrequenciaNaSituacaoNotas: boolean;
  frequenciaMinimaAprovacao: number;
};

const getSituacao = (
  media: number,
  totalAvaliacoes: number,
  presenca: number,
  regra: RegraFrequenciaNotas
): SituacaoNota => {
  if (totalAvaliacoes === 0) return 'pendente';
  if (regra.usarFrequenciaNaSituacaoNotas && regra.frequenciaMinimaAprovacao > 0 && presenca < regra.frequenciaMinimaAprovacao) {
    return 'reprovado';
  }
  if (media >= 10) return 'aprovado';
  if (media >= 8) return 'recuperacao';
  return 'reprovado';
};

const getSituacaoColor = (situacao: SituacaoNota) => {
  switch (situacao) {
    case 'aprovado':
      return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
    case 'recuperacao':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
    case 'reprovado':
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  }
};

const getSituacaoText = (situacao: SituacaoNota) => {
  switch (situacao) {
    case 'aprovado':
      return 'Bom desempenho';
    case 'recuperacao':
      return 'Em atenção';
    case 'reprovado':
      return 'Desempenho baixo';
    default:
      return 'Sem dados';
  }
};

export const ProgressBar = ({ value }: { value: number }) => {
  const width = Math.max(0, Math.min(100, value));
  return (
    <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
      <div
        className={`h-full rounded-full transition-all ${
          width >= 75 ? 'bg-emerald-500' : width >= 50 ? 'bg-amber-500' : 'bg-red-500'
        }`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
};

export const NotasPage = () => {
  const [loading, setLoading] = useState(true);
  const [alunos, setAlunos] = useState<AlunoNotas[]>([]);
  const [avaliacoesSyncData, setAvaliacoesSyncData] = useState<Avaliacao[]>([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState<AlunoDesempenho | null>(null);
  const [modalTab, setModalTab] = useState<'overview' | 'notas' | 'analise'>('overview');
  const [onlineStatus, setOnlineStatus] = useState(navigator.onLine);
  const [syncStats, setSyncStats] = useState(0);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleChecked, setRoleChecked] = useState(false);
  const [search, setSearch] = useState('');
  const [filtroTurma, setFiltroTurma] = useState('Todas turmas');
  const [filtroDisciplina, setFiltroDisciplina] = useState('Todas disciplinas');
  const [filtroSituacao, setFiltroSituacao] = useState<'Todas situações' | SituacaoNota>('Todas situações');
  const [regraFrequenciaNotas, setRegraFrequenciaNotas] = useState<RegraFrequenciaNotas>({
    usarFrequenciaNaSituacaoNotas: false,
    frequenciaMinimaAprovacao: 0
  });
  const {confirm , ModalComponent } = useConfirmModal(); // ✅ Hook de confirmação
  const loadSyncStats = async () => {
    try {
      const pendentes = await getPendingCount('avaliacoes');
      setSyncStats(pendentes);
      setOnlineStatus(navigator.onLine);
    } catch (error) {
      console.error('Erro ao carregar sync stats de avaliações:', error);
    }
  };

  const loadNotasData = async () => {
    try {
      setLoading(true);

      const [alunosBase, avaliacoes, frequencias, academiaConfig] = await Promise.all([
        alunosService.getAllStudents(),
        db.avaliacoes.filter((a) => !a.deleted && a.instituicao_id === instituicaoIdValue()).toArray(),
        frequenciaService.getAllFrequencias(),
        configService.getAcademyConfig()
      ]);
      setRegraFrequenciaNotas({
        usarFrequenciaNaSituacaoNotas: academiaConfig.usarFrequenciaNaSituacaoNotas,
        frequenciaMinimaAprovacao: academiaConfig.frequenciaMinimaAprovacao
      });
      const profile = await profileService.getLocalProfile();
      const role = profile?.role || localStorage.getItem('user_role');
      const teacherNameKey = (profile?.full_name || profile?.nome || profile?.email || '').toLowerCase().trim();

      let alunosFiltradosBase = alunosBase;
      let avaliacoesFiltradas = avaliacoes;
      let frequenciasFiltradas = frequencias;

      if (role === 'teacher' && teacherNameKey) {
        const turmasProfessor = await db.turmas
          .filter(
            (t) =>
              !t.deleted &&
              t.instituicao_id === instituicaoIdValue() &&
              (t.professor || '').toLowerCase().trim() === teacherNameKey
          )
          .toArray();
        const turmaIdSet = new Set(turmasProfessor.map((t) => t.id));
        alunosFiltradosBase = alunosBase.filter((a) => a.turma_id && turmaIdSet.has(a.turma_id));
        const alunoIdSet = new Set(alunosFiltradosBase.map((a) => a.id));
        avaliacoesFiltradas = avaliacoes.filter(
          (a) => (a.turma_id && turmaIdSet.has(a.turma_id)) || alunoIdSet.has(a.aluno_id)
        );
        frequenciasFiltradas = frequencias.filter((f) => alunoIdSet.has(f.aluno_id));
      }

      setAvaliacoesSyncData(avaliacoesFiltradas);

      const avaliacoesPorAluno = new Map<string, Avaliacao[]>();
      avaliacoesFiltradas.forEach((av) => {
        const current = avaliacoesPorAluno.get(av.aluno_id) || [];
        current.push(av);
        avaliacoesPorAluno.set(av.aluno_id, current);
      });

      const frequenciaMap = new Map<string, { total: number; presentes: number }>();
      frequenciasFiltradas.forEach((f) => {
        const current = frequenciaMap.get(f.aluno_id) || { total: 0, presentes: 0 };
        current.total += 1;
        current.presentes += f.presente ? 1 : 0;
        frequenciaMap.set(f.aluno_id, current);
      });

      const alunosComNotas: AlunoNotas[] = alunosFiltradosBase.map((aluno) => {
        const notas = (avaliacoesPorAluno.get(aluno.id) || []).sort(
          (a, b) => new Date(b.data_avaliacao).getTime() - new Date(a.data_avaliacao).getTime()
        );

        const soma = notas.reduce((acc, n) => acc + n.nota, 0);
        const media = notas.length > 0 ? soma / notas.length : 0;
        const freq = frequenciaMap.get(aluno.id);
        const presenca = freq && freq.total > 0 ? (freq.presentes * 100) / freq.total : 0;

        return {
          ...(aluno as any),
          avaliacao: notas,
          media,
          presenca,
          ultimaAvaliacao: notas[0]?.nota || 0,
          situacao_notas: getSituacao(media, notas.length, presenca, {
            usarFrequenciaNaSituacaoNotas: academiaConfig.usarFrequenciaNaSituacaoNotas,
            frequenciaMinimaAprovacao: academiaConfig.frequenciaMinimaAprovacao
          })
        };
      });

      setAlunos(alunosComNotas.sort((a, b) => b.media - a.media));
    } catch (error) {
      console.error('Erro ao carregar notas:', error);
      setAlunos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotasData();
    loadSyncStats();
  }, []);

    useEffect(() => {
      const loadRole = async () => {
        try {
          const profile = await profileService.getLocalProfile();
          const role = profile?.role || localStorage.getItem('user_role');
          setUserRole(role);
        } catch {
          setUserRole(localStorage.getItem('user_role'));
        } finally {
          setRoleChecked(true);
        }
      };
  
      loadRole();
    }, []);
  

  const handleForceSync = async () => {
    try {
      await avaliacaoService.syncAvaliacoes();
      await loadNotasData();
      await loadSyncStats();
    } catch (error) {
      console.error('Erro ao sincronizar avaliações:', error);
    }
  };

  const turmasDisponiveis = useMemo(
    () => [...new Set(alunos.map((a) => a.turma_nome).filter(Boolean))],
    [alunos]
  );

  const disciplinasDisponiveis = useMemo(() => {
    const disciplinas = new Set<string>();
    alunos.forEach((aluno) => aluno.avaliacao.forEach((a) => disciplinas.add(a.disciplina)));
    return Array.from(disciplinas).sort((a, b) => a.localeCompare(b));
  }, [alunos]);

  const alunosFiltrados = useMemo(() => {
    return alunos.filter((aluno) => {
      const searchLower = search.trim().toLowerCase();
      const matchSearch =
        !searchLower ||
        aluno.nome_completo.toLowerCase().includes(searchLower) ||
        String(aluno.numero_estudante).toLowerCase().includes(searchLower) ||
        (aluno.turma_nome || '').toLowerCase().includes(searchLower);

      const matchTurma = filtroTurma === 'Todas turmas' || aluno.turma_nome === filtroTurma;
      const matchDisciplina =
        filtroDisciplina === 'Todas disciplinas' || aluno.avaliacao.some((n) => n.disciplina === filtroDisciplina);
      const matchSituacao = filtroSituacao === 'Todas situações' || aluno.situacao_notas === filtroSituacao;

      return matchSearch && matchTurma && matchDisciplina && matchSituacao;
    });
  }, [alunos, search, filtroTurma, filtroDisciplina, filtroSituacao]);

  const stats = useMemo(() => {
    const total = alunosFiltrados.length;
    const comAvaliacao = alunosFiltrados.filter((a) => a.avaliacao.length > 0);
    const aprovados = comAvaliacao.filter((a) => a.situacao_notas === 'aprovado').length;

    const mediaGeral =
      comAvaliacao.length > 0
        ? comAvaliacao.reduce((acc, a) => acc + a.media, 0) / comAvaliacao.length
        : 0;

    const taxaAprovacao = comAvaliacao.length > 0 ? (aprovados * 100) / comAvaliacao.length : 0;
    const progressoGlobal = (mediaGeral / 20) * 100;
    const mediaPresenca =
      alunosFiltrados.length > 0
        ? alunosFiltrados.reduce((acc, aluno) => acc + (aluno.presenca || 0), 0) / alunosFiltrados.length
        : 0;

    return {
      total,
      comAvaliacao: comAvaliacao.length,
      mediaGeral,
      taxaAprovacao,
      progressoGlobal,
      mediaPresenca
    };
  }, [alunosFiltrados]);

  const progressoPorDisciplina = useMemo(() => {
    const mapa = new Map<string, { soma: number; count: number }>();

    alunosFiltrados.forEach((aluno) => {
      aluno.avaliacao.forEach((av) => {
        const current = mapa.get(av.disciplina) || { soma: 0, count: 0 };
        current.soma += av.nota;
        current.count += 1;
        mapa.set(av.disciplina, current);
      });
    });

    return Array.from(mapa.entries())
      .map(([disciplina, data]) => ({
        disciplina,
        media: data.count > 0 ? data.soma / data.count : 0
      }))
      .sort((a, b) => b.media - a.media)
      .slice(0, 6);
  }, [alunosFiltrados]);

  if (loading) {
    return <PageLoader title="Carregando notas" subtitle="Preparando avaliações e indicadores..." fullScreen={false} />;
  }

  const regraFrequenciaIncompleta =
    regraFrequenciaNotas.usarFrequenciaNaSituacaoNotas && regraFrequenciaNotas.frequenciaMinimaAprovacao <= 0;

  

  return (
    <>
      <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white leading-tight">Gestão de Notas</h2>
              <SyncStatusBadge tableName="avaliacoes" />
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
              Mesma base da aba de notas da turma, com visão global e filtros.
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Trimestres são usados apenas para leitura de evolução. Sem pauta formal (MAC/PP).
            </p>
          </div>

          <div className="flex items-center gap-2 w-full lg:w-auto">
            <div className="relative flex-1 lg:w-80">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Pesquisar por aluno, número ou turma..."
                className="w-full pl-9 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
          <SelectTyped
            value={filtroTurma}
            vect={['Todas turmas', ...turmasDisponiveis]}
            onChange={(value: string) => setFiltroTurma(value)}
            placeholder="Todas as turmas"
          />

          <SelectTyped
            value={filtroDisciplina}
            vect={['Todas disciplinas', ...disciplinasDisponiveis]}
            onChange={(value: string) => setFiltroDisciplina(value)}
            placeholder="Todas as disciplinas"
          />

          <SelectTyped
            value={filtroSituacao}
            vect={['Todas situações', 'aprovado', 'recuperacao', 'reprovado', 'pendente']}
            onChange={(value: string) => setFiltroSituacao(value as 'Todas situações' | SituacaoNota)}
            placeholder="Todas as situações"
          />

          <button
            onClick={() => {
              setSearch('');
              setFiltroTurma('Todas turmas');
              setFiltroDisciplina('Todas disciplinas');
              setFiltroSituacao('Todas situações');
            }}
            className="inline-flex items-center justify-center gap-2 px-3 py-2 bg-primary-50 text-primary-700 dark:bg-primary-900/30 dark:text-primary-300 hover:bg-primary-100 dark:hover:bg-primary-900/50 rounded-lg transition-colors"
          >
            <FiFilter />
            Limpar filtros
          </button>
        </div>
      </div>

      {regraFrequenciaIncompleta && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 text-amber-900 px-4 py-3 text-sm dark:bg-amber-900/20 dark:border-amber-700 dark:text-amber-200">
          A regra de frequência está ativa, mas a frequência mínima ainda não foi definida.
          Peça ao administrador para configurar em <strong>Configurações Acadêmicas</strong>.
        </div>
      )}

      {syncStats > 0 && (
        <SyncDataDetail
          syncStats={syncStats}
          onlineStatus={onlineStatus}
          handleForceSync={handleForceSync}
          table="avaliacoes"
          data={avaliacoesSyncData}
        />
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard 
          title="Alunos Filtrados" 
          value={stats.total}
          subtitle={stats.total === alunos.length ? 'Todos os alunos' : `${((stats.total / alunos.length) * 100).toFixed(1)}% do total`}
          icon={FiUsers}
          color="blue"
          trend={stats.total > 0 ? 'positive' : 'neutral'}
        />  

        <StatCard 
          title="Com avaliações" 
          value={stats.comAvaliacao}
          subtitle={stats.comAvaliacao === alunos.length ? 'Todos os alunos' : `${((stats.comAvaliacao / alunos.length) * 100).toFixed(1)}% do total`}
          icon={FiBookOpen}
          color="purple"
          trend={stats.comAvaliacao > 0 ? 'positive' : 'neutral'}
        />  
        <StatCard 
          title="Média geral" 
          value={stats.mediaGeral.toFixed(1)+"%"}
          subtitle={stats.comAvaliacao === alunos.length ? 'Todos os alunos' : `${((stats.comAvaliacao / alunos.length) * 100).toFixed(1)}% do total`}
          icon={FiTrendingUp}
          color="orange"
          trend={stats.mediaGeral > 10 ? 'positive' : 'neutral'}
          progress={true}
          percent={(stats.mediaGeral / 20) * 100}
        />  

        <StatCard 
          title="Frequência média" 
          value={stats.mediaPresenca.toFixed(1)+"%"}
          subtitle={stats.mediaPresenca >= 75 ? "Presença estável" : "Risco por faltas"}
          icon={FiUsers}
          color="green"
          trend={stats.mediaPresenca >= 75 ? 'positive' : 'neutral'}
          progress={true}
          percent={stats.mediaPresenca}
        />  
      </div>
      
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/40">
          <h3 className="font-semibold text-base sm:text-lg text-gray-900 dark:text-white">Alunos e Progresso</h3>
        </div>

        <NotasTable
          alunos={alunosFiltrados}
          onVerDetalhes={(aluno) => {
            setModalTab('overview');
            setAlunoSelecionado(aluno);
          }}
          onLancarNota={(aluno) => {
            setModalTab('notas');
            setAlunoSelecionado(aluno);
          }}
        />
      </div>
      {progressoPorDisciplina.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
          <h3 className="font-semibold text-base sm:text-lg text-gray-900 dark:text-white mb-4">Progresso por disciplina</h3>
          <div className="space-y-3">
            {progressoPorDisciplina.map((item) => (
              <div key={item.disciplina}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{item.disciplina}</span>
                  <span className="text-sm text-gray-600 dark:text-gray-300">{item.media.toFixed(1)} / 20</span>
                </div>
                <ProgressBar value={(item.media / 20) * 100} />
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
      <StudentModal
        alunoSelecionado={alunoSelecionado}
        setAlunoSelecionado={(aluno) => {
          setAlunoSelecionado(aluno);
          if (!aluno) setModalTab('overview');
        }}
        loadTurmaDetails={loadNotasData}
        onNotaAdicionada={loadNotasData}
        confirm={confirm}
        initialTab={modalTab}
      />
<ModalComponent/>    
    </>
      );
};
