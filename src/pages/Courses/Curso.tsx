// src/pages/Courses/Courses.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FiPlus, FiEdit, FiTrash2, FiBook, FiSearch, FiClock, FiUsers, FiBookOpen, FiAlertCircle } from 'react-icons/fi';
import { Select } from '../../components/ui/Select';
import { FaMoneyBillWave, FaChalkboardUser } from 'react-icons/fa6';
import { StatCard } from '../../components/students/StatCard';
import { FaChalkboardTeacher } from 'react-icons/fa';
import { Course, CourseFormData } from '../../types/curso';
import { cursosService } from '../../services/database';
import { SelectTyped } from '../../components/students/StudentForm';
import { getPendingCount } from '../../utils/emitPendingSync';
import { SyncStatusBadge } from '../../components/ui/SyncStatusBadge';
import {  useConfirmModal } from '../../components/ui/ComfirmModal';
import { Curso } from '../../types';
import { useAlert } from '../../components/ui/AlertBadge';
// Mock data - depois substitui pelo service real

 
export const Courses = () => {
  const [cursos, setCursos] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('Todos Status');
  const [filtroDisciplina, setFiltroDisciplina] = useState<string>('Todas disciplinas');
  const [onlineStatus, setOnlineStatus] = useState(navigator.onLine);
  const [syncStats, setSyncStats] = useState(0);
  const [isExpanded,setExpanded]=useState(false)
  const { confirm, ModalComponent } = useConfirmModal();
  const { showAlert } = useAlert(); // ✅ Hook correto
  const nav = useNavigate();

  const abrirCurso = (cursoId: string) => {
    console.log('Abrir curso com ID:', cursoId);
    nav(`/cursos/${cursoId}`);
  };

  const { status, disciplinas } = useMemo(() => {
      const stats = ['Todos Status', 'Ativos', 'Inativos'];
      
      const todasDisciplinas = cursos.flatMap(curso => 
          curso.disciplinas.filter(disciplina => disciplina && disciplina.trim() !== "")
      );
      
      const disciplinasUnicas = ['Todas disciplinas', ...new Set(todasDisciplinas)];
      
      return {
          status: stats,
          disciplinas: disciplinasUnicas
      };
  }, [cursos]); 


  useEffect(() => {
    Reload();
  }, []);

   useEffect(() => {
      // Monitorar status online
      const handleOnline = () => setOnlineStatus(true);
      const handleOffline = () => setOnlineStatus(false);
      
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      
      // Carregar estatísticas de sincronização
      const loadSyncStats = async () => {
        try {
          const turmasPendentes = await getPendingCount("cursos");
          setSyncStats(turmasPendentes);
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
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('sync-pending', handleSyncUpdate);
        window.removeEventListener('sync-complete', handleSyncUpdate);
      };
    }, []);
    
    
    const handleForceSync = async () => {
      try {
        await cursosService.syncCursos();
        Reload();
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
      };
    };
        

  function Reload(){
  localStorage.setItem("last_rota","/cursos")
  const loadCursos = async () => {
    try {
      setLoading(true);
      const cursosData = await cursosService.getCourses();
      setCursos(cursosData||[]);
       
    } catch (error) {
      console.error('Erro ao carregar cursos:', error);
      }finally{
      setLoading(false);
    }
  };
      loadCursos();
  }

 

  const estatisticas = useMemo(() => {
    const cursosFiltrados = cursos.filter(curso => {
      const matchesSearch = curso.nome?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = filtroStatus === 'Todos Status' || 
                          (filtroStatus === 'Ativos' && curso.ativo) ||
                          (filtroStatus === 'Inativos' && !curso.ativo);
      const matchesDisciplinas = filtroDisciplina === 'Todas disciplinas' || curso.disciplinas.includes(filtroDisciplina)
      
      
      return matchesSearch  && matchesStatus && matchesDisciplinas;
    });

    const total = cursosFiltrados.length;
    const ativos = cursosFiltrados.filter(c => c.ativo).length;
    const inativos = cursosFiltrados.filter(c => !c.ativo).length;
    const totalVagas = cursosFiltrados.reduce((acc, cur) => acc + cur.vagas, 0);
    const totalInscritos = cursosFiltrados.reduce((acc, cur) => acc + cur.alunos, 0);
    const taxaOcupacao = totalVagas > 0 ? (totalInscritos / totalVagas) * 100 : 0;
    const receitaPotencial = cursosFiltrados.reduce((acc, cur) => acc + (cur.preco * cur.alunos), 0);

    return {
      total,
      ativos,
      inativos,
      totalVagas,
      totalInscritos,
      taxaOcupacao,
      receitaPotencial
    };
  }, [cursos, searchTerm, filtroDisciplina, filtroStatus]);

  const filteredCourses = cursos.filter(curso => {
    const matchesSearch = curso.nome?.toLowerCase().includes(searchTerm.toLowerCase());

    
    const matchesStatus = filtroStatus === 'Todos Status' || 
                        (filtroStatus === 'Ativos' && curso.ativo) ||
                        (filtroStatus === 'Inativos' && !curso.ativo);

  const matchesDisciplinas = filtroDisciplina === 'Todas disciplinas' || curso.disciplinas.includes(filtroDisciplina)

    return matchesSearch  && matchesStatus && matchesDisciplinas;
  });

  const deleteCurso = async (curso:Course) => {
      const confirmed = await confirm({
          type: 'delete',
          title: 'Excluir Curso',
          message: `Tem certeza que deseja excluir ${curso.nome}? Todos dados ligados a ele permanecerão.`,
          isDestructive: true,
          confirmText: 'Excluir',
          onConfirm: async () => {
            try {
              await cursosService.deleteCourse(curso.id);
              setCursos(cursos.filter(t => t.id !== curso.id));
              showAlert({
                type: 'success',
                title: 'Curso excluído!',
                message: `${curso.nome} foi removido do sistema.`,
                duration: 3000
              });
              
            } catch (error) {
              showAlert({
                type: 'error',
                title: 'Erro ao excluir',
                message: 'Não foi possível excluir o turma. Verifique sua conexão.',
                duration: 5000
              });
            }
          }
        });
    };



    if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <>
        <div className="space-y-6 p-4  dark:bg-gray-900 min-h-screen">
      {/* Cabeçalho com Busca Integrada */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Gestão de Cursos</h1>
              <SyncStatusBadge tableName="cursos" />
            </div>
          <p className="text-gray-600 dark:text-gray-100 mt-1">Gerencie os cursos da instituição</p>
        </motion.div>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Busca */}
        
          
          {/* Botão Novo Curso */}
          <Link
            to="/cursos/novo"
            className=" bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 my-5 hover:to-indigo-800 text-white px-4 py-2.5 transition-all rounded-md hover:bg-primary-700 flex items-center justify-center space-x-2 whitespace-nowrap"
          >
            <FiPlus size={18} />
            <span>Novo Curso</span>
          </Link>
        </div>
      </div>
      {syncStats > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
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
                    {syncStats} curso{syncStats !== 1 ? 's' : ''} pendente{syncStats !== 1 ? 's' : ''}
                  </h3>
                  <p className="text-sm text-orange-700 dark:text-orange-400/80">
                    {!onlineStatus 
                      ? 'Conecte-se à internet para sincronizar os dados.'
                      : 'Estes registros foram modificados offline e aguardam sincronização.'}
                  </p>
                </div>
              </div>

              {(
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
              )}
            </div>

            {/* Detalhes Expandíveis */}
            <motion.div
              initial={false}
              animate={{ height: isExpanded ? 'auto' : 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 pt-4 border-t border-orange-200 dark:border-orange-800">
                <div className="space-y-3">
                  {cursos
                    .filter(curso => curso.sync_status === 'pending')
                    .slice(0, 3)
                    .map((curso, index) => (
                      <motion.div
                        key={curso.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center justify-between p-3 bg-white/50 dark:bg-gray-800/50 
                                rounded-lg border border-orange-100 dark:border-orange-900/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900 
                                        flex items-center justify-center">
                            <FiBook className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                          </div>
                          <div>
                            <div className="font-medium text-gray-900 dark:text-white">
                              {curso.nome}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {curso.preco} • {curso.duracao || 'Sem turma'}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full 
                                      bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
                          {curso.id.startsWith('local_') ? 'Novo' : 'Alterado'}
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
          </div>
        </motion.div>
      )}
      {/* Filtros Rápidos */}
      <div className="flex flex-col sm:flex-row gap-4 p-4 px-0">
        <div className="flex-1 flex flex-col sm:flex-row gap-3">
           <div className="relative flex-1 min-w-[300px]">
            <FiSearch className="absolute left-3 top-5 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
          <div className="flex-1">
            <SelectTyped 
              vect={status} 
              icon={FiUsers} 
              onChange={setFiltroStatus}
              value={filtroStatus}
            />
          </div>
           <div className="flex-1">
            <SelectTyped 
              vect={disciplinas} 
              icon={FiBookOpen} 
              onChange={setFiltroDisciplina}
              value={filtroDisciplina}
            />
          </div>
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard 
          title="Cursos Filtrados" 
          value={estatisticas.total}
          subtitle={estatisticas.total === cursos.length ? 'Todos os cursos' : `${((estatisticas.total / cursos.length) * 100).toFixed(1)}% do total`}
          icon={FiBook}
          color="blue"
          trend={estatisticas.total > 0 ? 'positive' : 'neutral'}
          funcion={null}
        />
        
        <StatCard 
          title="Alunos Inscritos" 
          value={estatisticas.totalInscritos}
          subtitle={`${estatisticas.taxaOcupacao.toFixed(1)}% das vagas ocupadas`}
          icon={FiUsers}
          color="red"
          trend={estatisticas.totalInscritos > 0 ? 'positive' : 'neutral'}
          funcion={null}
        />
        
        <StatCard 
          title="Cursos Ativos" 
          value={estatisticas.ativos}
          subtitle={estatisticas.total > 0 ? `${((estatisticas.ativos / estatisticas.total) * 100).toFixed(1)}% dos filtrados` : 'Sem dados'}
          icon={FaChalkboardTeacher}
          color="purple"
          trend={estatisticas.ativos > 0 ? 'positive' : 'neutral'}
          funcion={null}
        />
        
        <StatCard 
          title="Receita Potencial" 
          value={`${(estatisticas.receitaPotencial / 1000).toFixed(0)}K AOA`}
          subtitle="Valor mensal estimado"
          icon={FaMoneyBillWave}
          color="green"
          trend={estatisticas.receitaPotencial > 0 ? 'positive' : 'neutral'}
          funcion={()=>null}
        />
      </div>

      {/* Indicador de Filtros Ativos */}
      {(searchTerm || filtroDisciplina !== 'Todas disciplinas' || filtroStatus !== 'Todos Status') && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 dark:bg-blue-900/20 dark:border-blue-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center flex-wrap gap-2">
              <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Filtros ativos:</span>
              {searchTerm && (
                <span className="inline-flex items-center bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-sm">
                  🔍 {searchTerm}
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="ml-2 text-blue-500 hover:text-blue-700 dark:hover:text-blue-400"
                  >
                    ×
                  </button>
                </span>
              )}
              {filtroDisciplina !== 'Todas disciplinas' && (
                <span className="inline-flex items-center bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-sm">
                  <FiBookOpen className='mr-2'/> 
                  { filtroDisciplina}
                  <button 
                    onClick={() => setFiltroDisciplina('Todas disciplinas')}
                    className="ml-2 text-blue-500 hover:text-blue-700 dark:hover:text-blue-400"
                  >
                    ×
                  </button>
                </span>
              )}
              {filtroStatus !== 'Todos Status' && (
                <span className="inline-flex items-center bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-sm">
                  {filtroStatus === 'Ativos' ? '✅ Ativos' : '❌ Inativos'}
                  <button 
                    onClick={() => setFiltroStatus('Todos Status')}
                    className="ml-2 text-blue-500 hover:text-blue-700 dark:hover:text-blue-400"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
            <button
              onClick={() => {
                setSearchTerm('');
                setFiltroDisciplina('Todas disciplinas');
                setFiltroStatus('Todos Status');
              }}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 text-sm font-medium whitespace-nowrap"
            >
              Limpar todos os filtros
            </button>
          </div>
        </div>
      )}

      {/* Lista de Cursos */}
      <div className="bg-white dark:bg-gray-800 dark:border-gray-700 rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-primary-600">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Curso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Preço
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Disciplinas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Vagas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Turmas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredCourses.map((curso, index) => (
                <motion.tr
                  key={curso.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div 
                        onClick={() => abrirCurso(curso.id)} 
                        className="flex-shrink-0 cursor-pointer text-primary-600 hover:text-white hover:bg-primary-700 transition-colors h-10 w-10 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center"
                      >
                        <FiBook />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium dark:text-white text-gray-900">
                          {curso.nome}
                        </div>
                       
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap dark:text-white text-sm text-gray-900">
                    {curso.preco.toLocaleString('pt-AO')} AOA
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {curso.disciplinas.map((disciplina, idx) => (
                        <span 
                          key={idx}
                          className="inline-block bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs px-2 py-1 rounded"
                        >
                          {disciplina}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm dark:text-white text-gray-900">
                    <div className="flex items-center gap-2">
                      <span>{curso.alunos}/{curso.vagas}</span>
                      <div className="w-16 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full" 
                          style={{ width: `${(curso.alunos/ curso.vagas) * 100}%` }}
                        />
                      </div>
                    </div>
                  </td>
                   <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {curso.turmas.map((turma, idx) => (
                        <span 
                          key={idx}
                          className="inline-block bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs px-2 py-1 rounded"
                        >
                          {turma.nome_turma}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      curso.ativo 
                        ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300'
                        : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300'
                    }`}>
                      {curso.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <Link
                      to={`/cursos/editar/${curso.id}`}
                      className="text-primary-600 hover:text-primary-900 dark:hover:text-primary-400"
                    >
                      <FiEdit size={16} className="inline" />
                    </Link>
                    <button
                      onClick={() => deleteCurso(curso)}
                      className="text-red-600 hover:text-red-900 dark:hover:text-red-400 ml-2"
                    >
                      <FiTrash2 size={16} className="inline" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredCourses.length === 0 && (
          <div className="text-center py-12">
            <FiBook className="mx-auto h-12 w-12 dark:text-gray-400 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium dark:text-white text-gray-900">Nenhum curso encontrado</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchTerm ? 'Tente ajustar os termos da busca.' : 'Comece adicionando um novo curso.'}
            </p>
              <button className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-8 py-2 rounded-lg font-medium hover:from-blue-700 my-5 hover:to-indigo-800"
              onClick={Reload}>Reload pagina</button>
          </div>
        )}
      </div>

     
    </div>
     <ModalComponent/>
    </>
  );
};

export default Courses;