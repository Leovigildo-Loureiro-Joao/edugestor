import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { FiPlus, FiEdit, FiTrash2, FiUsers, FiBook, FiClock, FiSearch, FiAlertCircle } from 'react-icons/fi';
import { turmaService } from '../../services/database';
import { Select } from '../../components/ui/Select';
import {Turma} from "../../types/turma"
import { SelectTyped } from '../../components/students/StudentForm';
import { FaGraduationCap } from 'react-icons/fa';
import { profileService } from '../../services/database/profileService';
import { UserProfile } from '../../types/profile';
import { instituicaoIdValue } from '../../utils/getInsitituicaoID';
import { StatCard } from '../../components/students/StatCard';
import { SyncStatusBadge } from '../../components/ui/SyncStatusBadge';
import { getPendingCount } from '../../utils/emitPendingSync';
import {  useConfirmModal } from '../../components/ui/ComfirmModal';
import { useAlert } from '../../components/ui/AlertBadge';

// Definição das interfaces

interface Estatisticas {
  total: number;
  manha: number;
  tarde: number;
  noite: number;
}


const Turmas: React.FC = () => {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filtroTurno, setFiltroTurno] = useState<string>('Todos Turnos');
  const [filtroCurso, setFiltroCurso] = useState<string>('Todos Cursos');
  const [filtroAnoLectivo,setFiltroAnoLectivo] = useState('Todos ano lectivos');
  const [isExpanded,setExpanded]=useState(false)
  const anoLectivo = ["Todos ano lectivos","2024-2025","2025-2026","2027-2028","2028-2029","2030-2031"];;

  const [onlineStatus, setOnlineStatus] = useState(navigator.onLine);
  const [syncStats, setSyncStats] = useState(0);
  const { confirm, ModalComponent } = useConfirmModal();
  const { showAlert } = useAlert(); // ✅ Hook correto

  const nav = useNavigate();

    useEffect(() => {
      localStorage.setItem("last_rota","/turmas")
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
          const turmasPendentes = await getPendingCount("turmas");
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
        await turmaService.syncTurmas();
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
      
    }

    function Reload(){
  
      const loadTurmas = async (): Promise<void> => {
        try {
          setLoading(true);
          const turmasData: Turma [] = await turmaService.getTurmas(instituicaoIdValue()||"");
          setTurmas(turmasData);
        } catch (error) {
          showAlert({
            type: 'error',
            title: 'Erro ao carregar dados!',
            message: `Não foi possível carregar os alunos da base de dados.`,
            duration: 5000
          });
          console.error('Erro ao carregar turmas:', error);
        } finally {
          setLoading(false);
        }
      };
      loadTurmas();
    }
 

    const {cursosInst}  = useMemo(() => {
        // Extrai valores únicos, lidando com undefined
        const cursosSet = new Set<string>();
        turmas.forEach(curso => {
          if (curso.curso_nome) {
            cursosSet.add(curso.curso_nome);
          }
        });
        
        return {
          cursosInst: ['Todos Cursos', ...Array.from(cursosSet)],

        };
      }, [turmas]);

 

  const abrirTurma = (turmaID: string): void => {
    console.log('Abrir turma com ID:', turmaID);
    nav(`/turmas/${turmaID}`);
  };

  const handleDelete = async (turmaSel:Turma): Promise<void> => {
     const confirmed = await confirm({
          type: 'delete',
          title: 'Excluir Turma',
          message: `Tem certeza que deseja excluir ${turmaSel.nome_turma}? Todos dados ligados a ela permanecerão.`,
          isDestructive: true,
          confirmText: 'Excluir',
          onConfirm: async () => {
            try {
             await turmaService.deleteTurma(turmaSel.id);
              setTurmas(turmas.filter(t => t.id !== turmaSel.id));
              showAlert({
                type: 'success',
                title: 'Aluno excluído!',
                message: `${turmaSel.nome_turma} foi removido do sistema.`,
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

  const turmasFiltradas: Turma[] = !turmas ? [] : turmas.filter((turma: Turma) => {
    const matchesSearch = turma.nome_turma?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTurno = filtroTurno === 'Todos Turnos' || turma.turno === filtroTurno;
    const matchesCurso = filtroCurso === 'Todos Cursos' || turma.curso_nome === filtroCurso;
    const matchesAnoLectivo = filtroAnoLectivo === 'Todos ano lectivos' || turma.ano_lectivo === filtroAnoLectivo;

    return matchesSearch && matchesTurno && matchesCurso&&matchesAnoLectivo;
  });

  const estatisticas: Estatisticas = {
    total: turmasFiltradas.length,
    manha: turmasFiltradas.filter(t => t.turno.toLowerCase() === 'manhã').length,
    tarde: turmasFiltradas.filter(t => t.turno.toLowerCase() === 'tarde').length,
    noite: turmasFiltradas.filter(t => t.turno.toLowerCase() === 'noite').length
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 dark:border-primary-400"></div>
      </div>
    );
  }

  return (<>
    <div className="space-y-6 p-4 dark:bg-gray-900 min-h-screen ">
      {/* Cabeçalho */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
         <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-3">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
              Gestão de Turmas
            </h1>
            <SyncStatusBadge tableName="turmas" />
          </div>            
          <p className="text-gray-600 dark:text-gray-400 mt-1">Gerencie as turmas da instituição</p>
          </motion.div>
        
        <div className="flex flex-col sm:flex-row gap-3">
            {/* Busca */}
            <div className="relative flex-1 min-w-[300px]">
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
            

            <Link
              to="/turmas/nova"
              className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 text-white px-4 py-2.5 transition-colors rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 whitespace-nowrap font-medium"
            >
              <FiPlus size={18} />
              <span>Nova Turma</span>
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
                    {syncStats} turma{syncStats !== 1 ? 's' : ''} pendente{syncStats !== 1 ? 's' : ''}
                  </h3>
                  <p className="text-sm text-orange-700 dark:text-orange-400/80">
                    {!onlineStatus 
                      ? 'Conecte-se à internet para sincronizar os dados.'
                      : 'Estes registros foram modificados offline e aguardam sincronização.'}
                  </p>
                </div>
              </div>

              { (
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
                  {turmas
                    .filter(turma => turma.sync_status === 'pending')
                    .slice(0, 3)
                    .map((turma, index) => (
                      <motion.div
                        key={turma.id}
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
                              {turma.nome_turma}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {turma.curso_nome} • {turma.ano_lectivo || 'Sem turma'}
                            </div>
                          </div>
                        </div>
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full 
                                      bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
                          {turma.id.startsWith('local_') ? 'Novo' : 'Alterado'}
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
      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-4 p-4  rounded-lg">
        <div className="flex-1 flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <SelectTyped 
              vect={['Todos Turnos', 'Manhã', 'Tarde', 'Noite']} 
              icon={FiClock} 
              onChange={setFiltroTurno}
              darkMode
            />
          </div>
          <div className="flex-1">
            <SelectTyped 
              vect={[...cursosInst]} 
              icon={FiBook} 
              onChange={setFiltroCurso}
              darkMode
            />
          </div>
           <div className="flex-1">

            <SelectTyped 
              vect={anoLectivo} 
              icon={FaGraduationCap} 
              onChange={setFiltroAnoLectivo}
              value={filtroAnoLectivo}
            />
          </div>
           
        </div>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 ">
        <StatCard 
          color={"blue"}
          icon={FiBook}
          title={"Turmas Filtradas"}
          subtitle={estatisticas.total === turmas.length ? 'Todas turmas' : `${((estatisticas.total / turmas.length) * 100).toFixed(1)}% do total`}
          value={estatisticas.total}
          trend={estatisticas.total > 0 ? 'positive' : 'neutral'}
          funcion={null}

        />
       <StatCard 
          color={"orange"}
          icon={FiClock}
          title={"Manhã"}
          subtitle={estatisticas.manha === turmasFiltradas.length ? 'Manhã' : `${((estatisticas.manha / turmasFiltradas.length) * 100).toFixed(1)}% do total`}
          value={estatisticas.manha}
          trend={estatisticas.manha > 0 ? 'positive' : 'neutral'}
          funcion={null}

        />

        <StatCard 
          color={"green"}
          icon={FiClock}
          title={"Tarde"}
          subtitle={estatisticas.tarde === turmasFiltradas.length ? 'Tarde' : `${((estatisticas.tarde / turmasFiltradas.length) * 100).toFixed(1)}% do total`}
          value={estatisticas.tarde}
          trend={estatisticas.tarde > 0 ? 'positive' : 'neutral'}
          funcion={null}

        />

         <StatCard 
          color={"purple"}
          icon={FiClock}
          title={"Noite"}
          subtitle={estatisticas.noite === turmasFiltradas.length ? 'Noite' : `${((estatisticas.noite / turmasFiltradas.length) * 100).toFixed(1)}% do total`}
          value={estatisticas.noite}
          trend={estatisticas.noite > 0 ? 'positive' : 'neutral'}
          funcion={null}
        />

  
      </div>

      {/* Lista de Turmas */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-primary-600 dark:bg-primary-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Turma
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Curso
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Professor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Turno
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Capacidade
                </th>
                 <th className="px-6 py-3 whitespace-nowrap text-left text-xs font-medium text-white uppercase tracking-wider">
                  Qtd Alunos
                </th>
                <th className="px-6 py-3 whitespace-nowrap text-left text-xs font-medium text-white uppercase tracking-wider">
                  Ano Lectivo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {turmasFiltradas.map((turma: Turma, index: number) => (
                <motion.tr
                  key={turma.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap" onClick={() => abrirTurma(turma.id)}>
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10 text-primary-600 dark:text-primary-400 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center hover:bg-primary-200 dark:hover:bg-primary-800 transition-colors">
                        <FiBook className="" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {turma.nome_turma}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                    {turma?.curso_nome}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                    {turma.professor}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      turma.turno.toLowerCase() === 'manhã' 
                        ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-300'
                        : turma.turno.toLowerCase()=== 'tarde'
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                        : 'bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300'
                    }`}>
                      {turma.turno}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                    <div className="flex items-center space-x-2">
                      <FiUsers className="text-gray-400 dark:text-gray-500" />
                      <span>{turma.capacidade_maxima} alunos</span>
                    </div>
                  </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                    <div className="flex items-center space-x-2">
                      <FiUsers className="text-gray-400 dark:text-gray-500" />
                      <span>{turma.qtd} alunos</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-300">
                    {turma.ano_lectivo}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <Link
                      to={`/turmas/editar/${turma.id}`}
                      className="text-primary-600 dark:text-primary-400 hover:text-primary-900 dark:hover:text-primary-300 transition-colors"
                    >
                      <FiEdit size={16} className="inline" />
                    </Link>
                    <button
                      onClick={() => {handleDelete(turma)}}
                      className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 ml-2 transition-colors"
                    >
                      <FiTrash2 size={16} className="inline" />
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {turmasFiltradas.length === 0 && (
          <div className="text-center py-12">
            <FiBook className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-600" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">Nenhuma turma encontrada</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchTerm ? 'Tente ajustar os termos da busca.' : 'Comece criando uma nova turma.'}
            </p>
             <button className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 my-5 hover:to-indigo-800 text-white px-8 py-2 rounded-lg font-medium "
              onClick={Reload}>Reload pagina</button>
          </div>
        )}
      </div>

    
    </div>

     <ModalComponent/>
  </>
    
  );
};

export default Turmas;