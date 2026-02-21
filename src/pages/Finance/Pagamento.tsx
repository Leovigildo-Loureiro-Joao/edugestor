import { useState, useEffect, useMemo } from 'react';
import { FiSearch, FiFilter, FiDollarSign, FiUser, FiCreditCard, FiCheckCircle, FiXCircle, FiClock, FiRefreshCw, FiArrowLeft, FiCalendar, FiTrendingDown, FiBarChart2 } from 'react-icons/fi';
import { Select } from '../../components/ui/Select.jsx';
import { FaBookAtlas, FaUserTie } from 'react-icons/fa6';
import { Student } from '../../types/aluno.ts';
import { Turma } from '../../types/turma.ts';
import { Course } from '../../types/curso.ts';
import { propinaService, alunosService, turmaService, cursosService } from '../../services/database'
import { HistoricoPagamentos } from '../../components/finance/historicoPagamento.jsx';
import { useNavigate } from 'react-router-dom';
import { SelectTyped } from '../../components/students/StudentForm.tsx';
import { configService } from '../../services/database/config.ts';
import { motion } from 'framer-motion';
import { RxPerson } from 'react-icons/rx';
import { SyncStatusBadge } from '../../components/ui/SyncStatusBadge.tsx';
import { financeRulesService } from '../../services/finance/financeRulesService.ts';
import { PagamentosTable } from '../../components/finance/PagamentosTable.tsx';
import { PageLoader } from '../../components/ui/PageLoader.tsx';

