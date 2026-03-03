// components/financeiro/ModalMatricula.tsx
import { useState, useEffect } from 'react';
import { FiX, FiUser, FiDollarSign, FiCheckCircle, FiCalendar, FiCreditCard } from 'react-icons/fi';
import { alunosService } from '../../services/database/alunosService';
import { transacaoService } from '../../services/database/transacaoService';
import { Student } from '../../types/aluno';
import { instituicaoService } from '../../services/database/insitituicao';
import { useAlert } from '../ui/AlertBadge';
import toast from 'react-hot-toast';
import { motion, MotionConfig } from 'framer-motion';

interface ModalMatriculaProps {
    alunoId: string;
    onConcluido: () => void;
    onCancelado: () => void;
    onPular: () => void;
}

export const ModalMatricula = ({ alunoId, onConcluido, onCancelado, onPular }: ModalMatriculaProps) => {
    const [aluno, setAluno] = useState<Student | null>(null);
    const [loading, setLoading] = useState(false);
    const [processando, setProcessando] = useState(false);
    const [sucesso, setSucesso] = useState(false);
    const [configInstituicao, setConfigInstituicao] = useState<any>(null);
    const { showAlert } = useAlert(); 
    const [dadosMatricula, setDadosMatricula] = useState({
        valorMatricula: '0',
        incluirCartao: false,
        valorCartao: '0',
        incluirPropina: false,
        valorPropina: '0',
        observacao: 'Taxa de matrícula inicial'
    });

    useEffect(() => {
        carregarDados();
    }, [alunoId]);

    const carregarDados = async () => {
        try {
            setLoading(true);
            
            // Carregar aluno e configurações em paralelo
            const [alunoData, configData] = await Promise.all([
                alunosService.getStudentById(alunoId),
                instituicaoService.getConfig()
            ]);
            
            setAluno(alunoData || null);
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
        } finally {
            setLoading(false);
        }
    };

    const calcularTotal = () => {
        const matricula:number = parseFloat(dadosMatricula.valorMatricula) || 0;
        const cartao:number = dadosMatricula.incluirCartao ? (parseFloat(dadosMatricula.valorCartao) || 0) : 0;
        const propina = dadosMatricula.incluirPropina ? (parseFloat(dadosMatricula.valorPropina) || 0) : 0;
        
        return matricula + cartao + propina;
    };

    const handleRegistrarMatricula = async () => {
        if (!aluno || !configInstituicao) return;

        try {
            setProcessando(true);
            
            const transacoes = [];
            // 1. Processar matrícula
            const resultadoMatricula = await transacaoService.processarPagamento(
                {
                   categoria:"matricula",
                   data:new Date().toISOString(),
                   descricao:"Pagamento de matricula do aluno "+aluno.nome_completo,
                   tipo:"entrada",
                   valor:parseFloat(dadosMatricula.valorMatricula)
                }
            );

            if (!resultadoMatricula.sucesso) {
                throw new Error(resultadoMatricula.mensagem);
            }
            transacoes.push('Matrícula');

            // 2. Processar cartão se selecionado
            if (dadosMatricula.incluirCartao && parseFloat(dadosMatricula.valorCartao) > 0) {
                const resultadoCartao = await transacaoService.processarPagamento(
                    {
                       categoria:"cartão",
                        data:new Date().toISOString(),
                        descricao:"Pagamento de cartão do aluno "+aluno.nome_completo,
                        tipo:"entrada",
                        valor:parseFloat(dadosMatricula.valorCartao)
                    }
                );

                if (resultadoCartao.sucesso) {
                    // Atualizar status do cartão no aluno
                    await alunosService.updateStudent(aluno.id, {
                        ...aluno,
                        cartao_pago: true
                    });
                    transacoes.push('Cartão');
                }
            }

            // 3. Processar propina se selecionado
            if (dadosMatricula.incluirPropina && parseFloat(dadosMatricula.valorPropina) > 0) {
                const resultadoPropina = await transacaoService.processarMensalidade(
                    aluno.id,
                    {
                        valor: parseFloat(dadosMatricula.valorPropina).toString(),
                        metodo: 'cash',
                        meses: 1,
                        descricao: 'Propina do mês atual'
                    }
                );

                if (resultadoPropina.sucesso) {
                    transacoes.push('Propina');
                }
            }

            // 4. Atualizar status da matrícula do aluno
            await alunosService.updateStudent(aluno.id, {
                estado:'ativo'
            });
            
            setSucesso(true);
            
            // Aguardar para mostrar mensagem de sucesso
            onConcluido();
            showAlert({
                type: 'success',
                title: 'Matricula realizada',
                message: 'Parabens o registro foi realizado com sucesso',
                duration: 3000
            });
           

        } catch (error: any) {
            console.error('Erro ao registrar matrícula:', error);
            toast.error('Erro ao registrar matrícula' + error.message);
            showAlert({
                type: 'error',
                title: 'Erro ao registrar matrícula',
                message: 'Verifique suas permissões de utilizador',
                duration: 5000
            });
            
        } finally {
            setProcessando(false);
        }
    };

    const formatarMoeda = (valor: number): string => {
        return new Intl.NumberFormat('pt-AO', { 
            style: 'currency', 
            currency: 'AOA' 
        }).format(valor);
    };

    if (loading) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-8 w-full max-w-none sm:max-w-6xl h-[90vh] sm:h-auto sm:max-h-[90vh]">
                    <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                    <p className="text-center mt-4 text-gray-600 dark:text-gray-400">Carregando dados...</p>
                </div>
            </div>
        );
    }

    if (sucesso) {
        return (
            <motion.div className="fixed inset-0 shadow-xl bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-8 w-full max-w-none sm:max-w-6xl h-[90vh] sm:h-auto sm:max-h-[90vh] text-center">
                    <FiCheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Matrícula Concluída!</h2>
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Todas as transações foram registradas com sucesso.
                    </p>
                    <div className="bg-green-50 rounded-lg p-4 mb-6">
                        <div className="text-lg font-semibold text-green-600">
                            Total: {formatarMoeda(calcularTotal())}
                        </div>
                        <p className="text-sm text-green-700 mt-2">
                            Aluno ativo no sistema
                        </p>
                    </div>
                    <button 
                        onClick={onConcluido}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Continuar
                    </button>
                </div>
            </motion.div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-none sm:max-w-6xl h-[90vh] sm:h-auto sm:max-h-[90vh] overflow-y-auto">
                
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
                    <div>
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Completar Matrícula</h2>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">Registre os pagamentos iniciais do aluno</p>
                    </div>
                    <button
                        onClick={onCancelado}
                        className="text-gray-400 hover:text-gray-600 dark:text-gray-400 transition-colors"
                    >
                        <FiX size={24} />
                    </button>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        
                        {/* Informações do Aluno */}
                        <div className="lg:col-span-1 space-y-4">
                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                                <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                                    <FiUser className="text-blue-600" />
                                    Novo Aluno
                                </h3>
                                
                                {aluno && (
                                    <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-blue-700 font-medium">Nome:</span>
                                            <span className="text-blue-900">{aluno.nome_completo}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-blue-700 font-medium">Nº Estudante:</span>
                                            <span className="text-blue-900">#{aluno.numero_estudante}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-blue-700 font-medium">Turma:</span>
                                            <span className="text-blue-900">{aluno.turma_nome || 'Não definida'}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-blue-700 font-medium">Classe:</span>
                                            <span className="text-blue-900">{aluno.classe_escolar}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                                <div className="flex items-center gap-2 text-green-700 mb-2">
                                    <FiCheckCircle className="text-green-600" />
                                    <span className="font-semibold">Próximos Passos</span>
                                </div>
                                <p className="text-sm text-green-700">
                                    Complete os pagamentos para ativar o aluno no sistema.
                                </p>
                            </div>
                        </div>

                        {/* Formulário de Pagamentos */}
                        <div className="lg:col-span-2 space-y-6">
                            
                            {/* Taxa de Matrícula */}
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                                    <FiDollarSign className="text-blue-600" />
                                    Taxa de Matrícula
                                </h4>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={dadosMatricula.valorMatricula}
                                        onChange={(e) => setDadosMatricula(prev => ({ 
                                            ...prev, 
                                            valorMatricula: e.target.value 
                                        }))}
                                        className="w-full pl-4 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        min="0"
                                        step="0.01"
                                    />
                                </div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Valor sugerido: {formatarMoeda(configInstituicao?.valor_matricula || 5000)}
                                </p>
                            </div>

                            {/* Cartão de Estudante */}
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
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
                                        <span className="text-sm text-gray-700 dark:text-gray-300">Incluir cartão</span>
                                    </label>
                                </div>
                                
                                {dadosMatricula.incluirCartao && (
                                    <div className="mt-3">
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={dadosMatricula.valorCartao}
                                                onChange={(e) => setDadosMatricula(prev => ({ 
                                                    ...prev, 
                                                    valorCartao: e.target.value 
                                                }))}
                                                className="w-full pl-4 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                                min="0"
                                                step="0.01"
                                                placeholder="Valor do cartão"
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            Valor padrão: {formatarMoeda(configInstituicao?.valor_cartao || 1000)}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Propina */}
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                        <FiCalendar className="text-green-600" />
                                        Propina do Mês
                                    </h4>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={dadosMatricula.incluirPropina}
                                            onChange={(e) => setDadosMatricula(prev => ({ 
                                                ...prev, 
                                                incluirPropina: e.target.checked 
                                            }))}
                                            className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
                                        />
                                        <span className="text-sm text-gray-700 dark:text-gray-300">Incluir propina</span>
                                    </label>
                                </div>
                                
                                {dadosMatricula.incluirPropina && (
                                    <div className="mt-3">
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={dadosMatricula.valorPropina}
                                                onChange={(e) => setDadosMatricula(prev => ({ 
                                                    ...prev, 
                                                    valorPropina: e.target.value 
                                                }))}
                                                className="w-full pl-4 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                                                min="0"
                                                step="0.01"
                                                placeholder="Valor da propina"
                                            />
                                        </div>
                                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                            Valor cadastrado: {formatarMoeda(aluno?.propina || 0)}
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Observações */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Observações
                                </label>
                                <textarea
                                    value={dadosMatricula.observacao}
                                    onChange={(e) => setDadosMatricula(prev => ({ 
                                        ...prev, 
                                        observacao: e.target.value 
                                    }))}
                                    className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                    rows={2}
                                    placeholder="Observações sobre estes pagamentos..."
                                />
                            </div>

                            {/* Resumo */}
                            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Resumo dos Pagamentos</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600 dark:text-gray-400">Taxa de Matrícula:</span>
                                        <span className="font-medium">{formatarMoeda(parseFloat(dadosMatricula.valorMatricula))}</span>
                                    </div>
                                    
                                    {dadosMatricula.incluirCartao && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Cartão de Estudante:</span>
                                            <span className="font-medium">{formatarMoeda(parseFloat(dadosMatricula.valorCartao))}</span>
                                        </div>
                                    )}
                                    
                                    {dadosMatricula.incluirPropina && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Propina:</span>
                                            <span className="font-medium">{formatarMoeda(parseFloat(dadosMatricula.valorPropina))}</span>
                                        </div>
                                    )}
                                    
                                    <div className="flex justify-between border-t border-gray-200 dark:border-gray-700 pt-2">
                                        <span className="text-gray-800 dark:text-gray-100 font-semibold">Total a Pagar:</span>
                                        <span className="text-green-600 font-bold text-lg">
                                            {formatarMoeda(calcularTotal())}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Botões de Ação */}
                    <div className="flex gap-3 mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                        <button
                            onClick={onPular}
                            className="flex-1 px-4 py-3 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:bg-gray-900 transition-colors font-medium"
                            disabled={processando}
                        >
                            Pular Pagamentos
                        </button>
                        
                        <button
                            onClick={handleRegistrarMatricula}
                            disabled={processando || calcularTotal() <= 0}
                            className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors font-medium"
                        >
                            {processando ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    Processando...
                                </>
                            ) : (
                                <>
                                    <FiDollarSign size={18} />
                                    Registrar Pagamentos ({formatarMoeda(calcularTotal())})
                                </>
                            )}
                        </button>
                    </div>

                    <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-4">
                        Você pode registrar os pagamentos individualmente mais tarde na página de finanças.
                    </p>
                </div>
            </div>
        </div>
    );
};
