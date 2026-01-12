import { useState, useEffect, useMemo } from 'react';
import { FiSearch, FiFilter, FiDollarSign, FiUser, FiCreditCard, FiCheckCircle, FiXCircle, FiClock, FiRefreshCw, FiArrowLeft, FiCalendar, FiTrendingDown, FiBarChart2 } from 'react-icons/fi';
import { Select } from '../../components/ui/Select.jsx';
import { FaBookAtlas, FaUserTie } from 'react-icons/fa6';
import { Student } from '../../types/aluno.ts';
import { Turma } from '../../types/turma.ts';
import { propinaService, alunosService, turmaService } from '../../services/database'
import { DadosPagamentoCash, Transacao } from '../../types/transacao.ts';
import { HistoricoPagamentos } from '../../components/finance/historicoPagamento.jsx';
import { useNavigate } from 'react-router-dom';
import { SelectTyped } from '../../components/students/StudentForm.tsx';
import { configService } from '../../services/database/config.ts';
import { motion } from 'framer-motion';
import { RxPerson } from 'react-icons/rx';

export const PagamentosPage = () => {
  const [alunos, setAlunos] = useState<Student[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
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
    if (!mesCompleto) return '';
    
    const mapaMeses: { [key: string]: string } = {
      'Setembro': 'Set', 'Outubro': 'Out', 'Novembro': 'Nov', 'Dezembro': 'Dez',
      'Janeiro': 'Jan', 'Fevereiro': 'Fev', 'Março': 'Mar', 'Abril': 'Abr',
      'Maio': 'Mai', 'Junho': 'Jun', 'Julho': 'Jul', 'Agosto': 'Ago'
      
    };

    // Extrair apenas o nome do mês (remover ano se existir)
    const partes = mesCompleto.split(' ');
    const mesNome = partes[0]; // Pega o primeiro elemento (Setembro, Outubro, etc.)
    
    return mapaMeses[mesNome] || mesNome.substring(0, 3);
  };

  // ✅ Função corrigida para obter meses pendentes do aluno
  const getMesesPendentesAluno = (aluno: Student): string[] => {
    if (!aluno.meses_em_aberto || !Array.isArray(aluno.meses_em_aberto)) {
      return [];
    }
    
    // Retorna os meses pendentes já no formato abreviado
    return aluno.meses_em_aberto.map(extrairMesAbreviado);
  };

const getMesesPagosAluno = (aluno: Student): string[] => {
  if (!aluno.data_matricula || !mesesDoAno.length) return [];
  
  const todosMeses = mesesDoAno
    .filter(mes => mes !== "Todos os Meses")
    .map(extrairMesAbreviado);

  // 1. Obter meses pendentes uma única vez
  const mesesPendentes = getMesesPendentesAluno(aluno);
  
  // 2. Determinar ponto de partida (primeiro mês pago)
  let startIndex = 0;
  console.log("Histórico de pagamentos do aluno:", aluno.propina);
   propinaService.getByAluno(aluno.id).then((value)=>{
        // Tentar usar histórico de pagamentos primeiro
      if (value.length) {
        // Encontrar o pagamento mais antigo
        const primeiroPagamento = value.reduce((maisAntigo, atual) => {
          if (!maisAntigo) return atual;
          if (!atual.data_pagamento || !maisAntigo.data_pagamento) return maisAntigo;
          return new Date(atual.data_pagamento) < new Date(maisAntigo.data_pagamento) 
            ? atual : maisAntigo;
        });
        
        if (primeiroPagamento?.mes_referencia) {
          const mesAbreviado = extrairMesAbreviado(primeiroPagamento.mes_referencia);
          startIndex = todosMeses.indexOf(mesAbreviado);
        }
      }
   })
 
  
  // Fallback para data de matrícula se histórico não existir ou mês não encontrado
  if (startIndex < 0) {
    const mesMatricula = new Date(aluno.data_matricula).getMonth() + 1;
    
    if (mesMatricula >= 9 && mesMatricula <= 12) {
      startIndex = mesMatricula - 9; // Set(0), Out(1), Nov(2), Dez(3)
    } else if (mesMatricula >= 1 && mesMatricula <= 6) {
      startIndex = mesMatricula + 3; // Jan(4), Fev(5), Mar(6), etc.
    } else {
      startIndex = 0; // Julho/Agosto → começar em Setembro
    }
  }
  startIndex = Math.max(0, startIndex);

  const mesesEsperados = todosMeses.slice(startIndex);
  return mesesEsperados.filter(mes => !mesesPendentes.includes(mes));
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

  // ✅ Função corrigida para calcular meses pagos e pendentes para estatísticas
  const calcularMesesPorAluno = (alunosData: Student[]) => {
    const mesesPagamentosObj: { [alunoId: string]: string[] } = {};
    const mesesPendentesObj: { [alunoId: string]: string[] } = {};

    alunosData.forEach(aluno => {
      mesesPagamentosObj[aluno.id] = getMesesPagosAluno(aluno);
      mesesPendentesObj[aluno.id] = getMesesPendentesAluno(aluno);
    });

    setMesesPagamentos(mesesPagamentosObj);
    setMesesPendentes(mesesPendentesObj);
  };

  const carregarDados = async () => {
    try {
      setLoading(true);

      const [alunosData, turmasData] = await Promise.all([
        alunosService.getAllStudents(),
        turmaService.getTurmas()
      ]);

      // Processar alunos
      const alunosNormalized = alunosData.map((a: any) => ({
        ...a,
        turmas: Array.isArray(a.turmas) ? (a.turmas[0] ?? null) : (a.turmas ?? null),
      })) as Student[];
      const resulst =await configService.getPaymentConfig()
      setMesesDoano(["Todos os Meses",...resulst.mesesPagamento]) // <-- aqui estava
      setAlunos(alunosNormalized);
      setTurmas(turmasData || []);

      calcularMesesPorAluno(alunosNormalized);

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
    const totalPendentes=alunos.filter(a => !a.pagamento_em_dia).length
    const totalEmDia=alunos.filter(a => a.pagamento_em_dia).length
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
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <FiDollarSign className="h-8 w-8 text-green-600" />
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Pagamento de Propinas</h1>
                  <p className="text-gray-600">Gerencie os pagamentos dos estudantes por mês</p>
                </div>
              </div>
              <div className='flex gap-2'>
                <div className="relative ">
                  <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={busca}
                    onChange={(e) => setBusca(e.target.value)}
                    placeholder="Nome ou número de estudante..."
                    className="w-full max pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
              initial={{opacity:0,y:20}}
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
              initial={{opacity:0,y:20}}
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
                initial={{opacity:0,y:20}}
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
              initial={{opacity:0,y:20}}
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
         
          className="bg-white rounded-lg border border-gray-200 p-6 mb-6 shadow-sm">
            <div className="flex flex-row gap-4 justify-around">

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
                  className="flex w-full items-center gap-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  <FiFilter size={16} />
                  Limpar Filtros
                </button>
              </div>
            </div>
          </motion.div>

          {/* Resumo de Filtros Ativos */}
          {(filtroTurma !== 'Todas Turmas' || filtroStatus !== 'Todos' || filtroMes !== 'Todos os Meses' || busca) && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 text-blue-700 mb-2">
                <FiFilter size={16} />
                <span className="font-medium">Filtros Ativos:</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {busca && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                    Busca: "{busca}"
                  </span>
                )}
                {filtroTurma !== 'Todas Turmas' && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                    Turma: {filtroTurma}
                  </span>
                )}
                {filtroStatus !== 'Todos' && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                    Status: {filtroStatus}
                  </span>
                )}
                {filtroMes !== 'Todos os Meses' && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                    Mês: {filtroMes}
                  </span>
                )}
              </div>
            </div>
          )}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}>
             {/* Lista de Estudantes */}
              {loading ? (
                <div className="flex justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div  className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                  {/* Cabeçalho da Tabela */}
                  <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b border-gray-200 font-semibold text-gray-700 text-sm">
                    <div className="col-span-3">Estudante</div>
                    <div className="col-span-2">Turma</div>
                    <div className="col-span-3">Meses Pagos</div>
                    <div className="col-span-2">Status Geral</div>
                    <div className="col-span-2 text-center">Ação</div>
                  </div>

                  {/* Lista de Estudantes */}
                  <div className="divide-y divide-gray-200">
                    {alunosFiltrados.map((aluno: Student) => (
                      <div key={aluno.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-gray-50 transition-colors">
                        <div className="col-span-3">
                          <div className="flex items-center gap-3">
                            <div onClick={() => abrirAluno(aluno.id)} className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center cursor-pointer hover:bg-blue-200 transition-colors">
                              <FiUser className="text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{aluno.nome_completo}</div>
                              <div className="text-sm text-gray-500">#{aluno.numero_estudante}</div>
                            </div>
                          </div>
                        </div>

                        <div className="col-span-2 text-gray-700">
                          { aluno.turma_nome || 'N/A'}
                        </div>
                        <div className="col-span-3">
                          {/* Sempre mostra meses pagos E pendentes */}
                          <div className="space-y-1">
                            {/* Meses Pagos */}
                            <div className={filtroStatus === "Pendente" ? "hidden" : "block text-sm"}>
                              <span className="text-green-600 font-medium">Pagou:</span>{' '}
                              {getMesesPagosFormatados(aluno, filtroMes)}
                            </div>

                            {/* Meses Pendentes */}
                            <div className={filtroStatus === "Pago" ? "hidden" : "block text-sm"}>
                              <span className="text-red-600 font-medium">Pendente:</span>{' '}
                              {getMesesPendentesFormatados(aluno, filtroMes)}
                            </div>
                          </div>

                          {/* Contadores totais */}
                          <div className="text-xs text-gray-500 mt-1 flex gap-2">
                            <span className={filtroStatus === "Pendente" ? "hidden" : "block"}>✓ {getMesesPagosAluno(aluno).length}</span>
                            <span className={filtroStatus === "Pago" ? "hidden" : "block"}>✗ {getMesesPendentesAluno(aluno).length}</span>
                          </div>
                        </div>

                        <div className="col-span-2">
                          <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${
                            aluno.pagamento_em_dia
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                            }`}>
                            {aluno.pagamento_em_dia ? (
                              <>
                                <FiCheckCircle size={14} />
                                Em Dia
                              </>
                            ) : (
                              <>
                                <FiClock size={14} />
                                Pendente
                              </>
                            )}
                          </span>
                        </div>

                      <div className="col-span-2 text-center justify-center flex items-center">
                          <button
                            onClick={() => handleSelecionarAluno(aluno)}
                            className="flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors bg-green-600 text-white hover:bg-green-700"
                            title="Realizar pagamento (mês atual ou adiantado)"
                          >
                            <FiDollarSign size={16} />
                            <span>Pagar</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Mensagem quando não há resultados */}
                  {alunosFiltrados.length === 0 && (
                    <div className="text-center py-12">
                      <FiUser className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-4 text-lg font-medium text-gray-900">
                        Nenhum estudante encontrado
                      </h3>
                      <p className="text-gray-500 mt-2">
                        {busca || filtroTurma !== 'Todas Turmas' || filtroStatus !== 'Todos' || filtroMes !== 'Todos os Meses'
                          ? 'Tente ajustar os filtros de busca'
                          : 'Nenhum estudante cadastrado'
                        }
                      </p>
                    </div>
                  )}
                </div>
              )}
          </motion.div>
         

         
          {/* Histórico de Pagamentos */}
          <div className="mt-8">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Histórico Recente de Pagamentos</h2>
            <HistoricoPagamentos historico={historicoPagamentos} />
          </div>

        </div>
      </div>
    </div>
  );
};

export default PagamentosPage;