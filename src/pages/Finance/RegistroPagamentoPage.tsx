import { useState, useEffect } from 'react';
import { FiUser, FiDollarSign, FiCalendar, FiArrowLeft, FiCheckCircle, FiInfo } from 'react-icons/fi';
import { Student } from '../../types/aluno.ts';
import { useParams, useNavigate } from 'react-router-dom';
import { alunosService } from '../../services/database/alunosService.ts';
import { transacaoService } from '../../services/database/transacaoService.ts';
import { propinaService } from '../../services/database/propinas.ts';
import { mesesUtils } from '../../utils/meses.ts';
import { DadosPagamentoCash } from '../../types/transacao.ts';


export const RegistroPagamentoPage: React.FC = () => {
  const { alunoId } = useParams<{ alunoId: string }>();
  const navigate = useNavigate();
  
  const [aluno, setAluno] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagamentoLoading, setPagamentoLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);

  const [dadosPagamento, setDadosPagamento] = useState<DadosPagamentoCash>({
    valor: '',
    meses: 1,
    valorTotal: 0,
    metodo: 'cash',
    mesReferencia: []
  });

  // Meses disponíveis para pagamento

// No RegisterPropinaPage
const [mesesDisponiveis, setMesesDisponiveis] = useState<string[]>([]);

// Todos os meses do ano (completos)
const TODOS_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

// Carregar meses disponíveis quando o aluno for carregado
useEffect(() => {
  const carregarMesesDisponiveis = async () => {
    if (!aluno?.id) return;
    
    try {
      // 1. Buscar meses JÁ pagos (abreviados: ['Jan', 'Fev', etc])
      const mesesPagosAbreviados = await propinaService.SearchMesesPagos(aluno.id);
      
      // 2. Filtrar TODOS_MESES para pegar apenas os NÃO pagos
      const mesesNaoPagos = TODOS_MESES.filter(mesCompleto => {
        const mesAbreviado = mesesUtils.paraAbreviado(mesCompleto);
        return !mesesPagosAbreviados.includes(mesAbreviado);
      });
      
      // 3. Atualizar estado com meses disponíveis
      setMesesDisponiveis(mesesNaoPagos);
      
    } catch (error) {
      console.error('Erro ao carregar meses disponíveis:', error);
      // Se der erro, mostra todos os meses
      setMesesDisponiveis(TODOS_MESES);
    }
  };

  carregarMesesDisponiveis();
}, [aluno?.id]);

  // Carregar dados do aluno
  useEffect(() => {
    const carregarAluno = async () => {
      if (!alunoId) return;
      
      try {
        setLoading(true);
        const alunoData = await alunosService.getStudentById(alunoId);
        
        if (alunoData) {
          // Normalizar turmas se for array
          const alunoNormalizado = {
            ...alunoData,
            turmas: Array.isArray(alunoData.turmas) ? (alunoData.turmas[0] ?? null) : (alunoData.turmas ?? null),
          } as Student;
          
          setAluno(alunoNormalizado);
          
          // Preencher valor padrão
          setDadosPagamento(prev => ({
            ...prev,
            valor: alunoNormalizado.propina?.toString() || ''
          }));
        }
      } catch (error) {
        console.error('❌ Erro ao carregar aluno:', error);
        alert('Erro ao carregar dados do aluno');
        navigate('/financeiro/pagamentos');
      } finally {
        setLoading(false);
      }
    };

    carregarAluno();
  }, [alunoId, navigate]);

  // Calcular valor total quando meses ou valor mensal mudar
 // Atualizar o useEffect que calcula os meses de referência
