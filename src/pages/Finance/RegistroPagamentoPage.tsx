import { useEffect, useState } from 'react';
import { FiUser, FiDollarSign, FiCalendar, FiArrowLeft, FiCheckCircle, FiInfo } from 'react-icons/fi';
import { useNavigate, useParams } from 'react-router-dom';
import { Student } from '../../types/aluno';
import { DadosPagamentoCash } from '../../types/transacao';
import { alunosService } from '../../services/database/alunosService';
import { transacaoService } from '../../services/database/transacaoService';
import { propinaService } from '../../services/database/propinas';
import { cursosService, turmaService } from '../../services/database';
import { configService } from '../../services/database/config';
import { financeRulesService } from '../../services/finance/financeRulesService';
import { useConfirmModal } from '../../components/ui/ComfirmModal';
import { useAlert } from '../../components/ui/AlertBadge';
import { PageLoader } from '../../components/ui/PageLoader';
import { useSmartBack } from '../../hooks/useSmartBack';
import { SeletorMeses } from '../../components/ui/SelectMonth';

const DEFAULT_PAYMENT_MONTHS = [
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto'
];

export const RegistroPagamentoPage: React.FC = () => {
  const { alunoId } = useParams<{ alunoId: string }>();
  const navigate = useNavigate();
  const goBack = useSmartBack();
  const { ModalComponent } = useConfirmModal();
  const { showAlert } = useAlert();
  const [aluno, setAluno] = useState<Student | null>(null);
  const [loading, setLoading] = useState(false);
  const [pagamentoLoading, setPagamentoLoading] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [mesesDisponiveis, setMesesDisponiveis] = useState<string[]>([]);

  const [dadosPagamento, setDadosPagamento] = useState<DadosPagamentoCash>({
    valor: '',
    meses: 1,
    valorTotal: 0,
    metodo: 'cash',
    mesReferencia: []
  });

  useEffect(() => {
    const carregarAluno = async () => {
      if (!alunoId) return;

      try {
        setLoading(true);
        const alunoData = await alunosService.getStudentById(alunoId);

        if (alunoData) {
          const alunoNormalizado = {
            ...alunoData,
            turmas: await turmaService.getTurmaById(alunoData.turma_id)
          } as Student;

          setAluno(alunoNormalizado);
          setDadosPagamento((prev) => ({
            ...prev,
            valor: alunoNormalizado.propina?.toString() || ''
          }));
        }
      } catch (error) {
        console.error('Erro ao carregar aluno:', error);
        showAlert({
          type: 'error',
          title: 'Erro ao carregar dados do aluno',
          message: 'Verifique os dados e tente novamente',
          duration: 5000
        });
        navigate('/financeiro/pagamentos');
      } finally {
        setLoading(false);
      }
    };

    carregarAluno();
  }, [alunoId, navigate, showAlert]);

  useEffect(() => {
    const carregarMesesDisponiveis = async () => {
      if (!aluno?.id) return;

      try {
        const [mesesPagos, turmas, cursos, paymentConfig] = await Promise.all([
          propinaService.SearchMesesPagos(aluno.id),
          turmaService.getTurmas(),
          cursosService.getCourses(),
          configService.getPaymentConfig()
        ]);

        const mesesBaseCompletos = paymentConfig.mesesPagamento?.length
          ? paymentConfig.mesesPagamento
          : DEFAULT_PAYMENT_MONTHS;
        const mesesBase = mesesBaseCompletos.map((mes) => financeRulesService.toMonthAbbr(mes));

        const planoCobranca = financeRulesService.getBillingMonthsForStudent(
          aluno,
          mesesBase,
          turmas || [],
          cursos || [],
          {
            includeFutureMonths: Boolean(paymentConfig.permitePagamentoAntecipado),
            paidMonths: mesesPagos
          }
        );

        const mesesNaoPagos = planoCobranca
          .filter((mes) => !mesesPagos.includes(financeRulesService.toMonthAbbr(mes)))
          .map(
            (mes) =>
              mesesBaseCompletos.find(
                (mesCompleto) =>
                  financeRulesService.toMonthAbbr(mesCompleto) === financeRulesService.toMonthAbbr(mes)
              ) || mes
          );

        setMesesDisponiveis(mesesNaoPagos);
        setDadosPagamento((prev) => {
          const selecaoValida = (prev.mesReferencia || []).filter((mes) => mesesNaoPagos.includes(mes));
          const proximaSelecao = selecaoValida.length > 0 ? selecaoValida : mesesNaoPagos.slice(0, 1);

          return {
            ...prev,
            mesReferencia: proximaSelecao,
            meses: proximaSelecao.length
          };
        });
      } catch (error) {
        console.error('Erro ao carregar meses disponíveis:', error);
        setMesesDisponiveis([]);
      }
    };

    carregarMesesDisponiveis();
  }, [aluno]);

  useEffect(() => {
    const valorMensal = parseFloat(dadosPagamento.valor) || aluno?.propina || 0;
    const mesesSelecionados = dadosPagamento.mesReferencia || [];
    const valorTotal = valorMensal * mesesSelecionados.length;

    setDadosPagamento((prev) => {
      if ((prev.valorTotal || 0) === valorTotal && prev.meses === mesesSelecionados.length) {
        return prev;
      }

      return {
        ...prev,
        valorTotal,
        meses: mesesSelecionados.length
      };
    });
  }, [dadosPagamento.mesReferencia, dadosPagamento.valor, aluno?.propina]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!aluno) return;
    if (!(dadosPagamento.mesReferencia || []).length) {
      showAlert({
        type: 'warning',
        title: 'Selecione os meses',
        message: 'Escolha pelo menos um mês de referência antes de confirmar.',
        duration: 4000
      });
      return;
    }

    try {
      setPagamentoLoading(true);

      const resultado = await transacaoService.processarMensalidade(aluno.id, dadosPagamento);

      if (resultado.sucesso) {
        setSucesso(true);
        setTimeout(() => {
          navigate('/financeiro/pagamentos');
        }, 2000);
      } else {
        throw new Error(resultado.mensagem);
      }
    } catch (error: any) {
      console.error('Erro ao registrar pagamento:', error);
      showAlert({
        type: 'error',
        title: 'Erro ao registrar pagamento',
        message: 'Verifique os dados e tente novamente',
        duration: 5000
      });
    } finally {
      setPagamentoLoading(false);
    }
  };

  const formatarMoeda = (valor: number): string => {
    return new Intl.NumberFormat('pt-AO', {
      style: 'currency',
      currency: 'AOA'
    }).format(valor);
  };

  if (loading) {
    return <PageLoader title="Carregando pagamento" subtitle="Buscando dados do aluno e propinas..." />;
  }

  if (!aluno) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Aluno não encontrado</h2>
          <button
            onClick={() => goBack('/financeiro/pagamentos')}
            className="mt-4 p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
            aria-label="Voltar"
          >
            <FiArrowLeft className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  if (sucesso) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg text-center max-w-md">
          <FiCheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Pagamento Registrado!</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            O pagamento de {dadosPagamento.meses} mes(es) foi registrado com sucesso para {aluno.nome_completo}.
          </p>
          <div className="text-lg font-semibold text-green-600 mb-6">
            Total: {formatarMoeda(dadosPagamento.valorTotal ?? 0)}
          </div>
          <button
            onClick={() => goBack('/financeiro/pagamentos')}
            className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
            aria-label="Voltar"
          >
            <FiArrowLeft className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-4xl mx-auto">
        <ModalComponent />

        <div className="mb-8">
          <button
            onClick={() => goBack('/financeiro/pagamentos')}
            className="p-2.5 mb-6 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all text-gray-600 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400"
            aria-label="Voltar"
          >
            <FiArrowLeft className="h-5 w-5" />
          </button>

          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Registrar Pagamento</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">Registre o pagamento de propinas do estudante</p>
            </div>

            <div className="text-sm text-gray-500 dark:text-gray-400">
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
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Informações do Estudante</h3>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <FiUser className="text-blue-600 text-xl" />
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white text-lg">{aluno.nome_completo}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">#{aluno.numero_estudante}</div>
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Turma:</span>
                  <div className="text-gray-900 dark:text-white">{aluno.turma_nome || 'Não definida'}</div>
                </div>

                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Professor:</span>
                  <div className="text-gray-900 dark:text-white">{aluno.professor || 'Não definido'}</div>
                </div>

                <div>
                  <span className="font-medium text-gray-700 dark:text-gray-300">Propina Mensal:</span>
                  <div className="text-green-600 font-semibold">{formatarMoeda(aluno.propina || 0)}</div>
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg border border-green-200 p-6">
              <div className="flex items-center gap-3 mb-3">
                <FiDollarSign className="text-green-600 text-xl" />
                <h3 className="font-semibold text-green-900">Pagamento em Cash</h3>
              </div>
              <p className="text-green-700 text-sm">
                O valor será registrado como recebido em dinheiro. Certifique-se de ter recebido o valor antes de confirmar.
              </p>
            </div>

            {mesesDisponiveis.length === 0 && (
              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mb-4">
                <div className="flex items-center gap-2 text-yellow-700">
                  <FiInfo className="text-yellow-600" />
                  <span className="font-medium">Todos os meses já foram pagos</span>
                </div>
                <p className="text-sm text-yellow-600 mt-1">
                  Este aluno já quitou todos os meses disponíveis para cobrança.
                  {aluno.pagamento_em_dia ? ' Está em dia!' : ' Verifique se há meses pendentes.'}
                </p>
              </div>
            )}

            {mesesDisponiveis.length > 0 && (
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mb-4">
                <p className="text-sm text-blue-600">
                  <strong>Meses disponíveis:</strong> {mesesDisponiveis.length}
                </p>
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 shadow-sm">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    <FiCalendar className="inline mr-2 mb-1" />
                    Meses a Pagar
                  </label>

                  <SeletorMeses
                    value={dadosPagamento.mesReferencia || []}
                    onChange={(meses) =>
                      setDadosPagamento((prev) => ({
                        ...prev,
                        mesReferencia: meses,
                        meses: meses.length
                      }))
                    }
                    availableMonths={mesesDisponiveis}
                  />

                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                    O admin pode escolher livremente o primeiro mês da cobrança, tal como na matrícula.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Valor por Mês (AOA)
                  </label>
                  <input
                    type="number"
                    value={dadosPagamento.valor}
                    onChange={(e) =>
                      setDadosPagamento((prev) => ({
                        ...prev,
                        valor: e.target.value
                      }))
                    }
                    placeholder="0.00"
                    className="w-full p-3 text-lg border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min="0"
                    step="0.01"
                  />
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Valor sugerido: {formatarMoeda(aluno.propina || 0)}
                  </p>
                </div>

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
                      <span className="text-green-600 text-2xl">{formatarMoeda(dadosPagamento.valorTotal ?? 0)}</span>
                    </div>
                  </div>

                  {(dadosPagamento.mesReferencia || []).length > 0 && (
                    <div className="mt-4 pt-4 border-t border-blue-200">
                      <div className="text-sm text-blue-700 font-medium mb-2">Meses cobertos:</div>
                      <div className="flex flex-wrap gap-2">
                        {dadosPagamento.mesReferencia?.map((mes, index) => (
                          <span
                            key={index}
                            className="px-3 py-2 bg-white dark:bg-gray-800 text-blue-800 text-sm rounded-lg border border-blue-300 font-medium"
                          >
                            {mes}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={() => goBack('/financeiro/pagamentos')}
                    className="flex-1 px-6 py-3 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:bg-gray-900 transition-colors font-medium"
                    disabled={pagamentoLoading}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={
                      pagamentoLoading ||
                      !dadosPagamento.valor ||
                      parseFloat(dadosPagamento.valor) <= 0 ||
                      !(dadosPagamento.mesReferencia || []).length
                    }
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
