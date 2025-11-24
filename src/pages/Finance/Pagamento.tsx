import { useState, useEffect } from 'react';
import { FiSearch, FiFilter, FiDollarSign, FiUser, FiCreditCard, FiCheckCircle, FiXCircle, FiClock, FiRefreshCw, FiArrowLeft } from 'react-icons/fi';
import { studentsService } from '../../services/database/students.ts';
import { turmaService } from '../../services/database/turmas.ts';
import { transacaoService } from '../../services/database/transacaoService.ts';
import { Select } from '../../components/ui/Select.jsx';
import { FaBookAtlas, FaUserTie } from 'react-icons/fa6';
import { AlunoData, Student } from '../../types/aluno.ts';
import { Turma } from '../../types/turma.ts';
import { propinaService } from '../../services/database/propinas.ts';
import { DadosPagamentoCash, Transacao } from '../../types/transacao.ts';
import { HistoricoPagamentos } from '../../components/finance/historicoPagamento.jsx';
import { useNavigate } from 'react-router-dom';

export const PagamentosPage = () => {
  const [alunos, setAlunos] = useState<Student[]>([]);
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [professores, setProfessores] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroTurma, setFiltroTurma] = useState('Todas Turmas');
  const [filtroProfessor, setFiltroProfessor] = useState('Todos Professores');
  const [filtroStatus, setFiltroStatus] = useState('Todos');
  const [alunoSelecionado, setAlunoSelecionado] = useState<Student|null>(null);
  const [pagamentoLoading, setPagamentoLoading] = useState(false);
  const [historicoPagamentos, setHistoricoPagamentos] = useState<any[]>([]);

  // Carregar dados iniciais
  useEffect(() => {
    carregarDados();
  }, []);

  const carregarDados = async () => {
    try {
      setLoading(true);
      
      // Buscar alunos
      const alunosData = await studentsService.getStudents();
      // Normalizar e garantir que o formato de 'turmas' esteja compatível com o tipo Student
      const alunosNormalized = (alunosData || []).map((a: any) => ({
        ...a,
        // se 'turmas' vier como array, use o primeiro elemento; caso contrário mantenha o valor (ou null)
        turmas: Array.isArray(a.turmas) ? (a.turmas[0] ?? null) : (a.turmas ?? null),
      })) as Student[];
      setAlunos(alunosNormalized);

      // Buscar turmas
      const turmasData = await turmaService.getTurmas();
      setTurmas(turmasData||[]);

      // Buscar professores (extraindo dos dados das turmas ou deixando vazio se não houver)
      const professoresData = (turmasData || []).map((t: Turma) => (
        t.professor ?? 'Desconhecido'
      ));
      setProfessores(professoresData);
      

      // Carregar histórico de pagamentos
      await carregarHistoricoPagamentos();

    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };


  const carregarHistoricoPagamentos = async () => {
    try {
      const historico = await propinaService.getHistoricoPagamentos();
      setHistoricoPagamentos(historico || []);
    } catch (error) {
      console.error('Erro ao carregar histórico:', error);
      setHistoricoPagamentos([]);
    }
  };

  // Filtrar alunos
  const alunosFiltrados = alunos.filter(aluno => {
    const matchBusca = busca ? 
      aluno.nome_completo?.toLowerCase().includes(busca.toLowerCase()) ||
      aluno.numero_estudante?.toString().includes(busca) : true;
    
    const matchTurma = filtroTurma !== 'Todas Turmas' ? 
      aluno.turmas?.nome_turma === filtroTurma || 
      aluno.turma_id === filtroTurma : true;

    const matchStatus = filtroStatus !== 'Todos' ? 
      (filtroStatus === 'Pago' ? aluno.pagamento_em_dia : !aluno.pagamento_em_dia) : true;

    return matchBusca && matchTurma && matchStatus;
  });

  const handleSelecionarAluno = (aluno:Student) => {
    setAlunoSelecionado(aluno);
    navigate("/financeiro/pagamento/"+aluno.id)
  };

  const handleProcessarPagamento = async (dadosPagamento: DadosPagamentoCash) => {
  try {
    setPagamentoLoading(true);
    
    if (!alunoSelecionado) return;

    // Processar pagamento em cash
    const resultado = await transacaoService.processarPagamentoCash(
      alunoSelecionado.id, 
      dadosPagamento
    );

    if (resultado.sucesso) {
      console.log('✅ Pagamento em cash registrado com sucesso');
      // Atualizar lista de alunos
      await carregarDados();

      setAlunoSelecionado(null);
      
      // Mostrar mensagem de sucesso
      alert(resultado.mensagem);
    } else {
      throw new Error(resultado.mensagem);
    }

  } catch (error: any) {
    console.error('❌ Erro ao registrar pagamento:', error);
    alert('Erro ao registrar pagamento: ' + error.message);
  } finally {
    setPagamentoLoading(false);
  }
};
const navigate=useNavigate();
  const prepararDadosSelect = {
    turmas: ['Todas Turmas', ...turmas.map(t => t.nome_turma)],
    professores: ['Todos Professores', ...professores.map(p => p)],
    status: ['Todos', 'Pago', 'Pendente']
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
                <p className="text-gray-600">Gerencie os pagamentos dos estudantes</p>
              </div>
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
          <div className="flex flex-col lg:flex-row flex-wrap lg:items-end lg:gap-6">
            
            {/* Busca por Nome ou Número */}
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Buscar Estudante
              </label>
              <div className="relative">
                <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Nome ou número de estudante..."
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-max"
                />
              </div>
            </div>
             {/* Filtro Turma */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Turma
              </label>
              <Select 
                vect={prepararDadosSelect.turmas} 
                icon={FaBookAtlas}
                onChange={setFiltroTurma}
              />
            </div>

            {/* Filtro Professor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Professor
              </label>
              <Select 
                vect={prepararDadosSelect.professores} 
                icon={FaUserTie}
                onChange={setFiltroProfessor}
              />
            </div>

            {/* Filtro Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <Select 
                vect={prepararDadosSelect.status}
                onChange={setFiltroStatus}
              />
            </div>
              {/* Botão Limpar Filtros */}
          <div className="flex justify-end mt-4">
            <button
              onClick={() => {
                setBusca('');
                setFiltroTurma('Todas Turmas');
                setFiltroProfessor('Todos Professores');
                setFiltroStatus('Todos');
              }}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <FiFilter size={16} />
              Limpar Filtros
            </button>
          </div>
          </div>

        
        </div>

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
              <div className="col-span-2">Professor</div>
              <div className="col-span-2">Status</div>
              <div className="col-span-2 text-center">Ação</div>
            </div>

            {/* Lista de Estudantes */}
            <div className="divide-y divide-gray-200">
              {alunosFiltrados.map((aluno:Student) => (
                <div key={aluno.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-gray-50 transition-colors">
                  <div className="col-span-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <FiUser className="text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{aluno.nome_completo}</div>
                        <div className="text-sm text-gray-500">#{aluno.numero_estudante}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="col-span-2 text-gray-700">{aluno.turmas?.nome_turma}</div>
                  
                  <div className="col-span-2 text-gray-700">
                    {aluno.turmas?.professor || 'N/A'}
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
                          Pago
                        </>
                      ) : (
                        <>
                          <FiClock size={14} />
                          Pendente
                        </>
                      )}
                    </span>
                  </div>
                  
                  <div className="col-span-2 text-center">
                    <button
                      onClick={() => handleSelecionarAluno(aluno)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        aluno.pagamento_em_dia
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {aluno.pagamento_em_dia ? 'Pago' : 'Pagar'}
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
                  {busca || filtroTurma !== 'Todas Turmas' || filtroProfessor !== 'Todos Professores' || filtroStatus !== 'Todos'
                    ? 'Tente ajustar os filtros de busca'
                    : 'Nenhum estudante cadastrado'
                  }
                </p>
              </div>
            )}
          </div>
        )}
        {/* Histórico de Pagamentos (Opcional) */}
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