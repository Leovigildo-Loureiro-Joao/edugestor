// Students.tsx - VERSÃO ATUALIZADA
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FiPlus, FiEdit, FiTrash2, FiUser, FiSearch, FiLayers, FiAlertCircle, FiRefreshCw } from 'react-icons/fi';
import { alunosService } from '../../services/database/alunosService';
import { FaBookAtlas, FaGraduationCap, FaPeopleGroup } from 'react-icons/fa6';
import { RxPerson } from 'react-icons/rx';
import { StatCard } from '../../components/students/StatCard';
import { Student } from '../../types';
import { SelectTyped } from '../../components/students/StudentForm';
import { getPendingCount } from '../../utils/emitPendingSync';
import { useConfirmModal } from '../../components/ui/ComfirmModal';
import { useAlert } from '../../components/ui/AlertBadge'; // ✅ Use useAlert
import { SyncStatusBadge } from '../../components/ui/SyncStatusBadge';

const Students = () => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroProfessor, setFiltroProfessor] = useState('Todos Professores');
  const [filtroTurma, setFiltroTurma] = useState('Todas Turmas');
  const [filtroEstado, setFiltroEstado] = useState('Todos estados');
  const [isCartao, setCartao] = useState(false);
  const [isExpanded, setExpanded] = useState(false);
  const [filtroAnoLectivo, setFiltroAnoLectivo] = useState('Todos ano lectivos');
  
  const nav = useNavigate();
  const [syncStats, setSyncStats] = useState(0);
  const { confirm, ModalComponent } = useConfirmModal();
  const { showAlert } = useAlert(); // ✅ Hook correto

  // Carregar estatísticas de sincronização
  useEffect(() => {
    const loadSyncStats = async () => {
      try {
        const alunosPendentes = await getPendingCount("alunos");
        setSyncStats(alunosPendentes);
      } catch (error) {
        console.error('Erro ao carregar sync stats:', error);
      }
    };
    
    loadSyncStats();
    
    // Ouvir eventos de sincronização
    const handleSyncUpdate = () => {
      loadSyncStats();
    };
    
    window.addEventListener('sync-pending', handleSyncUpdate);
    window.addEventListener('sync-complete', handleSyncUpdate);
    
    return () => {
      window.removeEventListener('sync-pending', handleSyncUpdate);
      window.removeEventListener('sync-complete', handleSyncUpdate);
    };
  }, []);

  const handleForceSync = async () => {
    try {
      await alunosService.syncAlunos();
      reload()
      // ✅ USANDO O NOVO SISTEMA DE ALERT
      showAlert({
        type: 'success',
        title: 'Sincronização concluída!',
        message: 'Os dados foram sincronizados com o servidor.',
        duration: 3000
      });
      
    } catch (error) {
      showAlert({
        type: 'error',
        title: 'Erro na sincronização',
        message: 'Não foi possível sincronizar com o servidor.',
        duration: 5000
      });
    }
  };

  const abrirAluno = (alunoId: string) => {
    nav(`/alunos/${alunoId}`);
  };

  const estadoSet = ["Todos estados", "ativo", "inativo", "transferido", "desistente"];
  const anoLectivoSet = ["Todos ano lectivos", "2024-2025", "2025-2026", "2027-2028", "2028-2029", "2030-2031"];

  // Extrair professores e turmas únicos
  const { professores, turmas } = useMemo(() => {
    const profsSet = new Set<string>();
    const turmsSet = new Set<string>();
   
    students.forEach(student => {
      if (student.professor) profsSet.add(student.professor);
      if (student.turma_nome) turmsSet.add(student.turma_nome);
    });
    
    return {
      professores: ['Todos Professores', ...Array.from(profsSet)],
      turmas: ['Todas Turmas', ...Array.from(turmsSet)]
    };
  }, [students]);

  // Carregar alunos
  const reload = async () => {
    try {
      setLoading(true);
      const studentsData = await alunosService.getAllStudents();
      setStudents(studentsData);  
    } catch (error) {
      showAlert({
        type: 'error',
        title: 'Erro ao carregar dados',
        message: 'Não foi possível carregar os alunos da base de dados.',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    localStorage.setItem("last_rota", "/alunos");
    reload();
  }, []);

  // Função para deletar aluno
  const handleDeleteStudent = async (student: Student) => {
    const confirmed = await confirm({
      type: 'delete',
      title: 'Excluir Aluno',
      message: `Tem certeza que deseja excluir ${student.nome_completo}? Os dados ligados a ele permanecerão.`,
      isDestructive: true,
      confirmText: 'Excluir',
      onConfirm: async () => {
        try {
          await alunosService.deleteStudent(student.id);
          setStudents(prev => prev.filter(s => s.id !== student.id));
          showAlert({
            type: 'success',
            title: 'Aluno excluído!',
            message: `${student.nome_completo} foi removido do sistema.`,
            duration: 3000
          });
          
        } catch (error) {
          showAlert({
            type: 'error',
            title: 'Erro ao excluir',
            message: 'Não foi possível excluir o aluno. Verifique sua conexão.',
            duration: 5000
          });
        }
      }
    });
  };

  // Calcular estatísticas
  const estatisticas = useMemo(() => {
    const alunosFiltrados = students.filter(student => {
      const nomeMatch = student.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
      const numeroMatch = student.numero_estudante?.toString().includes(searchTerm) || false;
      const matchesSearch = nomeMatch || numeroMatch;
      
      const matchesProfessor = filtroProfessor === 'Todos Professores' || student.professor === filtroProfessor;
      const matchesTurma = filtroTurma === 'Todas Turmas' || student.turma_nome === filtroTurma;
      const matchesEstado = filtroEstado === 'Todos estados' || student.estado === filtroEstado;
      const matchesAnoLectivo = filtroAnoLectivo === 'Todos ano lectivos' || student.ano_lectivo === filtroAnoLectivo;
      const matchesCartap = isCartao ? student.cartao_pago === true : true;
      
      return matchesSearch && matchesProfessor && matchesTurma && matchesAnoLectivo && matchesEstado && matchesCartap;
    });

    const total = alunosFiltrados.length;
    const ativos = alunosFiltrados.filter(s => s.estado === 'ativo').length;
    const transferidos = alunosFiltrados.filter(s => s.estado === 'transferido').length;
    const desistentes = alunosFiltrados.filter(s => s.estado === 'desistente').length;
    const inativos = transferidos + desistentes;
    const cartaoPago = alunosFiltrados.filter(s => s.cartao_pago).length;

    return {
      total,
      ativos,
      inativos,
      transferidos,
      desistentes,
      cartaoPago,
      percentualCartao: total > 0 ? ((cartaoPago / total) * 100) : 0
    };
  }, [students, searchTerm, filtroProfessor, filtroTurma, filtroAnoLectivo, filtroEstado, isCartao]);

  // Filtrar alunos para a tabela
  const filteredStudents = useMemo(() => {
    return students.filter(student => {
      const nomeMatch = student.nome_completo?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
      const numeroMatch = student.numero_estudante?.toString().includes(searchTerm) || false;
      const matchesSearch = nomeMatch || numeroMatch;
      
      const matchesProfessor = filtroProfessor === 'Todos Professores' || student.professor === filtroProfessor;
      const matchesTurma = filtroTurma === 'Todas Turmas' || student.turma_nome === filtroTurma;
      const matchesEstado = filtroEstado === 'Todos estados' || student.estado === filtroEstado;
      const matchesAnoLectivo = filtroAnoLectivo === 'Todos ano lectivos' || student.ano_lectivo === filtroAnoLectivo;
      const matchesCartap = isCartao ? student.cartao_pago === true : true;
      
      return matchesSearch && matchesProfessor && matchesTurma && matchesAnoLectivo && matchesEstado && matchesCartap;
    });
  }, [students, searchTerm, filtroProfessor, filtroTurma, filtroAnoLectivo, filtroEstado, isCartao]);

  // Se estiver carregando
  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Carregando alunos...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6 p-5">
        {/* Header Principal com Título e Controles */}
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex-1">
            <motion.div className="space-y-2">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
                  Gestão de Alunos
                </h1>
                <SyncStatusBadge tableName="alunos" />
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                Gerencie os alunos da instituição
              </p>    
            </motion.div>
          </div>

          {/* Seção Direita - Controles e Ações */}
          <div className="w-full lg:w-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Barra de Busca */}
              <div className="relative flex-1 min-w-[280px]">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiSearch className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  placeholder="Buscar por nome ou número..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg 
                          bg-white dark:bg-gray-800 text-gray-900 dark:text-white
                          placeholder-gray-500 dark:placeholder-gray-400
                          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                          transition-colors duration-200"
                />
              </div>

              {/* Botões de Ação */}
              <div className="flex flex-wrap gap-2">
                <Link
                  to="/alunos/novo"
                  className="inline-flex items-center px-4 py-2.5 rounded-lg font-medium
                          bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700
                          text-white shadow-sm hover:shadow
                          transition-all duration-200"
                >
                  <FiPlus className="mr-2" size={18} />
                  <span>Novo Aluno</span>
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Banner de Alerta - Aparece apenas se houver pendentes */}
        {syncStats > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="overflow-hidden"
          >
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/10 dark:to-amber-900/10 
                          border border-orange-200 dark:border-orange-800 rounded-xl p-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/50 rounded-lg">
                      <FiAlertCircle className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold text-orange-900 dark:text-orange-300 mb-1">
                      {syncStats} aluno{syncStats !== 1 ? 's' : ''} pendente{syncStats !== 1 ? 's' : ''}
                    </h3>
                    <p className="text-sm text-orange-700 dark:text-orange-400/80">
                      Conecte-se à internet para sincronizar os dados.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={handleForceSync}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white 
                            font-medium rounded-lg text-sm transition-colors"
                  >
                    Sincronizar Agora
                  </button>
                  <button
                    onClick={() => setExpanded(!isExpanded)}
                    className="px-4 py-2 border border-orange-300 dark:border-orange-700 
                            text-orange-700 dark:text-orange-400 font-medium rounded-lg 
                            text-sm hover:bg-orange-50 dark:hover:bg-orange-900/20 
                            transition-colors"
                  >
                    {isExpanded ? 'Ocultar' : 'Ver Detalhes'}
                  </button>
                </div>
              </div>

              {/* Detalhes Expandíveis */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-4 pt-4 border-t border-orange-200 dark:border-orange-800">
                      <div className="space-y-3">
                        {students
                          .filter(student => student.sync_status === 'pending')
                          .slice(0, 3)
                          .map((student, index) => (
                            <motion.div
                              key={student.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.1 }}
                              className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-800/50 
                                      rounded-lg border border-orange-100 dark:border-orange-900/50"
                            >
                              <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900 
                                              flex items-center justify-center">
                                  <FiUser className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                                </div>
                                <div>
                                  <div className="font-medium text-gray-900 dark:text-white">
                                    {student.nome_completo}
                                  </div>
                                  <div className="text-sm text-gray-500 dark:text-gray-400">
                                    {student.numero_estudante} • {student.turma_nome || 'Sem turma'}
                                  </div>
                                </div>
                              </div>
                              <span className="text-xs font-medium px-2.5 py-1 rounded-full 
                                            bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
                                {student.id.startsWith('local_') ? 'Novo' : 'Alterado'}
                              </span>
                            </motion.div>
                          ))}
                        
                        {syncStats > 3 && (
                          <div className="text-center">
                            <span className="text-sm text-orange-600 dark:text-orange-400">
                              + {syncStats - 3} mais pendentes
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard 
            title="Alunos Filtrados" 
            value={estatisticas.total}
            subtitle={estatisticas.total === students.length ? 'Todos os alunos' : `${((estatisticas.total / students.length) * 100).toFixed(1)}% do total`}
            icon={FaPeopleGroup}
            color="blue"
            trend={estatisticas.total > 0 ? 'positive' : 'neutral'}
            funcion={null}
          />
          
          <StatCard 
            title="Ativos" 
            value={estatisticas.ativos}
            subtitle={estatisticas.total > 0 ? `${((estatisticas.ativos / estatisticas.total) * 100).toFixed(1)}% dos filtrados` : 'Sem dados'}
            icon={FaGraduationCap}
            color="green"
            trend={estatisticas.ativos > 0 ? 'positive' : 'neutral'}
            funcion={null}
          />
          
          <StatCard 
            title="Inativos" 
            value={estatisticas.inativos}
            subtitle={
              <>
                {estatisticas.transferidos > 0 && <span className="text-orange-500">{estatisticas.transferidos}T</span>}
                {estatisticas.transferidos > 0 && estatisticas.desistentes > 0 && ' • '}
                {estatisticas.desistentes > 0 && <span className="text-red-500">{estatisticas.desistentes}D</span>}
              </>
            }
            icon={FiUser}
            color="red"
            trend="neutral"
            funcion={null}
          />
          
          <StatCard 
            title="Cartão Pago" 
            value={estatisticas.cartaoPago}
            subtitle={estatisticas.total > 0 ? `${estatisticas.percentualCartao.toFixed(1)}% dos filtrados` : 'Sem dados'}
            icon={FaBookAtlas}
            color="purple"
            trend={estatisticas.percentualCartao > 50 ? 'positive' : 'neutral'}
            funcion={() => {
              setCartao(!isCartao);
              showAlert({
                type: 'info',
                title: isCartao ? 'Mostrando todos' : 'Filtrando por cartão pago',
                duration: 2000
              });
            }}
          />
        </div>

        {/* Filtros Rápidos */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 whitespace-nowrap">
              Filtros:
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 flex-1">
              <SelectTyped 
                vect={professores} 
                icon={RxPerson} 
                onChange={setFiltroProfessor}
                value={filtroProfessor}
                className="w-full"
              />
              <SelectTyped 
                vect={turmas} 
                icon={FiLayers} 
                onChange={setFiltroTurma}
                value={filtroTurma}
                className="w-full"
              />
              <SelectTyped 
                vect={estadoSet} 
                icon={FaPeopleGroup} 
                onChange={setFiltroEstado}
                value={filtroEstado}
                className="w-full"
              />
              <SelectTyped 
                vect={anoLectivoSet} 
                icon={FaGraduationCap} 
                onChange={setFiltroAnoLectivo}
                value={filtroAnoLectivo}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Lista de Alunos */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-blue-600 dark:bg-blue-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Aluno</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Professor</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Nº Estudante</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Turma</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Cartão</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredStudents.map((student, index) => (
                  <motion.tr
                    key={student.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div 
                          onClick={() => abrirAluno(student.id)} 
                          className={`${student.sync_status === 'pending' ? "text-orange-600 hover:text-white hover:bg-orange-700 bg-orange-200 dark:bg-orange-900" : "text-blue-600 hover:text-white hover:bg-blue-700 bg-blue-100 dark:bg-blue-900"} flex-shrink-0 cursor-pointer transition-colors h-10 w-10 rounded-full flex items-center justify-center`}
                        >
                          {student.sync_status === 'pending' ? <FiAlertCircle /> : <FiUser />}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {student.nome_completo}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-300">
                            {student.contacto_principal}
                          </div>
                          {!student.pagamento_em_dia && (
                            <div className="text-sm text-red-800 dark:text-red-300">
                              Pagamentos em atraso
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {student.professor || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {student.numero_estudante}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {student.turma_nome || 'Sem turma'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        student.estado === 'ativo' 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          : student.estado === 'transferido'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                      }`}>
                        {student.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        student.cartao_pago
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
                      }`}>
                        {student.cartao_pago ? "possui" : 'ñ possui'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <Link
                        to={`/alunos/editar/${student.id}`}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        <FiEdit size={16} className="inline" />
                      </Link>
                      <button
                        onClick={() => handleDeleteStudent(student)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 ml-2"
                      >
                        <FiTrash2 size={16} className="inline" />
                      </button>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredStudents.length === 0 && (
            <div className="text-center py-12">
              <FiUser className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Nenhum aluno encontrado</h3>
              <button 
                className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 my-5 hover:to-indigo-800 text-white px-8 py-2 rounded-lg font-medium"
                onClick={reload}
              >
                Recarregar página
              </button>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {searchTerm ? 'Tente ajustar os termos da busca.' : 'Comece adicionando um novo aluno.'}
              </p>
            </div>
          )}
        </div>
      </div>
      
      <ModalComponent />
    </>
  );
};

export default Students;