export const PagamentosPage = () => {
  const [alunos, setAlunos] = useState<Student[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [cursos, setCursos] = useState<Course[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroTurma, setFiltroTurma] = useState('Todas Turmas');
  const [filtroStatus, setFiltroStatus] = useState('Todos');
  const [filtroMes, setFiltroMes] = useState('Todos os Meses');
  const [mesesDoAno, setMesesDoano] = useState<string[] | []>([]);
  const [alunoSelecionado, setAlunoSelecionado] = useState<Student | null>(null);
  const [historicoPagamentos, setHistoricoPagamentos] = useState<any[]>([]);
  const [mesesPagamentos, setMesesPagamentos] = useState<{ [alunoId: string]: string[] }>({});
  const [mesesPendente, setMesesPendentes] = useState<{ [alunoId: string]: string[] }>({});

  const navigate = useNavigate();

  const abrirAluno = (alunoId: string) => {
    navigate(`/alunos/${alunoId}`);
  };
  

  // Carregar dados iniciais
  useEffect(() => {
    carregarDados();
  }, []);

  const carregarHistoricoPagamentos = async () => {
    try {
      const historico = await propinaService.getHistoricoPagamentos();
      setHistoricoPagamentos(historico || []);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      setHistoricoPagamentos([]);
    }
  };



  // ✅ Função corrigida para extrair mês abreviado
  const extrairMesAbreviado = (mesCompleto: string): string => {
    return financeRulesService.toMonthAbbr(mesCompleto);
  };

  const getMesesCobrancaPorAluno = (
    aluno: Student,
    mesesBase: string[],
    turmasSource: Turma[],
    cursosSource: Course[]
  ): string[] => {
    if (!mesesBase.length) return [];

    return financeRulesService.getBillingMonthsForStudent(
      aluno,
      mesesBase,
      turmasSource,
      cursosSource
    );
  };

  const getMesesPagosAluno = (aluno: Student): string[] => {
    return mesesPagamentos[aluno.id] || [];
  };

  const getMesesPendentesAluno = (aluno: Student): string[] => {
    return mesesPendente[aluno.id]||[];
  };

  const Pendente = (aluno: Student): boolean => {
    return getMesesPagosAluno(aluno).includes(financeRulesService.getCurrentMonthAbbr());
  };

const getMesesPagosFormatados = (aluno: Student, mesReferencia: string) => {
  const mesesPagos = getMesesPagosAluno(aluno);
  
  if (mesesPagos.length === 0) return 'Nenhum mês pago';
  
  if (mesReferencia === "Todos os Meses") {
    if (mesesPagos.length > 3) return `${mesesPagos.slice(0, 3).join(', ')} +${mesesPagos.length - 3}`;
    return mesesPagos.join(', ');
  } else {
    const mesAbreviado = extrairMesAbreviado(mesReferencia);
    return mesesPagos.includes(mesAbreviado) ? 'Pago' : 'Não pago';
  }
};

  // ✅ Função corrigida para formatar meses pendentes
  const getMesesPendentesFormatados = (aluno: Student, mesReferencia: string) => {
    const mesesPendentes = getMesesPendentesAluno(aluno);
    
    if (mesesPendentes.length === 0) return 'Todos pagos';
    
    if (mesReferencia === "Todos os Meses") {
      if (mesesPendentes.length > 3) return `${mesesPendentes.slice(0, 3).join(', ')} +${mesesPendentes.length - 3}`;
      return mesesPendentes.join(', ');
    } else {
      const mesAbreviado = extrairMesAbreviado(mesReferencia);
      return mesesPendentes.includes(mesAbreviado) ? 'Pendente' : 'Pago';
    }
  };

  // ✅ Função corrigida para verificar se aluno pagou um mês específico
  const alunoPagouMes = (aluno: Student, mes: string) => {
    if (mes === 'Todos os Meses') return false;
    
    const mesAbreviado = extrairMesAbreviado(mes);
    const mesesPagos = getMesesPagosAluno(aluno);
    
    return mesesPagos.includes(mesAbreviado);
  };

  // ✅ Função corrigida para verificar se aluno tem mês pendente
  const alunoTemMesPendente = (aluno: Student, mes: string) => {
    if (mes === 'Todos os Meses') return false;
    
    const mesAbreviado = extrairMesAbreviado(mes);
    const mesesPendentes = getMesesPendentesAluno(aluno);
    
    return mesesPendentes.includes(mesAbreviado);
  };

  const carregarDados = async () => {
    try {
      setLoading(true);

      const [alunosData, turmasData, cursosData, propinasData] = await Promise.all([
        alunosService.getAllStudents(),
        turmaService.getTurmas(),
        cursosService.getCourses(),
        propinaService.getAllPropinas()
      ]);

      // Processar alunos
      const alunosNormalized = alunosData.map((a: any) => ({
        ...a,
        turmas: Array.isArray(a.turmas) ? (a.turmas[0] ?? null) : (a.turmas ?? null),
      })) as Student[];
      const resulst =await configService.getPaymentConfig()
      const mesesConfig = ["Todos os Meses",...resulst.mesesPagamento];
      const mesesBase = mesesConfig
        .filter((mes: string) => mes !== 'Todos os Meses')
        .map(extrairMesAbreviado);
      setMesesDoano(mesesConfig) // <-- aqui estava
      setAlunos(alunosNormalized);
      setTurmas(turmasData || []);
      setCursos(cursosData || []);

      const mesesPagosMap = financeRulesService.buildPaidMonthsMap(propinasData);
      const mesesPendentesMap = financeRulesService.buildPendingMonthsMap(
        alunosNormalized,
        mesesBase,
        turmasData || [],
        cursosData || [],
        mesesPagosMap
      );

      setMesesPagamentos(mesesPagosMap);
      setMesesPendentes(mesesPendentesMap);

    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const alunosFiltrados = alunos.filter(aluno => {
    // Filtro de busca
    const matchBusca = !busca ||
      aluno.nome_completo?.toLowerCase().includes(busca.toLowerCase()) ||
      aluno.numero_estudante?.toString().includes(busca);

    // Filtro de turma
    const turmaNome = aluno.turma_nome
    const matchTurma = filtroTurma === 'Todas Turmas' || turmaNome === filtroTurma;

    // Filtro de status
    const mesesPendentes = getMesesPendentesAluno(aluno);
    const mesesPagos = getMesesPagosAluno(aluno);
    let matchStatus = true;

    if (filtroStatus === 'Pago') {
      matchStatus = mesesPagos.length > 0;
    } else if (filtroStatus === 'Pendente') {
      matchStatus = mesesPendentes.length > 0;
    } else if (filtroStatus === 'Todos') {
      matchStatus = true;
    }

    // Filtro de mês específico
    let matchMes = true;
    if (filtroMes !== 'Todos os Meses') {
      if (filtroStatus === 'Pago') {
        matchMes = alunoPagouMes(aluno, filtroMes);
      } else if (filtroStatus === 'Pendente') {
        matchMes = alunoTemMesPendente(aluno, filtroMes);
      } else {
        // Para "Todos" ou outros status, mostra tanto pagos quanto pendentes
        matchMes = alunoPagouMes(aluno, filtroMes) || alunoTemMesPendente(aluno, filtroMes);
      }
    }

    return matchBusca && matchTurma && matchStatus && matchMes;
  });

  const estatistica = useMemo(() => {
    const alunos=alunosFiltrados
    const totalEstudantes=alunos.length
    const totalPendentes=alunos.filter(a => getMesesPendentesAluno(a).length > 0).length
    const totalEmDia=alunos.filter(a => getMesesPendentesAluno(a).length === 0).length
    const totalMesePagos=Object.values(mesesPagamentos).flat().length
     return {
      totalEstudantes,
      totalPendentes,
      totalEmDia,
      totalMesePagos
    };
  },[alunosFiltrados,mesesPagamentos])

  const handleSelecionarAluno = (aluno: Student) => {
    setAlunoSelecionado(aluno);
    navigate("/financeiro/pagamento/" + aluno.id);
  };

  const prepararDadosSelect = {
    turmas: ['Todas Turmas', ...turmas.map(t => t.nome_turma)],
    status: ['Todos', 'Pago', 'Pendente'],
    meses: mesesDoAno
  };

  const limparFiltros = () => {
    setBusca('');
    setFiltroTurma('Todas Turmas');
    setFiltroStatus('Todos');
    setFiltroMes('Todos os Meses');
  };

  return (
    <div className='p-4 md:p-6'>
      <button
        onClick={() => navigate("/financeiro")}
        className="flex items-center gap-2 mb-4 text-blue-600 hover:text-blue-800"
      >
        <FiArrowLeft /> Voltar ao Dashboard
      </button>

      <div className="min-h-screen ">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="mb-8">
            <div className="flex flex-wrap gap-3 items-center justify-between mb-6">
              <div className="flex items-start sm:items-center gap-3">
                <FiDollarSign className="h-8 w-8 text-green-600" />

                <data  className='flex flex-col sm:flex-row sm:items-center gap-2'>

                  <div>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white leading-tight">Pagamento de Propinas</h1>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Gerencie os pagamentos dos estudantes por mês</p>
                </div>
                <SyncStatusBadge tableName='propina'   />
                </data>
              </div>
              <div className='flex gap-2'>
                <div className="relative ">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                  <input
                    type="text"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Nome ou número de estudante..."
                    className="w-full max pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <button
                  onClick={carregarDados}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <FiRefreshCw size={16} />
                  Atualizar
                </button>
              </div>
            </div>
          </div>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <motion.div 
              initial={{opacity:0,y:-20}}
              animate={{opacity:1,y:0}}
              className="bg-white dark:bg-gray-700 rounded-xl shadow-lg p-6 border-l-4 border-blue-500"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm dark:text-white">Estudantes Filtrados</p>
                  <h3 className="text-2xl dark:text-white font-bold">{estatistica.totalEstudantes}</h3>
                </div>
                <RxPerson className="text-3xl text-blue-500" />
              </div>
            </motion.div>
    
            <motion.div 
              initial={{opacity:0,y:-20}}
              animate={{opacity:1,y:0}}
              transition={{ delay: 0.1 }}
              className="bg-white dark:bg-gray-700 rounded-xl shadow-lg p-6 border-l-4 border-green-500"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 dark:text-white text-sm">Em Dia</p>
                  <h3 className="text-2xl dark:text-white font-bold">
                    {estatistica.totalEmDia}
                  </h3>
                </div>
                <FiCheckCircle className="text-3xl text-green-500" />
              </div>
            </motion.div>
    
            <motion.div 
                initial={{opacity:0,y:-20}}
              animate={{opacity:1,y:0}}
              transition={{ delay: 0.2 }}
              className="bg-white dark:bg-gray-700 rounded-xl shadow-lg p-6 border-l-4 border-red-500"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm dark:text-white">Pendentes</p>
                  <h3 className="text-2xl dark:text-white font-bold">{estatistica.totalPendentes}</h3>
                </div>
                <FiTrendingDown className="text-3xl text-red-500" />
              </div>
            </motion.div>
    
            <motion.div 
              initial={{opacity:0,y:-20}}
              animate={{opacity:1,y:0}}
              transition={{ delay: 0.3 }}
              className="bg-white dark:bg-gray-700 rounded-xl shadow-lg p-6 border-l-4 border-orange-500"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-500 text-sm dark:text-white">Meses Pagos</p>
                  <h3 className="text-2xl font-bold dark:text-white">{estatistica.totalMesePagos}</h3>
                </div>
                <FiBarChart2 className="text-3xl text-orange-500" />
              </div>
            </motion.div>
          </div>
        

          {/* Filtros e Busca */}
          <motion.div 
          initial={{opacity:0,y:20}}
          animate={{opacity:1,y:0}}
           transition={{ delay: 0.5 }}
         
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 mb-6 shadow-sm">
            <div className="flex flex-wrap gap-4 justify-around">

              {/* Filtro Turma */}
              <div className='w-full'>
                <SelectTyped
                  vect={prepararDadosSelect.turmas}
                  icon={FaBookAtlas}
                  onChange={setFiltroTurma}
                  value={filtroTurma}
                />
              </div>

              {/* Filtro Status */}
              <div className='w-full'>
                <SelectTyped
                  vect={prepararDadosSelect.status}
                  onChange={setFiltroStatus}
                  value={filtroStatus}
                />
              </div>

              {/* Filtro Mês */}
               <div className='w-full'>
                <SelectTyped
                  vect={prepararDadosSelect.meses}
                  icon={FiCalendar}
                  onChange={setFiltroMes}
                  value={filtroMes}
                />
              </div>

              {/* Botão Limpar Filtros */}
               <div className='w-full'>
                <button
                  onClick={limparFiltros}
                  className="flex w-full items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  <FiFilter size={16} />
                  Limpar Filtros
                </button>
              </div>
            </div>
          </motion.div>

          {/* Resumo de Filtros Ativos */}
          {(filtroTurma !== 'Todas Turmas' || filtroStatus !== 'Todos' || filtroMes !== 'Todos os Meses' || busca) && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/60 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 mb-2">
                <FiFilter size={16} />
                <span className="font-medium">Filtros Ativos:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {busca && (
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 text-sm rounded-full">
                    Busca: "{busca}"
                  </span>
                )}
                {filtroTurma !== 'Todas Turmas' && (
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 text-sm rounded-full">
                    Turma: {filtroTurma}
                  </span>
                )}
                {filtroStatus !== 'Todos' && (
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 text-sm rounded-full">
                    Status: {filtroStatus}
                  </span>
                )}
                {filtroMes !== 'Todos os Meses' && (
                  <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 text-sm rounded-full">
                    Mês: {filtroMes}
                  </span>
                )}
              </div>
            </div>
          )}
  
          {/* Lista de Estudantes */}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            {loading ? (
              <PageLoader
                title="Carregando pagamentos"
                subtitle="Buscando alunos e situação de propinas..."
                fullScreen={false}
              />
            ) : (
              <PagamentosTable
                alunos={alunosFiltrados}
                filtroMes={filtroMes}
                filtroStatus={filtroStatus}
                getMesesPagosFormatados={getMesesPagosFormatados}
                getMesesPendentesFormatados={getMesesPendentesFormatados}
                getMesesPagosAluno={getMesesPagosAluno}
                getMesesPendentesAluno={getMesesPendentesAluno}
                Pendente={Pendente}
                onPagar={handleSelecionarAluno}
                onVerAluno={abrirAluno}
              />
            )}
          </motion.div>

         
          {/* Histórico de Pagamentos */}
          <div className="mt-8">
            <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white mb-4">Histórico Recente de Pagamentos</h2>
            <HistoricoPagamentos historico={historicoPagamentos} />
          </div>

        </div>
      </div>
    </div>
  );
};

export default PagamentosPage;
