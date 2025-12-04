import { useState, useEffect } from 'react';
import { FiSearch, FiFilter, FiDollarSign, FiUser, FiCreditCard, FiCheckCircle, FiXCircle, FiClock, FiRefreshCw, FiArrowLeft, FiCalendar } from 'react-icons/fi';
import { Select } from '../../components/ui/Select.jsx';
import { FaBookAtlas, FaUserTie } from 'react-icons/fa6';
import {  Student } from '../../types/aluno.ts';
import { Turma } from '../../types/turma.ts';
import { propinaService,studentsService,turmaService } from '../../services/database'
import { DadosPagamentoCash, Transacao } from '../../types/transacao.ts';
import { HistoricoPagamentos } from '../../components/finance/historicoPagamento.jsx';
import { useNavigate } from 'react-router-dom';
import { SelectTyped } from '../../components/students/StudentForm.tsx';

export const PagamentosPage = () => {
  const [alunos, setAlunos] = useState<Student[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroTurma, setFiltroTurma] = useState('Todas Turmas');
  const [filtroStatus, setFiltroStatus] = useState('Todos');
  const [filtroMes, setFiltroMes] = useState('Todos os Meses');
  const [alunoSelecionado, setAlunoSelecionado] = useState<Student|null>(null);
  const [historicoPagamentos, setHistoricoPagamentos] = useState<any[]>([]);
  const [mesesPagamentos, setMesesPagamentos] = useState<{[alunoId: string]: string[]}>({});
  const [mesesPendente, setMesesPendentes] = useState<{[alunoId: string]: string[]}>({});

  const navigate = useNavigate();

  const abrirAluno = (alunoId: string) => {
    console.log('Abrir aluno com ID:', alunoId);
    navigate(`/alunos/${alunoId}`);
  };

  // Meses do ano para filtro
  const mesesDoAno = [
    'Todos os Meses',
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

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


  const extrairMesAbreviado = (mesCompleto: string): string => {
  const mapaMeses: {[key: string]: string} = {
    'Janeiro': 'Jan', 'Fevereiro': 'Fev', 'Março': 'Mar', 'Abril': 'Abr',
    'Maio': 'Mai', 'Junho': 'Jun', 'Julho': 'Jul', 'Agosto': 'Ago',
    'Setembro': 'Set', 'Outubro': 'Out', 'Novembro': 'Nov', 'Dezembro': 'Dez'
  };
  
  // Extrair apenas o nome do mês (remover ano)
  const mesNome = mesCompleto.split(' ')[0];
  return mapaMeses[mesNome] || mesNome.substring(0, 3);
};

// ✅ Nova função para obter meses pendentes do aluno
const getMesesPendentesAluno = (aluno: Student): string[] => {
  if (!aluno.meses_em_aberto || !Array.isArray(aluno.meses_em_aberto)) {
    return [];
  }
  
  return aluno.meses_em_aberto.map(extrairMesAbreviado);
};

// ✅ Nova função para obter meses pagos (todos menos os em aberto)
const getMesesPagosAluno = (aluno: Student): string[] => {
  const todosMeses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const mesesPendentes = getMesesPendentesAluno(aluno);
  
  return todosMeses.filter(mes => !mesesPendentes.includes(mes));
};

// ✅ Nova função para formatar meses pagos
const getMesesPagosFormatados = (aluno: Student, mesReferencia: string) => {
  const mesesPagos = getMesesPagosAluno(aluno);
  
  if (mesesPagos.length === 0) return 'Nenhum mês pago';
  
  if (mesReferencia === "Todos os Meses") {
    if (mesesPagos.length > 3) return `${mesesPagos.slice(0, 3).join(', ')} +${mesesPagos.length - 3}`;
    return mesesPagos.join(', ');  
  } else {
    const mesAbreviado = extrairMesAbreviado(mesReferencia);
    return mesesPagos.includes(mesAbreviado) ? mesAbreviado : 'Não pago';
  }
};

// ✅ Nova função para formatar meses pendentes
const getMesesPendentesFormatados = (aluno: Student, mesReferencia: string) => {
  const mesesPendentes = getMesesPendentesAluno(aluno);
  
  if (mesesPendentes.length === 0) return 'Todos pagos';
  
  if (mesReferencia === "Todos os Meses") {
    if (mesesPendentes.length > 3) return `${mesesPendentes.slice(0, 3).join(', ')} +${mesesPendentes.length - 3}`;
    return mesesPendentes.join(', ');
  } else {
    const mesAbreviado = extrairMesAbreviado(mesReferencia);
    return mesesPendentes.includes(mesAbreviado) ? mesAbreviado : 'Pago';
  }
};

// ✅ Nova função simplificada para filtro de mês
const alunoPagouMes = (aluno: Student, mes: string) => {
  if (mes === 'Todos os Meses') return false;
  
  const mesAbreviado = extrairMesAbreviado(mes);
  const mesesPagos = getMesesPagosAluno(aluno);
  
  return mesesPagos.includes(mesAbreviado);
};

const alunoTemMesPendente = (aluno: Student, mes: string) => {
  if (mes === 'Todos os Meses') return false;
  
  const mesAbreviado = extrairMesAbreviado(mes);
  const mesesPendentes = getMesesPendentesAluno(aluno);
  
  return mesesPendentes.includes(mesAbreviado);
};


const carregarDados = async () => {
  try {
    setLoading(true);
    
    // ✅ Só carregar alunos e turmas (os meses já vêm com o aluno!)
    const [alunosData, turmasData] = await Promise.all([
      studentsService.getStudents(),
      turmaService.getTurmas()
    ]);

    // Processar alunos
    const alunosNormalized = alunosData.map((a: any) => ({
      ...a,
      turmas: Array.isArray(a.turmas) ? (a.turmas[0] ?? null) : (a.turmas ?? null),
    })) as Student[];
    
    setAlunos(alunosNormalized);
    setTurmas(turmasData || []);
    
    console.log(`✅ ${alunosNormalized.length} alunos carregados com meses_em_aberto`);
    
    // ✅ Calcular estatísticas para debug
    const alunosComPendencias = alunosNormalized.filter(a => 
      a.meses_em_aberto && a.meses_em_aberto.length > 0
    );
    console.log(`📊 ${alunosComPendencias.length} alunos com meses pendentes`);

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
    const matchTurma = filtroTurma === 'Todas Turmas' || aluno.turmas?.nome_turma === filtroTurma;

    // Filtro de status
    const mesesPendentes = getMesesPendentesAluno(aluno);
    const matchStatus = filtroStatus === 'Todos' ||
        (filtroStatus === 'Pago' && aluno.pagamento_em_dia) ||
        (filtroStatus === 'Pendente' && mesesPendentes.length > 0) ||
        (filtroStatus === 'Atrasado' && !aluno.pagamento_em_dia);

    // Filtro de mês (USANDO OS NOVOS DADOS)
    const matchMes = filtroMes === 'Todos os Meses' ||
        (filtroStatus === 'Pago' && alunoPagouMes(aluno, filtroMes)) ||
        (filtroStatus === 'Pendente' && alunoTemMesPendente(aluno, filtroMes)) ||
        (filtroStatus !== 'Pago' && filtroStatus !== 'Pendente' && 
         (alunoPagouMes(aluno, filtroMes) || alunoTemMesPendente(aluno, filtroMes)));

    return matchBusca && matchTurma && matchStatus && matchMes;
});

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
    <div>
      <button 
        onClick={() => navigate("/financeiro")}
        className="flex items-center gap-2 mb-4 text-blue-600 hover:text-blue-800"
      >
        <FiArrowLeft /> Voltar ao Dashboard
      </button>
      
      <div className="min-h-screen p-6">
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

          {/* Filtros e Busca */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 shadow-sm">
            <div className="flex flex-wrap gap-4">
                 
                {/* Filtro Turma */}
                <div>
                  <SelectTyped 
                    vect={prepararDadosSelect.turmas} 
                    icon={FaBookAtlas}
                    onChange={setFiltroTurma}
                    value={filtroTurma}
                  />
                </div>

                {/* Filtro Status */}
                <div>
                  <SelectTyped 
                    vect={prepararDadosSelect.status}
                    onChange={setFiltroStatus}
                    value={filtroStatus}
                  />
                </div>

                {/* Filtro Mês */}
                <div>
                  <SelectTyped 
                    vect={prepararDadosSelect.meses}
                    icon={FiCalendar}
                    onChange={setFiltroMes}
                    value={filtroMes}
                  />
                </div>

                  {/* Botão Limpar Filtros */}
                  <div className="">
                    <button
                      onClick={limparFiltros}
                      className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      <FiFilter size={16} />
                      Limpar Filtros
                    </button>
                  </div>
              </div>


          
          </div>

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

          {/* Lista de Estudantes */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
              {/* Cabeçalho da Tabela */}
              <div className="grid grid-cols-12 gap-4 p-4 bg-gray-50 border-b border-gray-200 font-semibold text-gray-700 text-sm">
                <div className="col-span-4">Estudante</div>
                <div className="col-span-2">Turma</div>
                <div className="col-span-3">Meses Pagos</div>
                <div className="col-span-2">Status Geral</div>
                <div className="col-span-1 text-center">Ação</div>
              </div>

              {/* Lista de Estudantes */}
              <div className="divide-y divide-gray-200">
                {alunosFiltrados.map((aluno: Student) => (
                  <div key={aluno.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-gray-50 transition-colors">
                    <div className="col-span-4">
                      <div className="flex items-center gap-3">
                        <div onClick={()=> abrirAluno(aluno.id)} className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <FiUser className="text-blue-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{aluno.nome_completo}</div>
                          <div className="text-sm text-gray-500">#{aluno.numero_estudante}</div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="col-span-2 text-gray-700">{Array.isArray(aluno.turmas) ? aluno.turmas[0]?.nome_turma || 'N/A' : aluno.turmas?.nome_turma || 'N/A'}</div>
                    <div className="col-span-3">
                    {/* SEMPRE mostra meses pagos E pendentes */}
                    <div className="space-y-1">
                      {/* Meses Pagos */}
                      <div className={filtroStatus=="Pendente"?"hidden":"block text-sm"}  >
                        <span className="text-green-600 font-medium">Pagou:</span>{' '}
                        {getMesesPagosFormatados(aluno,filtroMes)}
                      </div>
                      
                      {/* Meses Pendentes */}
                      <div className={filtroStatus=="Pago"?"hidden":"block text-sm"}  >
                        <span className="text-red-600 font-medium">Pendente:</span>{' '}
                        {getMesesPendentesFormatados(aluno,filtroMes)}
                      </div>
                    </div>
  
                      {/* Contadores totais */}
                      <div className="text-xs text-gray-500 mt-1 flex gap-2">
                        
                        <span className={filtroStatus=="Pendente"?"hidden":"block"}>✓ {mesesPagamentos[aluno.id]?.length || 0}</span>
                        <span className={filtroStatus=="Pago"?"hidden":"block"}>✗ {mesesPendente[aluno.id]?.length || 0}</span>
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
                    
                    <div className="col-span-1 text-center items-center">
                      <button
                        onClick={() => handleSelecionarAluno(aluno)}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                          aluno.pagamento_em_dia
                            ? 'bg-gray-100 text-gray-400'
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                        disabled={aluno.pagamento_em_dia}
                      >
                        Pagar
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

          {/* Estatísticas Rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-2xl font-bold text-gray-900">{alunosFiltrados.length}</div>
              <div className="text-sm text-gray-600">Estudantes Filtrados</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-2xl font-bold text-green-600">
                {alunosFiltrados.filter(a => a.pagamento_em_dia).length}
              </div>
              <div className="text-sm text-gray-600">Em Dia</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-2xl font-bold text-red-600">
                {alunosFiltrados.filter(a => !a.pagamento_em_dia).length}
              </div>
              <div className="text-sm text-gray-600">Pendentes</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-2xl font-bold text-blue-600">
                {Object.values(mesesPagamentos).flat().length}
              </div>
              <div className="text-sm text-gray-600">Meses Pagos</div>
            </div>
          </div>

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