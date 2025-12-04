import { useEffect, useState } from "react";
import { FiSave } from "react-icons/fi";
import { Instituicao } from "../../types";
import { instituicaoService } from "../../services/database/insitituicao";
import { Select } from "../ui/Select";

export const ConfiguracoesGerais = () => {
    const [salvando, setSalvando] = useState(false);
    const [salvoComSucesso, setSalvoComSucesso] = useState(false);
    const [instituicao, setInstituicao] = useState<Instituicao | null>(null);

    async function carregarDados() {
        const insti = await instituicaoService.getConfig();
        setInstituicao(insti);
    }
    
    useEffect(() => {
        carregarDados();
    }, []);
    
    // Debug para verificar os dados carregados
    useEffect(() => {
        console.log('Dados da instituição carregados:', instituicao);
    }, [instituicao]);

    async function handelConfigAcademy() {
        setSalvando(true);
        try {
            await instituicaoService.updateConfig(instituicao || {});
            setSalvoComSucesso(true);
            
            // Esconder o aviso após 3 segundos
            setTimeout(() => {
                setSalvoComSucesso(false);
            }, 3000);
        } catch (error) {
            console.error('Erro ao salvar configurações:', error);
        } finally {
            setSalvando(false);
        }
    }

    // Função segura para atualizar o estado
    const handleInputChange = (field: keyof Instituicao, value: string) => {
        setInstituicao(prev => ({
            ...(prev || {
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            } as Instituicao),
            [field]: value
        }));
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Informações da Escola
            </h2>
            
            {/* Aviso de salvamento */}
            {salvoComSucesso && (
                <div className="mb-4 p-3 bg-green-100 dark:bg-green-900 border border-green-400 dark:border-green-600 text-green-700 dark:text-green-300 rounded-lg">
                    Configurações salvas com sucesso!
                </div>
            )}

            <form className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Nome da Escola *
                        </label>
                        <input
                            type="text"
                            value={instituicao?.nome_escola || ''}
                            onChange={(e) => handleInputChange('nome_escola', e.target.value)}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="Ex: Escola Primária do Seu Irmão"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Telefone *
                        </label>
                        <input
                            type="tel"
                            value={instituicao?.numero_telefone || ''}
                            onChange={(e) => handleInputChange('numero_telefone', e.target.value)}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="+244 XXX XXX XXX"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Email
                        </label>
                        <input
                            type="email"
                            value={instituicao?.email || ''}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="escola@email.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            WhatsApp
                        </label>
                        <input
                            type="text"
                            value={instituicao?.whatsapp || ''}
                            onChange={(e) => handleInputChange('whatsapp', e.target.value)}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="Número do WhatsApp"
                        />
                    </div>

                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Endereço Completo
                        </label>
                        <textarea
                            value={instituicao?.endereco || ''}
                            onChange={(e) => handleInputChange('endereco', e.target.value)}
                            rows={3}
                            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            placeholder="Endereço completo da escola"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Ano Letivo
                        </label>
                        <Select
                            vect={Array.from({length: 5}, (_, i) => new Date().getFullYear() - 2 + i).map(ano => 
                                `${ano-1}-${ano}`
                            )}  
                            value={instituicao?.ano_lectivo || ''}         
                            onChange={(value: string) => handleInputChange('ano_lectivo', value)}
                        />
                    </div>
                </div>

               

                <div className="flex justify-end pt-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                        type="button"
                        onClick={handelConfigAcademy}
                        disabled={salvando}
                        className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <FiSave size={18} />
                        {salvando ? 'Salvando...' : 'Salvar Configurações'}
                    </button>
                </div>
            </form>
        </div>
    );
};