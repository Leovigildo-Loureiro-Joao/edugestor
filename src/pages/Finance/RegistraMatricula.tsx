// pages/financeiro/CompletarMatricula.tsx
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiUser, FiDollarSign, FiCheckCircle, FiCalendar, FiCreditCard } from 'react-icons/fi';
import { alunosService } from '../../services/database/alunosService.ts';
import { transacaoService } from '../../services/database/transacaoService.ts';
import { Student } from '../../types/aluno.ts';
import { instituicaoService } from '../../services/database/insitituicao.ts';
import { SeletorMeses } from '../../components/ui/SelectMonth.tsx';

export const CompletarMatricula = () => {
    const { alunoId } = useParams();
    const navigate = useNavigate();
    
    const [aluno, setAluno] = useState<Student | null>(null);
    const [loading, setLoading] = useState(true);
    const [processando, setProcessando] = useState(false);
    const [sucesso, setSucesso] = useState(false);
    const [configInstituicao, setConfigInstituicao] = useState<any>(null);
    
    const [dadosMatricula, setDadosMatricula] = useState({
        valorMatricula: '0',
        incluirCartao: false,
        valorCartao: '0',
        incluirPropina: false,
        mesesPropina: [] as string[],
        valorPropina: '0',
        observacao: 'Taxa de matrícula inicial',

    });

    // Meses disponíveis para pagamento
    const opcoesMeses = [
        { value: 1, label: '1 Mês' },
        { value: 2, label: '2 Meses' },
        { value: 3, label: '3 Meses' },
        { value: 6, label: '6 Meses' },
        { value: 12, label: '1 Ano (12 Meses)' }
    ];

    useEffect(() => {
        if (alunoId) {
            carregarDados();
        }
    }, [alunoId]);

    const carregarDados = async () => {
        try {
            setLoading(true);
            
            const [alunoData, configData] = await Promise.all([
                alunosService.getStudentById(alunoId!),
                instituicaoService.getConfig()
            ]);
            
            setAluno(alunoData||null);
            setConfigInstituicao(configData);
            
            // Preencher valores padrão
            setDadosMatricula(prev => ({
                ...prev,
                valorMatricula: configData?.valor_matricula?.toString() || '5000',
                valorCartao: configData?.valor_cartao?.toString() || '1000',
                valorPropina: alunoData?.propina?.toString() || '0',
                incluirCartao: alunoData?.cartao_pago || false
            }));
            
        } catch (error) {
            console.error('Erro ao carregar dados:', error);
            alert('Erro ao carregar dados do aluno');
        } finally {
            setLoading(false);
        }
    };

    const calcularTotal = (): number => {
        const matricula = parseFloat(dadosMatricula.valorMatricula) || 0;
        const cartao = dadosMatricula.incluirCartao ? (parseFloat(dadosMatricula.valorCartao) || 0) : 0;
        const propina = dadosMatricula.incluirPropina ? 
            ((parseFloat(dadosMatricula.valorPropina) || 0) * dadosMatricula.mesesPropina.length) : 0;
        
        return matricula + cartao + propina;
    };

    const calcularTotalPropina = (): number => {
        if (!dadosMatricula.incluirPropina) return 0;
        return (parseFloat(dadosMatricula.valorPropina) || 0) * dadosMatricula.mesesPropina.length;
    };

    const handleRegistrarMatricula = async () => {
        if (!aluno || !configInstituicao) return;

        try {
            setProcessando(true);
            
            const transacoes = [];

            // 1. Processar matrícula
            const resultadoMatricula = await transacaoService.processarPagamento({
                categoria: "matricula",
                data: new Date().toISOString(),
                descricao: `Pagamento de matrícula - ${aluno.nome_completo}`,
                tipo: "entrada",
                valor: parseFloat(dadosMatricula.valorMatricula)
            });

            if (!resultadoMatricula.sucesso) {
                throw new Error(resultadoMatricula.mensagem);
            }
            transacoes.push('Matrícula');

            // 2. Processar cartão se selecionado
            if (dadosMatricula.incluirCartao && parseFloat(dadosMatricula.valorCartao) > 0) {
                const resultadoCartao = await transacaoService.processarPagamento({
                    categoria: "cartão",
                    data: new Date().toISOString(),
                    descricao: `Pagamento de cartão estudante - ${aluno.nome_completo}`,
                    tipo: "entrada",
                    valor: parseFloat(dadosMatricula.valorCartao)
                });

                if (!resultadoCartao.sucesso) {
                    // Atualizar status do cartão no aluno
                    await alunosService.updateStudent(aluno.id,{
                        cartao_pago: true
                    });
                    transacoes.push('Cartão');
                }
            }

            // 3. Processar propina se selecionado
            if (dadosMatricula.incluirPropina && parseFloat(dadosMatricula.valorPropina) > 0) {
                const totalPropina = calcularTotalPropina();
                
                const resultadoPropina = await transacaoService.processarMensalidade(
                    aluno.id,
                    {
                        valor: dadosMatricula.valorPropina,
                        metodo: 'cash',
                        meses: dadosMatricula.mesesPropina.length,
                        mesReferencia:dadosMatricula.mesesPropina,
                        descricao: `Propina - ${dadosMatricula.mesesPropina} ${dadosMatricula.mesesPropina.length > 1 ? 'meses' : 'mês'}`
                    }
                );

                if (resultadoPropina.sucesso) {
                    transacoes.push(`Propina (${dadosMatricula.mesesPropina} ${dadosMatricula.mesesPropina.length > 1 ? 'meses' : 'mês'})`);
                } else {
                    throw new Error(resultadoPropina.mensagem);
                }
            }

            // 4. Atualizar status da matrícula do aluno
            await alunosService.updateStudent(aluno.id, {
                estado: 'ativo'
            });
            
            setSucesso(true);
            
        } catch (error: any) {
            console.error('Erro ao registrar matrícula:', error);
            alert('Erro ao registrar matrícula: ' + error.message);
        } finally {
            setProcessando(false);
        }
    };

    const obterNomeMesAtual = () => {
        const mesAtual = new Date().getMonth();
        const nomesMeses = [
            'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
            'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        return nomesMeses[mesAtual];
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
                <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
                    <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                    <p className="text-center mt-4 text-gray-600">Carregando dados do aluno...</p>
                </div>
            </div>
        );
    }

    if (!aluno) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center">
                    <h2 className="text-2xl font-bold text-gray-900 mb-4">Aluno não encontrado</h2>
                    <button 
                        onClick={() => navigate('/alunos')}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Voltar para Alunos
                    </button>
                </div>
            </div>
        );
    }

    if (sucesso) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-lg p-8 max-w-md w-full text-center">
                    <FiCheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Matrícula Concluída!</h2>
                    <p className="text-gray-600 mb-4">
                        Aluno matriculado com sucesso no sistema.
                    </p>
                    <div className="bg-green-50 rounded-lg p-4 mb-6">
                        <div className="text-lg font-semibold text-green-600">
                            Total Registrado: {formatarMoeda(calcularTotal())}
                        </div>
                        <p className="text-sm text-green-700 mt-2">
                            {aluno.nome_completo} está agora ativo
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => navigate('/alunos')}
                            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                        >
                            Ver Alunos
                        </button>
                        <button 
                            onClick={() => navigate('/financeiro')}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Ir para Financeiro
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate('/alunos')}
                        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
                    >
                        <FiArrowLeft size={20} />
                        Voltar para Alunos
                    </button>
                    
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Completar Matrícula</h1>
                            <p className="text-gray-600 mt-2">
                                Registre os pagamentos iniciais para ativar o aluno no sistema
                            </p>
                        </div>
                        
                        <div className="text-right">
                            <div className="text-sm text-gray-500">Nº do Estudante</div>
                            <div className="text-xl font-bold text-blue-600">#{aluno.numero_estudante}</div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    
                    {/* Informações do Aluno */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
                            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <FiUser className="text-blue-600" />
                                Dados do Aluno
                            </h3>
                            
                            <div className="space-y-3">
                                <div>
                                    <div className="text-sm text-gray-500">Nome Completo</div>
                                    <div className="font-medium text-gray-900">{aluno.nome_completo}</div>
                                </div>
                                
                                <div>
                                    <div className="text-sm text-gray-500">Turma</div>
                                    <div className="font-medium text-gray-900">
                                        {aluno.turma_nome || 'Não definida'}
                                    </div>
                                </div>
                                
                                <div>
                                    <div className="text-sm text-gray-500">Classe</div>
                                    <div className="font-medium text-gray-900">{aluno.classe_escolar}</div>
                                </div>
                                
                                <div>
                                    <div className="text-sm text-gray-500">Data de Matrícula</div>
                                    <div className="font-medium text-gray-900">
                                        {new Date(aluno.data_matricula).toLocaleDateString('pt-AO')}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                            <div className="flex items-center gap-2 text-green-700 mb-2">
                                <FiCheckCircle className="text-green-600" />
                                <span className="font-semibold">Status</span>
                            </div>
                            <p className="text-sm text-green-700">
                                Complete os pagamentos para ativar o aluno no sistema.
                            </p>
                        </div>
                    </div>

                    {/* Formulário de Pagamentos */}
                    <div className="lg:col-span-3">
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                            <div className="p-6 border-b border-gray-200">
                                <h2 className="text-xl font-bold text-gray-900">Pagamentos Iniciais</h2>
                                <p className="text-gray-600 mt-1">Selecione os pagamentos que deseja registrar</p>
                            </div>

                            <div className="p-6 space-y-6">
                                
                                {/* Taxa de Matrícula */}
                                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                        <FiDollarSign className="text-blue-600" />
                                        Taxa de Matrícula
                                    </h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Valor (AOA)
                                            </label>
                                            <input
                                                type="number"
                                                value={dadosMatricula.valorMatricula}
                                                onChange={(e) => setDadosMatricula(prev => ({ 
                                                    ...prev, 
                                                    valorMatricula: e.target.value 
                                                }))}
                                                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                                min="0"
                                                step="0.01"
                                            />
                                        </div>
                                        <div className="flex items-end">
                                            <p className="text-sm text-gray-600">
                                                <span className="font-medium">Sugerido:</span><br />
                                                {formatarMoeda(configInstituicao?.valor_matricula || 5000)}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Cartão de Estudante */}
                                <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                            <FiCreditCard className="text-purple-600" />
                                            Cartão de Estudante
                                        </h4>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={dadosMatricula.incluirCartao}
                                                onChange={(e) => setDadosMatricula(prev => ({ 
                                                    ...prev, 
                                                    incluirCartao: e.target.checked 
                                                }))}
                                                className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                                            />
                                            <span className="text-sm font-medium text-gray-700">Incluir cartão</span>
                                        </label>
                                    </div>
                                    
                                    {dadosMatricula.incluirCartao && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Valor do Cartão (AOA)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={dadosMatricula.valorCartao}
                                                    onChange={(e) => setDadosMatricula(prev => ({ 
                                                        ...prev, 
                                                        valorCartao: e.target.value 
                                                    }))}
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                                    min="0"
                                                    step="0.01"
                                                />
                                            </div>
                                            <div className="flex items-end">
                                                <p className="text-sm text-gray-600">
                                                    <span className="font-medium">Padrão:</span><br />
                                                    {formatarMoeda(configInstituicao?.valor_cartao || 1000)}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Propina */}
                                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                                            <FiCalendar className="text-green-600" />
                                            Propina
                                        </h4>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={dadosMatricula.incluirPropina}
                                                onChange={(e) => setDadosMatricula(prev => ({ 
                                                    ...prev, 
                                                    incluirPropina: e.target.checked,
                                                    mesesPropina: e.target.checked ? [obterNomeMesAtual()] : [] // ✅ Agora é string
                                                }))}
                                                className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                                            />
                                            <span className="text-sm font-medium text-gray-700">Incluir propina</span>
                                        </label>
                                    </div>
                                    
                                    {dadosMatricula.incluirPropina && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Valor Mensal (AOA)
                                                </label>
                                                <input
                                                    type="number"
                                                    value={dadosMatricula.valorPropina}
                                                    onChange={(e) => setDadosMatricula(prev => ({ 
                                                        ...prev, 
                                                        valorPropina: e.target.value 
                                                    }))}
                                                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                                    min="0"
                                                    step="0.01"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Meses a Pagar
                                                </label>
                                                <SeletorMeses
                                                    value={dadosMatricula.mesesPropina}
                                                    onChange={(meses) => setDadosMatricula(prev => ({ 
                                                        ...prev, 
                                                        mesesPropina: meses 
                                                    }))}
                                                    anoLetivo={new Date().getFullYear()}
                                                />
                                                {dadosMatricula.mesesPropina.length > 0 && (
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        {dadosMatricula.mesesPropina.length} {dadosMatricula.mesesPropina.length === 1 ? 'mês selecionado' : 'meses selecionados'}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    
                                    {dadosMatricula.incluirPropina && dadosMatricula.mesesPropina.length > 0 && (
                                        <div className="mt-3 p-3 bg-white rounded border border-green-200">
                                            <div className="flex justify-between items-center">
                                                <span className="text-sm text-gray-600">
                                                    {dadosMatricula.mesesPropina.length} {dadosMatricula.mesesPropina.length === 1 ? 'mês' : 'meses'} × {formatarMoeda(parseFloat(dadosMatricula.valorPropina))}
                                                </span>
                                                <span className="font-semibold text-green-600">
                                                    {formatarMoeda(calcularTotalPropina())}
                                                </span>
                                            </div>
                                            {dadosMatricula.mesesPropina.length > 0 && (
                                                <div className="mt-2 text-xs text-gray-500">
                                                    Meses: {dadosMatricula.mesesPropina.map(num => 
                                                       num
                                                    ).join(', ')}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Observações */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Observações
                                    </label>
                                    <textarea
                                        value={dadosMatricula.observacao}
                                        onChange={(e) => setDadosMatricula(prev => ({ 
                                            ...prev, 
                                            observacao: e.target.value 
                                        }))}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                        rows={3}
                                        placeholder="Observações sobre estes pagamentos..."
                                    />
                                </div>

                                {/* Resumo Final */}
                                <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
                                    <h4 className="font-semibold text-gray-900 mb-4 text-lg">Resumo Final</h4>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Taxa de Matrícula:</span>
                                            <span className="font-medium">{formatarMoeda(parseFloat(dadosMatricula.valorMatricula))}</span>
                                        </div>
                                        
                                        {dadosMatricula.incluirCartao && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Cartão de Estudante:</span>
                                                <span className="font-medium">{formatarMoeda(parseFloat(dadosMatricula.valorCartao))}</span>
                                            </div>
                                        )}
                                        
                                        {dadosMatricula.incluirPropina && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">
                                                    Propina ({dadosMatricula.mesesPropina} {dadosMatricula.mesesPropina.length > 1 ? 'meses' : 'mês'}):
                                                </span>
                                                <span className="font-medium">{formatarMoeda(calcularTotalPropina())}</span>
                                            </div>
                                        )}
                                        
                                        <div className="flex justify-between border-t border-gray-300 pt-3">
                                            <span className="text-gray-800 font-bold text-lg">Total a Pagar:</span>
                                            <span className="text-green-600 font-bold text-xl">
                                                {formatarMoeda(calcularTotal())}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Botões de Ação */}
                                <div className="flex gap-4 pt-6">
                                   
                                    
                                    <button
                                        onClick={handleRegistrarMatricula}
                                        disabled={processando || calcularTotal() <= 0}
                                        className="flex-1 px-6 py-4 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transition-colors font-medium text-lg"
                                    >
                                        {processando ? (
                                            <>
                                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                                                Processando Pagamentos...
                                            </>
                                        ) : (
                                            <>
                                                <FiDollarSign size={20} />
                                                Registrar Pagamentos ({formatarMoeda(calcularTotal())})
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};