useEffect(() => {
  const valorMensal = parseFloat(dadosPagamento.valor) || aluno?.propina || 0;
  
  // Pegar apenas os primeiros X meses disponíveis
  const mesesSelecionados = mesesDisponiveis.slice(0, dadosPagamento.meses);
  const valorTotal = valorMensal * mesesSelecionados.length;
  
  setDadosPagamento(prev => ({
    ...prev,
    valorTotal,
    mesReferencia: mesesSelecionados,
    meses: mesesSelecionados.length // Ajusta automaticamente
  }));
}, [dadosPagamento.meses, aluno?.propina, mesesDisponiveis]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!aluno) return;

    try {
      setPagamentoLoading(true);
      
      // Processar pagamento em cash
      const resultado = await transacaoService.processarMensalidade(
        aluno.id, 
        dadosPagamento
      );

      if (resultado.sucesso) {
        setSucesso(true);
        setTimeout(() => {
          navigate('/financeiro/pagamentos');
        }, 2000);
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

  const handleMesesChange = (novosMeses: number) => {
    const meses = Math.max(1, Math.min(mesesDisponiveis.length, novosMeses));
    setDadosPagamento(prev => ({
      ...prev,
      meses
    }));
  };

  const formatarMoeda = (valor: number): string => {
    return new Intl.NumberFormat('pt-AO', { 
      style: 'currency', 
      currency: 'AOA' 
    }).format(valor);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!aluno) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900">Aluno não encontrado</h2>
          <button 
            onClick={() => navigate('/financeiro/pagamentos')}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Voltar para Pagamentos
          </button>
        </div>
      </div>
    );
  }

  if (sucesso) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg text-center max-w-md">
          <FiCheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Pagamento Registrado!</h2>
          <p className="text-gray-600 mb-6">
            O pagamento de {dadosPagamento.meses} mes(es) foi registrado com sucesso para {aluno.nome_completo}.
          </p>
          <div className="text-lg font-semibold text-green-600 mb-6">
            Total: {formatarMoeda(dadosPagamento.valorTotal)}
          </div>
          <button 
            onClick={() => navigate('/financeiro/pagamentos')}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Voltar para Pagamentos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen  p-6">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="mb-8">
          <button 
            onClick={() => navigate('/financeiro/pagamentos')}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 mb-6"
          >
            <FiArrowLeft size={20} />
            Voltar para Lista de Pagamentos
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Registrar Pagamento</h1>
              <p className="text-gray-600 mt-2">Registre o pagamento de propinas do estudante</p>
            </div>
            
            <div className="text-sm text-gray-500">
              {aluno.pagamento_em_dia ? (
                <span className="flex items-center gap-1 text-green-600">
                  <FiCheckCircle size={16} />
                  Status: Em dia
                </span>
              ) : (
                <span className="flex items-center gap-1 text-orange-600">
                  <FiCalendar size={16} />
                  Status: Pendente
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Coluna 1: Informações do Aluno */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Card Informações do Estudante */}
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações do Estudante</h3>
              
              <div className="flex items-center gap-3 mb-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <FiUser className="text-blue-600 text-xl" />
                </div>
                <div>
                  <div className="font-medium text-gray-900 text-lg">{aluno.nome_completo}</div>
                  <div className="text-sm text-gray-500">
                    #{aluno.numero_estudante}
                  </div>
                </div>
              </div>
              
              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Turma:</span>
                  <div className="text-gray-900">{aluno.turmas?.nome_turma || 'Não definida'}</div>
                </div>
                
                <div>
                  <span className="font-medium text-gray-700">Professor:</span>
                  <div className="text-gray-900">{aluno.turmas?.professor || 'Não definido'}</div>
                </div>
                
                <div>
                  <span className="font-medium text-gray-700">Propina Mensal:</span>
                  <div className="text-green-600 font-semibold">
                    {formatarMoeda(aluno.propina || 0)}
                  </div>
                </div>
              </div>
            </div>

            {/* Card Método de Pagamento */}
            <div className="bg-green-50 rounded-lg border border-green-200 p-6">
              <div className="flex items-center gap-3 mb-3">
                <FiDollarSign className="text-green-600 text-xl" />
                <h3 className="font-semibold text-green-900">Pagamento em Cash</h3>
              </div>
              <p className="text-green-700 text-sm">
                O valor será registrado como recebido em dinheiro. 
                Certifique-se de ter recebido o valor antes de confirmar.
              </p>
            </div>
                  {mesesDisponiveis.length === 0 && (
                    <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mb-4">
                      <div className="flex items-center gap-2 text-yellow-700">
                        <FiInfo className="text-yellow-600" />
                        <span className="font-medium">Todos os meses já foram pagos</span>
                      </div>
                      <p className="text-sm text-yellow-600 mt-1">
                        Este aluno já quitou todos os meses do ano. 
                        {aluno.pagamento_em_dia ? ' Está em dia!' : ' Verifique se há meses pendentes.'}
                      </p>
                    </div>
                  )}

                  {mesesDisponiveis.length > 0 && mesesDisponiveis.length < 12 && (
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-4">
                      <p className="text-sm text-blue-600">
                        <strong>Meses disponíveis:</strong> {mesesDisponiveis.length} de 12
                      </p>
                    </div>
                  )}
          </div>

          {/* Coluna 2: Formulário de Pagamento */}
          <div className="lg:col-span-2">
            
            <div className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* No seu JSX - adicione esta seção */}

                {/* Seleção de Meses */}
                <div>
                  <label className="block text-lg font-semibold text-gray-900 mb-4">
                    <FiCalendar className="inline mr-2 mb-1" />
                    Quantidade de Meses a Pagar
                  </label>
                  
                  <div className="flex items-center justify-center gap-6 mb-4">
                    <button
                      type="button"
                      onClick={() => handleMesesChange(dadosPagamento.meses - 1)}
                      disabled={dadosPagamento.meses <= 1}
                      className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors text-2xl font-bold"
                    >
                      -
                    </button>
                    
                    <div className="text-center">
                      <div className="text-5xl font-bold text-blue-600">{dadosPagamento.meses}</div>
                      <div className="text-lg text-gray-500 mt-2">
                        mês{dadosPagamento.meses > 1 ? 'es' : ''}
                      </div>
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => handleMesesChange(dadosPagamento.meses + 1)}
                      disabled={dadosPagamento.meses >= 12}
                      className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-200 transition-colors text-2xl font-bold"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Valor por Mês */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor por Mês (AOA)
                  </label>
                  <input
                    type="number"
                    value={dadosPagamento.valor}
                    onChange={(e) => setDadosPagamento(prev => ({ 
                      ...prev, 
                      valor: e.target.value 
                    }))}
                    placeholder="0.00"
                    className="w-full p-3 text-lg border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    step="0.01"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Valor sugerido: {formatarMoeda(aluno.propina || 0)}
                  </p>
                </div>

                {/* Resumo do Pagamento */}
                <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 text-lg mb-4">Resumo do Pagamento</h4>
                  
                  <div className="space-y-3 text-base">
                    <div className="flex justify-between">
                      <span className="text-blue-700">Valor por mês:</span>
                      <span className="font-medium">{formatarMoeda(parseFloat(dadosPagamento.valor) || 0)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-blue-700">Meses selecionados:</span>
                      <span className="font-medium">{dadosPagamento.meses}</span>
                    </div>
                    
                    <div className="flex justify-between text-xl font-bold border-t border-blue-200 pt-3 mt-3">
                      <span className="text-blue-900">Total a Pagar:</span>
                      <span className="text-green-600 text-2xl">{formatarMoeda(dadosPagamento.valorTotal)}</span>
                    </div>
                  </div>

                  {/* Meses de Referência */}
                  {dadosPagamento.mesReferencia.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-blue-200">
                      <div className="text-sm text-blue-700 font-medium mb-2">Meses cobertos:</div>
                      <div className="flex flex-wrap gap-2">
                        {dadosPagamento.mesReferencia.map((mes, index) => (
                          <span 
                            key={index}
                            className="px-3 py-2 bg-white text-blue-800 text-sm rounded-lg border border-blue-300 font-medium"
                          >
                            {mes}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Botões */}
                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => navigate('/pagamentos')}
                    className="flex-1 px-6 py-3 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                    disabled={pagamentoLoading}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={pagamentoLoading || !dadosPagamento.valor || parseFloat(dadosPagamento.valor) <= 0}
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors font-medium text-lg"
                  >
                    {pagamentoLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                        Processando...
                      </>
                    ) : (
                      <>
                        <FiDollarSign size={20} />
                        Confirmar Pagamento
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegistroPagamentoPage;