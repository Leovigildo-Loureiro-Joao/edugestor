import { motion } from "framer-motion";
import { useState } from "react";
import { FiSave } from "react-icons/fi";
import { useAlert } from "../ui/AlertBadge";

export const ConfiguracoesSeguranca = () => {
  const { showAlert } = useAlert(); 
  const [config, setConfig] = useState({
    tempoSessao: 60, // minutos
    tentativasLogin: 3,
    bloquearConta: true,
    forcarSenhaForte: true,
    logsAtividade: true,
    backupAutomatico: true,
    ipPermitidos: [] as string[]
  });

  const [novaSenha, setNovaSenha] = useState({
    atual: '',
    nova: '',
    confirmar: ''
  });

  const alterarSenha = async (e: React.FormEvent) => {
    e.preventDefault();
    // Implementar alteração de senha
     showAlert({
        type: 'success',
        title: 'Senha alterada com sucesso!',
        duration: 3000
    });
    setNovaSenha({ atual: '', nova: '', confirmar: '' });
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }} className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Configurações de Segurança</h2>
      
      <div className="space-y-8">
        
        {/* Alteração de Senha */}
        <div className="border-b border-gray-200 pb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Alterar Senha</h3>
          <form onSubmit={alterarSenha} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Senha Atual
              </label>
              <input
                type="password"
                value={novaSenha.atual}
                onChange={(e) => setNovaSenha(prev => ({...prev, atual: e.target.value}))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nova Senha
              </label>
              <input
                type="password"
                value={novaSenha.nova}
                onChange={(e) => setNovaSenha(prev => ({...prev, nova: e.target.value}))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
                minLength={8}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar Nova Senha
              </label>
              <input
                type="password"
                value={novaSenha.confirmar}
                onChange={(e) => setNovaSenha(prev => ({...prev, confirmar: e.target.value}))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={novaSenha.nova !== novaSenha.confirmar || novaSenha.nova.length < 8}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                Alterar Senha
              </button>
            </div>
          </form>
        </div>

        {/* Configurações de Sessão */}
        <div className="border-b border-gray-200 pb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Sessão e Autenticação</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tempo de Sessão (minutos)
              </label>
              <input
                type="number"
                value={config.tempoSessao}
                onChange={(e) => setConfig(prev => ({...prev, tempoSessao: parseInt(e.target.value)}))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min="15"
                max="480"
              />
              <p className="text-sm text-gray-500 mt-1">Tempo até logout automático</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tentativas de Login
              </label>
              <input
                type="number"
                value={config.tentativasLogin}
                onChange={(e) => setConfig(prev => ({...prev, tentativasLogin: parseInt(e.target.value)}))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                min="1"
                max="10"
              />
              <p className="text-sm text-gray-500 mt-1">Tentativas antes de bloquear</p>
            </div>
          </div>
        </div>

        {/* Políticas de Segurança */}
        <div className="border-b border-gray-200 pb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Políticas de Segurança</h3>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Bloquear conta após tentativas falhadas
                </label>
                <p className="text-sm text-gray-500">
                  Bloqueia a conta temporariamente após múltiplas tentativas falhadas
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.bloquearConta}
                onChange={(e) => setConfig(prev => ({...prev, bloquearConta: e.target.checked}))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Forçar senha forte
                </label>
                <p className="text-sm text-gray-500">
                  Exige senhas com mínimo 8 caracteres, números e símbolos
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.forcarSenhaForte}
                onChange={(e) => setConfig(prev => ({...prev, forcarSenhaForte: e.target.checked}))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Logs de atividade
                </label>
                <p className="text-sm text-gray-500">
                  Registra todas as atividades importantes do sistema
                </p>
              </div>
              <input
                type="checkbox"
                checked={config.logsAtividade}
                onChange={(e) => setConfig(prev => ({...prev, logsAtividade: e.target.checked}))}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* IPs Permitidos */}
        <div>
          <h3 className="text-lg font-medium text-gray-900 mb-4">IPs Permitidos (Opcional)</h3>
          <p className="text-sm text-gray-500 mb-4">
            Adicione endereços IP específicos para acesso restrito. Deixe vazio para permitir de qualquer local.
          </p>
          
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              placeholder="Ex: 192.168.1.100"
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="button"
              className="px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
            >
              Adicionar IP
            </button>
          </div>

          <div className="space-y-2">
            {config.ipPermitidos.map((ip, index) => (
              <div key={index} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                <span className="font-mono text-sm">{ip}</span>
                <button
                  type="button"
                  className="text-red-600 hover:text-red-800"
                >
                  Remover
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end pt-6 border-t border-gray-200">
          <button
            type="button"
            className="flex items-center gap-2 px-6 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 font-medium"
          >
            <FiSave size={18} />
            Salvar Configurações de Segurança
          </button>
        </div>
      </div>
    </motion.div>
  );
};